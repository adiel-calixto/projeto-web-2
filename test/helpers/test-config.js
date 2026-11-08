export const testConfig = {
  jwt: {
    secret: 'segredo-de-teste-com-pelo-menos-32-caracteres',
    accessExpiresIn: '15m',
  },
  refreshTtlDays: 7,
  emailVerificationTtlHours: 24,
  appBaseUrl: 'http://localhost:3000',
  smtp: {
    host: 'smtp.teste',
    port: 2525,
    user: '',
    pass: '',
    from: 'Teste <teste@exemplo.com>',
  },
  s3: {
    bucket: 'bucket-de-teste',
    region: 'us-east-1',
    publicBaseUrl: 'https://fake-s3.test',
    endpoint: null,
    forcePathStyle: false,
  },
};

export function createPassThroughLimiters() {
  const passThrough = (req, res, next) => next();

  return {
    login: passThrough,
    signup: passThrough,
    resend: passThrough,
  };
}
