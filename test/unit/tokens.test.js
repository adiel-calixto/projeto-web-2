import { describe, expect, test } from '@jest/globals';
import {
  generateOpaqueToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from '../../src/auth/tokens.js';

const secret = 'segredo-de-teste-com-pelo-menos-32-caracteres';

function unsignedToken(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
}

describe('access token', () => {
  test('assina e verifica o token com o usuário no subject', () => {
    const token = signAccessToken({ id: '123' }, { secret });
    const payload = verifyAccessToken(token, secret);

    expect(payload.sub).toBe('123');
    expect(payload.iss).toBe('psw2-api');
  });

  test('recusa token expirado', () => {
    const token = signAccessToken({ id: '123' }, { secret, expiresIn: -1 });

    expect(() => verifyAccessToken(token, secret)).toThrow(
      expect.objectContaining({ name: 'TokenExpiredError' }),
    );
  });

  test('recusa assinatura adulterada', () => {
    const token = signAccessToken({ id: '123' }, { secret });
    const lastCharacter = token.at(-1);
    const tampered = `${token.slice(0, -1)}${lastCharacter === 'a' ? 'b' : 'a'}`;

    expect(() => verifyAccessToken(tampered, secret)).toThrow(
      expect.objectContaining({ name: 'JsonWebTokenError' }),
    );
  });

  test('recusa token sem assinatura (alg none)', () => {
    const token = unsignedToken({
      sub: '123',
      iss: 'psw2-api',
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    expect(() => verifyAccessToken(token, secret)).toThrow(
      expect.objectContaining({ name: 'JsonWebTokenError' }),
    );
  });

  test('recusa token assinado com outro segredo', () => {
    const token = signAccessToken({ id: '123' }, { secret });

    expect(() => verifyAccessToken(token, `${secret}-outro`)).toThrow();
  });
});

describe('tokens opacos', () => {
  test('gera um valor aleatório e o hash SHA-256 correspondente', () => {
    const { token, hash } = generateOpaqueToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toBe(token);
  });

  test('gera valores diferentes a cada chamada', () => {
    expect(generateOpaqueToken().token).not.toBe(generateOpaqueToken().token);
  });

  test('hashToken é determinístico', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });
});
