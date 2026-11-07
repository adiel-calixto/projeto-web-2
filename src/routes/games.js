import { Router } from 'express';
import { renderGamesPdf } from '../pdf/games-pdf.js';

export function createGamesRouter(store) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      res.json(await store.list());
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const result = await store.create(req.body);

      if (!result.valid) {
        return res.status(400).json({ erro: result.message });
      }

      return res.status(201).json(result.game);
    } catch (error) {
      return next(error);
    }
  });

  router.get('/pdf', async (req, res, next) => {
    try {
      const document = renderGamesPdf(await store.list());

      document.on('error', (error) => {
        if (res.headersSent) {
          res.destroy(error);
          return;
        }

        next(error);
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="jogos.pdf"',
      });

      document.pipe(res);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:codigo', async (req, res, next) => {
    try {
      const game = await store.findByCode(req.params.codigo);

      if (!game) {
        return res.status(404).json({ erro: 'Jogo não encontrado.' });
      }

      return res.json(game);
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/:codigo', async (req, res, next) => {
    try {
      if (!(await store.deleteByCode(req.params.codigo))) {
        return res.status(404).json({ erro: 'Jogo não encontrado.' });
      }

      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
