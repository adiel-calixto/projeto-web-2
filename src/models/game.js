import { Schema, model } from 'mongoose';

const gameSchema = new Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  genre: { type: String, required: true, trim: true },
  coverUrl: { type: String, default: null },
});

export const Game = model('Game', gameSchema, 'Games');
export default Game;
