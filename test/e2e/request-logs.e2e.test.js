import { beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  createInMemoryGamesStore,
  createInMemoryRequestLogsStore,
} from '../helpers/in-memory-stores.js';
import { createFakeMailer } from '../helpers/fake-mailer.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createPassThroughLimiters, testConfig } from '../helpers/test-config.js';

describe('requisições', () => {
  let requestLogsStore;
  let app;

  beforeEach(() => {
    requestLogsStore = createInMemoryRequestLogsStore([
      {
        timestamp: new Date('2024-01-02T02:59:59.000Z'),
        method: 'GET',
        path: '/jogos',
      },
      {
        timestamp: new Date('2024-01-02T03:00:00.000Z'),
        method: 'GET',
        path: '/requisicoes',
      },
    ]);

    app = createApp({
      gamesStore: createInMemoryGamesStore(),
      requestLogsStore,
      mailer: createFakeMailer(),
      storage: createFakeStorage(),
      config: testConfig,
      limiters: createPassThroughLimiters(),
      isWeekdayCheck: () => true,
    });
  });

  test('GET /requisicoes exige o parâmetro data', async () => {
    const response = await request(app).get('/requisicoes');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'Informe uma data válida no formato YYYY-MM-DD.',
    });
  });

  test('GET /requisicoes rejeita data inválida', async () => {
    const response = await request(app)
      .get('/requisicoes')
      .query({ data: '2023-02-29' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'Informe uma data válida no formato YYYY-MM-DD.',
    });
  });

  test('GET /requisicoes filtra pelo dia no fuso America/Fortaleza', async () => {
    const response = await request(app)
      .get('/requisicoes')
      .query({ data: '2024-01-01' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        timestamp: '2024-01-02T02:59:59.000Z',
        method: 'GET',
        path: '/jogos',
      },
    ]);
  });

  test('registra toda requisição recebida', async () => {
    await request(app).get('/jogos');

    expect(requestLogsStore.create).toHaveBeenCalledWith({
      timestamp: expect.any(Date),
      method: 'GET',
      path: '/jogos',
    });
  });
});
