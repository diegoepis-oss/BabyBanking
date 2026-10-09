const express = require('express');
const store = require('./store');
const { sendBackupEmail } = require('./mailer');
const { buildTransactionsCsv } = require('./csv');
const { getEnv } = require('./env');

const router = express.Router();

// Protegge gli endpoint usati dai Cron Job di Vercel: Vercel invia
// automaticamente questa intestazione con il valore di CRON_SECRET, così
// nessun altro può richiamare questi indirizzi dall'esterno.
function requireCronSecret(req, res, next) {
  const expected = `Bearer ${getEnv('CRON_SECRET')}`;
  if (req.headers.authorization !== expected) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }
  next();
}

router.get('/keepalive', requireCronSecret, async (req, res) => {
  try {
    await store.pingDatabase();
    res.json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/backup', requireCronSecret, async (req, res) => {
  try {
    const rows = await store.getAllTransactionsForBackup();
    const csv = buildTransactionsCsv(rows);
    const filename = `babybanking-backup-${new Date().toISOString().slice(0, 10)}.csv`;

    await sendBackupEmail({ to: getEnv('BACKUP_EMAIL_TO'), csvContent: csv, filename });

    res.json({ ok: true, sentAt: new Date().toISOString(), transactions: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
