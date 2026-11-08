import { hashPassword, verifyPassword } from './passwords.js';
import { generateOpaqueToken, hashToken, signAccessToken } from './tokens.js';
import { validateRegisterInput } from '../data/users-store.js';
import { verificationEmail } from '../mail/templates.js';

const DUMMY_HASH = '$2b$12$ZpA4jyL2LZxwPHZMg7phxeNmsPSAG.Z34RSy/blRuIAe63RB7XhmW';
const INVALID_CREDENTIALS = 'E-mail ou senha inválidos.';
const INVALID_VERIFICATION = 'Link inválido ou expirado.';

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function createAuthService({
  usersStore,
  refreshTokensStore,
  mailer,
  config,
  now = () => new Date(),
}) {
  async function sendVerification(user) {
    const { token, hash } = generateOpaqueToken();
    const expiresAt = addHours(now(), config.emailVerificationTtlHours);

    await usersStore.setVerificationToken(user.id, { tokenHash: hash, expiresAt });

    const link = `${config.appBaseUrl}/auth/verificar-email?token=${encodeURIComponent(token)}`;

    await mailer.send({
      to: user.email,
      ...verificationEmail({ name: user.name, link }),
    });
  }

  async function issueTokens(user) {
    const accessToken = signAccessToken(user, config.jwt);
    const { token: refreshToken, hash } = generateOpaqueToken();

    await refreshTokensStore.create({
      userId: user.id,
      tokenHash: hash,
      expiresAt: addDays(now(), config.refreshTtlDays),
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: config.jwt.accessExpiresIn,
    };
  }

  return {
    async register(input) {
      const validation = validateRegisterInput(input);

      if (!validation.valid) {
        return { ok: false, status: 400, message: validation.message };
      }

      const { name, email, password } = validation.value;
      const passwordHash = await hashPassword(password);
      const result = await usersStore.create({ name, email, passwordHash });

      if (!result.ok) {
        return { ok: false, status: 409, message: 'E-mail já cadastrado.' };
      }

      try {
        await sendVerification(result.user);
      } catch (error) {
        console.error('Falha ao enviar e-mail de verificação:', error);
      }

      return { ok: true };
    },

    async verifyEmail(token) {
      if (typeof token !== 'string' || !token) {
        return { ok: false, status: 400, message: INVALID_VERIFICATION };
      }

      const user = await usersStore.findByVerificationHash(hashToken(token));
      const expiresAt = user?.emailVerification?.expiresAt;

      if (!user || !expiresAt || new Date(expiresAt).getTime() < now().getTime()) {
        return { ok: false, status: 400, message: INVALID_VERIFICATION };
      }

      await usersStore.markEmailVerified(user.id);
      return { ok: true };
    },

    async resendVerification(email) {
      const normalizedEmail = normalizeEmail(email);

      if (normalizedEmail) {
        const user = await usersStore.findByEmail(normalizedEmail);

        if (user && !user.emailVerified) {
          try {
            await sendVerification(user);
          } catch (error) {
            console.error('Falha ao reenviar e-mail de verificação:', error);
          }
        }
      }

      return { ok: true };
    },

    async login({ email, password } = {}) {
      const normalizedEmail = normalizeEmail(email);
      const user = normalizedEmail ? await usersStore.findByEmail(normalizedEmail) : null;
      const passwordHash = user?.passwordHash ?? DUMMY_HASH;
      const passwordOk = await verifyPassword(String(password), passwordHash);

      if (!user || !passwordOk) {
        return { ok: false, status: 401, message: INVALID_CREDENTIALS };
      }

      if (!user.emailVerified) {
        return {
          ok: false,
          status: 403,
          message: 'Confirme seu e-mail antes de entrar.',
        };
      }

      return { ok: true, ...(await issueTokens(user)) };
    },
  };
}
