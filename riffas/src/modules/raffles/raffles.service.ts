import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Raffle, RaffleDocument } from './raffle.schema';
import { CreateRaffleDto } from './dto/create-raffle.dto';
import { UpdateRaffleDto } from './dto/update-raffle.dto';
import { RaffleStatus } from '../../common/enums/raffle-status.enum';
import { Ticket, TicketDocument } from '../tickets/ticket.schema';
import { S3Service } from '../storage/s3.service';
import { MailService } from '../mail/mail.service';

type RaffleUploadedFiles = {
  imagenes?: Express.Multer.File[];
  stickers?: Express.Multer.File[];
};

@Injectable()
export class RafflesService {
  constructor(
    @InjectModel(Raffle.name)
    private readonly raffleModel: Model<RaffleDocument>,
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    private readonly s3Service: S3Service,
    private readonly mailService: MailService,
  ) {}

  findPublicActivas(): Promise<RaffleDocument[]> {
    return this.raffleModel.find({ estado: RaffleStatus.ACTIVA }).exec();
  }

  findAllAdmin(): Promise<RaffleDocument[]> {
    return this.raffleModel.find().exec();
  }

  async getAdminSummary() {
    const [raffles, todayTickets] = await Promise.all([
      this.raffleModel.find().lean().exec(),
      this.ticketModel
        .find({
          createdAt: {
            $gte: this.getStartOfToday(),
            $lt: this.getStartOfTomorrow(),
          },
        })
        .lean()
        .exec(),
    ]);

    const statusCounts = raffles.reduce(
      (counts, raffle: any) => {
        const status = String(
          raffle.estado ?? RaffleStatus.BORRADOR,
        ) as RaffleStatus;
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
      },
      {
        [RaffleStatus.BORRADOR]: 0,
        [RaffleStatus.ACTIVA]: 0,
        [RaffleStatus.PAUSADA]: 0,
        [RaffleStatus.CERRADA]: 0,
        [RaffleStatus.FINALIZADA]: 0,
      } as Record<RaffleStatus, number>,
    );

    const priceByRaffleId = new Map(
      raffles.map((raffle: any) => [
        String(raffle._id),
        Number(raffle.precioTicket ?? 0),
      ]),
    );

    const ventasHoy = (todayTickets as Array<any>).reduce((total, ticket) => {
      const ticketPrice = priceByRaffleId.get(String(ticket.raffleId)) ?? 0;
      return total + ticketPrice;
    }, 0);

    return {
      activos: statusCounts[RaffleStatus.ACTIVA],
      ventasHoy,
      ticketsVendidos: raffles.reduce(
        (total: number, raffle: any) =>
          total + Number(raffle.ticketsVendidos ?? 0),
        0,
      ),
      borradores: statusCounts[RaffleStatus.BORRADOR],
      pausadas: statusCounts[RaffleStatus.PAUSADA],
      cerradas: statusCounts[RaffleStatus.CERRADA],
      pendientesSorteo: statusCounts[RaffleStatus.CERRADA],
      finalizadas: statusCounts[RaffleStatus.FINALIZADA],
      totalRifas: raffles.length,
    };
  }

  async findOne(id: string): Promise<RaffleDocument> {
    const raffle = await this.raffleModel.findById(id).exec();
    if (!raffle) throw new NotFoundException('Rifa no encontrada');
    return raffle;
  }

  async create(dto: CreateRaffleDto, files?: RaffleUploadedFiles) {
    const imagenes = await this.uploadFiles(files?.imagenes, 'raffles', 3);
    const stickers = await this.uploadFiles(files?.stickers, 'raffles/stickers', 10);

    const raffle = new this.raffleModel({
      titulo: dto.titulo,
      subtitulo: dto.subtitulo,
      descripcion: dto.descripcion,
      condiciones: dto.condiciones,
      precioTicket: dto.precioTicket,
      totalTickets: dto.totalTickets,
      limitePorUsuario: dto.limitePorUsuario,
      fechaCierre: dto.fechaCierre,
      fechaInicioVenta: dto.fechaInicioVenta,
      fechaTerminoVenta: dto.fechaTerminoVenta,
      fechaSorteo: dto.fechaSorteo,
      paquetes: this.normalizePackages(dto.paquetes, dto.precioTicket),
      imagenes,
      stickers,
      estado: 'ACTIVA',
      ticketsVendidos: 0,
    });

    await raffle.save();
    return raffle;
  }

