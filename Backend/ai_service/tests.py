import json
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, override_settings

from .services import OllamaServiceError, generate_quote_text


@override_settings(
    OLLAMA_BASE_URL="http://localhost:11434",
    OLLAMA_MODEL="mistral-small3.1:24b-instruct-2503-q4_K_M",
)
class QuoteTextServiceTests(SimpleTestCase):
    def setUp(self):
        self.quote = SimpleNamespace(
            customer=SimpleNamespace(
                name="Mario",
                company="Ristorante La Piazza",
            ),
            title="Sito web",
            delivery_time="3 settimane",
            items=Mock(),
        )
        self.quote.items.all.return_value = [
            SimpleNamespace(description="Sito di 5 pagine"),
        ]

    @patch("ai_service.services.requests.post")
    def test_returns_generated_text(self, post):
        text = "Realizzeremo il sito di 5 pagine in 3 settimane."
        post.return_value.json.return_value = {
            "response": json.dumps({"generated_text": f"  {text}\n"}),
        }

        self.assertEqual(generate_quote_text(self.quote), text)
        payload = post.call_args.kwargs["json"]
        self.assertEqual(
            payload["model"],
            "mistral-small3.1:24b-instruct-2503-q4_K_M",
        )
        self.assertEqual(payload["keep_alive"], 0)
        self.assertEqual(payload["options"]["num_ctx"], 2048)
        self.assertIn("Sito di 5 pagine", payload["prompt"])

    @patch("ai_service.services.requests.post")
    def test_rejects_invalid_responses(self, post):
        for payload, message in [
            ({"response": ""}, "risposta non valida"),
            ({"response": '{"generated_text":'}, "risposta non valida"),
            ({"response": "{}"}, "risposta non valida"),
            ([], "risposta non valida"),
            ({}, "risposta non valida"),
            (
                {"response": json.dumps({"generated_text": "   "})},
                "non ha generato alcun testo",
            ),
        ]:
            with self.subTest(payload=payload):
                post.return_value.json.return_value = payload
                with self.assertRaisesRegex(OllamaServiceError, message):
                    generate_quote_text(self.quote)
