const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Manca la variabile d'ambiente ${name}. Configurala su Vercel (Settings -> Environment Variables) ` +
        `oppure nel file .env.local se stai lavorando in locale.`
    );
  }
  return value;
}

const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

function mapTransaction(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    date: row.date,
    balanceAfter: Number(row.balance_after),
    createdAt: row.created_at,
  };
}

function computeBalance(transactions) {
  return transactions.reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);
}

async function getAllTransactions(accountId) {
  const { data, error } = await supabase.from('transactions').select('*').eq('account_id', accountId);
  if (error) throw new Error(error.message);
  return data.map(mapTransaction);
}

async function getAccounts() {
  const { data: accounts, error } = await supabase.from('accounts').select('*').order('id');
  if (error) throw new Error(error.message);

  return Promise.all(
    accounts.map(async (acc) => ({
      ...acc,
      balance: computeBalance(await getAllTransactions(acc.id)),
    }))
  );
}

async function getAccount(accountId) {
  const { data: acc, error } = await supabase.from('accounts').select('*').eq('id', accountId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!acc) return null;

  return { ...acc, balance: computeBalance(await getAllTransactions(accountId)) };
}

async function getTransactions(accountId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('account_id', accountId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data.map(mapTransaction);
}

async function addTransaction({ accountId, type, amount, description, date }) {
  const account = await getAccount(accountId);
  if (!account) throw new Error('Conto non trovato');

  if (type === 'withdraw' && amount > account.balance) {
    throw new Error('Non ci sono abbastanza risparmi in questo salvadanaio');
  }

  const balanceAfter =
    type === 'deposit' ? account.balance + amount : account.balance - amount;

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      account_id: accountId,
      type,
      amount,
      description,
      date: date || new Date().toISOString(),
      balance_after: Math.round(balanceAfter * 100) / 100,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return mapTransaction(data);
}

async function deleteTransaction(accountId, transactionId) {
  const { error, count } = await supabase
    .from('transactions')
    .delete({ count: 'exact' })
    .eq('id', transactionId)
    .eq('account_id', accountId);
  if (error) throw new Error(error.message);
  if (!count) throw new Error('Movimento non trovato');

  await recomputeBalanceSnapshots(accountId);
}

async function recomputeBalanceSnapshots(accountId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('account_id', accountId)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  let running = 0;
  for (const row of data) {
    running += row.type === 'deposit' ? Number(row.amount) : -Number(row.amount);
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ balance_after: Math.round(running * 100) / 100 })
      .eq('id', row.id);
    if (updateError) throw new Error(updateError.message);
  }
}

const MONTH_NAMES_IT = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
];

async function getMonthlyStats(accountId, monthsBack = 6) {
  const transactions = await getAllTransactions(accountId);

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

async function getSettings() {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function verifyKidsPin(pin) {
  const settings = await getSettings();
  return Boolean(settings) && bcrypt.compareSync(String(pin), settings.kids_pin_hash);
}

async function verifyParentPin(pin) {
  const settings = await getSettings();
  return Boolean(settings) && bcrypt.compareSync(String(pin), settings.parent_pin_hash);
}

async function setPins({ kidsPin, parentPin }) {
  const update = {};
  if (kidsPin) update.kids_pin_hash = bcrypt.hashSync(String(kidsPin), 10);
  if (parentPin) update.parent_pin_hash = bcrypt.hashSync(String(parentPin), 10);
  if (Object.keys(update).length === 0) return;

  const { error } = await supabase.from('app_settings').update(update).eq('id', 1);
  if (error) throw new Error(error.message);
}

module.exports = {
  getAccounts,
  getAccount,
  getTransactions,
  getMonthlyStats,
  addTransaction,
  deleteTransaction,
  verifyKidsPin,
  verifyParentPin,
  setPins,
};
