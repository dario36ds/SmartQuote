# SmartQuote

SmartQuote è un’applicazione full-stack per gestire clienti e preventivi commerciali. Il gestore prepara la proposta, può generare un testo di presentazione con Ollama e condivide un link attraverso cui il cliente consulta il preventivo e comunica la propria decisione senza registrarsi.

## Funzionalità principali

- **Account:** registrazione con username, password di almeno 8 caratteri ed email facoltativa; accesso e logout tramite token. Nelle Impostazioni è possibile modificare email e password confermando la password attuale. Il cambio password applica i validatori Django e sostituisce il token di autenticazione.
- **Clienti:** creazione, modifica ed eliminazione di nome, azienda, email, telefono e indirizzo; ricerca, filtri per tipologia e stato dei preventivi, ordinamento e paginazione. Ogni cliente mostra un riepilogo delle proposte associate.
- **Preventivi:** editor con cliente, titolo, descrizione, tempi di consegna e voci di costo; salvataggio in bozza, modifica, anteprima, pubblicazione ed eliminazione. È possibile creare e selezionare un nuovo cliente direttamente nell’editor, mantenendo i dati già compilati.
- **Ricerca preventivi:** ricerca per titolo, descrizione, cliente e servizi; filtri per cliente e stato, ordinamento per data, importo o titolo e paginazione.
- **Testi AI:** generazione della descrizione con tono professionale, cordiale, sintetico o commerciale, a partire dai dati del preventivo. Il testo può essere rivisto e salvato prima della pubblicazione.
- **Condivisione e area cliente:** copia del link pubblico, email e WhatsApp con destinatario e messaggio precompilati; consultazione, accettazione o rifiuto tramite una pagina pubblica con conferma della decisione.
- **Dashboard:** riepilogo su 3, 6 o 12 mesi con valore dei preventivi accettati, proposte attive, tasso di accettazione, clienti totali e nuovi, andamento mensile, distribuzione degli stati e clienti in evidenza.
- **Notifiche e solleciti:** notifiche per accettazione, rifiuto e mancata risposta; preferenze personali per attivare i promemoria e scegliere dopo quanti giorni proporre un sollecito via email o WhatsApp.
- **Interfaccia responsive:** CSS condiviso, layout per desktop e mobile, conferme delle eliminazioni, indicatori di caricamento e animazioni che rispettano la preferenza di riduzione del movimento.

### Voci, quantità e prezzi

Un preventivo richiede un cliente dell’utente autenticato, un titolo e almeno una voce. Ogni voce contiene descrizione, quantità e prezzo unitario; descrizione e prezzo sono obbligatori.

| Valore | Regole applicate |
| --- | --- |
| Quantità | Solo numeri interi positivi, da **1** a **99.999.999**. |
| Prezzo unitario | Da **0** a **99.999.999,99 €**, con **fino a due decimali**. |
| Totale | Somma di `quantità × prezzo unitario` per ciascuna voce. Il backend limita sia il totale della voce sia quello del preventivo a **9.999.999.999,99 €**. |

Il frontend imposta quantità con `min="1"`, `max="99999999"` e `step="1"`, impedisce l’inserimento di quantità frazionarie e valida i prezzi con `min="0"`, `max="99999999.99"` e `step="0.01"`. I serializer backend rifiutano quantità non positive o frazionarie, prezzi negativi o con precisione eccessiva e totali oltre il limite. I totali dell’API vengono calcolati con valori decimali; il frontend mostra un’anteprima durante la compilazione.

Email e telefoni vengono controllati sia nei moduli sia nelle API. I telefoni ammettono 7–15 cifre, un prefisso internazionale facoltativo e separatori come spazi, trattini, punti e parentesi.

## Stack tecnologico

