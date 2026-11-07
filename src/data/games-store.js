import { Game } from '../models/game.js';
import { Counter } from '../models/counter.js';

export function validateGameInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, message: 'O corpo da requisição deve ser um objeto JSON.' };
  }

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const genre = typeof input.genre === 'string' ? input.genre.trim() : '';

  if (!title) {
    return { valid: false, message: 'O título é obrigatório.' };
  }

  if (!genre) {
    return { valid: false, message: 'O gênero é obrigatório.' };
  }

  if (
    typeof input.price !== 'number'
    || !Number.isFinite(input.price)
    || input.price < 0
    || Number(input.price.toFixed(2)) !== input.price
  ) {
    return {
      valid: false,
      message: 'O preço deve ser um número não negativo com até duas casas decimais.',
    };
  }

  return {
    valid: true,
    value: { title, price: input.price, genre },
  };
}

function toGame(document) {
  if (!document) {
    return null;
  }

  return {
    code: document.code,
    title: document.title,
    price: document.price,
    genre: document.genre,
  };
}

async function nextCode() {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'gameCode' },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true },
  );

  return `G${String(counter.seq).padStart(3, '0')}`;
}

export function createGamesStore() {
  return {
    async list() {
      const games = await Game.find().lean();
      return games.map(toGame);
    },

    async findByCode(code) {
      const game = await Game.findOne({ code }).lean();
      return toGame(game);
    },

    async create(input) {
      const validation = validateGameInput(input);

      if (!validation.valid) {
        return validation;
      }

      const code = await nextCode();

      const created = await Game.create({
        code,
        ...validation.value,
      });

      return { valid: true, game: toGame(created.toObject()) };
    },

    async deleteByCode(code) {
      const result = await Game.deleteOne({ code });
      return result.deletedCount > 0;
    },
  };
}
