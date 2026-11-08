import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  emailVerification: {
    tokenHash: { type: String, default: null },
    expiresAt: { type: Date, default: null },
  },
  createdAt: { type: Date, default: Date.now },
});

userSchema.index({ 'emailVerification.tokenHash': 1 }, { sparse: true });

export const User = model('User', userSchema, 'Users');
export default User;
