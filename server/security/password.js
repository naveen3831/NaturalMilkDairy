const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

function generateTemporaryPassword() {
  return crypto.randomBytes(18).toString('base64url');
}

async function verifyPassword(password, storedPassword) {
  if (typeof password !== 'string' || typeof storedPassword !== 'string' || !storedPassword) {
    return { valid: false, needsRehash: false };
  }

  if (!storedPassword.startsWith('scrypt$')) {
    const candidate = Buffer.from(password);
    const stored = Buffer.from(storedPassword);
    const valid = candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
    return { valid, needsRehash: valid };
  }

  const [, salt, encodedHash, ...extra] = storedPassword.split('$');
  if (
    extra.length > 0 ||
    !/^[a-f0-9]{32}$/i.test(salt || '') ||
    !/^[a-f0-9]{128}$/i.test(encodedHash || '')
  ) {
    return { valid: false, needsRehash: false };
  }

  const expected = Buffer.from(encodedHash, 'hex');
  const actual = await scrypt(password, salt, KEY_LENGTH);
  return {
    valid: crypto.timingSafeEqual(actual, expected),
    needsRehash: false,
  };
}

module.exports = { hashPassword, generateTemporaryPassword, verifyPassword };
