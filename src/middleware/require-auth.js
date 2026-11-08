import { verifyAccessToken } from '../auth/tokens.js';

export function createRequireAuth({ secret }) {
  return (req, res, next) => {
    const header = req.get('Authorization') ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ erro: 'Autenticação necessária.' });
    }

    try {
      const payload = verifyAccessToken(token, secret);
      req.user = { id: payload.sub };
      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ erro: 'Token expirado.' });
      }

      return res.status(401).json({ erro: 'Token inválido.' });
    }
  };
}
