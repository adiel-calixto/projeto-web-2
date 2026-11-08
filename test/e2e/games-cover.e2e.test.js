import { beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { signAccessToken } from '../../src/auth/tokens.js';
import { MAX_COVER_BYTES } from '../../src/storage/image-validation.js';
import {
  createInMemoryGamesStore,
  createInMemoryRequestLogsStore,
} from '../helpers/in-memory-stores.js';
import { createFakeMailer } from '../helpers/fake-mailer.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createPassThroughLimiters, testConfig } from '../helpers/test-config.js';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const hades = {
  code: 'G001',
  title: 'Hades',
  price: 49.9,
  genre: 'Ação',
  coverUrl: null,
};

const accessToken = signAccessToken({ id: 'user-1' }, { secret: testConfig.jwt.secret });

function authorize(testRequest) {
  return testRequest.set('Authorization', `Bearer ${accessToken}`);
}

function createContext() {
  const gamesStore = createInMemoryGamesStore([hades]);
  const storage = createFakeStorage(testConfig.s3.publicBaseUrl);
  const app = createApp({
    gamesStore,
    requestLogsStore: createInMemoryRequestLogsStore(),
    mailer: createFakeMailer(),
    storage,
    config: testConfig,
    limiters: createPassThroughLimiters(),
    isWeekdayCheck: () => true,
  });

  return { app, gamesStore, storage };
}

describe('capa dos jogos', () => {
  let context;

  beforeEach(() => {
    context = createContext();
  });

  test('envia uma capa válida e devolve a URL pública', async () => {
    const response = await authorize(request(context.app).put('/jogos/G001/capa'))
      .attach('capa', png, 'capa.png');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...hades,
      coverUrl: expect.stringMatching(
        /^https:\/\/fake-s3\.test\/games\/G001\/[0-9a-f-]+\.png$/,
      ),
    });

    const key = response.body.coverUrl.slice('https://fake-s3.test/'.length);

    expect(context.storage.upload).toHaveBeenCalledWith({
      key,
      body: png,
      contentType: 'image/png',
    });
    expect(context.storage.objects.get(key)).toEqual({
      body: png,
      contentType: 'image/png',
    });
    expect(context.gamesStore.games[0].coverUrl).toBe(response.body.coverUrl);
  });

  test('trocar a capa apaga o objeto antigo', async () => {
    const first = await authorize(request(context.app).put('/jogos/G001/capa'))
      .attach('capa', png, 'primeira.png');
    const second = await authorize(request(context.app).put('/jogos/G001/capa'))
      .attach('capa', png, 'segunda.png');

    expect(second.status).toBe(200);
    expect(second.body.coverUrl).not.toBe(first.body.coverUrl);
    expect(context.storage.objects.size).toBe(1);
    expect(context.storage.objects.has(
      second.body.coverUrl.slice('https://fake-s3.test/'.length),
    )).toBe(true);
    expect(context.storage.deleteByUrl).toHaveBeenCalledWith(first.body.coverUrl);
  });

  test('recusa arquivo que não é imagem', async () => {
    const response = await authorize(request(context.app).put('/jogos/G001/capa'))
      .attach('capa', Buffer.from('texto qualquer'), 'falsa.jpg');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'Formato inválido. Use JPEG, PNG ou WebP.',
    });
    expect(context.storage.upload).not.toHaveBeenCalled();
    expect(context.gamesStore.games[0].coverUrl).toBeNull();
  });

  test('recusa requisição sem arquivo', async () => {
    const response = await authorize(request(context.app).put('/jogos/G001/capa'));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'Envie a imagem no campo "capa".',
    });
  });

  test('recusa imagem maior que 5 MB com 413', async () => {
    const response = await authorize(request(context.app).put('/jogos/G001/capa'))
      .attach('capa', Buffer.alloc(MAX_COVER_BYTES + 1), 'grande.png');

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ erro: 'A imagem excede 5 MB.' });
    expect(context.storage.upload).not.toHaveBeenCalled();
  });

  test('recusa upload com nome de campo errado', async () => {
    const response = await authorize(request(context.app).put('/jogos/G001/capa'))
      .attach('imagem', png, 'capa.png');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ erro: 'Upload inválido.' });
    expect(context.storage.upload).not.toHaveBeenCalled();
  });

  test('retorna 404 ao enviar capa para jogo inexistente', async () => {
    const response = await authorize(request(context.app).put('/jogos/G404/capa'))
      .attach('capa', png, 'capa.png');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ erro: 'Jogo não encontrado.' });
    expect(context.storage.upload).not.toHaveBeenCalled();
  });

  test('exige autenticação para enviar a capa', async () => {
    const response = await request(context.app)
      .put('/jogos/G001/capa')
      .attach('capa', png, 'capa.png');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ erro: 'Autenticação necessária.' });
    expect(context.storage.upload).not.toHaveBeenCalled();
  });

  test('remove a capa e o objeto do storage', async () => {
    const uploaded = await authorize(request(context.app).put('/jogos/G001/capa'))
      .attach('capa', png, 'capa.png');

    const response = await authorize(request(context.app).delete('/jogos/G001/capa'));

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(context.gamesStore.games[0].coverUrl).toBeNull();
    expect(context.storage.objects.size).toBe(0);
    expect(context.storage.deleteByUrl).toHaveBeenCalledWith(uploaded.body.coverUrl);
  });

  test('retorna 404 ao remover capa de jogo sem capa', async () => {
    const response = await authorize(request(context.app).delete('/jogos/G001/capa'));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ erro: 'O jogo não possui capa.' });
  });

  test('retorna 404 ao remover capa de jogo inexistente', async () => {
    const response = await authorize(request(context.app).delete('/jogos/G404/capa'));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ erro: 'Jogo não encontrado.' });
  });

  test('apagar o jogo remove a capa do storage', async () => {
    await authorize(request(context.app).put('/jogos/G001/capa'))
      .attach('capa', png, 'capa.png');

    const response = await authorize(request(context.app).delete('/jogos/G001'));

    expect(response.status).toBe(204);
    expect(context.gamesStore.games).toHaveLength(0);
    expect(context.storage.objects.size).toBe(0);
  });
});
