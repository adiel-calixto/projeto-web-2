import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { createRefreshTokensStore } from '../../src/data/refresh-tokens-store.js';
import { RefreshToken } from '../../src/models/refresh-token.js';

const userId = '507f1f77bcf86cd799439011';
const expiresAt = new Date('2024-01-08T00:00:00.000Z');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('createRefreshTokensStore', () => {
  test('cria e formata o refresh token', async () => {
    jest.spyOn(RefreshToken, 'create').mockResolvedValue({
      toObject: () => ({
        _id: 'refresh-1',
        userId,
        tokenHash: 'hash',
        expiresAt,
        revokedAt: null,
        replacedByHash: null,
      }),
    });

    await expect(createRefreshTokensStore().create({
      userId,
      tokenHash: 'hash',
      expiresAt,
    })).resolves.toEqual({
      id: 'refresh-1',
      userId,
      tokenHash: 'hash',
      expiresAt,
      revokedAt: null,
      replacedByHash: null,
    });
  });

  test('revoga um token e registra o substituto', async () => {
    const updateOne = jest.spyOn(RefreshToken, 'updateOne').mockResolvedValue({});

    await createRefreshTokensStore().revoke('hash-antigo', 'hash-novo');

    expect(updateOne).toHaveBeenCalledWith(
      { tokenHash: 'hash-antigo', revokedAt: null },
      {
        $set: {
          revokedAt: expect.any(Date),
          replacedByHash: 'hash-novo',
        },
      },
    );
  });

  test('revoga todos os tokens ativos de um usuário', async () => {
    const updateMany = jest.spyOn(RefreshToken, 'updateMany').mockResolvedValue({});

    await createRefreshTokensStore().revokeAllForUser(userId);

    expect(updateMany).toHaveBeenCalledWith(
      { userId, revokedAt: null },
      { $set: { revokedAt: expect.any(Date) } },
    );
  });
});
