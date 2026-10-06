# SmartQuote

SmartQuote è un’applicazione per creare e gestire preventivi commerciali, organizzare i clienti e generare testi di presentazione con AI locale tramite Ollama.

## Funzionalità

- **Account:** registrazione, accesso e logout con autenticazione tramite token; pagina Impostazioni per cambiare email e password confermando la password attuale, con controlli sulla robustezza della nuova password e rinnovo del token; pulsante per mostrare o nascondere la password.
- **Clienti:** creazione, modifica ed eliminazione dell’anagrafica, ricerca, filtri, ordinamento e paginazione, con riepiloghi dei preventivi associati.
- **Validazione dei campi:** email con dominio completo, telefoni nazionali e internazionali con 7–15 cifre e prefisso facoltativo, controlli sui campi obbligatori e sulle lunghezze. I moduli mostrano gli errori accanto ai campi; le API ripetono i controlli. Quantità e prezzi dei preventivi ammettono due decimali, rispettivamente con minimo 0,01 e 0; vengono controllati anche i limiti dei valori e dei totali.
- **Preventivi:** editor con cliente, titolo, descrizione, tempi di consegna e voci di costo; creazione di un nuovo cliente direttamente nell’editor, con selezione automatica e mantenimento dei dati già inseriti; calcolo dei totali, salvataggio in bozza e anteprima.
- **Testi AI:** generazione con tono professionale, cordiale, sintetico o commerciale. La bozza viene salvata prima della generazione; il testo può essere rivisto e deve essere salvato per conservarne le modifiche. In caso di errore, la descrizione precedente rimane disponibile.
- **Condivisione:** pubblicazione di un link cliente, copia del link e preparazione di messaggi per email o WhatsApp con destinatario già impostato dai contatti del cliente. I numeri senza prefisso usano +39; quelli con + o 00 mantengono il prefisso internazionale. Se manca il contatto, il relativo pulsante segnala il dato da aggiungere nell’anagrafica. L’invio viene confermato nell’app scelta.
- **Area cliente:** consultazione del preventivo senza account e accettazione o rifiuto con conferma.
- **Dashboard:** valore accettato, preventivi attivi, tasso di accettazione, clienti totali, andamento mensile, distribuzione degli stati e clienti in evidenza.
- **Notifiche:** accettazioni e rifiuti compaiono nella campanella, anche su mobile, con contatore delle notifiche non lette. Puoi aprire il preventivo o segnare tutte le notifiche come lette. L’app controlla le nuove risposte ogni 30 secondi mentre è visibile, al ritorno nella finestra e all’apertura della campanella; un avviso segnala le nuove risposte rilevate durante l’uso.
- **Interfaccia:** stile condiviso tra le pagine, elenchi a schede su mobile, finestre di conferma per le eliminazioni e skeleton per generazione AI, dashboard, clienti, preventivi, pagina pubblica e caricamento della sessione. Le animazioni rispettano la preferenza “riduci movimento”.

Il ciclo del preventivo comprende gli stati **Bozza**, **Inviato**, **Visualizzato**, **Accettato** e **Rifiutato**. Solo le bozze possono essere modificate o rigenerate con AI. La pubblicazione rende disponibile il link pubblico e passa il preventivo a “Inviato”; la prima apertura dell’area cliente lo passa a “Visualizzato”.

Le notifiche e il loro stato di lettura vengono conservati nel database per il proprietario del preventivo. La campanella mostra le ultime 50 notifiche e conta tutte quelle non lette. Se elimini un preventivo, il riepilogo della notifica rimane consultabile. La migrazione `quotes/0002_quotenotification` include anche le risposte già registrate.

Il backend dei promemoria conserva preferenze personali (`enabled`, `after_days` da 1 a 365; predefinito: attivo dopo 7 giorni) e genera una sola notifica `REMINDER` per ogni preventivo Inviato o Visualizzato senza risposta. La soglia si calcola dalla data di invio e vale anche per i preventivi già presenti. Leggere la notifica o cambiare l’intervallo non genera duplicati; disattivare i promemoria ferma quelli nuovi. Una risposta del cliente chiude il promemoria e lo segna come letto, conservando anche la notifica della risposta. La migrazione `quotes/0003_quote_reminders` aggiunge queste preferenze e mantiene lo storico esistente. La configurazione e la visualizzazione dei promemoria nel frontend sono previste nei passaggi successivi.

## Tecnologie e struttura

- **Frontend:** React 19, React Router, Vite 8 ed ESLint.
- **Backend:** Python 3.14+, Django e Django REST Framework, con dipendenze gestite da `uv`.
- **Database:** PostgreSQL 17 nella configurazione Docker.
- **AI:** Ollama con modello configurabile; il modello predefinito è `qwen2.5:14b-instruct`.