| Componente | Tecnologie |
| --- | --- |
| Frontend | React 19, React Router 8, React Icons e CSS personalizzato. |
| Strumenti frontend | Vite 8, npm ed ESLint 10; dipendenze bloccate in `package-lock.json`. |
| Backend | Python 3.14+, Django 6.1 e Django REST Framework 3.18. |
| Dipendenze backend | `uv`, con versioni bloccate in `uv.lock`; Psycopg, Requests e django-cors-headers. |
| Database | PostgreSQL; la configurazione Docker usa la versione 17. |
| AI | Ollama; il Dockerfile include la versione 0.32.0. |
| Avvio completo | Docker Compose, container unico e Nginx per il frontend compilato e il proxy API. |

## Architettura

```text
React
  ↓ REST API (JSON, autenticazione tramite token)
Django / Django REST Framework
  ↓
PostgreSQL

Django
  ↓ HTTP
Ollama
```

Le API private separano clienti, preventivi, notifiche e preferenze per utente. Le API pubbliche identificano la proposta tramite un token UUID. Nell’avvio Docker tutti i processi risiedono nello stesso container; Nginx serve React e inoltra `/api/` a Django. Il processo dei promemoria legge e aggiorna PostgreSQL attraverso Django.

## Struttura del progetto

```text
SmartQuote/
├── Backend/
│   ├── accounts/           # Autenticazione e impostazioni account
│   ├── customers/          # Anagrafica e API clienti
│   ├── quotes/             # Preventivi, pagina pubblica, notifiche e promemoria
│   ├── ai_service/         # Integrazione con Ollama
│   ├── config/             # Impostazioni, validatori e URL Django
│   ├── manage.py
│   ├── pyproject.toml
│   ├── uv.lock
│   └── Dockerfile
├── Frontend/
│   ├── src/                # Pagine, componenti, autenticazione e utilità
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── Dockerfile
├── docker/                 # Supervisione dei processi, healthcheck, Nginx e test
├── .env.example
├── Dockerfile              # Immagine completa usata da Compose
└── docker-compose.yml
```

Compose usa il **Dockerfile nella radice**. I Dockerfile nelle cartelle Backend e Frontend sono presenti per costruire i singoli componenti, ma non vengono utilizzati dall’avvio completo descritto di seguito.

## Avvio rapido con Docker

### Requisiti

Servono Git per clonare il repository, Docker con Docker Compose e una connessione Internet per scaricare immagini, dipendenze e modello AI al primo avvio. Docker installa i componenti e compila il frontend: non occorrono installazioni locali di Python, Node.js, PostgreSQL o Ollama.

### Configurazione e avvio

```bash
git clone https://github.com/dario36ds/SmartQuote.git
cd SmartQuote
cp .env.example .env
```

**Prima dell’avvio, modifica `.env`:**

- Sostituisci `DJANGO_SECRET_KEY` con una chiave casuale personale: Django richiede un valore non vuoto.
- Configura `DB_NAME`, `DB_USER` e `DB_PASSWORD` con i dati del database da inizializzare. Mantieni questi valori non vuoti e scegli una password personale.
- Mantieni `OLLAMA_MODEL=qwen2.5:14b-instruct` per usare il modello predefinito oppure indica il modello che desideri scaricare. Compose richiede esplicitamente questa variabile non vuota.

Gli altri valori dell’esempio sono già impostati per l’uso sul computer locale. Avvia quindi:

```bash
docker compose up --build
```

Il solo servizio Compose è **`app`**. L’immagine contiene PostgreSQL 17, Ollama, Django, il frontend compilato servito da Nginx e il processo dei promemoria. Non serve un container separato per inizializzare Ollama: lo script di avvio esegue queste operazioni:

1. Avvia PostgreSQL e Ollama, attende il database e applica le migrazioni Django con `migrate --noinput`.
2. Attende Ollama, verifica il modello configurato e lo scarica se manca.
3. Avvia il controllo dei promemoria ogni 60 secondi, l’API Django sulla porta 8000 e Nginx sulla porta 5173.

