import { afterEach, describe, expect, jest, test } from '@jest/globals';
import {
  createUsersStore,
  toPublicUser,
  validateRegisterInput,
} from '../../src/data/users-store.js';
import { User } from '../../src/models/user.js';

const validInput = {
  name: '  Ana Silva  ',
  email: '  ANA@Exemplo.com ',
  password: 'senha-forte-123',
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('validateRegisterInput', () => {
  test('normaliza nome e e-mail e descarta campos extras', () => {
    expect(validateRegisterInput({
      ...validInput,
      id: 'forjado',
      emailVerified: true,
    })).toEqual({
      valid: true,
      value: {
        name: 'Ana Silva',
        email: 'ana@exemplo.com',
        password: 'senha-forte-123',
      },
    });
  });

  test.each([
    ['corpo nulo', null, 'O corpo da requisição deve ser um objeto JSON.'],
    ['array', [], 'O corpo da requisição deve ser um objeto JSON.'],
    ['texto', 'cadastro', 'O corpo da requisição deve ser um objeto JSON.'],
    ['nome vazio', { ...validInput, name: '  ' }, 'O nome é obrigatório.'],
    ['nome ausente', { ...validInput, name: undefined }, 'O nome é obrigatório.'],
    [
      'nome longo',
      { ...validInput, name: 'a'.repeat(101) },
      'O nome deve ter no máximo 100 caracteres.',
    ],
    ['e-mail vazio', { ...validInput, email: ' ' }, 'O e-mail é obrigatório.'],
    ['e-mail inválido', { ...validInput, email: 'ana@exemplo' }, 'Informe um e-mail válido.'],
    ['e-mail longo', { ...validInput, email: `${'a'.repeat(250)}@x.com` }, 'Informe um e-mail válido.'],
    [
      'senha curta',
      { ...validInput, password: '1234567' },
      'A senha deve ter entre 8 e 72 caracteres.',
    ],
    [
      'senha longa',
      { ...validInput, password: 'a'.repeat(73) },
      'A senha deve ter entre 8 e 72 caracteres.',
    ],
    [
      'senha ausente',
      { ...validInput, password: undefined },
      'A senha deve ter entre 8 e 72 caracteres.',
    ],
  ])('rejeita %s', (_label, input, message) => {
    expect(validateRegisterInput(input)).toEqual({ valid: false, message });
  });

  test.each([8, 72])('aceita senha com %i caracteres', (length) => {
    expect(validateRegisterInput({ ...validInput, password: 'a'.repeat(length) }).valid)
      .toBe(true);
  });
});

describe('toPublicUser', () => {
  test('expõe apenas os dados públicos', () => {
    expect(toPublicUser({
      id: 'user-1',
      _id: 'user-1',
      name: 'Ana',
      email: 'ana@exemplo.com',
      emailVerified: true,
      passwordHash: 'hash-secreto',
      emailVerification: { tokenHash: 'token-secreto' },
    })).toEqual({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@exemplo.com',
      emailVerified: true,
    });
  });

  test('devolve null para usuário inexistente', () => {
    expect(toPublicUser(null)).toBeNull();
  });
});

describe('createUsersStore', () => {
  test('cria um usuário e devolve os dados internos', async () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    jest.spyOn(User, 'create').mockResolvedValue({
      toObject: () => ({
        _id: '507f1f77bcf86cd799439011',
        name: 'Ana',
        email: 'ana@exemplo.com',
        passwordHash: 'hash',
        emailVerified: false,
        emailVerification: { tokenHash: null, expiresAt: null },
        createdAt,
      }),
    });

    const result = await createUsersStore().create({
      name: 'Ana',
      email: 'ana@exemplo.com',
      passwordHash: 'hash',
    });

    expect(User.create).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@exemplo.com',
      passwordHash: 'hash',
      emailVerification: undefined,
    });
    expect(result).toEqual({
      ok: true,
      user: {
        id: '507f1f77bcf86cd799439011',
        name: 'Ana',
        email: 'ana@exemplo.com',
        passwordHash: 'hash',
        emailVerified: false,
        emailVerification: { tokenHash: null, expiresAt: null },
        createdAt,
      },
    });
  });

  test('informa e-mail duplicado', async () => {
    const error = new Error('duplicado');
    error.code = 11000;
    jest.spyOn(User, 'create').mockRejectedValue(error);

    await expect(createUsersStore().create({
      name: 'Ana',
      email: 'ana@exemplo.com',
      passwordHash: 'hash',
    })).resolves.toEqual({ ok: false, reason: 'EMAIL_TAKEN' });
  });

  test('busca por e-mail e devolve null quando não encontra', async () => {
    const findOne = jest.spyOn(User, 'findOne');

    findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue({
        _id: '1',
        name: 'Ana',
        email: 'ana@exemplo.com',
        passwordHash: 'hash',
        emailVerified: true,
      }),
    });
    findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue(null),
    });

    const store = createUsersStore();

    await expect(store.findByEmail('ana@exemplo.com')).resolves.toEqual(
      expect.objectContaining({ email: 'ana@exemplo.com', passwordHash: 'hash' }),
    );
    await expect(store.findByEmail('nao@exemplo.com')).resolves.toBeNull();
  });

  test('trata id inválido como usuário inexistente', async () => {
    const error = new Error('cast');
    error.name = 'CastError';
    jest.spyOn(User, 'findById').mockImplementation(() => {
      throw error;
    });

    await expect(createUsersStore().findById('invalido')).resolves.toBeNull();
  });

  test('marca o e-mail como verificado e limpa o token', async () => {
    const updateOne = jest.spyOn(User, 'updateOne').mockResolvedValue({ modifiedCount: 1 });

    await expect(createUsersStore().markEmailVerified('507f1f77bcf86cd799439011'))
      .resolves.toBe(true);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011' },
      {
        $set: {
          emailVerified: true,
          'emailVerification.tokenHash': null,
          'emailVerification.expiresAt': null,
        },
      },
    );
  });

  test('grava o token de verificação', async () => {
    const updateOne = jest.spyOn(User, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
    const expiresAt = new Date('2024-01-02T00:00:00.000Z');

    await createUsersStore().setVerificationToken('507f1f77bcf86cd799439011', {
      tokenHash: 'hash-do-token',
      expiresAt,
    });

    expect(updateOne).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011' },
      {
        $set: {
          'emailVerification.tokenHash': 'hash-do-token',
          'emailVerification.expiresAt': expiresAt,
        },
      },
    );
  });
});
