const express = require('express');
const store = require('./store');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Errore del server, riprova tra poco' });
    });
  };
}

function requireLogin(req, res, next) {
  if (!req.loggedIn) {
    return res.status(401).json({ error: 'Devi prima entrare con la password di casa' });
  }
  next();
}

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { pin } = req.body;
    if (!pin || !(await store.verifyKidsPin(pin))) {
      return res.status(401).json({ error: 'Password sbagliata, riprova!' });
    }
    req.login();
    res.json({ ok: true });
  })
);

router.post('/logout', (req, res) => {
  req.logout();
  res.json({ ok: true });
});

router.get('/session', (req, res) => {
  res.json({ loggedIn: Boolean(req.loggedIn) });
});

router.get(
  '/accounts',
  requireLogin,
  asyncHandler(async (req, res) => {
    res.json(await store.getAccounts());
  })
);

router.get(
  '/accounts/:id',
  requireLogin,
  asyncHandler(async (req, res) => {
    const account = await store.getAccount(req.params.id);
    if (!account) return res.status(404).json({ error: 'Salvadanaio non trovato' });
    res.json(account);
  })
);

router.get(
  '/accounts/:id/transactions',
  requireLogin,
  asyncHandler(async (req, res) => {
    const account = await store.getAccount(req.params.id);
    if (!account) return res.status(404).json({ error: 'Salvadanaio non trovato' });
    res.json(await store.getTransactions(req.params.id));
  })
);

router.get(
  '/accounts/:id/stats',
  requireLogin,
  asyncHandler(async (req, res) => {
    const account = await store.getAccount(req.params.id);
    if (!account) return res.status(404).json({ error: 'Salvadanaio non trovato' });
    res.json(await store.getMonthlyStats(req.params.id, 6));
  })
);

router.post(
  '/accounts/:id/transactions',
  requireLogin,
  asyncHandler(async (req, res) => {
    const { type, amount, description, date, parentPin } = req.body;

    if (!(await store.verifyParentPin(parentPin))) {
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

    const account = await store.getAccount(req.params.id);
    if (!account) return res.status(404).json({ error: 'Salvadanaio non trovato' });

    try {
      const transaction = await store.addTransaction({
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
  })
);

router.delete(
  '/accounts/:id/transactions/:transactionId',
  requireLogin,
  asyncHandler(async (req, res) => {
    const { parentPin } = req.body;

    if (!(await store.verifyParentPin(parentPin))) {
      return res.status(403).json({ error: 'Password dei genitori sbagliata' });
    }

    const account = await store.getAccount(req.params.id);
    if (!account) return res.status(404).json({ error: 'Salvadanaio non trovato' });

    try {
      await store.deleteTransaction(req.params.id, req.params.transactionId);
      res.json({ ok: true });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  })
);

module.exports = router;