  async update(
    id: string,
    dto: UpdateRaffleDto,
    files?: RaffleUploadedFiles,
  ): Promise<RaffleDocument> {
    const raffle = await this.raffleModel.findById(id).exec();
    if (!raffle) throw new NotFoundException('Rifa no encontrada');

    if (dto.titulo !== undefined) raffle.titulo = dto.titulo;
    if (dto.subtitulo !== undefined) raffle.subtitulo = dto.subtitulo;
    if (dto.descripcion !== undefined) raffle.descripcion = dto.descripcion;
    if (dto.condiciones !== undefined) raffle.condiciones = dto.condiciones;
    if (dto.precioTicket !== undefined) raffle.precioTicket = dto.precioTicket;
    if (dto.totalTickets !== undefined) raffle.totalTickets = dto.totalTickets;
    if (dto.limitePorUsuario !== undefined) {
      raffle.limitePorUsuario = dto.limitePorUsuario;
    }

    if (dto.fechaCierre !== undefined) {
      raffle.fechaCierre = dto.fechaCierre ? new Date(dto.fechaCierre) : null;
    }

    if (dto.fechaInicioVenta !== undefined) {
      raffle.fechaInicioVenta = dto.fechaInicioVenta
        ? new Date(dto.fechaInicioVenta)
        : null;
    }

    if (dto.fechaTerminoVenta !== undefined) {
      raffle.fechaTerminoVenta = dto.fechaTerminoVenta
        ? new Date(dto.fechaTerminoVenta)
        : null;
    }

    if (dto.fechaSorteo !== undefined) {
      raffle.fechaSorteo = dto.fechaSorteo ? new Date(dto.fechaSorteo) : null;
    }

    if (dto.paquetes !== undefined) {
      raffle.paquetes = this.normalizePackages(
        dto.paquetes,
        dto.precioTicket ?? raffle.precioTicket,
      );
    }

    if (files?.imagenes && files.imagenes.length > 0) {
      raffle.imagenes = await this.uploadFiles(
        files.imagenes,
        `raffles/${id}`,
        3,
      );
    }

    if (files?.stickers && files.stickers.length > 0) {
      raffle.stickers = await this.uploadFiles(
        files.stickers,
        `raffles/${id}/stickers`,
        10,
      );
    }

    await raffle.save();
    return raffle;
  }

  async cerrar(id: string): Promise<RaffleDocument> {
    const raffle = await this.raffleModel
      .findByIdAndUpdate(
        id,
        { estado: RaffleStatus.CERRADA },
        { new: true },
      )
      .exec();
    if (!raffle) throw new NotFoundException('Rifa no encontrada');
    return raffle;
  }

  async drawWinner(id: string): Promise<RaffleDocument> {
    const raffle = await this.findOne(id);
    if (raffle.estado !== RaffleStatus.CERRADA) {
      throw new BadRequestException('La rifa debe estar cerrada para sortear');
    }

    const ticketsPagados = await this.ticketModel
      .find({ raffleId: raffle._id.toString(), estado: 'PAGADO' })
      .exec();

    if (!ticketsPagados.length) {
      throw new BadRequestException('No hay tickets pagados para sortear');
    }

    const winnerIndex = Math.floor(Math.random() * ticketsPagados.length);
    const winner = ticketsPagados[winnerIndex];

    raffle.ganadorTicketId = winner._id.toString();
    raffle.estado = RaffleStatus.FINALIZADA;
    raffle.fechaSorteo = new Date();
    raffle.codigoVerificacionSorteo = `SORTEO-${raffle._id}-${Date.now()}`;

    await raffle.save();
    await this.notifyWinner(raffle, winner);

    return raffle;
  }

