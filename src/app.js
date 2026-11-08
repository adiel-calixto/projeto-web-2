import express from 'express';
import { createAuthService } from './auth/auth-service.js';
import { createGamesStore } from './data/games-store.js';
import { createRefreshTokensStore } from './data/refresh-tokens-store.js';
import { createRequestLogsStore } from './data/request-logs-store.js';
import { createUsersStore } from './data/users-store.js';
import { createRateLimiters } from './middleware/rate-limits.js';
import { createRequestLogger } from './middleware/request-logger.js';
import { createWeekdayAccessMiddleware } from './middleware/weekday-access.js';
import { createAuthRouter } from './routes/auth.js';
import { createGamesRouter } from './routes/games.js';
import { createRequestLogsRouter } from './routes/request-logs.js';
import { isWeekday } from './utils/date-utils.js';

export function createApp({
  gamesStore = createGamesStore(),
  requestLogsStore = createRequestLogsStore(),
  usersStore = createUsersStore(),
  refreshTokensStore = createRefreshTokensStore(),
  mailer,
  config,
  limiters = createRateLimiters(),
  isWeekdayCheck = isWeekday,
} = {}) {
  if (!config) {
    throw new Error('createApp exige a configuração da aplicação.');
  }

  if (!mailer) {
    throw new Error('createApp exige um serviço de e-mail.');
  }

  const app = express();

  app.use(createRequestLogger(requestLogsStore));
  app.use(express.json());

  const authService = createAuthService({
    usersStore,
    refreshTokensStore,
    mailer,
    config,
  });

  // Auth fica antes do bloqueio de fim de semana para que links de e-mail funcionem.
  app.use('/auth', createAuthRouter({ authService, limiters }));

  app.use(createWeekdayAccessMiddleware(isWeekdayCheck));
  app.use('/jogos', createGamesRouter(gamesStore));
  app.use('/requisicoes', createRequestLogsRouter(requestLogsStore));

  app.use((req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada.' });
  });

  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ erro: 'O corpo da requisição contém JSON inválido.' });
    }

    return res.status(500).json({ erro: 'Ocorreu um erro interno.' });
  });

  return app;
}
