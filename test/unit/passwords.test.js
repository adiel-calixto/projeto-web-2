import { describe, expect, test } from '@jest/globals';
import { hashPassword, verifyPassword } from '../../src/auth/passwords.js';

describe('senhas', () => {
  test('gera um hash diferente da senha', async () => {
    const hash = await hashPassword('senha-forte-123');

    expect(hash).not.toBe('senha-forte-123');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  test('verifica a senha correta e recusa a incorreta', async () => {
    const hash = await hashPassword('senha-forte-123');

    await expect(verifyPassword('senha-forte-123', hash)).resolves.toBe(true);
    await expect(verifyPassword('senha-errada', hash)).resolves.toBe(false);
  });
});
