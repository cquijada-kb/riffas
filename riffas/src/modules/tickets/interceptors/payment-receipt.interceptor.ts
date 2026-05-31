import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

export const PaymentReceiptInterceptor = FileInterceptor('comprobante', {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype?.startsWith('image/') ||
      file.mimetype === 'application/pdf';

    if (!allowed) {
      return cb(new Error('Solo se permiten imagenes o PDF'), false);
    }

    cb(null, true);
  },
});
