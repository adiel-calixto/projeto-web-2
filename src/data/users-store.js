import { User } from '../models/user.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegisterInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, message: 'O corpo da requisição deve ser um objeto JSON.' };
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!name) {
    return { valid: false, message: 'O nome é obrigatório.' };
  }

  if (name.length > 100) {
    return { valid: false, message: 'O nome deve ter no máximo 100 caracteres.' };
  }

  if (!email) {
    return { valid: false, message: 'O e-mail é obrigatório.' };
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { valid: false, message: 'Informe um e-mail válido.' };
  }

  if (password.length < 8 || password.length > 72) {
    return { valid: false, message: 'A senha deve ter entre 8 e 72 caracteres.' };
  }

  return { valid: true, value: { name, email, password } };
}

function toInternalUser(document) {
  if (!document) {
    return null;
  }

  return {
    id: String(document._id ?? document.id),
    name: document.name,
    email: document.email,
    passwordHash: document.passwordHash,
    emailVerified: document.emailVerified,
    emailVerification: {
      tokenHash: document.emailVerification?.tokenHash ?? null,
      expiresAt: document.emailVerification?.expiresAt ?? null,
    },
    createdAt: document.createdAt,
  };
}

export function toPublicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: String(user.id ?? user._id),
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
  };
}

export function createUsersStore() {
  return {
    async create({ name, email, passwordHash, emailVerification }) {
      try {
        const created = await User.create({
          name,
          email,
          passwordHash,
          emailVerification,
        });

        return { ok: true, user: toInternalUser(created.toObject()) };
      } catch (error) {
        if (error.code === 11000) {
          return { ok: false, reason: 'EMAIL_TAKEN' };
        }

        throw error;
      }
    },

    async findByEmail(email) {
      const user = await User.findOne({ email }).lean();
      return toInternalUser(user);
    },

    async findById(id) {
      try {
        const user = await User.findById(id).lean();
        return toInternalUser(user);
      } catch (error) {
        if (error.name === 'CastError') {
          return null;
        }

        throw error;
      }
    },

    async findByVerificationHash(tokenHash) {
      const user = await User.findOne({ 'emailVerification.tokenHash': tokenHash }).lean();
      return toInternalUser(user);
    },

    async markEmailVerified(id) {
      const result = await User.updateOne(
        { _id: id },
        {
          $set: {
            emailVerified: true,
            'emailVerification.tokenHash': null,
            'emailVerification.expiresAt': null,
          },
        },
      );

      return result.modifiedCount > 0;
    },

    async setVerificationToken(id, { tokenHash, expiresAt }) {
      await User.updateOne(
        { _id: id },
        {
          $set: {
            'emailVerification.tokenHash': tokenHash,
            'emailVerification.expiresAt': expiresAt,
          },
        },
      );
    },
  };
}
