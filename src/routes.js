const express = require('express');
const store = require('./store');

const router = express.Router();

function requireLogin(req, res, next) {
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: 'Devi prima entrare con la password di casa' });
  }
  next();
}

router.post('/login', (req, res) => {
  const { pin } = req.body;
  if (!pin || !store.verifyKidsPin(pin)) {
    return res.status(401).json({ error: 'Password sbagliata, riprova!' });
  }
  req.session.loggedIn = true;
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/session', (req, res) => {
  res.json({ loggedIn: Boolean(req.session.loggedIn) });
});

router.get('/accounts', requireLogin, (req, res) => {
  res.json(store.getAccounts());
});

router.get('/accounts/:id', requireLogin, (req, res) => {
  const account = store.getAccount(req.params.id);
  if (!account) return res.status(404).json({ error: 'Salvadanaio non trovato' });
  res.json(account);
});

router.get('/accounts/:id/transactions', requireLogin, (req, res) => {
  const account = store.getAccount(req.params.id);
  if (!account) return res.status(404).json({ error: 'Salvadanaio non trovato' });
  res.json(store.getTransactions(req.params.id));
});

router.post('/accounts/:id/transactions', requireLogin, (req, res) => {
  const { type, amount, description, date, parentPin } = req.body;

  if (!store.verifyParentPin(parentPin)) {
    return res.status(403).json({ error: 'Password dei genitori sbagliata' });
  }

  if (type !== 'deposit' && type !== 'withdraw') {
    return res.status(400).json({ error: 'Tipo di operazione non valido' });
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Inserisci un importo valido' });
  }

  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Scrivi una descrizione per ricordarti cosa hai fatto' });
  }

  const account = store.getAccount(req.params.id);
  if (!account) return res.status(404).json({ error: 'Salvadanaio non trovato' });

  try {
    const transaction = store.addTransaction({
      accountId: req.params.id,
      type,
      amount: Math.round(numericAmount * 100) / 100,
      description: description.trim(),
      date,
    });
    res.json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
