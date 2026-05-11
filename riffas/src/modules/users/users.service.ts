import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { Ticket, TicketDocument } from '../tickets/ticket.schema';
import { Raffle, RaffleDocument } from '../raffles/raffle.schema';
import { RaffleStatus } from '../../common/enums/raffle-status.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    @InjectModel(Raffle.name)
    private readonly raffleModel: Model<RaffleDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = new this.userModel({
      nombre: dto.nombre,
      email: dto.email.toLowerCase(),
      passwordHash,
      rol: dto.rol ?? 'CLIENTE',
    });
    return created.save();
  }

  async findAllWithSummary() {
    const [users, tickets, raffles] = await Promise.all([
      this.userModel.find().sort({ createdAt: -1 }).lean().exec(),
      this.ticketModel.find().lean().exec(),
      this.raffleModel.find().lean().exec(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ticketsByEmail = new Map<
      string,
      { tickets: number; raffleIds: Set<string>; lastActivity: Date | null }
    >();

    for (const ticket of tickets as Array<any>) {
      const email = String(ticket.compradorEmail ?? '').toLowerCase().trim();
      if (!email) {
        continue;
      }

      const current = ticketsByEmail.get(email) ?? {
        tickets: 0,
        raffleIds: new Set<string>(),
        lastActivity: null,
      };

      current.tickets += 1;

      if (ticket.raffleId) {
        current.raffleIds.add(String(ticket.raffleId));
      }

      const activityDate = ticket.updatedAt ?? ticket.createdAt ?? null;
      if (activityDate) {
        const normalized = new Date(activityDate);
        if (!current.lastActivity || normalized > current.lastActivity) {
          current.lastActivity = normalized;
        }
      }

      ticketsByEmail.set(email, current);
    }

    const systemUsers = users.map((user: any) => ({
      id: String(user._id),
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      estado: user.rol === 'ADMIN' ? 'Activo' : 'Cliente',
      createdAt: user.createdAt ?? null,
      updatedAt: user.updatedAt ?? null,
    }));

    const raffleById = new Map(
      (raffles as Array<any>).map((raffle) => [String(raffle._id), raffle]),
    );

    const buyers = Array.from(ticketsByEmail.entries())
      .map(([email, metrics]) => {
        const buyerTickets = (tickets as Array<any>).filter(
          (ticket) => String(ticket.compradorEmail ?? '').toLowerCase().trim() === email,
        );
        const latestTicket = buyerTickets.sort((a, b) => {
          return (
            new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
            new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
          );
        })[0];
        const name =
          latestTicket?.compradorNombre ||
          users.find((user: any) => String(user.email).toLowerCase() === email)?.nombre ||
          'Comprador sin nombre';
        const montoTotal = buyerTickets.reduce((total, ticket: any) => {
          const raffle = raffleById.get(String(ticket.raffleId));
          return total + Number(raffle?.precioTicket ?? 0);
        }, 0);

        return {
          id: email,
          nombre: name,
          email,
          ticketsComprados: metrics.tickets,
          rifasParticipadas: metrics.raffleIds.size,
          montoTotal,
          estado: buyerTickets.some((ticket: any) => ticket.estado === 'PAGADO') ? 'Activo' : 'Pendiente',
          createdAt: latestTicket?.createdAt ?? null,
          updatedAt: metrics.lastActivity ?? latestTicket?.updatedAt ?? null,
        };
      })
      .sort((a, b) => {
        return (
          new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
          new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
        );
      });

    const winners = (raffles as Array<any>)
      .filter((raffle) => raffle.estado === RaffleStatus.FINALIZADA && raffle.ganadorTicketId)
      .map((raffle) => {
        const winnerTicket = (tickets as Array<any>).find(
          (ticket) => String(ticket._id) === String(raffle.ganadorTicketId),
        );

        if (!winnerTicket) {
          return null;
        }

        return {
          raffleId: String(raffle._id),
          raffleTitulo: raffle.titulo,
          ticketId: String(winnerTicket._id),
          nombre: winnerTicket.compradorNombre || 'Ganador sin nombre',
          email: winnerTicket.compradorEmail || 'Sin correo',
          numero: Number(winnerTicket.numero ?? 0),
          fechaSorteo: raffle.fechaSorteo ?? raffle.updatedAt ?? null,
          codigoVerificacion: raffle.codigoVerificacionSorteo ?? null,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        return (
          new Date(b.fechaSorteo ?? 0).getTime() - new Date(a.fechaSorteo ?? 0).getTime()
        );
      });

    return {
      summary: {
        totalUsuarios: systemUsers.length,
        administradores: systemUsers.filter((user) => user.rol === 'ADMIN').length,
        participantes: buyers.length,
        compradores: buyers.length,
        ganadores: winners.length,
        nuevosHoy: systemUsers.filter((user) => {
          if (!user.createdAt) {
            return false;
          }

          return new Date(user.createdAt) >= today;
        }).length,
        ticketsTotales: buyers.reduce((total, buyer) => total + buyer.ticketsComprados, 0),
      },
      items: systemUsers,
      systemUsers,
      buyers,
      winners,
    };
  }

  async getTraceabilitySummary() {
    const [users, tickets, raffles] = await Promise.all([
      this.userModel.find().sort({ createdAt: -1 }).lean().exec(),
      this.ticketModel.find().sort({ createdAt: -1 }).lean().exec(),
      this.raffleModel.find().sort({ updatedAt: -1 }).lean().exec(),
    ]);

    const raffleById = new Map(
      (raffles as Array<any>).map((raffle) => [String(raffle._id), raffle]),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const purchaseEvents = this.buildPurchaseEvents(tickets as Array<any>, raffleById);
    const raffleEvents = this.buildRaffleEvents(raffles as Array<any>);
    const userEvents = this.buildUserEvents(users as Array<any>);

    const timelineEntries = [...purchaseEvents, ...raffleEvents, ...userEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const timeline = timelineEntries
      .map((entry) => ({
        icon: entry.icon,
        title: entry.title,
        time: this.getRelativeTimeLabel(entry.timestamp),
        description: entry.description,
        meta: entry.meta,
        chips: entry.chips,
        tone: entry.tone,
        category: entry.category,
      }));

    const eventsToday = [...purchaseEvents, ...raffleEvents, ...userEvents].filter(
      (entry) => new Date(entry.timestamp) >= today,
    ).length;

    const eventsYesterday = [...purchaseEvents, ...raffleEvents, ...userEvents].filter(
      (entry) =>
        new Date(entry.timestamp) >= yesterday && new Date(entry.timestamp) < today,
    ).length;

    const pendingReserved = (tickets as Array<any>).filter(
      (ticket) => ticket.estado === 'RESERVADO',
    ).length;

    const integrityIssues = this.countDuplicateTickets(tickets as Array<any>);

    const activeUsers = (users as Array<any>)
      .sort((a, b) => {
        return (
          new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
          new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
        );
      })
      .slice(0, 4)
      .map((user) => ({
        name: user.nombre,
        role: user.rol === 'ADMIN' ? 'Administrador' : 'Participante',
        status:
          new Date(user.updatedAt ?? user.createdAt ?? 0).getTime() >=
          Date.now() - 24 * 60 * 60 * 1000
            ? 'online'
            : 'offline',
      }));

    const forensicReport =
      integrityIssues > 0
        ? {
            title: 'Analisis forense de datos',
            description: `Se detectaron ${integrityIssues} conflictos en numeracion de tickets que requieren revision inmediata.`,
            actionLabel: 'Actualizar analisis',
          }
        : {
            title: 'Analisis forense de datos',
            description:
              pendingReserved > 0
                ? `No hay conflictos de integridad. Existen ${pendingReserved} compras reservadas pendientes de confirmacion.`
                : 'No se detectaron discrepancias entre tickets, rifas y trazabilidad reciente.',
            actionLabel: 'Actualizar analisis',
          };

    return {
      stats: [
        {
          label: 'Eventos hoy',
          value: String(eventsToday),
          detail: this.getDailyDeltaLabel(eventsToday, eventsYesterday),
        },
        {
          label: 'Alertas criticas',
          value: String(pendingReserved),
          detail: pendingReserved
            ? 'Compras reservadas pendientes de confirmacion'
            : 'Sin alertas pendientes',
        },
        {
          label: 'Estado de la integridad',
          value: integrityIssues > 0 ? 'Revisar' : 'Validado',
          detail:
            integrityIssues > 0
              ? `${integrityIssues} conflictos detectados en numeracion`
              : 'Sin inconsistencias en tickets y rifas',
        },
      ],
      timeline,
      activeUsers,
      synced: true,
      generatedAt: new Date().toISOString(),
      forensicReport,
    };
  }

  private buildPurchaseEvents(tickets: Array<any>, raffleById: Map<string, any>) {
    const grouped = new Map<string, any>();

    for (const ticket of tickets) {
      const key =
        ticket.flowOrderId ||
        `${ticket.raffleId}-${ticket.compradorEmail || 'sin-email'}-${ticket.createdAt}`;
      const raffle = raffleById.get(String(ticket.raffleId));
      const current = grouped.get(key) ?? {
        timestamp: ticket.updatedAt ?? ticket.createdAt ?? new Date(),
        icon: ticket.estado === 'PAGADO' ? 'payments' : 'schedule',
        title:
          ticket.estado === 'PAGADO'
            ? `Pago confirmado en ${raffle?.titulo || 'rifa'}`
            : `Compra reservada en ${raffle?.titulo || 'rifa'}`,
        description: '',
        meta: [] as string[],
        chips: [] as string[],
        tone: ticket.estado === 'PAGADO' ? 'success' : 'default',
        category: 'Ventas',
        quantity: 0,
        buyer: ticket.compradorNombre || 'Comprador sin nombre',
        email: ticket.compradorEmail || 'Sin correo',
        raffleTitle: raffle?.titulo || 'Rifa sin titulo',
      };

      current.quantity += 1;
      current.meta = [
        `Comprador: ${current.buyer}`,
        `Correo: ${current.email}`,
      ];
      current.chips = [current.category, `${current.quantity} tickets`];
      current.description = `${current.buyer} registro ${current.quantity} tickets en ${current.raffleTitle}.`;

      grouped.set(key, current);
    }

    return Array.from(grouped.values());
  }

  private buildRaffleEvents(raffles: Array<any>) {
    return raffles.slice(0, 12).map((raffle) => {
      const isCreation =
        raffle.createdAt &&
        raffle.updatedAt &&
        new Date(raffle.createdAt).getTime() === new Date(raffle.updatedAt).getTime();

      let title = `Rifa actualizada: ${raffle.titulo}`;
      let description = `Se actualizo la configuracion de la rifa ${raffle.titulo}.`;
      let tone: 'default' | 'error' | 'success' = 'default';
      let icon = 'edit_note';

      if (isCreation) {
        title = `Nueva rifa creada: ${raffle.titulo}`;
        description = `Se creo la rifa ${raffle.titulo} con ${raffle.totalTickets} tickets disponibles.`;
        icon = 'add_circle';
      } else if (raffle.estado === 'FINALIZADA') {
        title = `Sorteo finalizado: ${raffle.titulo}`;
        description = `La rifa ${raffle.titulo} ya tiene un ticket ganador registrado.`;
        tone = 'success';
        icon = 'verified';
      } else if (raffle.estado === 'CERRADA') {
        title = `Rifa cerrada: ${raffle.titulo}`;
        description = `La rifa ${raffle.titulo} fue cerrada para nuevas compras.`;
        icon = 'lock';
      } else if (raffle.estado === 'ACTIVA') {
        title = `Rifa activa: ${raffle.titulo}`;
        description = `La rifa ${raffle.titulo} se encuentra disponible para compra.`;
        icon = 'bolt';
      }

      return {
        timestamp: raffle.updatedAt ?? raffle.createdAt ?? new Date(),
        icon,
        title,
        description,
        meta: [
          `Estado: ${raffle.estado}`,
          `Vendidos: ${raffle.ticketsVendidos ?? 0}/${raffle.totalTickets ?? 0}`,
        ],
        chips: ['Admin', raffle.estado],
        tone,
        category: 'Admin',
      };
    });
  }

  private buildUserEvents(users: Array<any>) {
    return users.slice(0, 8).map((user) => ({
      timestamp: user.createdAt ?? user.updatedAt ?? new Date(),
      icon: user.rol === 'ADMIN' ? 'admin_panel_settings' : 'person_add',
      title:
        user.rol === 'ADMIN'
          ? `Administrador registrado: ${user.nombre}`
          : `Nuevo usuario: ${user.nombre}`,
      description: `${user.nombre} fue incorporado al sistema con rol ${user.rol}.`,
      meta: [`Correo: ${user.email}`],
      chips: ['Usuarios', user.rol],
      tone: 'default' as const,
      category: 'Usuarios',
    }));
  }

  private getRelativeTimeLabel(value: string | Date) {
    const date = new Date(value);
    const diffMinutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));

    if (diffMinutes < 60) {
      return `Hace ${diffMinutes} min`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `Hace ${diffHours} h`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} dias`;
  }

  private getDailyDeltaLabel(todayCount: number, yesterdayCount: number) {
    if (!yesterdayCount) {
      return 'Sin base comparativa del dia anterior';
    }

    const delta = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
    const prefix = delta >= 0 ? '+' : '';
    return `${prefix}${delta}% vs ayer`;
  }

  private countDuplicateTickets(tickets: Array<any>) {
    const seen = new Set<string>();
    let duplicates = 0;

    for (const ticket of tickets) {
      const key = `${ticket.raffleId}-${ticket.numero}`;
      if (seen.has(key)) {
        duplicates += 1;
        continue;
      }

      seen.add(key);
    }

    return duplicates;
  }
}
