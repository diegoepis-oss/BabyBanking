# 🏦 BabyBanking — La Banca di Casa

App online per gestire il "libretto di risparmio" di Arturo, Santiago e Sofia:
tre salvadanai separati, depositi e prelievi, con lo storico completo di ogni
movimento (data + descrizione). Gira su **Vercel** (ospita le pagine e la
logica dell'app) e **Supabase** (il database dove sono salvati conti e
movimenti) — entrambi gratuiti per un uso come questo.

## Come funziona

- **Password di casa** (facile, la conoscono anche i bambini): serve per
  entrare nell'app e vedere i saldi e lo storico.
- **Password dei genitori**: serve in più, solo per confermare un deposito,
  un prelievo o la cancellazione di un movimento. I bambini possono guardare,
  ma non spostare soldi da soli.
- Ogni movimento salva automaticamente **data, importo e descrizione**, così
  si ricorda sempre "cosa" e "quando".

Password di partenza (**cambiale subito dopo il primo deploy**, vedi sotto):

- Password di casa: `1234`
- Password dei genitori: `2026`

## Come è fatta l'app (in breve)

- `public/` — le pagine che vedono Arturo, Santiago e Sofia (HTML/CSS/JS, le
  stesse di sempre, nessuna build richiesta).
- `api/` + `src/` — la logica del server (login, depositi, prelievi,
  statistiche): su Vercel diventa automaticamente una funzione "serverless"
  che gira solo quando serve.
- `supabase/schema.sql` — la struttura del database da creare una volta sola
  su Supabase.

## Passo 1 — Crea il progetto Supabase (il database)

1. Vai su [supabase.com](https://supabase.com) e crea un account gratuito
   (puoi accedere anche con GitHub o Google).
2. Clicca **New project**. Scegli un nome (es. `babybanking`), una password
   per il database (salvala da parte, ma non ti servirà nell'uso quotidiano)
   e una regione vicina a te (es. Frankfurt/EU). Piano **Free**.
3. Aspetta un paio di minuti che il progetto venga creato.
4. Nel menu a sinistra vai su **SQL Editor**, clicca **New query**, apri il
   file `supabase/schema.sql` di questo progetto, copia **tutto** il
   contenuto, incollalo nell'editor e clicca **Run**. Questo crea le tabelle
   per conti, movimenti e password, e inserisce i tre conti (Arturo,
   Santiago, Sofia) con le password di partenza già pronte.
5. Vai su **Project Settings** (icona ingranaggio) → **Data API** e copia il
   **Project URL** (es. `https://xxxxx.supabase.co`).
6. Sempre in **Project Settings**, vai su **API Keys** e copia la chiave
   **service_role** (non la `anon`/`public`!). È una chiave segreta con
   accesso completo al database: **non condividerla né pubblicarla mai**,
   andrà solo nelle variabili d'ambiente di Vercel (passo 3).

## Passo 2 — Metti il codice su GitHub

Se il progetto è già su GitHub (come questo repository) puoi saltare questo
passo. Altrimenti crea un repository su [github.com](https://github.com) e
caricaci questo codice.

## Passo 3 — Crea il progetto Vercel (dove gira l'app)

1. Vai su [vercel.com](https://vercel.com) e crea un account gratuito
   collegandoti con GitHub (così Vercel vede subito i tuoi repository).
2. Clicca **Add New** → **Project**, e scegli il repository di BabyBanking
   dalla lista.
3. Nella schermata di configurazione, apri **Environment Variables** e
   aggiungi queste tre variabili (i valori di `SUPABASE_URL` e
   `SUPABASE_SERVICE_ROLE_KEY` sono quelli copiati al Passo 1):

   | Nome                          | Valore                                    |
   | ----------------------------- | ------------------------------------------ |
   | `SUPABASE_URL`                | il Project URL di Supabase                 |
   | `SUPABASE_SERVICE_ROLE_KEY`   | la chiave service_role di Supabase         |
   | `SESSION_SECRET`              | una stringa lunga e casuale (vedi sotto)   |

   Per generare `SESSION_SECRET`, apri un terminale (su Mac: app
   "Terminale") e lancia:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   e incolla il risultato come valore. Se non hai Node.js a portata di mano,
   va bene anche una password lunga e casuale generata da un gestore di
   password: l'importante è che sia lunga (almeno 32 caratteri) e che tu non
   la condivida.

4. Clicca **Deploy**. Dopo un minuto circa Vercel ti darà un indirizzo tipo
   `https://babybanking-tuonome.vercel.app`: è l'app, online, raggiungibile
   da qualunque dispositivo connesso a internet (non solo a casa).

## Passo 4 — Cambia le password di partenza

Non appena l'app è online, cambia subito le password di default. Il modo più
semplice è farlo in locale (una volta), collegandoti allo stesso database:

1. Nella cartella del progetto sul tuo computer, copia `.env.example` in un
   nuovo file chiamato `.env.local` e incolla gli stessi valori di
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SESSION_SECRET` usati su
   Vercel.
2. Esegui:
   ```bash
   npm install
   npm run set-pins
   ```
3. Digita la nuova password di casa e quella dei genitori (solo numeri, da 4
   a 8 cifre). Vengono salvate cifrate (hash) nel database, mai in chiaro.

Da quel momento le nuove password valgono subito sull'app online, senza
bisogno di un nuovo deploy.

## Provare le modifiche in locale prima di pubblicarle

Con `.env.local` configurato come sopra (Passo 4.1), puoi lanciare l'app sul
tuo computer collegata allo stesso database di Supabase:

```bash
npm install
npm start
```

L'app parte su `http://localhost:3000`. Ogni modifica fatta in locale (un
deposito di prova, ecc.) è vera e visibile anche sull'app online, perché
condividono lo stesso database: usa questa modalità solo per test rapidi, o
crea un secondo progetto Supabase "di prova" se vuoi sperimentare senza
toccare i dati veri.

## Aggiornare l'app online dopo una modifica al codice

Basta fare push delle modifiche sul branch collegato a Vercel (di solito
`main`): Vercel rifà automaticamente il deploy in un minuto o due, senza
altri passaggi.

## Dati salvati

Conti e movimenti vivono nel database Supabase (non più in un file locale).
Supabase fa già backup automatici sul piano gratuito, ma se vuoi un'ulteriore
copia di sicurezza puoi esportare le tabelle da **Table Editor** → menu dei
tre puntini → **Export data** in formato CSV, di tanto in tanto.

## Struttura del progetto

```
api/index.js          -> punto di ingresso per Vercel (funzione serverless)
server.js              -> avvio del server in locale, per sviluppo/test
src/app.js              -> app Express condivisa da locale e Vercel
src/store.js             -> lettura/scrittura dati su Supabase
src/session.js            -> login "senza server acceso 24/7" (cookie firmato)
src/routes.js              -> API usate dal frontend
public/                     -> interfaccia grafica (HTML/CSS/JS)
supabase/schema.sql          -> struttura del database da eseguire su Supabase
scripts/set-pins.js           -> script da riga di comando per cambiare le password
vercel.json                    -> configurazione del deploy su Vercel
```
