import json
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from .services import OllamaServiceError, generate_quick_quote


@override_settings(OLLAMA_BASE_URL="http://localhost:11434", OLLAMA_MODEL="qwen3:4b")
class QuickQuoteServiceTests(SimpleTestCase):
    @patch("ai_service.services.requests.post")
    def test_extracts_quote_with_thinking_disabled(self, post):
        quote = {
            "customer_name": "Mario",
            "company_name": "Ristorante La Piazza",
            "title": "Sito web",
            "items": [{"description": "Sito di 5 pagine", "quantity": 1, "unit_price": 800}],
            "delivery_time": "3 settimane",
            "missing_information": [],
        }
        post.return_value.json.return_value = {"response": json.dumps(quote), "done_reason": "stop"}
        self.assertEqual(generate_quick_quote("Sito per Mario a 800 euro"), quote)
        self.assertIs(post.call_args.kwargs["json"]["think"], False)

    @patch("ai_service.services.requests.post")
    def test_rejects_invalid_responses(self, post):
        for payload, message in [
            ({"response": "", "done_reason": "length"}, "limite di token"),
            ({"response": "", "thinking": "ragionamento"}, "risposta vuota"),
            ({"response": '{"items":'}, "risposta non valida"),
            ([], "risposta non valida"),
            ({}, "risposta non valida"),
        ]:
            with self.subTest(payload=payload):
                post.return_value.json.return_value = payload
                with self.assertRaisesRegex(OllamaServiceError, message):
                    generate_quick_quote("Sito per Mario a 800 euro")
