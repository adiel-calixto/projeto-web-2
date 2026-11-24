function required(env, name) {
  const value = typeof env[name] === 'string' ? env[name].trim() : '';

  if (!value) {
    throw new Error(`A variável de ambiente ${name} é obrigatória.`);
  }

  return value;
}

function positiveNumber(value, name, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`A variável de ambiente ${name} deve ser um número positivo.`);
  }

  return parsed;
}

function corsOrigins(env) {
  const origins = required(env, 'CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('A variável de ambiente CORS_ORIGINS é obrigatória.');
  }

  if (origins.includes('*')) {
    throw new Error('A variável de ambiente CORS_ORIGINS não aceita "*"; liste as origens permitidas.');
  }

  return origins;
}

export function loadConfig(env = process.env) {
  const jwtSecret = required(env, 'JWT_SECRET');

  if (jwtSecret.length < 32) {
    throw new Error('A variável de ambiente JWT_SECRET deve ter pelo menos 32 caracteres.');
  }

  const publicBaseUrl = required(env, 'S3_PUBLIC_BASE_URL').replace(/\/+$/, '');
  const port = positiveNumber(env.PORT, 'PORT', 3000);

  return {
    jwt: {
      secret: jwtSecret,
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN?.trim() || '15m',
    },
    refreshTtlDays: positiveNumber(env.REFRESH_TOKEN_TTL_DAYS, 'REFRESH_TOKEN_TTL_DAYS', 7),
    emailVerificationTtlHours: positiveNumber(
      env.EMAIL_VERIFICATION_TTL_HOURS,
      'EMAIL_VERIFICATION_TTL_HOURS',
      24,
    ),
    cors: { origins: corsOrigins(env) },
    appBaseUrl: (env.APP_BASE_URL?.trim() || `http://localhost:${port}`).replace(/\/+$/, ''),
    smtp: {
      host: env.SMTP_HOST?.trim() ?? '',
      port: positiveNumber(env.SMTP_PORT, 'SMTP_PORT', 587),
      user: env.SMTP_USER?.trim() ?? '',
      pass: env.SMTP_PASS ?? '',
      from: env.MAIL_FROM?.trim() || 'Catálogo de jogos <nao-responda@exemplo.com>',
    },
    s3: {
      bucket: required(env, 'S3_BUCKET'),
      region: required(env, 'AWS_REGION'),
      publicBaseUrl,
      endpoint: env.S3_ENDPOINT?.trim() || null,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
    },
  };
}