Il frontend e l’API diventano disponibili dopo la preparazione del modello. Il primo download può richiedere tempo e lo spazio e la memoria necessari dipendono dal modello scelto. Il container include un healthcheck di frontend, API, PostgreSQL e Ollama; se un processo supervisionato termina, vengono fermati gli altri e la politica `unless-stopped` permette il riavvio del container.

| Componente | Indirizzo sul computer locale |
| --- | --- |
| Applicazione React | http://localhost:5173 |
| API Django | http://127.0.0.1:8000/api/ |
| Amministrazione Django | http://127.0.0.1:8000/admin/ |
| PostgreSQL | `127.0.0.1:5432`, oppure la porta esterna scelta con `DB_PORT`. |

Ollama ascolta sulla porta 11434 all’interno del container; Compose non pubblica questa porta sul computer. Le dipendenze di avvio sono gestite dallo script `docker/start.py`, senza altri servizi Compose o `depends_on`.

I volumi **`postgres_data`** e **`ollama_data`** conservano rispettivamente database e modelli. Per leggere i log o fermare l’applicazione conservando i volumi:

```bash
docker compose logs -f app
docker compose down
```

Per usare l’amministrazione Django, crea facoltativamente un superutente:

```bash
docker compose exec app python manage.py createsuperuser
```

Apri l’applicazione, registra un account e accedi. Il superutente non è necessario per usare clienti e preventivi.

## Avvio locale per sviluppo

### Requisiti

- Git, **Python 3.14 o successivo** e `uv`.
- **Node.js 22, almeno 22.22.0**, con npm: è il requisito della versione di React Router nel lockfile. I Dockerfile usano Node.js **22.23.2**.
- Un server PostgreSQL avviato; la versione 17 è quella usata dalla configurazione Docker.
- Ollama installato e risorse sufficienti a eseguire il modello scelto.

Questa procedura esegue i componenti direttamente sul computer, senza richiedere Docker. Dopo aver clonato il repository con i comandi riportati sopra, lavora dalla radice `SmartQuote`.

### 1. Ambiente e PostgreSQL

Crea i file ambiente dagli esempi; esegui ciascuna copia solo se il relativo file `.env` non esiste già:

```bash
cp .env.example .env
cp Frontend/.env.example Frontend/.env
```

Configura `DJANGO_SECRET_KEY` e le variabili `DB_*` nel `.env` della radice. PostgreSQL deve avere un ruolo e un database corrispondenti. Per creare quelli chiamati `smartquote`, esegui i seguenti comandi da un account PostgreSQL autorizzato a creare ruoli e database:

```bash
createuser --login --pwprompt --createdb smartquote
createdb --owner=smartquote smartquote
```

Inserisci la password scelta in `DB_PASSWORD`. Adatta i nomi se hai modificato `DB_USER` e `DB_NAME`; se ruolo e database esistono già, non ricrearli. L’opzione `--createdb` consente al ruolo di creare anche il database temporaneo dei test Django.

Per la configurazione locale dell’esempio, PostgreSQL è raggiungibile su `127.0.0.1:5432` e `Frontend/.env` contiene `VITE_API_BASE_URL=http://127.0.0.1:8000/api`.

### 2. Ollama

Avvia Ollama tramite la sua applicazione oppure, in un terminale dedicato:

```bash
ollama serve
```

Con Ollama attivo, scarica il modello in un altro terminale:

```bash
ollama pull qwen2.5:14b-instruct
```

Il nome deve corrispondere a `OLLAMA_MODEL` nel `.env`; `OLLAMA_BASE_URL` nell’esempio è `http://127.0.0.1:11434`.

### 3. Backend

Dalla radice del repository:

```bash
cd Backend
uv sync --frozen
uv run manage.py migrate
uv run manage.py runserver 127.0.0.1:8000
```

`uv sync --frozen` installa le dipendenze da `uv.lock` nell’ambiente virtuale del backend. Django legge automaticamente il `.env` della radice.

### 4. Frontend

