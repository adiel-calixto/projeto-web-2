import { describe, expect, test } from '@jest/globals';
import {
  MAX_COVER_BYTES,
  validateCoverFile,
} from '../../src/storage/image-validation.js';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function fileFrom(buffer, mimetype = 'image/png') {
  return { buffer, size: buffer.length, mimetype };
}

describe('validateCoverFile', () => {
  test('aceita PNG pelo conteúdo real', async () => {
    await expect(validateCoverFile(fileFrom(png))).resolves.toEqual({
      valid: true,
      contentType: 'image/png',
      extension: 'png',
    });
  });

  test('recusa arquivo de texto renomeado para imagem', async () => {
    await expect(validateCoverFile(fileFrom(Buffer.from('não sou uma imagem'), 'image/jpeg')))
      .resolves.toEqual({
        valid: false,
        message: 'Formato inválido. Use JPEG, PNG ou WebP.',
      });
  });

  test('recusa arquivo ausente', async () => {
    await expect(validateCoverFile(undefined)).resolves.toEqual({
      valid: false,
      message: 'Envie a imagem no campo "capa".',
    });
  });

  test('recusa arquivo acima do limite', async () => {
    await expect(validateCoverFile({
      buffer: Buffer.alloc(MAX_COVER_BYTES + 1),
      size: MAX_COVER_BYTES + 1,
      mimetype: 'image/png',
    })).resolves.toEqual({
      valid: false,
      message: 'A imagem excede 5 MB.',
    });
  });
});
