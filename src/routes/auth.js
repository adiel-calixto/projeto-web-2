import { Router } from 'express';

export function createAuthRouter({ authService, limiters }) {
  const router = Router();

  router.post('/cadastro', limiters.signup, async (req, res, next) => {
    try {
      const result = await authService.register(req.body);

      if (!result.ok) {
        return res.status(result.status).json({ erro: result.message });
      }

      return res.status(201).json({
        mensagem: 'Cadastro criado. Verifique seu e-mail para ativar a conta.',
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/verificar-email', async (req, res, next) => {
    try {
      const result = await authService.verifyEmail(req.query.token);

      if (!result.ok) {
        return res.status(result.status).json({ erro: result.message });
      }

      return res.json({ mensagem: 'E-mail verificado. Você já pode fazer login.' });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/reenviar-verificacao', limiters.resend, async (req, res, next) => {
    try {
      await authService.resendVerification(req.body?.email);

      return res.status(202).json({
        mensagem: 'Se o e-mail existir e estiver pendente, enviamos um novo link.',
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/login', limiters.login, async (req, res, next) => {
    try {
      const result = await authService.login(req.body);

      if (!result.ok) {
        return res.status(result.status).json({ erro: result.message });
      }

      const { ok, ...tokens } = result;
      return res.json(tokens);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
