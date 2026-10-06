from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from io import StringIO
from threading import Barrier

from django.contrib.auth import get_user_model
from django.core.management import call_command, CommandError
from django.db import connections, IntegrityError, transaction
from django.test import TransactionTestCase, skipUnlessDBFeature
from django.utils import timezone
from rest_framework.test import APITestCase

from customers.models import Customer
from .models import Quote, QuoteNotification, QuoteReminderSettings
from .reminders import generate_due_reminders


class QuoteReminderTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = get_user_model().objects.create_user(username="reminder-owner")
        cls.other = get_user_model().objects.create_user(username="reminder-other")
        cls.customer = Customer.objects.create(user=cls.owner, name="Mario Rossi")
        cls.other_customer = Customer.objects.create(user=cls.other, name="Laura Bianchi")

    def setUp(self):
        self.now = timezone.now()
        self.client.force_authenticate(self.owner)

    def quote(self, **overrides):
        return Quote.objects.create(**{
            "customer": self.customer, "title": "Proposta", "status": Quote.Status.SENT,
            "sent_at": self.now - timedelta(days=7), **overrides,
        })

    def test_exact_threshold_includes_sent_and_viewed_but_excludes_new_and_resolved_quotes(self):
        due = [self.quote(), self.quote(status=Quote.Status.VIEWED)]
        for status in [Quote.Status.DRAFT, Quote.Status.ACCEPTED, Quote.Status.REJECTED]:
            self.quote(status=status, sent_at=self.now - timedelta(days=20))
        self.quote(sent_at=self.now - timedelta(days=7) + timedelta(seconds=1))
        self.quote(sent_at=None)
        self.quote(sent_at=self.now + timedelta(days=1))

        self.assertEqual(generate_due_reminders(now=self.now), 2)
        self.assertEqual(set(QuoteNotification.objects.values_list("quote_id", flat=True)), {quote.pk for quote in due})
        self.assertEqual(generate_due_reminders(now=self.now + timedelta(days=1)), 1)
        self.assertEqual(generate_due_reminders(now=self.now + timedelta(days=1)), 0)

    def test_preferences_are_personal_and_disabled_accounts_do_not_get_new_reminders(self):
        QuoteReminderSettings.objects.create(user=self.owner, after_days=3)
        QuoteReminderSettings.objects.create(user=self.other, enabled=False, after_days=1)
        due = self.quote(sent_at=self.now - timedelta(days=3))
        self.quote(sent_at=self.now - timedelta(days=2))
        self.quote(customer=self.other_customer, sent_at=self.now - timedelta(days=30))
        self.assertEqual(generate_due_reminders(now=self.now), 1)
        reminder = QuoteNotification.objects.get()
        self.assertEqual(reminder.quote_id, due.pk)
        self.assertEqual(reminder.user_id, self.owner.pk)
        self.assertEqual(reminder.created_at, self.now)
        self.assertEqual(reminder.customer_name, "Mario Rossi")

    def test_read_reminders_are_not_generated_again_and_list_is_owner_scoped(self):
        own = self.quote(sent_at=self.now - timedelta(days=10))
        other = self.quote(customer=self.other_customer, sent_at=self.now - timedelta(days=10))
        listing = self.client.get("/api/notifications/").data
        self.assertEqual(listing["unread_count"], 1)
        self.assertEqual(listing["results"][0]["quote"], own.pk)
        self.assertTrue(listing["results"][0]["can_remind"])
        self.assertFalse(QuoteNotification.objects.filter(quote=other).exists())
        reminder_id = listing["results"][0]["id"]
        self.assertEqual(self.client.post(f"/api/notifications/{reminder_id}/read/").status_code, 200)
        self.assertEqual(generate_due_reminders(user=self.owner, now=self.now + timedelta(days=30)), 0)
        self.assertEqual(self.client.get("/api/notifications/").data["unread_count"], 0)
        self.assertEqual(QuoteNotification.objects.filter(quote=own).count(), 1)

    def test_responses_close_existing_reminders_and_preserve_response_notifications(self):
        for decision, status in [("accept", Quote.Status.ACCEPTED), ("reject", Quote.Status.REJECTED)]:
            with self.subTest(decision=decision):
                quote = self.quote()
                generate_due_reminders(now=self.now)
                reminder = quote.notifications.get(status=QuoteNotification.REMINDER)
                response = self.client.post(f"/api/quotes/public/{quote.public_token}/{decision}/")
                self.assertEqual(response.status_code, 200)
                reminder.refresh_from_db()
                self.assertIsNotNone(reminder.read_at)
                self.assertEqual(quote.notifications.get(status=status).user_id, self.owner.pk)
                listing = self.client.get("/api/notifications/").data
                serialized = next(item for item in listing["results"] if item["id"] == reminder.pk)
                self.assertFalse(serialized["can_remind"])
        self.assertEqual(generate_due_reminders(now=self.now + timedelta(days=30)), 0)
        self.assertEqual(self.client.get("/api/notifications/").data["unread_count"], 2)

    def test_deleting_a_quote_keeps_its_reminder_snapshot_without_an_action(self):
        quote = self.quote()
        generate_due_reminders(now=self.now)
        quote.delete()
        reminder = self.client.get("/api/notifications/").data["results"][0]
        self.assertIsNone(reminder["quote"])
        self.assertFalse(reminder["can_remind"])
        self.assertEqual(reminder["customer_name"], "Mario Rossi")

    def test_defaults_and_updates_are_persisted_without_changing_other_accounts(self):
        path = "/api/notifications/settings/"
        self.assertEqual(self.client.get(path).data, {"enabled": True, "after_days": 7})
        self.assertFalse(QuoteReminderSettings.objects.exists())
        response = self.client.patch(path, {"after_days": 14, "user": self.other.pk}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"enabled": True, "after_days": 14})
        self.assertEqual(self.client.patch(path, {"enabled": False}, format="json").data, {"enabled": False, "after_days": 14})
        self.assertEqual(self.client.get(path).data["after_days"], 14)
        self.assertFalse(QuoteReminderSettings.objects.filter(user=self.other).exists())
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(path).data, {"enabled": True, "after_days": 7})

    def test_invalid_days_and_unauthenticated_preferences_are_rejected(self):
        path = "/api/notifications/settings/"
        for days in [0, -1, 366, 1.5, "abc", None]:
            with self.subTest(days=days):
                self.assertEqual(self.client.patch(path, {"after_days": days}, format="json").status_code, 400)
        self.assertFalse(QuoteReminderSettings.objects.exists())
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(path).status_code, 401)
        self.assertEqual(self.client.patch(path, {"after_days": 3}, format="json").status_code, 401)

    def test_database_constraints_allow_one_reminder_and_one_response(self):
        quote = self.quote()
        generate_due_reminders(now=self.now)
        with self.assertRaises(IntegrityError), transaction.atomic():
            QuoteNotification.objects.create(user=self.owner, quote=quote, status=QuoteNotification.REMINDER)
        QuoteNotification.objects.create(user=self.owner, quote=quote, status=Quote.Status.ACCEPTED)
        with self.assertRaises(IntegrityError), transaction.atomic():
            QuoteNotification.objects.create(user=self.owner, quote=quote, status=Quote.Status.REJECTED)

    def test_command_generates_reminders_for_offline_accounts_and_is_idempotent(self):
        self.quote()
        self.quote(customer=self.other_customer)
        output = StringIO()
        call_command("generate_quote_reminders", stdout=output)
        self.assertEqual(QuoteNotification.objects.count(), 2)
        self.assertIn("Promemoria creati: 2", output.getvalue())
        call_command("generate_quote_reminders", stdout=output)
        self.assertEqual(QuoteNotification.objects.count(), 2)
        with self.assertRaises(CommandError):
            call_command("generate_quote_reminders", interval=0, stdout=output)


class ConcurrentQuoteReminderTests(TransactionTestCase):
    @skipUnlessDBFeature("has_select_for_update")
    def test_concurrent_workers_do_not_duplicate_reminders(self):
        owner = get_user_model().objects.create_user(username="concurrent-reminder")
        customer = Customer.objects.create(user=owner, name="Mario Rossi")
        Quote.objects.create(customer=customer, title="Proposta", status="SENT", sent_at=timezone.now() - timedelta(days=8))
        barrier = Barrier(2)

        def generate(_):
            try:
                barrier.wait(timeout=10)
                return generate_due_reminders()
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(generate, range(2)))
        self.assertEqual(sum(results), 1)
        self.assertEqual(QuoteNotification.objects.count(), 1)
