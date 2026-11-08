import { describe, expect, jest, test } from '@jest/globals';
import { createRequireAuth } from '../../src/middleware/require-auth.js';
import { signAccessToken } from '../../src/auth/tokens.js';

const secret = 'segredo-de-teste-com-pelo-menos-32-caracteres';

function createResponse() {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };

  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

function createRequest(authorization) {
  return {
    get: jest.fn(() => authorization),
  };
}

describe('createRequireAuth', () => {
  test('exige o cabeçalho Authorization', () => {
    const res = createResponse();
    const next = jest.fn();

    createRequireAuth({ secret })(createRequest(undefined), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Autenticação necessária.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('recusa esquema diferente de Bearer', () => {
    const res = createResponse();
    const next = jest.fn();

    createRequireAuth({ secret })(createRequest('Basic abc'), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Autenticação necessária.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('preenche req.user com um token válido', () => {
    const token = signAccessToken({ id: 'user-1' }, { secret });
    const req = createRequest(`Bearer ${token}`);
    const res = createResponse();
    const next = jest.fn();

    createRequireAuth({ secret })(req, res, next);

    expect(req.user).toEqual({ id: 'user-1' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('distingue token expirado de token inválido', () => {
    const expired = signAccessToken({ id: 'user-1' }, { secret, expiresIn: -1 });
    const expiredRes = createResponse();
    createRequireAuth({ secret })(createRequest(`Bearer ${expired}`), expiredRes, jest.fn());

    expect(expiredRes.status).toHaveBeenCalledWith(401);
    expect(expiredRes.json).toHaveBeenCalledWith({ erro: 'Token expirado.' });

    const invalidRes = createResponse();
    createRequireAuth({ secret })(createRequest('Bearer token-invalido'), invalidRes, jest.fn());

    expect(invalidRes.status).toHaveBeenCalledWith(401);
    expect(invalidRes.json).toHaveBeenCalledWith({ erro: 'Token inválido.' });
  });
});
