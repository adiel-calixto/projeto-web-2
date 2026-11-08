import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';

const ISSUER = 'psw2-api';

export function signAccessToken(user, { secret, expiresIn = '15m' }) {
  return jwt.sign(
    {},
    secret,
    {
      algorithm: 'HS256',
      subject: String(user.id ?? user._id),
      issuer: ISSUER,
      expiresIn,
    },
  );
}

export function verifyAccessToken(token, secret) {
  return jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: ISSUER,
  });
}

export function generateOpaqueToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export const hashToken = (token) => createHash('sha256').update(token).digest('hex');
