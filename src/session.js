const crypto = require('crypto');
const cookie = require('cookie');

const COOKIE_NAME = 'bb_session';
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 giorni

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Manca la variabile d'ambiente SESSION_SECRET. Configurala su Vercel (Settings -> Environment " +
        'Variables) oppure nel file .env.local se stai lavorando in locale.'
    );
  }
  return secret;
}

function sign(payloadB64) {
  return crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
}

function createToken() {
  const payload = { exp: Date.now() + MAX_AGE_SECONDS * 1000 };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

function verifyToken(token) {
  if (!token) return false;
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return false;

  const expected = Buffer.from(sign(payloadB64));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
    path: '/',
  };
}

function sessionMiddleware(req, res, next) {
  const cookies = cookie.parse(req.headers.cookie || '');
  req.loggedIn = verifyToken(cookies[COOKIE_NAME]);

  req.login = () => {
    res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, createToken(), cookieOptions(MAX_AGE_SECONDS)));
  };

  req.logout = () => {
    res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '', cookieOptions(0)));
  };

  next();
}

module.exports = { sessionMiddleware };
