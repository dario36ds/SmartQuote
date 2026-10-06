from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import Customer


class CustomerValidationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username="owner")

    def setUp(self):
        self.client.force_authenticate(self.user)

    def create_customer(self, **fields):
        return self.client.post("/api/customers/", {"name": "Mario Rossi", **fields}, format="json")

    def test_accepts_national_and_international_phone_formats(self):
        for phone in ("3331234567", "02 1234 5678", "+39 333 123 4567", "0039 333 123 4567", "+44 (20) 7946-0958", "333.123.4567"):
            with self.subTest(phone=phone):
                response = self.create_customer(phone=phone)
                self.assertEqual(response.status_code, 201)
                self.assertEqual(response.data["phone"], phone)

    def test_rejects_invalid_phones_without_creating_customer(self):
        for phone in ("abc", "333abc1234567", "123", "+", "++393331234567", "39+3331234567", "+0393331234567", "0003331234567", "1234567890123456", "(3331234567", ")3331234567(", "((333))1234567", "333/123/4567", "333\n1234567"):
            with self.subTest(phone=phone):
                response = self.create_customer(phone=phone)
                self.assertEqual(response.status_code, 400)
                self.assertIn("phone", response.data)
        self.assertFalse(Customer.objects.exists())

    def test_email_format_is_checked(self):
        for email in ("invalid", "mario@", "mario@localhost", "mario@@example.com", "mario rossi@example.com", "mario..rossi@example.com"):
            with self.subTest(email=email):
                response = self.create_customer(email=email)
                self.assertEqual(response.status_code, 400)
                self.assertIn("email", response.data)
        response = self.create_customer(email=" mario.rossi+preventivi@example.it ")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["email"], "mario.rossi+preventivi@example.it")

    def test_optional_fields_can_be_empty_and_values_are_trimmed(self):
        response = self.create_customer(name="  Émilie D’Angelo  ", email="  ", phone="  ", company="  ACME  ")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], "Émilie D’Angelo")
        self.assertEqual(response.data["company"], "ACME")
        self.assertEqual(response.data["email"], "")
        self.assertEqual(response.data["phone"], "")

    def test_required_name_and_field_lengths(self):
        for field, value in (("name", "  "), ("name", "a" * 151), ("company", "a" * 151), ("email", "a" * 250 + "@example.it"), ("phone", " ".join("1" * 30))):
            with self.subTest(field=field):
                response = self.create_customer(**{field: value})
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)

    def test_invalid_edit_keeps_saved_data_and_partial_edits_work(self):
        customer = Customer.objects.create(user=self.user, name="Mario", phone="3331234567", email="mario@example.com")
        path = f"/api/customers/{customer.pk}/"
        response = self.client.patch(path, {"phone": "wrong", "email": "wrong"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.data)
        self.assertIn("email", response.data)
        customer.refresh_from_db()
        self.assertEqual(customer.phone, "3331234567")
        self.assertEqual(customer.email, "mario@example.com")
        self.assertEqual(self.client.patch(path, {"company": "Azienda"}, format="json").status_code, 200)
        self.assertEqual(self.client.patch(path, {"phone": "", "email": ""}, format="json").status_code, 200)
