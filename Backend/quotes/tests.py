from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from importlib import import_module
from threading import Barrier
from types import SimpleNamespace
from unittest.mock import patch

from django.apps import apps
from django.contrib.auth import get_user_model
from django.db import IntegrityError, connection, connections
from django.test import TransactionTestCase, skipUnlessDBFeature
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from customers.models import Customer
from .models import Quote, QuoteItem, QuoteNotification


class QuoteNotificationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = get_user_model().objects.create_user(username="owner")
        cls.other = get_user_model().objects.create_user(username="other")
        cls.customer = Customer.objects.create(user=cls.owner, name="Mario Rossi")
        cls.other_customer = Customer.objects.create(user=cls.other, name="Laura Bianchi")

    def quote(self, status=Quote.Status.SENT, customer=None, **kwargs):
        quote = Quote.objects.create(
            customer=customer or self.customer,
            title="Manutenzione impianto", status=status, **kwargs,
        )
        QuoteItem.objects.create(quote=quote, description="Manutenzione", quantity=1, unit_price=100)
        return quote

    def respond(self, quote, decision):
        return self.client.post(f"/api/quotes/public/{quote.public_token}/{decision}/")

    def test_accept_and_reject_notify_only_the_owner(self):
        for initial_status in (Quote.Status.SENT, Quote.Status.VIEWED):
            for decision, expected in (("accept", "ACCEPTED"), ("reject", "REJECTED")):
                with self.subTest(initial_status=initial_status, decision=decision):
                    quote = self.quote(status=initial_status)
                    response = self.respond(quote, decision)
                    self.assertEqual(response.status_code, 200)
                    quote.refresh_from_db()
                    notification = QuoteNotification.objects.get(quote=quote)
                    self.assertEqual(quote.status, expected)
                    self.assertEqual(notification.status, expected)
                    self.assertEqual(notification.user_id, self.owner.pk)
                    self.assertEqual(notification.customer_name, "Mario Rossi")
                    self.assertEqual(notification.quote_title, quote.title)
                    self.assertIsNone(notification.read_at)
                    self.assertEqual(notification.created_at, quote.accepted_at if decision == "accept" else quote.rejected_at)
        self.assertFalse(QuoteNotification.objects.filter(user=self.other).exists())

    def test_repeated_or_opposite_decisions_do_not_duplicate_notifications(self):
        quote = self.quote()
        self.assertEqual(self.respond(quote, "accept").status_code, 200)
        original = QuoteNotification.objects.get(quote=quote)
        self.assertEqual(self.respond(quote, "accept").status_code, 400)
        self.assertEqual(self.respond(quote, "reject").status_code, 400)
        quote.refresh_from_db()
        self.assertEqual(quote.status, Quote.Status.ACCEPTED)
        self.assertEqual(quote.accepted_at, original.created_at)
        self.assertEqual(QuoteNotification.objects.count(), 1)

    def test_drafts_and_unknown_quotes_cannot_generate_notifications(self):
        quote = self.quote(status=Quote.Status.DRAFT)
        for decision in ("accept", "reject"):
            self.assertEqual(self.respond(quote, decision).status_code, 400)
        self.assertEqual(self.client.post("/api/quotes/public/00000000-0000-0000-0000-000000000000/accept/").status_code, 404)
        self.assertFalse(QuoteNotification.objects.exists())

    def test_public_views_do_not_create_notifications_or_reset_a_decision(self):
        quote = self.quote()
        path = f"/api/quotes/public/{quote.public_token}/"
        self.assertEqual(self.client.get(path).data["status"], Quote.Status.VIEWED)
        self.assertFalse(QuoteNotification.objects.exists())
        self.respond(quote, "reject")
        self.assertEqual(self.client.get(path).data["status"], Quote.Status.REJECTED)
        self.assertEqual(QuoteNotification.objects.count(), 1)

    def test_notification_failure_rolls_back_the_response(self):
        quote = self.quote()
        with patch("quotes.views.QuoteNotification.objects.create", side_effect=IntegrityError):
            with self.assertRaises(IntegrityError):
                self.respond(quote, "accept")
        quote.refresh_from_db()
        self.assertEqual(quote.status, Quote.Status.SENT)
        self.assertIsNone(quote.accepted_at)
        self.assertFalse(QuoteNotification.objects.exists())

    def test_private_list_and_read_operations_are_scoped_to_owner(self):
        own = self.quote()
        other = self.quote(customer=self.other_customer)
        self.respond(own, "accept")
        self.respond(other, "reject")
        own_notification = QuoteNotification.objects.get(quote=own)
        other_notification = QuoteNotification.objects.get(quote=other)
        self.client.force_authenticate(self.owner)
        listing = self.client.get("/api/notifications/")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data["unread_count"], 1)
        self.assertEqual([row["id"] for row in listing.data["results"]], [own_notification.pk])
        self.assertEqual(self.client.post(f"/api/notifications/{other_notification.pk}/read/").status_code, 404)
        self.assertEqual(self.client.post("/api/notifications/999999/read/").status_code, 404)
        path = f"/api/notifications/{own_notification.pk}/read/"
        first = self.client.post(path)
        self.assertEqual(first.status_code, 200)
        self.assertIsNotNone(first.data["read_at"])
        self.assertEqual(self.client.post(path).data["read_at"], first.data["read_at"])
        self.assertEqual(self.client.get("/api/notifications/").data["unread_count"], 0)
        other_notification.refresh_from_db()
        self.assertIsNone(other_notification.read_at)

    def test_read_all_preserves_other_users_and_existing_read_dates(self):
        own = self.quote()
        self.respond(own, "accept")
        self.respond(self.quote(), "reject")
        self.respond(self.quote(customer=self.other_customer), "accept")
        self.client.force_authenticate(self.owner)
        first = self.client.post(f"/api/notifications/{own.response_notification.pk}/read/").data["read_at"]
        self.assertEqual(self.client.post("/api/notifications/read-all/").data["updated"], 1)
        self.assertEqual(self.client.post("/api/notifications/read-all/").data["updated"], 0)
        self.assertEqual(self.client.get("/api/notifications/").data["unread_count"], 0)
        self.assertEqual(self.client.post(f"/api/notifications/{own.response_notification.pk}/read/").data["read_at"], first)
        self.assertTrue(QuoteNotification.objects.filter(user=self.other, read_at__isnull=True).exists())

    def test_notifications_require_authentication(self):
        quote = self.quote()
        self.respond(quote, "accept")
        self.assertEqual(self.client.get("/api/notifications/").status_code, 401)
        self.assertEqual(self.client.post(f"/api/notifications/{quote.response_notification.pk}/read/").status_code, 401)
        self.assertEqual(self.client.post("/api/notifications/read-all/").status_code, 401)

    def test_deleting_quote_preserves_notification_snapshot(self):
        quote = self.quote()
        self.respond(quote, "accept")
        quote.delete()
        self.client.force_authenticate(self.owner)
        listing = self.client.get("/api/notifications/").data
        self.assertEqual(listing["unread_count"], 1)
        self.assertIsNone(listing["results"][0]["quote"])
        self.assertEqual(listing["results"][0]["quote_title"], "Manutenzione impianto")
        self.assertEqual(listing["results"][0]["customer_name"], "Mario Rossi")

    def test_list_limits_history_but_counts_all_unread_notifications(self):
        QuoteNotification.objects.bulk_create([
            QuoteNotification(user=self.owner, status="ACCEPTED", quote_title=f"Preventivo {index}", customer_name="Mario Rossi")
            for index in range(55)
        ])
        self.client.force_authenticate(self.owner)
        listing = self.client.get("/api/notifications/").data
        self.assertEqual(listing["unread_count"], 55)
        self.assertEqual(len(listing["results"]), 50)
        self.assertEqual(listing["results"][0]["quote_title"], "Preventivo 54")
        self.assertEqual(self.client.post("/api/notifications/read-all/").data["updated"], 55)

    def test_migration_includes_existing_responses_with_original_dates(self):
        responded_at = timezone.now() - timedelta(days=7)
        accepted = self.quote(status="ACCEPTED", accepted_at=responded_at)
        rejected = self.quote(status="REJECTED", rejected_at=responded_at, customer=self.other_customer)
        self.quote(status="DRAFT")
        migration = import_module("quotes.migrations.0002_quotenotification")
        migration.seed_existing_responses(apps, SimpleNamespace(connection=connection))
        self.assertEqual(QuoteNotification.objects.count(), 2)
        self.assertEqual(accepted.response_notification.created_at, responded_at)
        self.assertEqual(rejected.response_notification.user_id, self.other.pk)


class QuoteValidationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = get_user_model().objects.create_user(username="validation-owner")
        cls.customer = Customer.objects.create(user=cls.owner, name="Mario Rossi")

    def setUp(self):
        self.client.force_authenticate(self.owner)

    def create_quote(self, **overrides):
        data = {
            "customer": self.customer.pk,
            "title": "Manutenzione",
            "items": [{"description": "Servizio", "quantity": "2.50", "unit_price": "12.50"}],
        }
        return self.client.post("/api/quotes/", {**data, **overrides}, format="json")

    def test_fractional_quantities_and_zero_prices_are_valid(self):
        response = self.create_quote()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["total"], "31.25")
        response = self.create_quote(items=[{"description": "Omaggio", "quantity": "1", "unit_price": "0"}])
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["total"], "0.00")

    def test_invalid_item_values_and_empty_text_are_rejected(self):
        for field, value in (("description", "  "), ("quantity", "0"), ("quantity", "-1"), ("quantity", "0.001"), ("quantity", "100000000"), ("unit_price", "-1"), ("unit_price", "1.001"), ("unit_price", "100000000")):
            with self.subTest(field=field, value=value):
                item = {"description": "Servizio", "quantity": "1", "unit_price": "10", field: value}
                response = self.create_quote(items=[item])
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data["items"][0])
        self.assertEqual(self.create_quote(title="  ").status_code, 400)
        self.assertFalse(Quote.objects.exists())

    def test_excessive_line_and_quote_totals_are_rejected_before_saving(self):
        response = self.create_quote(items=[{"description": "Servizio", "quantity": "1000000", "unit_price": "1000000"}])
        self.assertEqual(response.status_code, 400)
        self.assertIn("unit_price", response.data["items"][0])
        response = self.create_quote(items=[{"description": "Servizio", "quantity": "1000000", "unit_price": "6000"}] * 2)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Quote.objects.exists())

    def test_incomplete_items_on_partial_edit_keep_the_previous_quote(self):
        original = self.create_quote()
        path = f"/api/quotes/{original.data['id']}/"
        response = self.client.patch(path, {"title": "Modificato", "items": [{"description": "Incompleto"}]}, format="json")
        self.assertEqual(response.status_code, 400)
        quote = Quote.objects.get(pk=original.data["id"])
        self.assertEqual(quote.title, "Manutenzione")
        self.assertEqual(quote.items.count(), 1)
        self.assertEqual(quote.items.get().description, "Servizio")
        self.assertEqual(self.client.patch(path, {"title": "Modificato"}, format="json").status_code, 200)


class ConcurrentQuoteResponseTests(TransactionTestCase):
    @skipUnlessDBFeature("has_select_for_update")
    def test_simultaneous_opposite_responses_record_one_decision(self):
        owner = get_user_model().objects.create_user(username="concurrent-owner")
        customer = Customer.objects.create(user=owner, name="Mario Rossi")
        quote = Quote.objects.create(customer=customer, title="Proposta", status="SENT")
        barrier = Barrier(2)

        def respond(decision):
            try:
                barrier.wait(timeout=10)
                return APIClient().post(f"/api/quotes/public/{quote.public_token}/{decision}/").status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(respond, ("accept", "reject")))
        self.assertEqual(sorted(results), [200, 400])
        quote.refresh_from_db()
        notification = QuoteNotification.objects.get(quote=quote)
        self.assertEqual(notification.status, quote.status)
