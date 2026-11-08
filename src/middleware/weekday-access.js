import { isWeekday } from '../utils/date-utils.js';

export function createWeekdayAccessMiddleware(isWeekdayCheck = isWeekday) {
  return (req, res, next) => {
    if (!isWeekdayCheck()) {
      return res.status(403).json({
        erro: 'A API só está disponível de segunda a sexta-feira.',
      });
    }

    return next();
  };
}
