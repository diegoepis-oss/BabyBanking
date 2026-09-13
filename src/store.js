const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const DEFAULT_KIDS_PIN = '1234';
const DEFAULT_PARENT_PIN = '2026';

function defaultData() {
  return {
    settings: {
      kidsPinHash: bcrypt.hashSync(DEFAULT_KIDS_PIN, 10),
      parentPinHash: bcrypt.hashSync(DEFAULT_PARENT_PIN, 10),
    },
    accounts: [
      { id: 'arturo', name: 'Arturo', avatar: '🦁', color: '#3B82F6' },
      { id: 'santiago', name: 'Santiago', avatar: '🐯', color: '#F97316' },
      { id: 'sofia', name: 'Sofia', avatar: '🦄', color: '#EC4899' },
    ],
    transactions: [],
  };
}

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    writeDb(defaultData());
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeDb(data) {
  const tmpPath = DB_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

function getAccounts() {
  const db = readDb();
  return db.accounts.map((acc) => ({
    ...acc,
    balance: computeBalance(db, acc.id),
  }));
}

function getAccount(accountId) {
  const db = readDb();
  const acc = db.accounts.find((a) => a.id === accountId);
  if (!acc) return null;
  return { ...acc, balance: computeBalance(db, acc.id) };
}

function computeBalance(db, accountId) {
  return db.transactions
    .filter((t) => t.accountId === accountId)
    .reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);
}

function getTransactions(accountId) {
  const db = readDb();
  return db.transactions
    .filter((t) => t.accountId === accountId)
    .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id));
}

function addTransaction({ accountId, type, amount, description, date }) {
  const db = readDb();
  const acc = db.accounts.find((a) => a.id === accountId);
  if (!acc) throw new Error('Conto non trovato');

  const currentBalance = computeBalance(db, accountId);
  if (type === 'withdraw' && amount > currentBalance) {
    throw new Error('Non ci sono abbastanza risparmi in questo salvadanaio');
  }

  const balanceAfter =
    type === 'deposit' ? currentBalance + amount : currentBalance - amount;

  const transaction = {
    id: crypto.randomUUID(),
    accountId,
    type,
    amount,
    description,
    date: date || new Date().toISOString(),
    balanceAfter,
    createdAt: new Date().toISOString(),
  };

  db.transactions.push(transaction);
  writeDb(db);
  return transaction;
}

const MONTH_NAMES_IT = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
];

function getMonthlyStats(accountId, monthsBack = 6) {
  const db = readDb();
  const transactions = db.transactions.filter((t) => t.accountId === accountId);

  const now = new Date();
  const months = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }

  const rangeStart = months[0];
  let runningBalance = transactions
    .filter((t) => new Date(t.date) < rangeStart)
    .reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);

  return months.map((monthStart) => {
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const monthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= monthStart && d < monthEnd;
    });

    const deposits = monthTx
      .filter((t) => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);
    const withdrawals = monthTx
      .filter((t) => t.type === 'withdraw')
      .reduce((sum, t) => sum + t.amount, 0);
    const net = Math.round((deposits - withdrawals) * 100) / 100;

    runningBalance = Math.round((runningBalance + net) * 100) / 100;

    return {
      label: `${MONTH_NAMES_IT[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
      deposits: Math.round(deposits * 100) / 100,
      withdrawals: Math.round(withdrawals * 100) / 100,
      net,
      balanceAtEnd: runningBalance,
    };
  });
}

function verifyKidsPin(pin) {
  const db = readDb();
  return bcrypt.compareSync(String(pin), db.settings.kidsPinHash);
}

function verifyParentPin(pin) {
  const db = readDb();
  return bcrypt.compareSync(String(pin), db.settings.parentPinHash);
}

function setPins({ kidsPin, parentPin }) {
  const db = readDb();
  if (kidsPin) db.settings.kidsPinHash = bcrypt.hashSync(String(kidsPin), 10);
  if (parentPin) db.settings.parentPinHash = bcrypt.hashSync(String(parentPin), 10);
  writeDb(db);
}

module.exports = {
  getAccounts,
  getAccount,
  getTransactions,
  getMonthlyStats,
  addTransaction,
  verifyKidsPin,
  verifyParentPin,
  setPins,
};
