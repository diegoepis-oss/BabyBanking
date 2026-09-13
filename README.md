# 🏦 BabyBanking — La Banca di Casa

Piccola app per gestire il "libretto di risparmio" di Arturo, Santiago e Sofia:
tre salvadanai separati, depositi e prelievi, con lo storico completo di ogni
movimento (data + descrizione).

## Come funziona

- **Password di casa** (facile, la conoscono anche i bambini): serve per
  entrare nell'app e vedere i saldi e lo storico.
- **Password dei genitori**: serve in più, solo per confermare un deposito o
  un prelievo. I bambini possono guardare, ma non spostare soldi da soli.
- Ogni movimento salva automaticamente **data, importo e descrizione**, così
  si ricorda sempre "cosa" e "quando".

Password di partenza (**cambiale subito**, vedi sotto):

- Password di casa: `1234`
- Password dei genitori: `2026`

## Avvio su Mac (per fare le prove)

Serve [Node.js](https://nodejs.org) installato (versione 18 o superiore).

```bash
npm install
npm start
```

L'app parte su `http://localhost:3000`. Apri quell'indirizzo dal browser del
Mac per provarla.

## Avvio su Windows (il PC di casa dove resterà attiva)

Passaggi completi, uno alla volta:

1. **Installa Node.js.** Vai su [nodejs.org](https://nodejs.org), scarica la
   versione **LTS** per Windows (il file `.msi`) e installala facendo doppio
   clic, lasciando tutte le opzioni di default. Per verificare che sia
   installato, apri il **Prompt dei comandi** (cerca "cmd" nel menu Start) e
   digita:
   ```
   node -v
   npm -v
   ```
   Se rispondono con un numero di versione, è tutto ok.

2. **Copia la cartella del progetto sul PC Windows.** Il modo più semplice se
   hai già fatto le prove sul Mac e vuoi portarti dietro anche lo storico dei
   risparmi già inserito: copia l'intera cartella `BabyBanking` (comprese le
   sottocartelle) su una chiavetta USB o tramite un servizio cloud, e
   incollala sul PC Windows, ad esempio dentro `Documenti`.

   In alternativa, se il progetto è su GitHub e preferisci scaricarlo da lì,
   su Windows serve anche [Git](https://git-scm.com/download/win); poi da
   Prompt dei comandi:
   ```
   cd Documenti
   git clone <url-del-repository>
   ```
   In questo caso però **non** verrà copiato il file `data/db.json` (non
   viene salvato su Git di proposito, perché contiene i dati di famiglia): le
   password torneranno a quelle di default e lo storico ripartirà da zero, va
   quindi rifatto il passaggio "cambia le password" più sotto.

3. **Apri il Prompt dei comandi nella cartella del progetto.** Apri la
   cartella `BabyBanking` in Esplora File, poi nella barra dell'indirizzo in
   alto scrivi `cmd` e premi Invio: si aprirà il Prompt dei comandi già
   posizionato in quella cartella.

4. **Installa le dipendenze** (solo la prima volta):
   ```
   npm install
   ```

5. **Avvia l'app:**
   ```
   npm start
   ```
   Vedrai scritto `BabyBanking pronta! Apri http://localhost:3000 ...`.
   Lascia questa finestra del Prompt dei comandi aperta: se la chiudi, l'app
   si ferma. Prova ad aprire `http://localhost:3000` dal browser dello stesso
   PC per controllare che funzioni.

6. **La prima volta, Windows potrebbe chiedere il permesso di rete** ("Windows
   Defender Firewall ha bloccato alcune funzionalità di questa app" o simile,
   riferito a Node.js). Spunta almeno la casella **Reti private** e clicca
   **Consenti l'accesso**: serve per far arrivare i tablet dei bambini
   all'app tramite il Wi-Fi di casa.

7. **Trova l'indirizzo IP del PC sulla rete di casa.** Sempre da Prompt dei
   comandi digita:
   ```
   ipconfig
   ```
   Cerca la riga **Indirizzo IPv4** sotto la scheda di rete che stai usando
   (Wi-Fi o Ethernet), es. `192.168.1.23`.

8. **Da tablet o telefono dei bambini**, collegati alla stessa rete Wi-Fi di
   casa e apri nel browser:
   ```
   http://192.168.1.23:3000
   ```
   (sostituendo con l'indirizzo trovato al passaggio 7).

L'app resta raggiungibile finché il PC Windows è acceso e la finestra con
`npm start` è aperta. Per comodità il progetto include già un file
`avvia-babybanking.bat`: dopo il primo `npm install`, per le volte successive
basta farci doppio clic per avviare l'app senza riaprire il Prompt dei
comandi e riscrivere i comandi ogni volta.

## Cambiare le password

Non appena l'app funziona, cambia le password di default con:

```bash
npm run set-pins
```

Ti verrà chiesto di digitare la nuova password di casa e quella dei genitori
(solo numeri, da 4 a 8 cifre). Le password non vengono mai salvate in chiaro:
sono conservate cifrate (hash) nel file `data/db.json`.

## Dati salvati

Tutti i conti e i movimenti sono salvati nel file `data/db.json`, che viene
creato automaticamente al primo avvio. Questo file **non va condiviso** né
caricato online: contiene lo storico delle transazioni di famiglia. Fai un
backup di tanto in tanto copiando semplicemente questo file altrove.

## Struttura del progetto

```
server.js               -> avvio del server Express
src/store.js             -> lettura/scrittura dei dati (conti, transazioni, password)
src/routes.js             -> API usate dal frontend
public/                   -> interfaccia grafica (HTML/CSS/JS, nessuna build richiesta)
scripts/set-pins.js       -> script da riga di comando per cambiare le password
avvia-babybanking.bat     -> avvio rapido su Windows con doppio clic
```
