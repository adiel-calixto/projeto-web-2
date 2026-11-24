import { beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { signAccessToken } from '../../src/auth/tokens.js';
import {
  createInMemoryGamesStore,
  createInMemoryRequestLogsStore,
} from '../helpers/in-memory-stores.js';
import { createFakeMailer } from '../helpers/fake-mailer.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createPassThroughLimiters, testConfig } from '../helpers/test-config.js';

const hades = {
  code: 'G001',
  title: 'Hades',
  price: 49.9,
  genre: 'Ação',
  coverUrl: null,
};
const celeste = {
  code: 'G002',
  title: 'Celeste',
  price: 19.9,
  genre: 'Plataforma',
  coverUrl: null,
};
const accessToken = signAccessToken({ id: 'user-1' }, { secret: testConfig.jwt.secret });

function authorize(testRequest) {
  return testRequest.set('Authorization', `Bearer ${accessToken}`);
}

function createTestApp(gamesStore, { isWeekdayCheck = () => true } = {}) {
  return createApp({
    gamesStore,
    requestLogsStore: createInMemoryRequestLogsStore(),
    mailer: createFakeMailer(),
    storage: createFakeStorage(),
    config: testConfig,
    limiters: createPassThroughLimiters(),
    isWeekdayCheck,
  });
}

function binaryParser(res, callback) {
  const chunks = [];

  res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

describe('jogos', () => {
  let gamesStore;
  let app;

  beforeEach(() => {
    gamesStore = createInMemoryGamesStore([hades, celeste]);
    app = createTestApp(gamesStore);
  });

  test('GET /jogos lista os jogos', async () => {
    const response = await request(app).get('/jogos');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([hades, celeste]);
  });

  test('POST /jogos cria um jogo com código sequencial', async () => {
    const response = await authorize(request(app).post('/jogos'))
      .send({ title: '  Stardew Valley  ', price: 24.9, genre: ' Simulação ' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      code: 'G003',
      title: 'Stardew Valley',
      price: 24.9,
      genre: 'Simulação',
      coverUrl: null,
    });
    expect(gamesStore.games).toContainEqual(response.body);
  });

  test('POST /jogos rejeita entrada inválida', async () => {
    const response = await authorize(request(app).post('/jogos'))
      .send({ title: 'Jogo', genre: 'Ação' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'O preço deve ser um número não negativo com até duas casas decimais.',
    });
  });

  test('POST /jogos rejeita JSON malformado', async () => {
    const response = await request(app)
      .post('/jogos')
      .set('Content-Type', 'application/json')
      .send('{"title":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'O corpo da requisição contém JSON inválido.',
    });
  });

  test('GET /jogos/:codigo retorna o jogo encontrado', async () => {
    const response = await request(app).get('/jogos/G001');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(hades);
  });

  test('GET /jogos/:codigo retorna 404 quando o jogo não existe', async () => {
    const response = await request(app).get('/jogos/G404');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ erro: 'Jogo não encontrado.' });
  });

  test('DELETE /jogos/:codigo exclui o jogo', async () => {
    const response = await authorize(request(app).delete('/jogos/G001'));

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(gamesStore.games).toEqual([celeste]);
  });

  test('DELETE /jogos/:codigo retorna 404 quando o jogo não existe', async () => {
    const response = await authorize(request(app).delete('/jogos/G404'));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ erro: 'Jogo não encontrado.' });
  });

  test('POST /jogos exige autenticação', async () => {
    const response = await request(app)
      .post('/jogos')
      .send({ title: 'Hades', price: 49.9, genre: 'Ação' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ erro: 'Autenticação necessária.' });
    expect(gamesStore.create).not.toHaveBeenCalled();
  });

  test('DELETE /jogos/:codigo exige autenticação', async () => {
    const response = await request(app).delete('/jogos/G001');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ erro: 'Autenticação necessária.' });
    expect(gamesStore.games).toEqual([hades, celeste]);
  });

  test('recusa token inválido nas rotas protegidas', async () => {
    const response = await request(app)
      .delete('/jogos/G001')
      .set('Authorization', 'Bearer token-invalido');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ erro: 'Token inválido.' });
  });

  test('GET /jogos/pdf retorna o catálogo em PDF', async () => {
    const response = await request(app)
      .get('/jogos/pdf')
      .buffer(true)
      .parse(binaryParser);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toBe('attachment; filename="jogos.pdf"');
    expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('GET /jogos/pdf funciona com catálogo vazio', async () => {
    const response = await request(createTestApp(createInMemoryGamesStore()))
      .get('/jogos/pdf')
      .buffer(true)
      .parse(binaryParser);

    expect(response.status).toBe(200);
    expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('GET /jogos/csv retorna o catálogo em CSV', async () => {
    const response = await request(app).get('/jogos/csv');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(response.headers['content-disposition']).toBe('attachment; filename="jogos.csv"');
    expect(response.text).toBe(
      'code,title,price,genre\nG001,Hades,49.9,Ação\nG002,Celeste,19.9,Plataforma',
    );
  });

  test('GET /jogos/csv funciona com catálogo vazio', async () => {
    const response = await request(createTestApp(createInMemoryGamesStore()))
      .get('/jogos/csv');

    expect(response.status).toBe(200);
    expect(response.text).toBe('code,title,price,genre');
  });

  test('GET /jogos/csv escapa vírgulas, aspas e quebras de linha', async () => {
    const store = createInMemoryGamesStore([
      { ...hades, title: 'Hades, "Edição"' },
      { ...celeste, title: 'Linha1\nLinha2' },
    ]);
    const response = await request(createTestApp(store)).get('/jogos/csv');

    expect(response.status).toBe(200);
    expect(response.text).toBe([
      'code,title,price,genre',
      'G001,"Hades, ""Edição""",49.9,Ação',
      'G002,"Linha1\nLinha2",19.9,Plataforma',
    ].join('\n'));
  });

  test('GET /jogos/csv não escapa valores simples', async () => {
    const response = await request(createTestApp(createInMemoryGamesStore([hades])))
      .get('/jogos/csv');

    expect(response.text.split('\n')[1]).toBe('G001,Hades,49.9,Ação');
    expect(response.text).not.toContain('"');
  });

  test('GET /jogos/csv é público', async () => {
    const response = await request(app).get('/jogos/csv');

    expect(response.status).toBe(200);
  });

  test('GET /jogos/csv responde 403 no fim de semana', async () => {
    const weekendApp = createTestApp(gamesStore, { isWeekdayCheck: () => false });
    const response = await request(weekendApp).get('/jogos/csv');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      erro: 'A API só está disponível de segunda a sexta-feira.',
    });
  });
});
