import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

export const ImagesInterceptor = FilesInterceptor('imagenes', 3, {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB por imagen
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'), false);
    }
    cb(null, true);
  }
});
