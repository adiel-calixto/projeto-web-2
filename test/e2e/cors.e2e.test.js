import { describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  createInMemoryGamesStore,
  createInMemoryRequestLogsStore,
} from '../helpers/in-memory-stores.js';
import { createFakeMailer } from '../helpers/fake-mailer.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createPassThroughLimiters, testConfig } from '../helpers/test-config.js';

const allowed = 'http://localhost:5173';

function createTestApp(overrides = {}) {
  return createApp({
    gamesStore: createInMemoryGamesStore(),
    requestLogsStore: createInMemoryRequestLogsStore(),
    mailer: createFakeMailer(),
    storage: createFakeStorage(),
    config: testConfig,
    limiters: createPassThroughLimiters(),
    isWeekdayCheck: () => true,
    ...overrides,
  });
}

describe('CORS', () => {
  test('preflight de origem permitida recebe os cabeçalhos, sem exigir autenticação', async () => {
    const response = await request(createTestApp())
      .options('/jogos')
      .set('Origin', allowed)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(allowed);
    expect(response.headers['access-control-allow-headers']).toMatch(/Authorization/i);
    expect(response.headers['access-control-allow-methods']).toMatch(/DELETE/);
  });

  test('origem não listada não recebe Access-Control-Allow-Origin', async () => {
    const response = await request(createTestApp())
      .options('/jogos')
      .set('Origin', 'http://evil.example')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('o 403 do fim de semana também leva os cabeçalhos CORS', async () => {
    const response = await request(createTestApp({ isWeekdayCheck: () => false }))
      .get('/jogos')
      .set('Origin', allowed);

    expect(response.status).toBe(403);
    expect(response.headers['access-control-allow-origin']).toBe(allowed);
  });
});
