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

module.exports = { getEnv };
