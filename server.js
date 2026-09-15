require('dotenv').config({ path: '.env.local' });

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`BabyBanking pronta! Apri http://localhost:${PORT}`);
});
