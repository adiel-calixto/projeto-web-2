import { describe, expect, test } from '@jest/globals';
import { loadConfig } from '../../src/config.js';

const baseEnv = {
  JWT_SECRET: 'a'.repeat(32),
  S3_BUCKET: 'bucket-de-teste',
  AWS_REGION: 'sa-east-1',
  S3_PUBLIC_BASE_URL: 'https://bucket-de-teste.s3.sa-east-1.amazonaws.com/',
};

describe('loadConfig', () => {
  test('carrega os valores obrigatórios e aplica os padrões', () => {
    expect(loadConfig(baseEnv)).toEqual({
      jwt: { secret: 'a'.repeat(32), accessExpiresIn: '15m' },
      refreshTtlDays: 7,
      emailVerificationTtlHours: 24,
      appBaseUrl: 'http://localhost:3000',
      smtp: {
        host: '',
        port: 587,
        user: '',
        pass: '',
        from: 'Catálogo de jogos <nao-responda@exemplo.com>',
      },
      s3: {
        bucket: 'bucket-de-teste',
        region: 'sa-east-1',
        publicBaseUrl: 'https://bucket-de-teste.s3.sa-east-1.amazonaws.com',
        endpoint: null,
        forcePathStyle: false,
      },
    });
  });

  test('rejeita JWT_SECRET ausente ou curto', () => {
    expect(() => loadConfig({ ...baseEnv, JWT_SECRET: '' }))
      .toThrow('A variável de ambiente JWT_SECRET é obrigatória.');
    expect(() => loadConfig({ ...baseEnv, JWT_SECRET: 'curto' }))
      .toThrow('A variável de ambiente JWT_SECRET deve ter pelo menos 32 caracteres.');
  });

  test.each(['S3_BUCKET', 'AWS_REGION', 'S3_PUBLIC_BASE_URL'])(
    'rejeita %s ausente',
    (name) => {
      expect(() => loadConfig({ ...baseEnv, [name]: '' }))
        .toThrow(`A variável de ambiente ${name} é obrigatória.`);
    },
  );

  test('rejeita números inválidos', () => {
    expect(() => loadConfig({ ...baseEnv, PORT: 'abc' }))
      .toThrow('A variável de ambiente PORT deve ser um número positivo.');
    expect(() => loadConfig({ ...baseEnv, REFRESH_TOKEN_TTL_DAYS: '0' }))
      .toThrow('A variável de ambiente REFRESH_TOKEN_TTL_DAYS deve ser um número positivo.');
  });

  test('lê as opções do SMTP e do S3', () => {
    const config = loadConfig({
      ...baseEnv,
      PORT: '4000',
      APP_BASE_URL: 'https://api.exemplo.com/',
      JWT_ACCESS_EXPIRES_IN: '30m',
      REFRESH_TOKEN_TTL_DAYS: '10',
      EMAIL_VERIFICATION_TTL_HOURS: '48',
      SMTP_HOST: 'smtp.exemplo.com',
      SMTP_PORT: '465',
      SMTP_USER: 'usuario',
      SMTP_PASS: 'senha',
      MAIL_FROM: 'App <app@exemplo.com>',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_FORCE_PATH_STYLE: 'true',
    });

    expect(config.appBaseUrl).toBe('https://api.exemplo.com');
    expect(config.jwt.accessExpiresIn).toBe('30m');
    expect(config.refreshTtlDays).toBe(10);
    expect(config.emailVerificationTtlHours).toBe(48);
    expect(config.smtp).toEqual({
      host: 'smtp.exemplo.com',
      port: 465,
      user: 'usuario',
      pass: 'senha',
      from: 'App <app@exemplo.com>',
    });
    expect(config.s3.endpoint).toBe('http://localhost:9000');
    expect(config.s3.forcePathStyle).toBe(true);
  });
});
