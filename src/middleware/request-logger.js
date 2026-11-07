import { formatFortalezaTimestamp } from '../utils/date-utils.js';

export function createRequestLogger(requestLogs) {
  return async (req, res, next) => {
    try {
      await requestLogs.create({
        timestamp: formatFortalezaTimestamp(),
        method: req.method,
        path: req.path,
      });
    } catch (error) {
      console.error('Falha ao registrar requisição:', error);
    }

    next();
  };
}
