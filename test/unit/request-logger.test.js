import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { createRequestLogger } from '../../src/middleware/request-logger.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('createRequestLogger', () => {
  test('registra método, caminho e horário e continua a requisição', async () => {
    const entries = [];
    const requestLogs = {
      create: jest.fn(async (entry) => {
        entries.push(entry);
      }),
    };
    const next = jest.fn();

    await createRequestLogger(requestLogs)({ method: 'GET', path: '/jogos' }, {}, next);

    expect(requestLogs.create).toHaveBeenCalledTimes(1);
    expect(entries).toEqual([
      {
        timestamp: expect.any(Date),
        method: 'GET',
        path: '/jogos',
      },
    ]);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('engole falha do store, registra no console e continua a requisição', async () => {
    const error = new Error('mongo indisponível');
    const requestLogs = { create: jest.fn().mockRejectedValue(error) };
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const next = jest.fn();

    await createRequestLogger(requestLogs)({ method: 'POST', path: '/jogos' }, {}, next);

    expect(consoleError).toHaveBeenCalledWith('Falha ao registrar requisição:', error);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
