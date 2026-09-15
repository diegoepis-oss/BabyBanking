require('dotenv').config({ path: '.env.local' });

const readline = require('readline');
const store = require('../src/store');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function isValidPin(pin) {
  return /^\d{4,8}$/.test(pin);
}

(async () => {
  console.log('=== Cambio password di BabyBanking ===');
  console.log('Le password devono avere da 4 a 8 numeri.\n');

  let kidsPin = await ask('Nuova password per i bambini (lascia vuoto per non cambiarla): ');
  if (kidsPin && !isValidPin(kidsPin)) {
    console.log('Password non valida, deve contenere solo numeri (4-8 cifre). Nessuna modifica salvata.');
    kidsPin = '';
  }

  let parentPin = await ask('Nuova password dei genitori (lascia vuoto per non cambiarla): ');
  if (parentPin && !isValidPin(parentPin)) {
    console.log('Password non valida, deve contenere solo numeri (4-8 cifre). Nessuna modifica salvata.');
    parentPin = '';
  }

  if (!kidsPin && !parentPin) {
    console.log('\nNessuna password aggiornata.');
    rl.close();
    return;
  }

  try {
    await store.setPins({ kidsPin: kidsPin || undefined, parentPin: parentPin || undefined });
    console.log('\nFatto! Le password sono state aggiornate.');
  } catch (err) {
    console.log('\nErrore nel salvare le password:', err.message);
  }
  rl.close();
})();
