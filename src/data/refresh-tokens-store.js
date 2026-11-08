import { RefreshToken } from '../models/refresh-token.js';

function toRefreshToken(document) {
  if (!document) {
    return null;
  }

  return {
    id: String(document._id ?? document.id),
    userId: String(document.userId),
    tokenHash: document.tokenHash,
    expiresAt: document.expiresAt,
    revokedAt: document.revokedAt ?? null,
    replacedByHash: document.replacedByHash ?? null,
  };
}

export function createRefreshTokensStore() {
  return {
    async create({ userId, tokenHash, expiresAt }) {
      const created = await RefreshToken.create({ userId, tokenHash, expiresAt });
      return toRefreshToken(created.toObject());
    },

    async findByHash(tokenHash) {
      const token = await RefreshToken.findOne({ tokenHash }).lean();
      return toRefreshToken(token);
    },

    async revoke(tokenHash, replacedByHash = null) {
      const update = { revokedAt: new Date() };

      if (replacedByHash) {
        update.replacedByHash = replacedByHash;
      }

      await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { $set: update });
    },

    async revokeAllForUser(userId) {
      await RefreshToken.updateMany(
        { userId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
    },
  };
}
