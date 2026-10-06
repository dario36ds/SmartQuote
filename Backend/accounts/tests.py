from unittest.mock import patch

from django.contrib.auth.models import User
from django.db import IntegrityError
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase


class AccountSettingsTests(APITestCase):
    current_password = "Lago!Verde-2026"
    new_password = "Montagna!Blu-2027"

    def setUp(self):
        self.user = User.objects.create_user(
            username="mario", email="mario@example.com", password=self.current_password,
        )
        self.other = User.objects.create_user(username="laura", email="laura@example.com")
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def change_password(self, **overrides):
        data = {
            "current_password": self.current_password,
            "new_password": self.new_password,
            "confirm_password": self.new_password,
        }
        data.update(overrides)
        return self.client.post("/api/auth/change-password/", data, format="json")

    def assert_credentials_unchanged(self):
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.current_password))
        self.assertTrue(Token.objects.filter(key=self.token.key).exists())

    def test_changes_require_authentication(self):
        self.client.credentials()
        self.assertEqual(self.client.patch("/api/auth/me/", {}, format="json").status_code, 401)
        self.assertEqual(self.change_password().status_code, 401)

    def test_email_update_is_persisted_and_scoped_to_current_user(self):
        response = self.client.patch("/api/auth/me/", {
            "email": " nuovo@example.com ",
            "current_password": self.current_password,
            "id": self.other.pk,
            "username": "changed",
            "password": self.new_password,
            "is_staff": True,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {
            "id": self.user.pk, "username": "mario", "email": "nuovo@example.com",
        })
        self.assertEqual(self.client.get("/api/auth/me/").data["email"], "nuovo@example.com")
        self.assert_credentials_unchanged()
        self.assertFalse(self.user.is_staff)
        self.other.refresh_from_db()
        self.assertEqual(self.other.email, "laura@example.com")

    def test_email_update_rejects_missing_or_invalid_fields_without_changes(self):
        for data in (
            {"email": "nuovo@example.com"},
            {"email": "nuovo@example.com", "current_password": "wrong"},
            {"email": "invalid", "current_password": self.current_password},
            {"email": "", "current_password": self.current_password},
            {"current_password": self.current_password},
        ):
            with self.subTest(data=data):
                self.assertEqual(self.client.patch("/api/auth/me/", data, format="json").status_code, 400)
                self.user.refresh_from_db()
                self.assertEqual(self.user.email, "mario@example.com")
                self.assert_credentials_unchanged()

    def test_password_change_rotates_token_and_updates_login_credentials(self):
        response = self.change_password()
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.new_password))
        self.assertNotEqual(self.user.password, self.new_password)
        self.assertFalse(self.user.check_password(self.current_password))
        self.assertEqual(response.data["user"]["email"], "mario@example.com")
        self.assertNotEqual(response.data["token"], self.token.key)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['token']}")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)
        self.client.credentials()
        self.assertEqual(self.client.post("/api/auth/login/", {
            "username": self.user.username, "password": self.current_password,
        }).status_code, 401)
        self.assertEqual(self.client.post("/api/auth/login/", {
            "username": self.user.username, "password": self.new_password,
        }).status_code, 200)
        self.other.refresh_from_db()
        self.assertFalse(self.other.has_usable_password())

    def test_password_change_rejects_wrong_current_password_and_mismatch(self):
        for overrides in (
            {"current_password": "wrong"},
            {"confirm_password": "Different!Password-2027"},
            {"new_password": self.current_password, "confirm_password": self.current_password},
        ):
            with self.subTest(overrides=overrides):
                self.assertEqual(self.change_password(**overrides).status_code, 400)
                self.assert_credentials_unchanged()

    def test_password_change_applies_all_configured_strength_validators(self):
        for password in ("Ab!2", "password", "12345678987654321", "mario@example.com"):
            with self.subTest(password=password):
                response = self.change_password(new_password=password, confirm_password=password)
                self.assertEqual(response.status_code, 400)
                self.assertIn("new_password", response.data)
                self.assert_credentials_unchanged()

    def test_password_fields_are_required(self):
        for missing in ("current_password", "new_password", "confirm_password"):
            with self.subTest(missing=missing):
                data = {
                    "current_password": self.current_password,
                    "new_password": self.new_password,
                    "confirm_password": self.new_password,
                }
                del data[missing]
                response = self.client.post("/api/auth/change-password/", data, format="json")
                self.assertEqual(response.status_code, 400)
                self.assertIn(missing, response.data)
                self.assert_credentials_unchanged()

    def test_password_whitespace_is_preserved(self):
        password = "  Montagna!Blu-2027  "
        self.assertEqual(self.change_password(new_password=password, confirm_password=password).status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(password))
        self.assertFalse(self.user.check_password(password.strip()))

    def test_token_creation_failure_rolls_back_password_and_token(self):
        with patch("accounts.views.Token.objects.create", side_effect=IntegrityError):
            with self.assertRaises(IntegrityError):
                self.change_password()
        self.assert_credentials_unchanged()
