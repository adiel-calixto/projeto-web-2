import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { renderGamesPdf } from '../pdf/games-pdf.js';
import { validateCoverFile } from '../storage/image-validation.js';

async function deleteStoredCover(storage, url) {
  try {
    await storage.deleteByUrl(url);
  } catch (error) {
    console.error('Falha ao apagar capa do S3:', error);
  }
}

export function createGamesRouter(store, {
  requireAuth,
  storage,
  uploadCover,
}) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      res.json(await store.list());
    } catch (error) {
      next(error);
    }
  });

  router.post('/', requireAuth, async (req, res, next) => {
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

  router.put('/:codigo/capa', requireAuth, uploadCover, async (req, res, next) => {
    try {
      const game = await store.findByCode(req.params.codigo);

      if (!game) {
        return res.status(404).json({ erro: 'Jogo não encontrado.' });
      }

      const validation = await validateCoverFile(req.file);

      if (!validation.valid) {
        return res.status(400).json({ erro: validation.message });
      }

      const key = `games/${game.code}/${randomUUID()}.${validation.extension}`;
      const { url } = await storage.upload({
        key,
        body: req.file.buffer,
        contentType: validation.contentType,
      });

      let updated;

      try {
        updated = await store.setCover(game.code, url);
      } catch (error) {
        await deleteStoredCover(storage, url);
        throw error;
      }

      if (!updated.found) {
        await deleteStoredCover(storage, url);
        return res.status(404).json({ erro: 'Jogo não encontrado.' });
      }

      if (updated.previousUrl) {
        await deleteStoredCover(storage, updated.previousUrl);
      }

      return res.json({ ...game, coverUrl: url });
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/:codigo/capa', requireAuth, async (req, res, next) => {
    try {
      const game = await store.findByCode(req.params.codigo);

      if (!game) {
        return res.status(404).json({ erro: 'Jogo não encontrado.' });
      }

      if (!game.coverUrl) {
        return res.status(404).json({ erro: 'O jogo não possui capa.' });
      }

      const updated = await store.clearCover(game.code);

      if (updated.previousUrl) {
        await deleteStoredCover(storage, updated.previousUrl);
      }

      return res.status(204).end();
    } catch (error) {
      return next(error);
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

  router.delete('/:codigo', requireAuth, async (req, res, next) => {
    try {
      const game = await store.findByCode(req.params.codigo);

      if (!(await store.deleteByCode(req.params.codigo))) {
        return res.status(404).json({ erro: 'Jogo não encontrado.' });
      }

      if (game?.coverUrl) {
        await deleteStoredCover(storage, game.coverUrl);
      }

      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
