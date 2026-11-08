import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  createInMemoryGamesStore,
  createInMemoryRequestLogsStore,
} from '../helpers/in-memory-stores.js';

afterEach(() => {
  jest.restoreAllMocks();
});

function createTestApp(overrides = {}) {
  return createApp({
    gamesStore: createInMemoryGamesStore(),
    requestLogsStore: createInMemoryRequestLogsStore(),
    isWeekdayCheck: () => true,
    ...overrides,
  });
}

describe('middlewares e erros', () => {
  test('bloqueia todas as rotas no fim de semana, mas registra a requisição', async () => {
    const requestLogsStore = createInMemoryRequestLogsStore();
    const app = createTestApp({
      requestLogsStore,
      isWeekdayCheck: () => false,
    });

    const response = await request(app).get('/jogos');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      erro: 'A API só está disponível de segunda a sexta-feira.',
    });
    expect(requestLogsStore.create).toHaveBeenCalledWith({
      timestamp: expect.any(Date),
      method: 'GET',
      path: '/jogos',
    });
  });

  test('retorna 404 para rota inexistente', async () => {
    const response = await request(createTestApp()).get('/nao-existe');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ erro: 'Rota não encontrada.' });
  });

  test('retorna 500 sem vazar detalhes quando o store falha', async () => {
    const gamesStore = createInMemoryGamesStore();
    gamesStore.list.mockRejectedValue(new Error('falha interna do banco'));

    const response = await request(createTestApp({ gamesStore })).get('/jogos');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ erro: 'Ocorreu um erro interno.' });
  });

  test('falha do logger não impede a requisição', async () => {
    const requestLogsStore = createInMemoryRequestLogsStore();
    requestLogsStore.create.mockRejectedValue(new Error('mongo indisponível'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(createTestApp({ requestLogsStore })).get('/jogos');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      'Falha ao registrar requisição:',
      expect.any(Error),
    );
  });
});
