import { jest } from '@jest/globals';
import { validateGameInput } from '../../src/data/games-store.js';

function nextGameSequence(games) {
  const highestCode = games.reduce((highest, game) => {
    const match = /^G(\d+)$/.exec(game.code);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return highestCode + 1;
}

export function createInMemoryGamesStore(initialGames = []) {
  const games = initialGames.map((game) => ({ ...game }));
  let nextSequence = nextGameSequence(games);

  return {
    games,
    list: jest.fn(async () => games.map((game) => ({ ...game }))),
    findByCode: jest.fn(async (code) => {
      const game = games.find((entry) => entry.code === code);
      return game ? { ...game } : null;
    }),
    create: jest.fn(async (input) => {
      const validation = validateGameInput(input);

      if (!validation.valid) {
        return validation;
      }

      const game = {
        code: `G${String(nextSequence).padStart(3, '0')}`,
        ...validation.value,
      };

      nextSequence += 1;
      games.push(game);

      return { valid: true, game: { ...game } };
    }),
    deleteByCode: jest.fn(async (code) => {
      const index = games.findIndex((entry) => entry.code === code);

      if (index === -1) {
        return false;
      }

      games.splice(index, 1);
      return true;
    }),
  };
}

function cloneUser(user) {
  return {
    ...user,
    emailVerification: { ...user.emailVerification },
  };
}

export function createInMemoryUsersStore(initialUsers = []) {
  let nextSequence = 1;

  function nextId() {
    let id = `user-${nextSequence}`;
    nextSequence += 1;

    while (initialUsers.some((user) => user.id === id)) {
      id = `user-${nextSequence}`;
      nextSequence += 1;
    }

    return id;
  }

  const users = initialUsers.map((user) => cloneUser({
    id: user.id ?? nextId(),
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash,
    emailVerified: user.emailVerified ?? false,
    emailVerification: {
      tokenHash: null,
      expiresAt: null,
      ...user.emailVerification,
    },
    createdAt: user.createdAt ?? new Date(),
  }));

  return {
    users,
    create: jest.fn(async ({ name, email, passwordHash, emailVerification }) => {
      if (users.some((user) => user.email === email)) {
        return { ok: false, reason: 'EMAIL_TAKEN' };
      }

      const user = {
        id: nextId(),
        name,
        email,
        passwordHash,
        emailVerified: false,
        emailVerification: {
          tokenHash: null,
          expiresAt: null,
          ...emailVerification,
        },
        createdAt: new Date(),
      };

      users.push(user);
      return { ok: true, user: cloneUser(user) };
    }),
    findByEmail: jest.fn(async (email) => {
      const user = users.find((entry) => entry.email === email);
      return user ? cloneUser(user) : null;
    }),
    findById: jest.fn(async (id) => {
      const user = users.find((entry) => entry.id === id);
      return user ? cloneUser(user) : null;
    }),
    findByVerificationHash: jest.fn(async (tokenHash) => {
      const user = users.find(
        (entry) => entry.emailVerification.tokenHash === tokenHash,
      );
      return user ? cloneUser(user) : null;
    }),
    markEmailVerified: jest.fn(async (id) => {
      const user = users.find((entry) => entry.id === id);

      if (!user) {
        return false;
      }

      user.emailVerified = true;
      user.emailVerification.tokenHash = null;
      user.emailVerification.expiresAt = null;
      return true;
    }),
    setVerificationToken: jest.fn(async (id, { tokenHash, expiresAt }) => {
      const user = users.find((entry) => entry.id === id);

      if (user) {
        user.emailVerification.tokenHash = tokenHash;
        user.emailVerification.expiresAt = expiresAt;
      }
    }),
  };
}

export function createInMemoryRefreshTokensStore(initialTokens = []) {
  let nextSequence = 1;

  const tokens = initialTokens.map((token) => ({
    id: token.id ?? `refresh-${nextSequence++}`,
    userId: String(token.userId),
    tokenHash: token.tokenHash,
    expiresAt: new Date(token.expiresAt),
    revokedAt: token.revokedAt ? new Date(token.revokedAt) : null,
    replacedByHash: token.replacedByHash ?? null,
  }));

  return {
    tokens,
    create: jest.fn(async ({ userId, tokenHash, expiresAt }) => {
      const token = {
        id: `refresh-${nextSequence++}`,
        userId: String(userId),
        tokenHash,
        expiresAt: new Date(expiresAt),
        revokedAt: null,
        replacedByHash: null,
      };

      tokens.push(token);
      return { ...token };
    }),
    findByHash: jest.fn(async (tokenHash) => {
      const token = tokens.find((entry) => entry.tokenHash === tokenHash);
      return token ? { ...token } : null;
    }),
    revoke: jest.fn(async (tokenHash, replacedByHash = null) => {
      const token = tokens.find((entry) => entry.tokenHash === tokenHash);

      if (!token || token.revokedAt) {
        return false;
      }

      token.revokedAt = new Date();
      token.replacedByHash = replacedByHash;
      return true;
    }),
    revokeAllForUser: jest.fn(async (userId) => {
      for (const token of tokens) {
        if (token.userId === String(userId) && !token.revokedAt) {
          token.revokedAt = new Date();
        }
      }
    }),
  };
}

export function createInMemoryRequestLogsStore(initialEntries = []) {
  const entries = initialEntries.map((entry) => ({ ...entry }));

  return {
    entries,
    create: jest.fn(async (entry) => {
      entries.push({ ...entry });
    }),
    list: jest.fn(async () => entries.map((entry) => ({ ...entry }))),
  };
}
