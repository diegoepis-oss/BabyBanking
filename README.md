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

## Avvio (sul PC/Mac di casa)

Serve [Node.js](https://nodejs.org) installato (versione 18 o superiore).

```bash
npm install
npm start
```

L'app parte su `http://localhost:3000`. Per farla usare anche ai bambini da
tablet/telefono collegati alla stessa rete Wi-Fi di casa, trova l'indirizzo IP
del PC sulla rete locale (es. `192.168.1.23`) e apri da tablet/telefono:

```
http://192.168.1.23:3000
```

L'app resta raggiungibile finché il PC è acceso e il comando `npm start` è in
esecuzione.

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
server.js          -> avvio del server Express
src/store.js        -> lettura/scrittura dei dati (conti, transazioni, password)
src/routes.js        -> API usate dal frontend
public/              -> interfaccia grafica (HTML/CSS/JS, nessuna build richiesta)
scripts/set-pins.js  -> script da riga di comando per cambiare le password
```
