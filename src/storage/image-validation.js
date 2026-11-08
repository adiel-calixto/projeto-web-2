import { fileTypeFromBuffer } from 'file-type';

export const MAX_COVER_BYTES = 5 * 1024 * 1024;

const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function validateCoverFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    return { valid: false, message: 'Envie a imagem no campo "capa".' };
  }

  if (file.size > MAX_COVER_BYTES || file.buffer.length > MAX_COVER_BYTES) {
    return { valid: false, message: 'A imagem excede 5 MB.' };
  }

  const detected = await fileTypeFromBuffer(file.buffer);

  if (!detected || !ALLOWED[detected.mime]) {
    return { valid: false, message: 'Formato inválido. Use JPEG, PNG ou WebP.' };
  }

  return {
    valid: true,
    contentType: detected.mime,
    extension: ALLOWED[detected.mime],
  };
}
