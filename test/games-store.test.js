import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGameInput } from '../src/data/games-store.js';

test('game input trims required text and accepts BRL prices to cents', () => {
  assert.deepEqual(validateGameInput({ title: '  Hades  ', price: 49.9, genre: '  Ação ' }), {
    valid: true,
    value: { title: 'Hades', price: 49.9, genre: 'Ação' },
  });
});

test('game input rejects blank fields, non-numeric prices, and more than two decimals', () => {
  for (const input of [
    { title: ' ', price: 10, genre: 'Ação' },
    { title: 'Jogo', price: 10, genre: ' ' },
    { title: 'Jogo', price: '10', genre: 'Ação' },
    { title: 'Jogo', price: -1, genre: 'Ação' },
    { title: 'Jogo', price: 1.234, genre: 'Ação' },
    null,
  ]) {
    assert.equal(validateGameInput(input).valid, false);
  }
});
