import json
from types import SimpleNamespace
from unittest.mock import Mock, patch

import requests
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

    @patch("ai_service.services.requests.post")
    def test_distinguishes_connection_failure_from_timeout(self, post):
        for error, message in [
            (requests.ConnectionError(), "Impossibile raggiungere Ollama"),
            (requests.Timeout(), "entro 120 secondi"),
        ]:
            with self.subTest(error=type(error).__name__):
                post.side_effect = error
                with self.assertRaisesRegex(OllamaServiceError, message):
                    generate_quote_text(self.quote)

    @patch("ai_service.services.requests.post")
    def test_explains_ollama_generation_errors(self, post):
        for status_code, payload, message in [
            (404, {"error": "model not found"}, "modello AI configurato non è disponibile"),
            (500, {"error": "llama runner process has terminated: signal: killed"}, "memoria disponibile"),
            (500, {"error": "model requires more system memory"}, "memoria disponibile"),
            (500, {"error": "internal server error"}, "errore durante la generazione"),
            (502, [], "errore durante la generazione"),
        ]:
            with self.subTest(status=status_code, payload=payload):
                post.return_value.status_code = status_code
                post.return_value.json.return_value = payload
                post.return_value.raise_for_status.side_effect = requests.HTTPError()
                with self.assertRaisesRegex(OllamaServiceError, message):
                    generate_quote_text(self.quote)

    @patch("ai_service.services.requests.post")
    def test_handles_non_json_server_error(self, post):
        post.return_value.status_code = 502
        post.return_value.raise_for_status.side_effect = requests.HTTPError()
        post.return_value.json.side_effect = ValueError("Not JSON")
        with self.assertRaisesRegex(OllamaServiceError, "errore durante la generazione"):
            generate_quote_text(self.quote)
