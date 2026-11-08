import express from 'express';
import { createGamesStore } from './data/games-store.js';
import { createRequestLogsStore } from './data/request-logs-store.js';
import { createRequestLogger } from './middleware/request-logger.js';
import { createWeekdayAccessMiddleware } from './middleware/weekday-access.js';
import { createGamesRouter } from './routes/games.js';
import { createRequestLogsRouter } from './routes/request-logs.js';
import { isWeekday } from './utils/date-utils.js';

export function createApp({
  gamesStore = createGamesStore(),
  requestLogsStore = createRequestLogsStore(),
  isWeekdayCheck = isWeekday,
} = {}) {
  const app = express();

  app.use(createRequestLogger(requestLogsStore));
  app.use(createWeekdayAccessMiddleware(isWeekdayCheck));
  app.use(express.json());

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
