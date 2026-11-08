import { describe, expect, test } from '@jest/globals';
import { verificationEmail } from '../../src/mail/templates.js';

describe('verificationEmail', () => {
  test('monta o assunto, o texto e o HTML com o link', () => {
    const message = verificationEmail({
      name: 'Ana',
      link: 'http://localhost:3000/auth/verificar-email?token=abc',
    });

    expect(message.subject).toBe('Confirme seu e-mail');
    expect(message.text).toContain('Olá, Ana!');
    expect(message.text).toContain('http://localhost:3000/auth/verificar-email?token=abc');
    expect(message.html).toContain('Olá, Ana!');
    expect(message.html).toContain('href="http://localhost:3000/auth/verificar-email?token=abc"');
  });

  test('escapa o nome no HTML para evitar injeção', () => {
    const message = verificationEmail({
      name: '<script>alert("x")</script>',
      link: 'http://localhost:3000/verificar',
    });

    expect(message.text).toContain('<script>alert("x")</script>');
    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.html).toContain('&quot;x&quot;');
  });
});
