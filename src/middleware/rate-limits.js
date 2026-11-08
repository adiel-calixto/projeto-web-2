import rateLimit from 'express-rate-limit';

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Tente novamente mais tarde.' },
};

export function createRateLimiters() {
  return {
    login: rateLimit({ ...baseOptions, windowMs: 15 * 60_000, limit: 10 }),
    signup: rateLimit({ ...baseOptions, windowMs: 60 * 60_000, limit: 10 }),
    resend: rateLimit({ ...baseOptions, windowMs: 60 * 60_000, limit: 5 }),
  };
}
