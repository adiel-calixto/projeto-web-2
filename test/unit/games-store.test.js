import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { Counter } from '../../src/models/counter.js';
import { Game } from '../../src/models/game.js';
import { createGamesStore, validateGameInput } from '../../src/data/games-store.js';

const priceMessage = 'O preço deve ser um número não negativo com até duas casas decimais.';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('validateGameInput', () => {
  test('normaliza título e gênero e descarta campos extras', () => {
    expect(validateGameInput({
      code: 'G999',
      title: '  Hades  ',
      price: 49.9,
      genre: '  Ação ',
    })).toEqual({
      valid: true,
      value: { title: 'Hades', price: 49.9, genre: 'Ação' },
    });
  });

  test.each([0, 49.9, 49.99, 100])('aceita o preço %p', (price) => {
    expect(validateGameInput({ title: 'Jogo', price, genre: 'Ação' }).valid).toBe(true);
  });

  test.each([
    ['corpo nulo', null, 'O corpo da requisição deve ser um objeto JSON.'],
    ['array', [], 'O corpo da requisição deve ser um objeto JSON.'],
    ['texto', 'jogo', 'O corpo da requisição deve ser um objeto JSON.'],
    ['título vazio', { title: ' ', price: 10, genre: 'Ação' }, 'O título é obrigatório.'],
    ['título ausente', { price: 10, genre: 'Ação' }, 'O título é obrigatório.'],
    ['gênero vazio', { title: 'Jogo', price: 10, genre: ' ' }, 'O gênero é obrigatório.'],
    ['gênero ausente', { title: 'Jogo', price: 10 }, 'O gênero é obrigatório.'],
    ['preço em texto', { title: 'Jogo', price: '10', genre: 'Ação' }, priceMessage],
    ['preço negativo', { title: 'Jogo', price: -1, genre: 'Ação' }, priceMessage],
    ['preço com três casas', { title: 'Jogo', price: 1.234, genre: 'Ação' }, priceMessage],
    ['preço NaN', { title: 'Jogo', price: Number.NaN, genre: 'Ação' }, priceMessage],
    ['preço infinito', { title: 'Jogo', price: Number.POSITIVE_INFINITY, genre: 'Ação' }, priceMessage],
    ['preço ausente', { title: 'Jogo', genre: 'Ação' }, priceMessage],
  ])('rejeita %s', (_label, input, message) => {
    expect(validateGameInput(input)).toEqual({ valid: false, message });
  });
});

describe('createGamesStore', () => {
  test('lista jogos sem expor campos internos do MongoDB', async () => {
    jest.spyOn(Game, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: '1', __v: 0, code: 'G001', title: 'Hades', price: 49.9, genre: 'Ação' },
      ]),
    });

    await expect(createGamesStore().list()).resolves.toEqual([
      { code: 'G001', title: 'Hades', price: 49.9, genre: 'Ação' },
    ]);
  });

  test('busca pelo código e retorna null quando não encontra', async () => {
    const findOne = jest.spyOn(Game, 'findOne');

    findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue({
        _id: '1',
        code: 'G001',
        title: 'Hades',
        price: 49.9,
        genre: 'Ação',
      }),
    });
    findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue(null),
    });

    const store = createGamesStore();

    await expect(store.findByCode('G001')).resolves.toEqual({
      code: 'G001',
      title: 'Hades',
      price: 49.9,
      genre: 'Ação',
    });
    await expect(store.findByCode('G404')).resolves.toBeNull();
  });

  test('não acessa o banco quando a entrada é inválida', async () => {
    const counter = jest.spyOn(Counter, 'findOneAndUpdate');
    const create = jest.spyOn(Game, 'create');

    const result = await createGamesStore().create({ title: '', price: 10, genre: 'Ação' });

    expect(result).toEqual({ valid: false, message: 'O título é obrigatório.' });
    expect(counter).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  test.each([
    [1, 'G001'],
    [10, 'G010'],
    [999, 'G999'],
  ])('cria jogo com sequência %i formatada como %s', async (sequence, code) => {
    const counter = jest.spyOn(Counter, 'findOneAndUpdate').mockResolvedValue({
      seq: sequence,
    });
    const create = jest.spyOn(Game, 'create').mockResolvedValue({
      toObject: () => ({
        _id: '1',
        code,
        title: 'Hades',
        price: 49.9,
        genre: 'Ação',
      }),
    });

    const result = await createGamesStore().create({
      title: ' Hades ',
      price: 49.9,
      genre: ' Ação ',
    });

    expect(counter).toHaveBeenCalledWith(
      { _id: 'gameCode' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true },
    );
    expect(create).toHaveBeenCalledWith({
      code,
      title: 'Hades',
      price: 49.9,
      genre: 'Ação',
    });
    expect(result).toEqual({
      valid: true,
      game: { code, title: 'Hades', price: 49.9, genre: 'Ação' },
    });
  });

  test('informa se o jogo foi excluído', async () => {
    const deleteOne = jest.spyOn(Game, 'deleteOne');

    deleteOne.mockResolvedValueOnce({ deletedCount: 1 });
    deleteOne.mockResolvedValueOnce({ deletedCount: 0 });

    const store = createGamesStore();

    await expect(store.deleteByCode('G001')).resolves.toBe(true);
    await expect(store.deleteByCode('G404')).resolves.toBe(false);
  });
});
