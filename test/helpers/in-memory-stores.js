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
