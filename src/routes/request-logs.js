import { Router } from 'express';
import { filterLogsByDate, isValidDateParam } from '../utils/date-utils.js';

export function createRequestLogsRouter(requestLogs) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    const { data } = req.query;

    if (!isValidDateParam(data)) {
      return res.status(400).json({
        erro: 'Informe uma data válida no formato YYYY-MM-DD.',
      });
    }

    try {
      const entries = await requestLogs.list();
      return res.json(filterLogsByDate(entries, data));
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
