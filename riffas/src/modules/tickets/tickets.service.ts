import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ticket, TicketDocument } from './ticket.schema';
import { Raffle, RaffleDocument } from '../raffles/raffle.schema';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { RaffleStatus } from '../../common/enums/raffle-status.enum';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { createHmac, timingSafeEqual } from 'crypto';
import { buildFlowSignature } from '../flow/flow-signature.util';
import { S3Service } from '../storage/s3.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    @InjectModel(Raffle.name)
    private readonly raffleModel: Model<RaffleDocument>,
    private readonly s3Service: S3Service,
    private readonly mailService: MailService,
  ) {}

  async createPurchase(
    raffleId: string,
    dto: CreatePurchaseDto,
  ): Promise<{
    tickets: TicketDocument[];
    montoTotal: number;
    flowOrderId: string;
    paymentUrl: string;
  }> {
    const raffle = await this.raffleModel.findById(raffleId).exec();
    if (!raffle) throw new NotFoundException('Rifa no encontrada');
    if (raffle.estado !== RaffleStatus.ACTIVA) {
      throw new BadRequestException(
        `La rifa no está activa para comprar (estado actual: ${raffle.estado})`,
      );
    }

    const now = new Date();
    const fechaInicioVenta = (raffle as any).fechaInicioVenta
      ? new Date((raffle as any).fechaInicioVenta)
      : null;
    const fechaTerminoVenta = (raffle as any).fechaTerminoVenta
      ? new Date((raffle as any).fechaTerminoVenta)
      : null;

    if (fechaInicioVenta && now < fechaInicioVenta) {
      throw new BadRequestException('La venta de tickets aun no comienza');
    }

    if (fechaTerminoVenta && now > fechaTerminoVenta) {
      throw new BadRequestException('La venta de tickets ya termino');
    }

    if (
      dto.cantidad > raffle.limitePorUsuario &&
      raffle.limitePorUsuario > 0
    ) {
      throw new BadRequestException(
        `No puede comprar más de ${raffle.limitePorUsuario} números por compra`,
      );
    }

    const existingTickets = await this.ticketModel
      .find(
        {
          raffleId: raffle._id.toString(),
          estado: { $ne: 'RECHAZADO' },
        },
        { numero: 1 },
      )
      .exec();

    const usados = new Set(existingTickets.map((t) => t.numero));
    const disponibles: number[] = [];

    for (let n = 1; n <= raffle.totalTickets; n++) {
      if (!usados.has(n)) disponibles.push(n);
    }

    if (dto.cantidad > disponibles.length) {
      throw new BadRequestException(
        `Solo quedan ${disponibles.length} números disponibles`,
      );
    }

    // Mezclar para asignar al azar
    for (let i = disponibles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [disponibles[i], disponibles[j]] = [disponibles[j], disponibles[i]];
    }

    const seleccionados = disponibles.slice(0, dto.cantidad);
    const docs: TicketDocument[] = [];

    for (const numero of seleccionados) {
      const t = new this.ticketModel({
        raffleId: raffle._id.toString(),
        numero,
        estado: 'RESERVADO',
        compradorNombre: dto.compradorNombre,
        compradorEmail: dto.compradorEmail.toLowerCase().trim(),
        compradorTelefono: dto.compradorTelefono,
        compradorRut: dto.compradorRut,
        compradorCiudad: dto.compradorCiudad,
        // flowOrderId se setea después de hablar con Flow
      });
      docs.push(t);
    }

    const saved = await this.ticketModel.insertMany(docs);

    raffle.ticketsVendidos += saved.length;
    await raffle.save();

    const selectedPackage = this.resolvePackage(raffle, dto);
    const montoTotal = selectedPackage
      ? selectedPackage.precio
      : Number(raffle.precioTicket) * saved.length;

    // ==============================
    // INTEGRACIÓN FLOW SANDBOX REAL
    // ==============================

    const apiKey = process.env.FLOW_API_KEY;
    const secretKey = process.env.FLOW_SECRET_KEY;
    const baseUrl = process.env.FLOW_BASE_URL || 'https://sandbox.flow.cl';
    const urlConfirmation =
      process.env.FLOW_CONFIRM_URL || 'https://55h8q0sh-3000.brs.devtunnels.ms/api/flow/callback';
    const urlReturn = process.env.FLOW_RETURN_URL || 'http://localhost:4200/flow/retorno';

    if (!apiKey || !secretKey) {
      await this.rollbackReservedTickets(raffle, saved as any);
      throw new BadRequestException(
        'Flow no configurado (falta FLOW_API_KEY o FLOW_SECRET_KEY)',
      );
    }

    const commerceOrder = `RIFA-${raffle._id}-${Date.now()}`;

    const currency = 'CLP'; // o saca de process.env si quieres

    const flowParams: Record<string, string | number> = {
      apiKey,
      commerceOrder,
      subject: raffle.titulo,
      currency, // 👈 OBLIGATORIO PARA FLOW
      amount: Math.round(montoTotal),
      email: dto.compradorEmail,
      urlConfirmation,
      urlReturn,
    };


    const signature = buildFlowSignature(flowParams, secretKey);

    const body = new URLSearchParams({
      ...Object.keys(flowParams).reduce(
        (acc, key) => ({
          ...acc,
          [key]: String(flowParams[key]),
        }),
        {} as Record<string, string>,
      ),
      s: signature,
    });

     let paymentUrl: string;
    let flowOrderId: string;

    try {
      const resp = await axios.post(
        `${baseUrl}/api/payment/create`,
        body.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      // 👇 Flow te está devolviendo: { token, url, flowOrder }
      const data = resp.data;

      // URL final para redirigir al cliente
      paymentUrl = `${data.url}?token=${data.token}`;

      // Este es el identificador de la orden en Flow
      flowOrderId = String(data.flowOrder);

      if (!paymentUrl || !flowOrderId) {
        throw new Error('Respuesta de Flow incompleta');
      }
    } catch (err: any) {
      await this.rollbackReservedTickets(raffle, saved as any);

      const flowMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data?.description ||
        err.message ||
        'Error desconocido de Flow';

      // eslint-disable-next-line no-console
      console.error(
        'Error al crear pago en Flow:',
        err.response?.status,
        err.response?.data,
      );

      throw new BadRequestException(
        `Error al crear la orden de pago en Flow: ${flowMessage}`,
      );
    }

    // Guardar datos de la orden real en todos los tickets de esta compra.
    await this.ticketModel.updateMany(
      { _id: { $in: saved.map((t) => t._id) } },
      {
        $set: {
          flowOrderId,
          metodoPago: 'Flow',
          estado: 'PENDIENTE',
          montoPagoTotal: montoTotal,
          paqueteCantidad: selectedPackage?.cantidad ?? saved.length,
          paquetePrecio: selectedPackage?.precio ?? montoTotal,
        },
      },
    );

    return {
      tickets: saved,
      montoTotal,
      flowOrderId,
      paymentUrl,
    };
  }

  async createManualPurchase(
    raffleId: string,
    dto: any,
    file?: Express.Multer.File,
  ) {
    const raffle = await this.raffleModel.findById(raffleId).exec();
    if (!raffle) throw new NotFoundException('Rifa no encontrada');
    this.ensureRaffleCanSell(raffle);

    const cantidad = Number(dto.cantidad ?? 0);
    if (!cantidad || cantidad < 1) {
      throw new BadRequestException('La cantidad de tickets es requerida');
    }

    if (
      cantidad > raffle.limitePorUsuario &&
      raffle.limitePorUsuario > 0
    ) {
      throw new BadRequestException(
        `No puede comprar más de ${raffle.limitePorUsuario} números por compra`,
      );
    }

    const compradorNombre = String(dto.compradorNombre ?? '').trim();
    const compradorEmail = String(dto.compradorEmail ?? '').toLowerCase().trim();

    if (!compradorNombre || !compradorEmail) {
      throw new BadRequestException('Nombre y correo son requeridos');
    }

    const existingTickets = await this.ticketModel
      .find(
        {
          raffleId: raffle._id.toString(),
          estado: { $ne: 'RECHAZADO' },
        },
        { numero: 1 },
      )
      .exec();

    const usados = new Set(existingTickets.map((ticket) => ticket.numero));
    const disponibles: number[] = [];

    for (let numero = 1; numero <= raffle.totalTickets; numero++) {
      if (!usados.has(numero)) disponibles.push(numero);
    }

    if (cantidad > disponibles.length) {
      throw new BadRequestException(
        `Solo quedan ${disponibles.length} números disponibles`,
      );
    }

    for (let i = disponibles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [disponibles[i], disponibles[j]] = [disponibles[j], disponibles[i]];
    }

    const selectedPackage = this.resolvePackage(raffle, {
      ...dto,
      cantidad,
    } as CreatePurchaseDto);
    const montoTotal = selectedPackage
      ? selectedPackage.precio
      : Number(raffle.precioTicket) * cantidad;
    const manualOrderId = `MANUAL-${raffle._id}-${Date.now()}`;

    let comprobanteUrl = String(dto.comprobanteUrl ?? '').trim();
    if (file) {
      const extension = this.getFileExtension(file.originalname, file.mimetype);
      const key = `payments/${manualOrderId}/comprobante-${Date.now()}${extension}`;
      comprobanteUrl = await this.s3Service.uploadImage(
        file.buffer,
        file.mimetype,
        key,
      );
    }

    const seleccionados = disponibles.slice(0, cantidad);
    const docs = seleccionados.map((numero) => new this.ticketModel({
      raffleId: raffle._id.toString(),
      numero,
      estado: 'PENDIENTE',
      compradorNombre,
      compradorEmail,
      compradorTelefono: dto.compradorTelefono,
      compradorRut: dto.compradorRut,
      compradorCiudad: dto.compradorCiudad,
      flowOrderId: manualOrderId,
      metodoPago: 'Transferencia',
      comprobanteUrl: comprobanteUrl || undefined,
      montoPagoTotal: montoTotal,
      paqueteCantidad: selectedPackage?.cantidad ?? cantidad,
      paquetePrecio: selectedPackage?.precio ?? montoTotal,
    }));

    const saved = await this.ticketModel.insertMany(docs);
    raffle.ticketsVendidos += saved.length;
    await raffle.save();

    return {
      ok: true,
      status: 'PENDING',
      flowOrderId: manualOrderId,
      paymentId: manualOrderId,
      quantity: saved.length,
      totalAmount: montoTotal,
      numbers: saved.map((ticket) => ticket.numero).sort((a, b) => a - b),
      comprobanteUrl: comprobanteUrl || null,
      message: 'Compra recibida. Revisaremos el comprobante para confirmar tus tickets.',
    };
  }

  async markTicketsPaidByOrder(flowOrderId: string): Promise<void> {
    if (!flowOrderId) return;
    await this.ticketModel.updateMany(
      { flowOrderId },
      { $set: { estado: 'PAGADO', paidAt: new Date() } },
    );
  }

  async findTicketsByFlowOrder(flowOrderId: string) {
    return this.ticketModel.find({ flowOrderId }).exec();
  }

  async getPublicPaymentResult(flowOrderId: string, status?: string) {
    if (!flowOrderId) {
      throw new BadRequestException('flowOrderId es requerido');
    }

    const tickets = await this.ticketModel.find({ flowOrderId }).lean().exec();
    if (!tickets.length) {
      throw new NotFoundException('No se encontraron tickets para esta orden');
    }

    const raffle = await this.raffleModel.findById(String(tickets[0].raffleId)).lean().exec();
    if (!raffle) {
      throw new NotFoundException('Rifa no encontrada para esta orden');
    }

    const normalizedStatus = this.resolvePublicPaymentStatus(status, tickets as Array<any>);

    return {
      ok: true,
      status: normalizedStatus,
      flowOrderId,
      raffleId: String(raffle._id),
      quantity: tickets.length,
      totalAmount:
        Number((tickets[0] as any).montoPagoTotal ?? 0) ||
        Number(raffle.precioTicket ?? 0) * tickets.length,
      numbers: (tickets as Array<any>).map((ticket) => Number(ticket.numero ?? 0)).sort((a, b) => a - b),
      message: this.getPublicPaymentMessage(normalizedStatus),
    };
  }

  async getAdminPayments() {
    const [tickets, raffles] = await Promise.all([
      this.ticketModel.find().sort({ createdAt: -1 }).lean().exec(),
      this.raffleModel.find().lean().exec(),
    ]);

    const raffleById = new Map(
      raffles.map((raffle: any) => [String(raffle._id), raffle]),
    );

    const grouped = new Map<string, any>();

    for (const ticket of tickets as Array<any>) {
      const groupKey =
        ticket.flowOrderId ||
        `${ticket.raffleId}-${ticket.compradorEmail || 'sin-email'}-${new Date(
          ticket.createdAt ?? Date.now(),
        ).toISOString()}`;

      const raffle = raffleById.get(String(ticket.raffleId));
      const current = grouped.get(groupKey) ?? {
        id: ticket.flowOrderId || String(ticket._id),
        flowOrderId: ticket.flowOrderId || null,
        compradorNombre: ticket.compradorNombre || 'Comprador sin nombre',
        compradorEmail: ticket.compradorEmail || 'Sin correo',
        compradorTelefono: ticket.compradorTelefono || '',
        compradorRut: ticket.compradorRut || '',
        compradorCiudad: ticket.compradorCiudad || '',
        raffleId: String(ticket.raffleId),
        raffleTitulo: raffle?.titulo || 'Rifa sin titulo',
        cantidadTickets: 0,
        montoTotal: 0,
        estado: 'Pendiente',
        metodo: ticket.metodoPago || 'Flow',
        referenciaPago: ticket.referenciaPago || null,
        comprobanteUrl: ticket.comprobanteUrl || null,
        createdAt: ticket.createdAt ?? null,
        updatedAt: ticket.updatedAt ?? null,
        numeros: [],
        rawTicketText: '',
      };

      current.cantidadTickets += 1;
      current.numeros.push(Number(ticket.numero ?? 0));
      current.rawTicketText = current.numeros
        .sort((a: number, b: number) => a - b)
        .join(', ');
      current.montoTotal =
        Number(ticket.montoPagoTotal ?? 0) ||
        current.montoTotal + Number(raffle?.precioTicket ?? 0);

      if (ticket.estado === 'PAGADO') {
        current.estado = 'Completado';
      }

      if (ticket.estado === 'RECHAZADO') {
        current.estado = 'Rechazado';
      }

      const updatedAt = ticket.updatedAt ?? ticket.createdAt ?? null;
      if (updatedAt && (!current.updatedAt || new Date(updatedAt) > new Date(current.updatedAt))) {
        current.updatedAt = updatedAt;
      }

      grouped.set(groupKey, current);
    }

    const items = Array.from(grouped.values()).sort((a, b) => {
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const volumen24h = items
      .filter((item) => item.createdAt && new Date(item.createdAt) >= today)
      .reduce((total, item) => total + item.montoTotal, 0);

    const pagosPendientes = items
      .filter((item) => item.estado === 'Pendiente')
      .reduce((total, item) => total + item.montoTotal, 0);

    return {
      summary: {
        volumen24h,
        transacciones24h: items.filter(
          (item) => item.createdAt && new Date(item.createdAt) >= today,
        ).length,
        pagosPendientes,
        solicitudesPendientes: items.filter((item) => item.estado === 'Pendiente').length,
        metodoPredominante: 'Flow',
        totalResultados: items.length,
      },
      items,
    };
  }

  async getTicketsByRaffle(raffleId: string, status?: string) {
    const raffle = await this.raffleModel.findById(raffleId).lean().exec();
    if (!raffle) throw new NotFoundException('Rifa no encontrada');

    const tickets = await this.ticketModel
      .find({ raffleId: String(raffle._id), estado: { $ne: 'RECHAZADO' } })
      .lean()
      .exec();

    const ticketByNumber = new Map(
      (tickets as Array<any>).map((ticket) => [Number(ticket.numero), ticket]),
    );

    const items = Array.from(
      { length: Number(raffle.totalTickets ?? 0) },
      (_, index) => {
        const numero = index + 1;
        const ticket = ticketByNumber.get(numero);
        const estado = this.mapTicketGridStatus(ticket?.estado);

        return {
          ticketId: ticket?._id ? String(ticket._id) : null,
          raffleId: String(raffle._id),
          numero,
          estado,
          compradorNombre: ticket?.compradorNombre ?? '',
          compradorEmail: ticket?.compradorEmail ?? '',
          compradorTelefono: ticket?.compradorTelefono ?? '',
          compradorRut: ticket?.compradorRut ?? '',
          compradorCiudad: ticket?.compradorCiudad ?? '',
          flowOrderId: ticket?.flowOrderId ?? null,
          referenciaPago: ticket?.referenciaPago ?? null,
          montoPagoTotal: ticket?.montoPagoTotal ?? null,
          createdAt: ticket?.createdAt ?? null,
          updatedAt: ticket?.updatedAt ?? null,
        };
      },
    );

    const normalizedStatus = String(status ?? 'TODOS').toUpperCase();
    const filtered =
      normalizedStatus === 'TODOS'
        ? items
        : items.filter((item) => item.estado === normalizedStatus);

    return {
      raffle: {
        id: String(raffle._id),
        titulo: raffle.titulo,
        totalTickets: Number(raffle.totalTickets ?? 0),
      },
      summary: {
        total: items.length,
        vendidos: items.filter((item) => item.estado === 'VENDIDO').length,
        porVerificar: items.filter((item) => item.estado === 'POR_VERIFICAR')
          .length,
        disponibles: items.filter((item) => item.estado === 'DISPONIBLE').length,
      },
      items: filtered,
    };
  }

  async getPublicTicketsByEmail(email: string) {
    const normalizedEmail = String(email ?? '').toLowerCase().trim();
    this.ensureValidEmail(normalizedEmail);

    const [tickets, raffles] = await Promise.all([
      this.ticketModel
        .find({ compradorEmail: normalizedEmail, estado: { $ne: 'RECHAZADO' } })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.raffleModel.find().lean().exec(),
    ]);

    const raffleById = new Map(
      (raffles as Array<any>).map((raffle) => [String(raffle._id), raffle]),
    );

    const items = (tickets as Array<any>).map((ticket) => {
      const raffle = raffleById.get(String(ticket.raffleId));
      return {
        ticketId: String(ticket._id),
        raffleId: String(ticket.raffleId),
        raffleTitulo: raffle?.titulo ?? 'Sorteo',
        raffleImagen: Array.isArray(raffle?.imagenes) ? raffle.imagenes[0] ?? '' : '',
        stickers: Array.isArray(raffle?.stickers) ? raffle.stickers : [],
        numero: Number(ticket.numero ?? 0),
        estado: this.mapTicketGridStatus(ticket.estado),
        compradorNombre: ticket.compradorNombre ?? '',
        compradorEmail: ticket.compradorEmail ?? '',
        flowOrderId: ticket.flowOrderId ?? null,
        createdAt: ticket.createdAt ?? null,
      };
    });

    return {
      ok: true,
      email: normalizedEmail,
      total: items.length,
      items,
    };
  }

  async requestPublicTicketLookup(email: string) {
    const normalizedEmail = String(email ?? '').toLowerCase().trim();
    this.ensureValidEmail(normalizedEmail);

    const expiresMinutes = 30;
    const token = this.signLookupToken(
      normalizedEmail,
      Date.now() + expiresMinutes * 60 * 1000,
    );
    const publicUrl = (process.env.PUBLIC_FRONTEND_URL || 'http://localhost')
      .replace(/\/+$/, '');
    const verificationUrl = `${publicUrl}/consultar-stickers?token=${encodeURIComponent(token)}`;

    try {
      await this.mailService.sendTicketLookupVerification({
        to: normalizedEmail,
        verificationUrl,
        expiresMinutes,
      });
    } catch {
      throw new InternalServerErrorException(
        'No pudimos enviar el correo de verificacion. Intenta nuevamente en unos minutos.',
      );
    }

    return {
      ok: true,
      message:
        'Si el correo existe en nuestras compras, enviamos un link para consultar tus stickers.',
    };
  }

  async getPublicTicketsByLookupToken(token: string) {
    const email = this.verifyLookupToken(token);
    return this.getPublicTicketsByEmail(email);
  }

  async getPaymentDetail(paymentId: string) {
    const tickets = await this.findPaymentTickets(paymentId);
    if (!tickets.length) throw new NotFoundException('Pago no encontrado');

    const first = tickets[0] as any;
    const raffle = await this.raffleModel
      .findById(String(first.raffleId))
      .lean()
      .exec();

    return {
      id: first.flowOrderId || String(first._id),
      flowOrderId: first.flowOrderId || null,
      estado: this.resolveAdminPaymentStatus(tickets as Array<any>),
      compradorNombre: first.compradorNombre || 'Comprador sin nombre',
      compradorEmail: first.compradorEmail || 'Sin correo',
      compradorTelefono: first.compradorTelefono || '',
      compradorRut: first.compradorRut || '',
      compradorCiudad: first.compradorCiudad || '',
      raffleId: String(first.raffleId),
      raffleTitulo: raffle?.titulo || 'Rifa sin titulo',
      cantidadTickets: tickets.length,
      numeros: tickets
        .map((ticket: any) => Number(ticket.numero ?? 0))
        .sort((a, b) => a - b),
      montoTotal:
        Number(first.montoPagoTotal ?? 0) ||
        Number(raffle?.precioTicket ?? 0) * tickets.length,
      metodo: first.metodoPago || 'Flow',
      referenciaPago: first.referenciaPago || null,
      comprobanteUrl: first.comprobanteUrl
        ? `/api/admin/payments/${encodeURIComponent(first.flowOrderId || String(first._id))}/receipt/view`
        : null,
      comprobanteOriginalUrl: first.comprobanteUrl || null,
      createdAt: first.createdAt ?? null,
      updatedAt: first.updatedAt ?? null,
    };
  }

  async confirmPayment(paymentId: string, body: any) {
    const tickets = await this.findPaymentTickets(paymentId);
    if (!tickets.length) throw new NotFoundException('Pago no encontrado');

    await this.ticketModel.updateMany(
      { _id: { $in: tickets.map((ticket: any) => ticket._id) } },
      {
        $set: {
          estado: 'PAGADO',
          referenciaPago: body?.referenciaPago || body?.reference || '',
          comprobanteUrl: body?.comprobanteUrl || undefined,
          paidAt: new Date(),
        },
      },
    );

    return this.getPaymentDetail(paymentId);
  }

  async uploadPaymentReceipt(paymentId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('El comprobante es requerido');
    }

    const tickets = await this.findPaymentTickets(paymentId);
    if (!tickets.length) throw new NotFoundException('Pago no encontrado');

    const extension = this.getFileExtension(file.originalname, file.mimetype);
    const safePaymentId = paymentId.replace(/[^a-zA-Z0-9-_]/g, '');
    const key = `payments/${safePaymentId}/comprobante-${Date.now()}${extension}`;
    const comprobanteUrl = await this.s3Service.uploadImage(
      file.buffer,
      file.mimetype,
      key,
    );

    await this.ticketModel.updateMany(
      { _id: { $in: tickets.map((ticket: any) => ticket._id) } },
      { $set: { comprobanteUrl } },
    );

    return this.getPaymentDetail(paymentId);
  }

  async getPaymentReceipt(paymentId: string) {
    const tickets = await this.findPaymentTickets(paymentId);
    if (!tickets.length) throw new NotFoundException('Pago no encontrado');

    const receiptUrl = (tickets[0] as any).comprobanteUrl;
    if (!receiptUrl) {
      throw new NotFoundException('Comprobante no encontrado');
    }

    return this.s3Service.getObjectByUrl(receiptUrl);
  }

  async rejectPayment(paymentId: string) {
    const tickets = await this.findPaymentTickets(paymentId);
    if (!tickets.length) throw new NotFoundException('Pago no encontrado');

    await this.ticketModel.updateMany(
      { _id: { $in: tickets.map((ticket: any) => ticket._id) } },
      { $set: { estado: 'RECHAZADO', rejectedAt: new Date() } },
    );

    const countsByRaffle = new Map<string, number>();
    for (const ticket of tickets as Array<any>) {
      countsByRaffle.set(
        String(ticket.raffleId),
        (countsByRaffle.get(String(ticket.raffleId)) ?? 0) + 1,
      );
    }

    await Promise.all(
      Array.from(countsByRaffle.entries()).map(([id, count]) =>
        this.raffleModel
          .findByIdAndUpdate(id, { $inc: { ticketsVendidos: -count } })
          .exec(),
      ),
    );

    return { ok: true, rejected: tickets.length };
  }

  private resolvePublicPaymentStatus(status: string | undefined, tickets: Array<any>) {
    const normalized = String(status ?? '').toUpperCase();

    if (normalized === 'PAID' || normalized === 'FAILED' || normalized === 'PENDING') {
      return normalized;
    }

    if (tickets.every((ticket) => ticket.estado === 'PAGADO')) {
      return 'PAID';
    }

    if (tickets.some((ticket) => ['RESERVADO', 'PENDIENTE'].includes(ticket.estado))) {
      return 'PENDING';
    }

    return 'FAILED';
  }

  private signLookupToken(email: string, expiresAt: number) {
    const payload = Buffer.from(
      JSON.stringify({ email, exp: expiresAt }),
      'utf8',
    ).toString('base64url');
    const signature = this.signPayload(payload);
    return `${payload}.${signature}`;
  }

  private ensureValidEmail(email: string) {
    if (!email) throw new BadRequestException('email es requerido');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('email no valido');
    }
  }

  private verifyLookupToken(token: string) {
    const [payload, signature] = String(token ?? '').split('.');
    if (!payload || !signature) {
      throw new BadRequestException('Link de verificacion invalido');
    }

    const expected = this.signPayload(payload);
    const valid =
      signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    if (!valid) {
      throw new BadRequestException('Link de verificacion invalido');
    }

    let decoded: { email?: string; exp?: number };
    try {
      decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Link de verificacion invalido');
    }

    if (!decoded.email || !decoded.exp || Date.now() > Number(decoded.exp)) {
      throw new BadRequestException('Link de verificacion vencido');
    }

    return String(decoded.email).toLowerCase().trim();
  }

  private signPayload(payload: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new BadRequestException('JWT_SECRET no configurado para verificar correos');
    }

    return createHmac('sha256', secret).update(payload).digest('base64url');
  }

  private getPublicPaymentMessage(status: 'PAID' | 'FAILED' | 'PENDING') {
    if (status === 'PAID') {
      return 'Pago confirmado correctamente.';
    }

    if (status === 'PENDING') {
      return 'Tu pago se encuentra pendiente de confirmacion.';
    }

    return 'El pago no pudo completarse o fue cancelado.';
  }

  private resolvePackage(raffle: RaffleDocument, dto: CreatePurchaseDto) {
    const packages = ((raffle as any).paquetes ?? []) as Array<any>;
    if (!packages.length) return null;

    if (dto.paqueteId !== undefined) {
      const byIndex = packages[Number(dto.paqueteId)];
      if (byIndex && Number(byIndex.cantidad) === Number(dto.cantidad)) {
        return {
          cantidad: Number(byIndex.cantidad),
          precio: Number(byIndex.precio),
        };
      }
    }

    const byQuantity = packages.find(
      (item) => Number(item.cantidad) === Number(dto.cantidad),
    );

    return byQuantity
      ? {
          cantidad: Number(byQuantity.cantidad),
          precio: Number(byQuantity.precio),
        }
      : null;
  }

  private ensureRaffleCanSell(raffle: RaffleDocument) {
    if (raffle.estado !== RaffleStatus.ACTIVA) {
      throw new BadRequestException(
        `La rifa no está activa para comprar (estado actual: ${raffle.estado})`,
      );
    }

    const now = new Date();
    const fechaInicioVenta = (raffle as any).fechaInicioVenta
      ? new Date((raffle as any).fechaInicioVenta)
      : null;
    const fechaTerminoVenta = (raffle as any).fechaTerminoVenta
      ? new Date((raffle as any).fechaTerminoVenta)
      : null;

    if (fechaInicioVenta && now < fechaInicioVenta) {
      throw new BadRequestException('La venta de tickets aun no comienza');
    }

    if (fechaTerminoVenta && now > fechaTerminoVenta) {
      throw new BadRequestException('La venta de tickets ya termino');
    }
  }

  private mapTicketGridStatus(status?: string) {
    if (status === 'PAGADO') return 'VENDIDO';
    if (status === 'RESERVADO' || status === 'PENDIENTE') {
      return 'POR_VERIFICAR';
    }
    return 'DISPONIBLE';
  }

  private resolveAdminPaymentStatus(tickets: Array<any>) {
    if (tickets.every((ticket) => ticket.estado === 'PAGADO')) {
      return 'Completado';
    }

    if (tickets.every((ticket) => ticket.estado === 'RECHAZADO')) {
      return 'Rechazado';
    }

    return 'Pendiente';
  }

  private async findPaymentTickets(paymentId: string) {
    const byOrder = await this.ticketModel
      .find({ flowOrderId: paymentId })
      .sort({ numero: 1 })
      .lean()
      .exec();

    if (byOrder.length) return byOrder;

    const byTicket = await this.ticketModel.findById(paymentId).lean().exec();
    return byTicket ? [byTicket] : [];
  }

  private async rollbackReservedTickets(
    raffle: RaffleDocument,
    tickets: TicketDocument[],
  ) {
    await this.ticketModel.deleteMany({
      _id: { $in: tickets.map((ticket) => ticket._id) },
    });
    raffle.ticketsVendidos = Math.max(0, raffle.ticketsVendidos - tickets.length);
    await raffle.save();
  }

  private getFileExtension(filename: string | undefined, mimeType: string) {
    const fromName = filename?.match(/\.[a-zA-Z0-9]+$/)?.[0];
    if (fromName) return fromName.toLowerCase();
    if (mimeType === 'application/pdf') return '.pdf';
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/webp') return '.webp';
    return '.jpg';
  }

}
