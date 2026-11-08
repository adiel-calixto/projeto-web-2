import multer from 'multer';
import { MAX_COVER_BYTES } from '../storage/image-validation.js';

export const uploadCover = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_COVER_BYTES,
    files: 1,
    fields: 0,
  },
}).single('capa');