```text
SmartQuote/
├── Backend/
│   ├── accounts/      # Autenticazione
│   ├── customers/     # Anagrafica clienti
│   ├── quotes/        # Preventivi e area pubblica
│   ├── ai_service/    # Integrazione con Ollama
│   └── config/        # Configurazione Django
├── Frontend/
│   └── src/
│       ├── components/ # Componenti condivisi e skeleton
│       ├── context/    # Stato dell’autenticazione
│       ├── pages/      # Pagine dell’applicazione
│       └── utils/      # Dashboard e condivisione
├── .env.example
└── docker-compose.yml
```

## Avvio con Docker

Sono necessari Docker e Docker Compose. Dalla radice del progetto:

```bash
cp .env.example .env
```

Configura `DJANGO_SECRET_KEY` nel nuovo `.env` con una chiave casuale locale e adatta le altre variabili se necessario. Poi avvia i servizi:

```bash
docker compose up --build
```

Compose avvia PostgreSQL e Ollama, scarica il modello configurato se non è già disponibile, applica le migrazioni e avvia backend e frontend. Il primo avvio può richiedere tempo per il download del modello. Database e modelli vengono conservati nei volumi Docker.

Il servizio `reminders` controlla ogni minuto i preventivi e genera i promemoria anche quando l’app è chiusa. Per l’avvio locale puoi eseguire `uv run manage.py generate_quote_reminders --watch --interval 60` in un terminale dalla cartella `Backend`; senza `--watch` esegue un solo controllo. La lettura delle notifiche recupera anche i promemoria scaduti dell’utente corrente.

| Servizio | Indirizzo locale |
| --- | --- |
| Applicazione | http://localhost:5173 |
| API | http://127.0.0.1:8000/api/ |
| Amministrazione Django | http://127.0.0.1:8000/admin/ |

Per consultare i log o fermare i servizi:

```bash
docker compose logs -f backend ollama ollama-init
docker compose down
```

La configurazione inclusa usa i server di sviluppo Django e Vite. Ollama è raggiungibile dal backend nella rete interna di Compose.

## Avvio locale

Sono necessari Python 3.14 o successivo, `uv`, Node.js 22 con npm, PostgreSQL e Ollama. Il container frontend usa Node.js 22.23.2.

### 1. Configurazione e database

Dalla radice del progetto, crea i file di configurazione:

```bash
cp .env.example .env
cp Frontend/.env.example Frontend/.env
```

Imposta `DJANGO_SECRET_KEY` e le credenziali PostgreSQL nel `.env` della radice. Puoi usare un database locale già configurato oppure avviare solo PostgreSQL tramite Compose:

```bash
docker compose up -d db
```

### 2. Ollama

Avvia Ollama tramite la sua applicazione oppure, in un terminale dedicato:

```bash
ollama serve
```

In un altro terminale, scarica il modello indicato da `OLLAMA_MODEL`:

```bash
ollama pull qwen2.5:14b-instruct
```

Se cambi modello, aggiorna `OLLAMA_MODEL` nel `.env` e scarica il modello corrispondente.

### 3. Backend

```bash
cd Backend
uv sync --frozen
uv run manage.py migrate
uv run manage.py runserver 127.0.0.1:8000
```

Per accedere all’amministrazione Django, crea facoltativamente un superutente dalla cartella `Backend`:

```bash
uv run manage.py createsuperuser
```

### 4. Frontend

In un altro terminale, dalla radice del progetto:

```bash
cd Frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Apri http://127.0.0.1:5173 e registra un account. Dalla pagina Preventivi puoi scegliere un cliente esistente oppure premere “Nuovo cliente” per crearlo e selezionarlo senza cambiare pagina. Completa la proposta e inserisci le voci di costo; puoi poi salvare la bozza, generare la descrizione AI, salvarla e pubblicare il link da condividere.

## Variabili d’ambiente

Il backend legge il `.env` nella radice del progetto; le variabili già impostate nel processo hanno precedenza. Nell’avvio locale, Vite legge `Frontend/.env`; con Docker, l’indirizzo API viene passato dal `.env` della radice.

| Variabile | Utilizzo |
| --- | --- |
| `DJANGO_SECRET_KEY` | Chiave segreta richiesta per avviare Django. |
| `DJANGO_DEBUG` | Modalità debug; l’esempio usa `True` per lo sviluppo locale. |
| `DJANGO_ALLOWED_HOSTS` | Host consentiti, separati da virgole, senza schema o porta. |
| `CORS_ALLOWED_ORIGINS` | Origini del frontend consentite, con schema e porta. |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Nome del database e credenziali PostgreSQL. |
| `DB_HOST`, `DB_PORT` | Indirizzo PostgreSQL; Compose usa internamente `db:5432`. |
| `OLLAMA_BASE_URL` | Indirizzo di Ollama; in locale è `http://127.0.0.1:11434`, in Compose è `http://ollama:11434`. |
| `OLLAMA_MODEL` | Modello da usare per la generazione del testo. |
| `VITE_API_BASE_URL` | Indirizzo API raggiungibile dal browser; predefinito `http://127.0.0.1:8000/api`. |

