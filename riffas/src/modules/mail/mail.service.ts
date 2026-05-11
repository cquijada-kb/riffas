import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPaymentConfirmation(options: {
    to: string;
    nombre: string;
    raffleTitulo: string;
    flowOrderId: string;
    montoTotal: number;
    numeros: number[];
  }) {
    const from =
      process.env.MAIL_FROM ?? '"Rifas" <no-reply@rifas-demo.local>';

    const subject = `Confirmacion de pago - ${options.raffleTitulo}`;
    const numerosStr = options.numeros.sort((a, b) => a - b).join(', ');

    const html = `
      <p>Hola <strong>${options.nombre}</strong>,</p>
      <p>Hemos recibido tu pago correctamente para la rifa:</p>
      <ul>
        <li><strong>${options.raffleTitulo}</strong></li>
        <li><strong>Orden Flow:</strong> ${options.flowOrderId}</li>
        <li><strong>Monto total pagado:</strong> $${options.montoTotal}</li>
        <li><strong>Tus numeros:</strong> ${numerosStr}</li>
      </ul>
      <p>Mucha suerte en el sorteo.</p>
      <p>Saludos,<br/>Equipo Rifas</p>
    `;

    const text = `Hola ${options.nombre},

Hemos recibido tu pago correctamente para la rifa:
- ${options.raffleTitulo}
- Orden Flow: ${options.flowOrderId}
- Monto total pagado: $${options.montoTotal}
- Tus numeros: ${numerosStr}

Mucha suerte en el sorteo.

Saludos,
Equipo Rifas
`;

    try {
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject,
        text,
        html,
      });

      this.logger.log(`Correo de confirmacion enviado: ${info.messageId}`);
    } catch (err) {
      this.logger.error('Error enviando correo de confirmacion', err);
    }
  }

  async sendWinnerNotification(options: {
    to: string;
    nombre: string;
    raffleTitulo: string;
    numeroGanador: number;
    fechaSorteo?: Date | string | null;
    codigoVerificacion?: string | null;
  }) {
    const from =
      process.env.MAIL_FROM ?? '"Rifas" <no-reply@rifas-demo.local>';

    const subject = `Ganaste la rifa - ${options.raffleTitulo}`;
    const fechaSorteo = options.fechaSorteo
      ? new Date(options.fechaSorteo).toLocaleString('es-CL')
      : 'Fecha no disponible';

    const html = `
      <p>Hola <strong>${options.nombre}</strong>,</p>
      <p>Tenemos una gran noticia: tu ticket fue seleccionado como ganador.</p>
      <ul>
        <li><strong>Rifa:</strong> ${options.raffleTitulo}</li>
        <li><strong>Numero ganador:</strong> ${options.numeroGanador}</li>
        <li><strong>Fecha del sorteo:</strong> ${fechaSorteo}</li>
        ${options.codigoVerificacion ? `<li><strong>Codigo de verificacion:</strong> ${options.codigoVerificacion}</li>` : ''}
      </ul>
      <p>Nos pondremos en contacto contigo para coordinar la entrega del premio.</p>
      <p>Saludos,<br/>Equipo Rifas</p>
    `;

    const text = `Hola ${options.nombre},

Tenemos una gran noticia: tu ticket fue seleccionado como ganador.

- Rifa: ${options.raffleTitulo}
- Numero ganador: ${options.numeroGanador}
- Fecha del sorteo: ${fechaSorteo}
${options.codigoVerificacion ? `- Codigo de verificacion: ${options.codigoVerificacion}` : ''}

Nos pondremos en contacto contigo para coordinar la entrega del premio.

Saludos,
Equipo Rifas
`;

    try {
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject,
        text,
        html,
      });

      this.logger.log(`Correo de ganador enviado: ${info.messageId}`);
    } catch (err) {
      this.logger.error('Error enviando correo de ganador', err);
    }
  }
}
