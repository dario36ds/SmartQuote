import json

import requests
from django.conf import settings


class OllamaServiceError(Exception):
    pass


QUOTE_TEXT_SCHEMA = {
    "type": "object",
    "properties": {
        "generated_text": {
            "type": "string",
        }
    },
    "required": [
        "generated_text",
    ],
}


def generate_quote_text(quote, tone="professional"):
    tone_descriptions = {
        "professional": "professionale, formale e chiaro",
        "friendly": "cordiale, amichevole ma professionale",
        "concise": "molto sintetico e diretto",
        "commercial": "commerciale e convincente ma non aggressivo",
    }

    tone_description = tone_descriptions.get(
        tone,
        tone_descriptions["professional"],
    )

    items_text = "\n".join(
        f"- {item.description}"
        for item in quote.items.all()
    )

    prompt = f"""
Genera il testo descrittivo di un preventivo commerciale destinato
direttamente al cliente finale.

DATI DEL PREVENTIVO

Cliente:
{quote.customer.name}

Azienda:
{quote.customer.company or "Non specificata"}

Titolo:
{quote.title}

Servizi inclusi:
{items_text}

Tempo di consegna:
{quote.delivery_time or "Non specificato"}

Tono richiesto:
{tone_description}

REGOLE:

- Usa esclusivamente le informazioni fornite.
- Non inventare informazioni.
- Non inventare servizi.
- Non inventare sconti.
- Non inventare condizioni di pagamento.
- Non inventare garanzie.
- Non inventare scadenze o periodi di validità del preventivo.
- Non inventare tempistiche.
- Non riportare prezzi, importi, quantità o totale nel testo.
- Non aggiungere benefici, vantaggi, obiettivi commerciali o caratteristiche che non siano esplicitamente presenti nei dati forniti.
- I dati economici saranno mostrati separatamente dall'applicazione.
- Puoi descrivere esclusivamente i servizi realmente presenti.
- Puoi indicare il tempo di consegna solo se è stato fornito.
- Non aggiungere firme o nomi del fornitore non presenti.
- Non scrivere etichette come "Cliente:" o "Azienda:".
- Rivolgiti direttamente al cliente in modo naturale.
- Non usare elenchi puntati.
- Non usare Markdown.
- Non aggiungere titoli come "Preventivo" o "Risposta".
- Non spiegare il ragionamento.
- Non descrivere il compito che stai svolgendo.
- Non inserire ragionamenti interni nel testo finale.
- Scrivi uno o due brevi paragrafi.
- Restituisci esclusivamente il risultato finale nel campo generated_text.
"""

    try:
        response = requests.post(
            f"{settings.OLLAMA_BASE_URL}/api/generate",
            json={
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": QUOTE_TEXT_SCHEMA,
                "keep_alive": 0,
                "options": {
                    "temperature": 0.2,
                    "num_ctx": 2048,
                    "num_predict": 500,
                },
            },
            timeout=120,
        )

        response.raise_for_status()

    except requests.Timeout as exc:
        raise OllamaServiceError(
            "Ollama non ha completato la generazione entro 120 secondi. "
            "Riprova o usa un modello più leggero."
        ) from exc

    except requests.ConnectionError as exc:
        raise OllamaServiceError(
            "Impossibile raggiungere Ollama. Verifica che il servizio sia avviato."
        ) from exc

    except requests.HTTPError as exc:
        error_detail = ""
        try:
            error_detail = str(response.json().get("error", "")).lower()
        except (ValueError, AttributeError):
            pass

        if response.status_code == 404:
            message = "Il modello AI configurato non è disponibile in Ollama."
        elif "memory" in error_detail or "signal: killed" in error_detail:
            message = (
                "Ollama non riesce a caricare il modello AI. "
                "Verifica la memoria disponibile o usa un modello più leggero."
            )
        else:
            message = "Ollama ha restituito un errore durante la generazione."

        raise OllamaServiceError(message) from exc

    except requests.RequestException as exc:
        raise OllamaServiceError(
            "Impossibile comunicare con Ollama."
        ) from exc

    try:
        ollama_data = response.json()

        raw_response = ollama_data["response"]

        structured_output = json.loads(
            raw_response
        )

        generated_text = structured_output[
            "generated_text"
        ].strip()

    except (ValueError, KeyError, TypeError) as exc:
        raise OllamaServiceError(
            "Ollama ha restituito una risposta non valida."
        ) from exc

    if not generated_text:
        raise OllamaServiceError(
            "Ollama non ha generato alcun testo."
        )

    return generated_text
