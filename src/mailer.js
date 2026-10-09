const nodemailer = require('nodemailer');
const { getEnv } = require('./env');

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: getEnv('GMAIL_USER'),
      pass: getEnv('GMAIL_APP_PASSWORD'),
    },
  });
}

async function sendBackupEmail({ to, csvContent, filename }) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject: `Backup BabyBanking - ${new Date().toLocaleDateString('it-IT')}`,
    text: 'In allegato lo storico di tutte le transazioni di BabyBanking, aggiornato a oggi.',
    attachments: [{ filename, content: csvContent }],
  });
}

module.exports = { sendBackupEmail };
