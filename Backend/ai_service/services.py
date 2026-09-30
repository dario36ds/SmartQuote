import json

import requests
from django.conf import settings


class OllamaServiceError(Exception):
    pass


QUICK_QUOTE_SCHEMA = {
    "type": "object",
    "properties": {
        "customer_name": {
            "type": ["string", "null"]
        },
        "company_name": {
            "type": ["string", "null"]
        },
        "title": {
            "type": ["string", "null"]
        },
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "description": {
                        "type": "string"
                    },
                    "quantity": {
                        "type": "number"
                    },
                    "unit_price": {
                        "type": ["number", "null"]
                    },
                },
                "required": [
                    "description",
                    "quantity",
                    "unit_price",
                ],
            },
        },
        "delivery_time": {
            "type": ["string", "null"]
        },
        "missing_information": {
            "type": "array",
            "items": {
                "type": "string"
            },
        },
    },
    "required": [
        "customer_name",
        "company_name",
        "title",
        "items",
        "delivery_time",
        "missing_information",
    ],
}


def generate_quick_quote(text):
    schema_string = json.dumps(
        QUICK_QUOTE_SCHEMA,
        ensure_ascii=False,
    )

    prompt = f"""
Sei un assistente che estrae informazioni per la creazione
di preventivi commerciali.

Analizza esclusivamente il testo fornito dall'utente.

REGOLE IMPORTANTI:

- Non inventare informazioni.
- Non inventare prezzi.
- Non inventare nomi.
- Non inventare tempistiche.
- Se un'informazione non è presente, usa null.
- Inserisci in missing_information le informazioni importanti mancanti.
- quantity deve essere 1 se viene descritto un singolo servizio e non
  viene indicata esplicitamente un'altra quantità.
- Restituisci esclusivamente dati conformi allo schema JSON.

Schema:

{schema_string}

Testo dell'utente:

{text}
"""

    try:
        response = requests.post(
            f"{settings.OLLAMA_BASE_URL}/api/generate",
            json={
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "think": False,
                "format": QUICK_QUOTE_SCHEMA,
                "options": {
                    "temperature": 0,
                },
            },
            timeout=120,
        )

        response.raise_for_status()

    except requests.RequestException as exc:
        raise OllamaServiceError(
            "Impossibile comunicare con Ollama."
        ) from exc

    try:
        ollama_response = response.json()

        generated_text = ollama_response["response"]

        return json.loads(generated_text)

    except (KeyError, TypeError, ValueError) as exc:
        raise OllamaServiceError(
            "Ollama ha restituito una risposta non valida."
        ) from exc