  private getExt(mime: string): string {
    if (mime === 'image/png') return '.png';
    if (mime === 'image/jpeg') return '.jpg';
    if (mime === 'image/jpg') return '.jpg';
    if (mime === 'image/webp') return '.webp';
    if (mime === 'application/pdf') return '.pdf';
    return '';
  }

  private async uploadFiles(
    files: Express.Multer.File[] | undefined,
    basePath: string,
    limit: number,
  ) {
    const urls: string[] = [];

    for (const file of (files ?? []).slice(0, limit)) {
      const ext = this.getExt(file.mimetype);
      const key = `${basePath}/${Date.now()}-${Math.random()}${ext}`;
      const url = await this.s3Service.uploadImage(
        file.buffer,
        file.mimetype,
        key,
      );
      urls.push(url);
    }

    return urls;
  }

  private normalizePackages(
    packages: any[] | undefined,
    defaultPrice: number,
  ) {
    const normalized = (packages ?? [])
      .map((item) => ({
        cantidad: Number(item?.cantidad ?? 0),
        precio: Number(item?.precio ?? 0),
        etiqueta: item?.etiqueta ? String(item.etiqueta) : '',
      }))
      .filter((item) => item.cantidad > 0 && item.precio >= 0);

    if (normalized.length > 0) {
      return normalized;
    }

    return defaultPrice > 0
      ? [{ cantidad: 1, precio: Number(defaultPrice), etiqueta: '1 ticket' }]
      : [];
  }

  private getStartOfToday(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private getStartOfTomorrow(): Date {
    const date = this.getStartOfToday();
    date.setDate(date.getDate() + 1);
    return date;
  }

  private async notifyWinner(raffle: RaffleDocument, winner: TicketDocument) {
    if (!winner.compradorEmail) {
      return;
    }

    await this.mailService.sendWinnerNotification({
      to: winner.compradorEmail,
      nombre: winner.compradorNombre || 'Ganador',
      raffleTitulo: raffle.titulo,
      numeroGanador: Number(winner.numero ?? 0),
      fechaSorteo: raffle.fechaSorteo,
      codigoVerificacion: raffle.codigoVerificacionSorteo,
    });
  }

  async getWinnerDetail(id: string) {
    const raffle = await this.raffleModel.findById(id).exec();
    if (!raffle) throw new NotFoundException('Rifa no encontrada');

    if (!raffle.ganadorTicketId) {
      return { hasWinner: false };
    }

    const ticket = await this.ticketModel
      .findById(raffle.ganadorTicketId)
      .lean()
      .exec();

    if (!ticket) {
      return { hasWinner: false };
    }

    return {
      hasWinner: true,
      ticketId: ticket._id,
      numero: ticket.numero,
      nombre: ticket.compradorNombre,
      email: ticket.compradorEmail,
    };
  }

  async abrir(id: string): Promise<RaffleDocument> {
    const raffle = await this.raffleModel.findById(id).exec();
    if (!raffle) throw new NotFoundException('Rifa no encontrada');

    if (raffle.estado !== 'CERRADA') {
      throw new BadRequestException('Solo se pueden reabrir rifas cerradas');
    }

    if (raffle.ganadorTicketId) {
      throw new BadRequestException(
        'No se puede reabrir una rifa ya sorteada',
      );
    }

    if (!raffle.fechaCierre) {
      throw new BadRequestException(
        'No se puede reabrir: la rifa no tiene fecha de sorteo definida',
      );
    }

    const now = new Date();
    const fechaSorteo = new Date(raffle.fechaCierre);

    if (now >= fechaSorteo) {
      throw new BadRequestException(
        'No se puede reabrir: la fecha de sorteo ya paso',
      );
    }

    raffle.estado = RaffleStatus.ACTIVA;

    await raffle.save();
    return raffle;
  }
}
