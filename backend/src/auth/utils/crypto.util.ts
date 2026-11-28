import * as crypto from 'crypto';

/**
 * Genuine cryptographic password hashing using PBKDF2 with SHA-512, 100,000 iterations.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`pbkdf2$100000$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Genuine cryptographic password verification using timingSafeEqual to prevent timing attacks.
 */
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const key = parts[3];
    return new Promise((resolve) => {
      crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (err, derivedKey) => {
        if (err) return resolve(false);
        const keyBuffer = Buffer.from(key, 'hex');
        if (keyBuffer.length !== derivedKey.length) return resolve(false);
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      });
    });
  }

  // Fallback for sha256
  const hashed = crypto.createHash('sha256').update(password).digest('hex');
  return hashed === storedHash;
}

export const bcrypt = {
  hash: hashPassword,
  compare: comparePassword,
};
