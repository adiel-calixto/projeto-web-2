import { describe, expect, jest, test } from '@jest/globals';
import { createWeekdayAccessMiddleware } from '../../src/middleware/weekday-access.js';

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('createWeekdayAccessMiddleware', () => {
  test('libera a requisição em dia útil', () => {
    const next = jest.fn();

    createWeekdayAccessMiddleware(() => true)({}, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('bloqueia com 403 no fim de semana', () => {
    const next = jest.fn();
    const res = createResponse();

    createWeekdayAccessMiddleware(() => false)({}, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      erro: 'A API só está disponível de segunda a sexta-feira.',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