In un altro terminale, dalla radice del repository:

```bash
cd Frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Apri http://127.0.0.1:5173. `npm ci` usa `package-lock.json`; `--strictPort` evita che Vite scelga un’altra porta se la 5173 è occupata.

### 5. Processo dei promemoria

Per generare i promemoria anche quando il browser è chiuso, lascia in esecuzione questo comando in un ulteriore terminale, dalla cartella `Backend`:

```bash
uv run manage.py generate_quote_reminders --watch --interval 60
```

Senza `--watch` il comando esegue un solo controllo. Anche la richiesta dell’elenco notifiche genera i promemoria scaduti per l’utente corrente. In Docker il processo periodico è già avviato automaticamente.

## Configurazione delle variabili d’ambiente

Il backend legge **`.env` nella radice**; le variabili già presenti nell’ambiente del processo hanno precedenza. Vite legge **`Frontend/.env`** durante lo sviluppo locale. I file `.env` sono esclusi da Git; i modelli di configurazione sono [.env.example](.env.example) e [Frontend/.env.example](Frontend/.env.example).

Gli esempi sensibili nella tabella sono segnaposto da sostituire.

| Variabile | Descrizione | Esempio |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | Chiave segreta Django, obbligatoria e non vuota. | `change-me` |
| `DJANGO_DEBUG` | Debug Django; l’esempio abilita lo sviluppo, il default del codice è `False`. | `True` |
| `DJANGO_ALLOWED_HOSTS` | Host consentiti, separati da virgole, senza protocollo o porta. | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Origini frontend consentite, complete di protocollo e porta. | `http://localhost:5173,http://127.0.0.1:5173` |
| `DB_NAME` | Nome del database PostgreSQL. | `smartquote` |
| `DB_USER` | Ruolo PostgreSQL utilizzato da Django. | `smartquote` |
| `DB_PASSWORD` | Password del ruolo PostgreSQL. | `change-me` |
| `DB_HOST` | Host PostgreSQL per l’avvio locale; Compose imposta `127.0.0.1` nel container. | `127.0.0.1` |
| `DB_PORT` | Porta PostgreSQL locale; in Compose sceglie la porta pubblicata sul computer, mentre quella interna resta 5432. | `5432` |
| `OLLAMA_BASE_URL` | URL Ollama usato dal backend; Compose imposta l’indirizzo interno indicato nell’esempio. | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Modello AI; default del backend e dell’esempio. Obbligatorio per Compose. | `qwen2.5:14b-instruct` |
| `COMPOSE_REMOVE_ORPHANS` | Rimuove i container di servizi non più presenti nello stesso progetto Compose; non elimina i volumi. | `true` |
| `VITE_API_BASE_URL` | URL API del frontend locale, da impostare in `Frontend/.env`. Il build Docker usa `/api`. | `http://127.0.0.1:8000/api` |

Compose ricava `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD` dalle rispettive variabili `DB_NAME`, `DB_USER` e `DB_PASSWORD` per inizializzare PostgreSQL. Sovrascrive inoltre `DB_HOST`, `DB_PORT` e `OLLAMA_BASE_URL` con gli indirizzi interni al container.

Il Dockerfile imposta anche queste variabili per il processo Ollama; non occorre aggiungerle al `.env`:

| Variabile | Descrizione | Esempio |
| --- | --- | --- |
| `OLLAMA_HOST` | Indirizzo di ascolto di Ollama nel container. | `127.0.0.1:11434` |
| `OLLAMA_NO_CLOUD` | Disabilita le funzionalità cloud di Ollama nell’immagine completa. | `1` |

