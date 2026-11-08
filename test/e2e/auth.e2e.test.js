import { beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { verifyAccessToken } from '../../src/auth/tokens.js';
import {
  createInMemoryGamesStore,
  createInMemoryRefreshTokensStore,
  createInMemoryRequestLogsStore,
  createInMemoryUsersStore,
} from '../helpers/in-memory-stores.js';
import { createFakeMailer } from '../helpers/fake-mailer.js';
import { createPassThroughLimiters, testConfig } from '../helpers/test-config.js';

const defaultUser = {
  name: 'Ana Silva',
  email: 'ana@exemplo.com',
  password: 'senha-forte-123',
};

function createContext({ isWeekdayCheck = () => true } = {}) {
  const dependencies = {
    gamesStore: createInMemoryGamesStore(),
    requestLogsStore: createInMemoryRequestLogsStore(),
    usersStore: createInMemoryUsersStore(),
    refreshTokensStore: createInMemoryRefreshTokensStore(),
    mailer: createFakeMailer(),
    config: testConfig,
    limiters: createPassThroughLimiters(),
    isWeekdayCheck,
  };

  return { ...dependencies, app: createApp(dependencies) };
}

function register(app, overrides = {}) {
  return request(app)
    .post('/auth/cadastro')
    .send({ ...defaultUser, ...overrides });
}

function tokenFromLastEmail(mailer) {
  const link = mailer.sent.at(-1).text.match(/https?:\/\/\S+/)[0];
  return new URL(link).searchParams.get('token');
}

function verifyEmail(app, mailer) {
  return request(app)
    .get('/auth/verificar-email')
    .query({ token: tokenFromLastEmail(mailer) });
}

async function registerAndVerify(context) {
  await register(context.app);
  return verifyEmail(context.app, context.mailer);
}

describe('autenticação', () => {
  let context;

  beforeEach(() => {
    context = createContext();
  });

  test('cadastro válido responde 201 e envia um e-mail com link', async () => {
    const response = await register(context.app);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      mensagem: 'Cadastro criado. Verifique seu e-mail para ativar a conta.',
    });
    expect(context.mailer.sent).toHaveLength(1);
    expect(context.mailer.sent[0].to).toBe('ana@exemplo.com');
    expect(context.mailer.sent[0].subject).toBe('Confirme seu e-mail');
    expect(context.mailer.sent[0].text).toContain(
      'http://localhost:3000/auth/verificar-email?token=',
    );
    expect(context.usersStore.users[0].emailVerified).toBe(false);
  });

  test('cadastro com e-mail repetido responde 409', async () => {
    await register(context.app);
    const response = await register(context.app);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ erro: 'E-mail já cadastrado.' });
    expect(context.mailer.sent).toHaveLength(1);
  });

  test('cadastro com senha curta responde 400', async () => {
    const response = await register(context.app, { password: '1234567' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'A senha deve ter entre 8 e 72 caracteres.',
    });
  });

  test('normaliza o e-mail para minúsculas', async () => {
    await register(context.app, { email: '  ANA@Exemplo.COM ' });

    expect(context.usersStore.users[0].email).toBe('ana@exemplo.com');
    expect(context.mailer.sent[0].to).toBe('ana@exemplo.com');
  });

  test('login antes da verificação responde 403', async () => {
    await register(context.app);

    const response = await request(context.app)
      .post('/auth/login')
      .send({ email: defaultUser.email, password: defaultUser.password });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      erro: 'Confirme seu e-mail antes de entrar.',
    });
  });

  test('verifica o e-mail e permite o login', async () => {
    await register(context.app);

    const verification = await verifyEmail(context.app, context.mailer);

    expect(verification.status).toBe(200);
    expect(verification.body).toEqual({
      mensagem: 'E-mail verificado. Você já pode fazer login.',
    });

    const login = await request(context.app)
      .post('/auth/login')
      .send({ email: defaultUser.email, password: defaultUser.password });

    expect(login.status).toBe(200);
    expect(login.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      tokenType: 'Bearer',
      expiresIn: '15m',
    });
    expect(login.body).not.toHaveProperty('passwordHash');

    const payload = verifyAccessToken(login.body.accessToken, testConfig.jwt.secret);
    expect(payload.sub).toBe(context.usersStore.users[0].id);
  });

  test('o token de verificação só pode ser usado uma vez', async () => {
    await register(context.app);
    const token = tokenFromLastEmail(context.mailer);

    await request(context.app).get('/auth/verificar-email').query({ token });
    const reuse = await request(context.app)
      .get('/auth/verificar-email')
      .query({ token });

    expect(reuse.status).toBe(400);
    expect(reuse.body).toEqual({ erro: 'Link inválido ou expirado.' });
  });

  test('recusa token de verificação expirado', async () => {
    await register(context.app);
    context.usersStore.users[0].emailVerification.expiresAt = new Date(Date.now() - 1000);

    const response = await verifyEmail(context.app, context.mailer);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ erro: 'Link inválido ou expirado.' });
  });

  test.each([
    ['token ausente', {}],
    ['token repetido na query', { token: ['a', 'b'] }],
  ])('recusa verificação com %s', async (_label, query) => {
    const response = await request(context.app).get('/auth/verificar-email').query(query);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ erro: 'Link inválido ou expirado.' });
  });

  test('senha errada e e-mail inexistente têm a mesma resposta', async () => {
    await registerAndVerify(context);

    const wrongPassword = await request(context.app)
      .post('/auth/login')
      .send({ email: defaultUser.email, password: 'senha-errada' });
    const unknownEmail = await request(context.app)
      .post('/auth/login')
      .send({ email: 'ninguem@exemplo.com', password: defaultUser.password });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual({ erro: 'E-mail ou senha inválidos.' });
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  test('reenvio responde 202 para e-mail existente e inexistente', async () => {
    await register(context.app);

    const existing = await request(context.app)
      .post('/auth/reenviar-verificacao')
      .send({ email: defaultUser.email });
    const unknown = await request(context.app)
      .post('/auth/reenviar-verificacao')
      .send({ email: 'ninguem@exemplo.com' });

    const expectedMessage = 'Se o e-mail existir e estiver pendente, enviamos um novo link.';

    expect(existing.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(existing.body).toEqual({ mensagem: expectedMessage });
    expect(unknown.body).toEqual(existing.body);
    expect(context.mailer.sent).toHaveLength(2);
  });

  test('rotas de auth continuam disponíveis no fim de semana', async () => {
    const weekendContext = createContext({ isWeekdayCheck: () => false });

    const authResponse = await request(weekendContext.app)
      .post('/auth/login')
      .send({ email: 'ninguem@exemplo.com', password: 'senha-forte-123' });
    const gamesResponse = await request(weekendContext.app).get('/jogos');

    expect(authResponse.status).toBe(401);
    expect(gamesResponse.status).toBe(403);
  });
});