Riavvia il servizio interessato dopo aver modificato la configurazione. Se cambi porta o host del frontend, aggiorna anche `CORS_ALLOWED_ORIGINS`. I file `.env` locali sono esclusi da Git; i valori di esempio sono in [.env.example](.env.example) e [Frontend/.env.example](Frontend/.env.example).

## Pagine e API

| Pagina | Percorso |
| --- | --- |
| Dashboard | `/` |
| Clienti | `/customers` |
| Preventivi | `/quotes` |
| Impostazioni account | `/settings` |
| Accesso e registrazione | `/login`, `/register` |
| Preventivo pubblico | `/q/:token` |

Le API private richiedono l’header `Authorization: Token <token>`. Clienti e preventivi vengono filtrati in base all’utente autenticato.

| API | Operazioni |
| --- | --- |
| `/api/auth/register/`, `/api/auth/login/`, `/api/auth/logout/` | `POST`: registrazione, accesso e logout. |
| `/api/auth/me/` | `GET`: utente corrente; `PATCH`: modifica email con `email` e `current_password`. |
| `/api/auth/change-password/` | `POST`: modifica password con `current_password`, `new_password` e `confirm_password`; restituisce utente e nuovo token, invalidando il precedente. |
| `/api/customers/` | `GET`, `POST`: elenco e creazione clienti. |
| `/api/customers/:id/` | `GET`, `PUT`, `PATCH`, `DELETE`: gestione del singolo cliente. |
| `/api/quotes/` | `GET`, `POST`: elenco e creazione preventivi. |
| `/api/quotes/:id/` | `GET`, `PUT`, `PATCH`, `DELETE`: gestione del singolo preventivo. |
| `/api/quotes/:id/generate-text/` | `POST`: generazione AI con `tone` pari a `professional`, `friendly`, `concise` o `commercial`. |
| `/api/quotes/:id/publish/` | `POST`: pubblicazione della bozza. |
| `/api/quotes/public/:token/` | `GET`: consultazione pubblica tramite token UUID. |
| `/api/quotes/public/:token/accept/`, `/api/quotes/public/:token/reject/` | `POST`: risposta del cliente. |
| `/api/notifications/` | `GET`: ultime 50 notifiche dell’utente e conteggio delle non lette. |
| `/api/notifications/settings/` | `GET`, `PATCH`: preferenze personali dei promemoria (`enabled`, `after_days` da 1 a 365). |
| `/api/notifications/:id/read/` | `POST`: segna una notifica come letta. |
| `/api/notifications/read-all/` | `POST`: segna tutte le notifiche dell’utente come lette. |

Le API pubbliche del preventivo non richiedono autenticazione. La generazione AI restituisce `generated_text` senza salvarlo automaticamente nella descrizione.

## Verifiche

Controlli frontend, dalla cartella `Frontend`:

```bash
npm run lint
npm test
npm run build
```

Controlli e test backend, dalla cartella `Backend`, con PostgreSQL configurato e disponibile:

```bash
uv run manage.py check
uv run manage.py test
```

I test dei preventivi verificano creazione e lettura delle notifiche, isolamento tra utenti, recupero delle risposte precedenti e gestione di accettazioni e rifiuti simultanei su PostgreSQL. I test dei promemoria controllano soglie temporali, preferenze, chiusura dopo una risposta, conservazione dello storico e generazione concorrente senza duplicati. Dopo un aggiornamento, applica le nuove migrazioni con `uv run manage.py migrate`; nell’avvio Docker vengono applicate automaticamente dal backend.

## Problemi comuni

- **Frontend non collegato all’API:** verifica `VITE_API_BASE_URL`, che il backend sia avviato e che l’origine del frontend sia presente in `CORS_ALLOWED_ORIGINS`.
- **Connessione al database fallita:** controlla le variabili `DB_*` e la disponibilità di PostgreSQL. Le migrazioni devono essere applicate prima dell’uso.
- **Generazione AI non disponibile:** controlla che Ollama sia avviato, raggiungibile dal backend e che il modello configurato sia stato scaricato. Il backend attende al massimo 120 secondi; in caso di timeout o memoria insufficiente, puoi configurare un modello più leggero.
- **Link pubblico non disponibile:** il preventivo deve essere pubblicato. Le bozze non sono consultabili nell’area cliente e l’eliminazione del preventivo rende il relativo link inutilizzabile.