`COMPOSE_REMOVE_ORPHANS=true` è già nell’esempio e permette di rimuovere i vecchi servizi dopo il passaggio al container unico. Vedi la [documentazione Docker](https://docs.docker.com/compose/how-tos/environment-variables/envvars/#compose_remove_orphans).

Dopo una modifica al `.env`, riavvia i processi locali interessati oppure rilancia `docker compose up --build`. Le variabili Vite vengono lette all’avvio o durante la compilazione; il build Docker imposta `/api` direttamente nel Dockerfile e non richiede `Frontend/.env`.

## Ollama e funzionalità AI

Il modello predefinito è **`qwen2.5:14b-instruct`**. Il backend invia a Ollama una richiesta HTTP a `/api/generate` contenente nome e azienda del cliente, titolo, descrizioni delle voci, tempi di consegna e tono scelto. Il prompt richiede uno o due brevi paragrafi e lascia i dati economici alla visualizzazione dell’applicazione.

L’endpoint SmartQuote restituisce `generated_text`, senza salvarlo automaticamente. Nell’editor, i dati vengono salvati in bozza prima della generazione quando necessario; dopo aver controllato il risultato, occorre salvare la descrizione. La generazione è consentita solo per le bozze e non modifica quantità, prezzi o totali.

La richiesta non usa streaming e ha un timeout di 120 secondi. Errori di connessione, modello mancante, memoria insufficiente o risposta non valida vengono comunicati al frontend con HTTP 503. In caso di errore, l’editor mantiene la descrizione precedente. Per usare un altro modello, aggiorna `OLLAMA_MODEL`; in locale scaricalo con `ollama pull`, mentre Docker lo prepara all’avvio.

> Su Mac Apple Silicon, nell’avvio completamente Dockerizzato Ollama non può sfruttare direttamente l’accelerazione GPU Apple disponibile tramite l’esecuzione nativa su macOS. Per prestazioni AI migliori durante lo sviluppo, utilizza Ollama nativamente seguendo la procedura di avvio locale. [Riferimento Ollama](https://docs.ollama.com/faq#how-do-i-use-ollama-with-gpu-acceleration-in-docker).

## Flusso del preventivo

1. Registra un account e accedi; crea un cliente oppure aggiungilo dall’editor.
2. Compila titolo, voci e dati della proposta. Salva la bozza, genera eventualmente il testo AI e salva le modifiche dopo averlo rivisto.
3. Pubblica la bozza con il pulsante di generazione del link pubblico e condividi l’indirizzo `/q/<token>`.
4. Il cliente apre la pagina pubblica e conferma l’accettazione o il rifiuto. Il gestore riceve la relativa notifica.
5. Se la risposta non arriva entro il periodo configurato, il gestore riceve un promemoria e può preparare un sollecito.

| Stato API | Significato |
| --- | --- |
| `DRAFT` — Bozza | Modificabile e utilizzabile per la generazione AI; la pagina pubblica non è accessibile. |
| `SENT` — Inviato | Il link è stato pubblicato e la data di invio registrata. |
| `VIEWED` — Visualizzato | La prima consultazione dell’API pubblica registra la visualizzazione; anche l’apertura del link da parte del gestore produce questo passaggio. |
| `ACCEPTED` — Accettato | Il cliente ha confermato l’accettazione. |
| `REJECTED` — Rifiutato | Il cliente ha confermato il rifiuto. |

Il link pubblico consente la consultazione e la risposta a chi lo possiede, senza autenticazione del cliente. Solo le bozze possono essere modificate o rigenerate con AI. Dopo una risposta il preventivo resta consultabile, ma la decisione non può essere cambiata tramite le API pubbliche. L’eliminazione rende il link inutilizzabile.

La pubblicazione imposta `SENT`: **non certifica l’invio di un’email o di un messaggio WhatsApp**. I pulsanti aprono `mailto:` o WhatsApp con destinatario, testo e link già compilati; l’utente conferma l’invio nell’app scelta. I numeri nazionali usano il prefisso +39, mentre quelli con + o 00 conservano il prefisso internazionale. Se manca il contatto, il relativo pulsante indica il dato da aggiungere al cliente.

### Notifiche e promemoria

I promemoria sono attivi per default dopo **7 giorni** dalla pubblicazione. In Impostazioni puoi disattivarli oppure scegliere un intervallo intero da **1 a 365 giorni**. La soglia usa `sent_at` e si applica anche ai preventivi già inviati o visualizzati, purché ancora senza risposta.

Ogni preventivo genera **un solo promemoria**: leggere la notifica o cambiare l’intervallo non ne crea un altro. Disattivarli ferma le nuove notifiche e conserva lo storico. Una risposta segna il promemoria come letto e crea la notifica di accettazione o rifiuto. Il sollecito viene proposto al gestore; il messaggio al cliente viene inviato dall’app email o WhatsApp dopo la sua conferma.

La campanella mostra le ultime **50 notifiche**, conta tutte quelle non lette e permette di aprire il preventivo o segnare tutte come lette. Controlla gli aggiornamenti ogni **30 secondi** mentre la pagina è visibile, al ritorno nella finestra e all’apertura della campanella. Le novità rilevate durante l’uso producono un avviso nell’interfaccia. La generazione periodica continua a browser chiuso se il processo dei promemoria resta avviato; gli avvisi vengono visualizzati quando si usa l’applicazione.

## API principali

Le API private richiedono `Authorization: Token <token>`. Il frontend conserva il token in `localStorage` e verifica l’utente all’apertura della sessione. Il token UUID nel link pubblico è distinto dal token di autenticazione. Gli elenchi privati sono limitati ai dati dell’utente corrente.

Nella tabella `:id` indica l’identificativo numerico e `:token` il token UUID del preventivo.

| Metodo | Endpoint | Scopo | Autenticazione |
| --- | --- | --- | --- |
| POST | `/api/auth/register/` | Registrazione; restituisce utente e token. | Pubblica |
| POST | `/api/auth/login/` | Accesso; restituisce utente e token. | Pubblica |
| POST | `/api/auth/logout/` | Logout e invalidazione del token. | Token |
| GET, PATCH | `/api/auth/me/` | Profilo corrente; modifica email con `email` e `current_password`. | Token |
| POST | `/api/auth/change-password/` | Cambio con `current_password`, `new_password`, `confirm_password`; restituisce un nuovo token. | Token |
| GET, POST | `/api/customers/` | Elenco e creazione clienti. | Token |
| GET, PUT, PATCH, DELETE | `/api/customers/:id/` | Lettura, modifica ed eliminazione cliente. | Token |
| GET, POST | `/api/quotes/` | Elenco e creazione preventivi. | Token |
| GET, PUT, PATCH, DELETE | `/api/quotes/:id/` | Lettura, modifica della bozza ed eliminazione preventivo. | Token |
| POST | `/api/quotes/:id/generate-text/` | Testo AI per una bozza; `tone`: `professional`, `friendly`, `concise`, `commercial`. | Token |
| POST | `/api/quotes/:id/publish/` | Pubblicazione della bozza. | Token |
| GET | `/api/quotes/public/:token/` | Consultazione e registrazione della prima visualizzazione. | Pubblica, tramite UUID |
| POST | `/api/quotes/public/:token/accept/` | Accettazione di un preventivo inviato o visualizzato. | Pubblica, tramite UUID |
| POST | `/api/quotes/public/:token/reject/` | Rifiuto di un preventivo inviato o visualizzato. | Pubblica, tramite UUID |
| GET | `/api/notifications/` | Ultime 50 notifiche, conteggio non lette e recupero dei promemoria scaduti. | Token |
| GET, PATCH | `/api/notifications/settings/` | Preferenze personali: `enabled`, `after_days`. | Token |
| POST | `/api/notifications/:id/read/` | Segna la notifica come letta. | Token |
| POST | `/api/notifications/read-all/` | Segna tutte le notifiche dell’utente come lette. | Token |

Le pagine React sono `/` (dashboard), `/customers`, `/quotes` e `/settings`, protette dall’accesso; `/login`, `/register` e `/q/:token` sono pubbliche. Dopo la registrazione il frontend invita a effettuare l’accesso.

Ricerca, filtri, ordinamento, paginazione e statistiche della dashboard vengono calcolati nel frontend a partire dagli elenchi API di clienti e preventivi.

## Database

| Modello | Ruolo |
| --- | --- |
| `User` | Utente standard Django e credenziali di accesso. |
| `Token` | Token di autenticazione di Django REST Framework. |
| `Customer` | Anagrafica appartenente a un utente. |
| `Quote` | Preventivo collegato a un cliente, con stato, token pubblico e date del ciclo di vita. |
| `QuoteItem` | Voce del preventivo con descrizione, quantità e prezzo unitario. |
| `QuoteNotification` | Notifica per il proprietario, stato di lettura e riepilogo del cliente e della proposta. |
| `QuoteReminderSettings` | Preferenze dei promemoria, una configurazione per utente. |

L’eliminazione di un cliente elimina anche i suoi preventivi e le relative voci. Le notifiche conservano titolo e nome del cliente anche dopo l’eliminazione del preventivo; il collegamento alla proposta diventa nullo. Vincoli nel database consentono una sola notifica di promemoria e una sola di risposta per preventivo. Le risposte pubbliche e la generazione dei promemoria usano transazioni e blocchi delle righe per gestire richieste concorrenti.

## Test disponibili

Il backend contiene test per account, validazione clienti e preventivi, integrazione AI con risposte simulate, notifiche, promemoria e concorrenza su PostgreSQL. Dalla cartella `Backend`, con database disponibile e ruolo autorizzato a creare il database temporaneo dei test:

```bash
uv run manage.py check
uv run manage.py test
```

In alternativa, per eseguire i test backend nel container già avviato, dalla radice:

```bash
docker compose exec app python manage.py test --noinput
```

I test della supervisione dei processi si eseguono dalla radice, con Python locale:

```bash
python3 -m unittest discover -s docker/tests -v
```

Per il frontend sono disponibili lint e verifica della compilazione, dalla cartella `Frontend` dopo `npm ci`:

```bash
npm run lint
npm run build
```

Lo script `npm test` è definito, ma il repository attuale non contiene test frontend: non costituisce una verifica funzionale dell’interfaccia.

## Note tecniche utili

- **Configurazione di sviluppo:** il backend usa `runserver` Django anche in Docker. L’avvio documentato serve allo sviluppo e alla dimostrazione del progetto; non è una configurazione di distribuzione in produzione.
- **Persistenza PostgreSQL:** le credenziali di inizializzazione vengono applicate quando il volume del database è vuoto. Modificare `DB_NAME`, `DB_USER` o `DB_PASSWORD` nel `.env` non aggiorna automaticamente un database già inizializzato.
- **Accesso da altri dispositivi:** in Docker il frontend usa `/api` sullo stesso host grazie a Nginx; aggiungi il nome host o l’indirizzo IP del computer a `DJANGO_ALLOWED_HOSTS`. Nello sviluppo locale, adatta anche l’indirizzo di ascolto di Django e Vite, `VITE_API_BASE_URL` e `CORS_ALLOWED_ORIGINS`.
- **Statistiche:** la dashboard considera la data di creazione dei preventivi nel periodo selezionato. Il tasso di accettazione è il rapporto tra accettati e conclusi (accettati più rifiutati); il valore accettato è la somma dei preventivi accettati. Il conteggio dei clienti totali comprende l’intera anagrafica.
- **Problemi AI:** controlla URL, disponibilità di Ollama e presenza del modello configurato. Se la generazione supera il timeout o manca memoria, scegli un modello più leggero e aggiorna `OLLAMA_MODEL`.
- **Migrazioni:** Docker le applica a ogni avvio; nello sviluppo locale esegui `uv run manage.py migrate` dalla cartella `Backend` dopo gli aggiornamenti che includono migrazioni.
