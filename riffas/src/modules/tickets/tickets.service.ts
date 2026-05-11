import {
  BadRequestException,
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
import { buildFlowSignature } from '../flow/flow-signature.util';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    @InjectModel(Raffle.name)
    private readonly raffleModel: Model<RaffleDocument>,
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

    if (
      dto.cantidad > raffle.limitePorUsuario &&
      raffle.limitePorUsuario > 0
    ) {
      throw new BadRequestException(
        `No puede comprar más de ${raffle.limitePorUsuario} números por compra`,
      );
    }

    const existingTickets = await this.ticketModel
      .find({ raffleId: raffle._id.toString() }, { numero: 1 })
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
        compradorEmail: dto.compradorEmail,
        // flowOrderId se setea después de hablar con Flow
      });
      docs.push(t);
    }

    const saved = await this.ticketModel.insertMany(docs);

    raffle.ticketsVendidos += saved.length;
    await raffle.save();

    const montoTotal = Number(raffle.precioTicket) * saved.length;

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

    // Guardar flowOrderId real en los tickets de esta compra
    await this.ticketModel.updateMany(
      { _id: { $in: saved.map((t) => t._id) } },
      { $set: { flowOrderId } },
    );

    return {
      tickets: saved,
      montoTotal,
      flowOrderId,
      paymentUrl,
    };
  }

  async markTicketsPaidByOrder(flowOrderId: string): Promise<void> {
    if (!flowOrderId) return;
    await this.ticketModel.updateMany(
      { flowOrderId },
      { $set: { estado: 'PAGADO' } },
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
      totalAmount: Number(raffle.precioTicket ?? 0) * tickets.length,
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
        id: groupKey,
        flowOrderId: ticket.flowOrderId || null,
        compradorNombre: ticket.compradorNombre || 'Comprador sin nombre',
        compradorEmail: ticket.compradorEmail || 'Sin correo',
        raffleId: String(ticket.raffleId),
        raffleTitulo: raffle?.titulo || 'Rifa sin titulo',
        cantidadTickets: 0,
        montoTotal: 0,
        estado: 'Pendiente',
        metodo: 'Flow',
        createdAt: ticket.createdAt ?? null,
        updatedAt: ticket.updatedAt ?? null,
      };

      current.cantidadTickets += 1;
      current.montoTotal += Number(raffle?.precioTicket ?? 0);

      if (ticket.estado === 'PAGADO') {
        current.estado = 'Completado';
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
      .filter((item) => item.estado !== 'Completado')
      .reduce((total, item) => total + item.montoTotal, 0);

    return {
      summary: {
        volumen24h,
        transacciones24h: items.filter(
          (item) => item.createdAt && new Date(item.createdAt) >= today,
        ).length,
        pagosPendientes,
        solicitudesPendientes: items.filter((item) => item.estado !== 'Completado').length,
        metodoPredominante: 'Flow',
        totalResultados: items.length,
      },
      items,
    };
  }

  private resolvePublicPaymentStatus(status: string | undefined, tickets: Array<any>) {
    const normalized = String(status ?? '').toUpperCase();

    if (normalized === 'PAID' || normalized === 'FAILED' || normalized === 'PENDING') {
      return normalized;
    }

    if (tickets.every((ticket) => ticket.estado === 'PAGADO')) {
      return 'PAID';
    }

    if (tickets.some((ticket) => ticket.estado === 'RESERVADO')) {
      return 'PENDING';
    }

    return 'FAILED';
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

}
