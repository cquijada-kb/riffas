import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PublicRaffleCard, PublicRaffleDetail, ReserveResponse, CreatePaymentResponse, PaymentResult, WinnerInfo } from './models';
import { map } from 'rxjs/operators';

type RaffleApiDto = {
  _id: string;
  titulo: string;
  descripcion: string;
  precioTicket: number;
  totalTickets: number;
  ticketsVendidos: number;
  limitePorUsuario: number;
  fechaCierre: string;
  fechaSorteo: string | null;
  estado: string;
  imagenes: string[];
  createdAt?: string;
  updatedAt?: string;
};


@Injectable({ providedIn: 'root' })
export class RafflesService {
  constructor(private http: HttpClient) { }

  private toCard(dto: RaffleApiDto): PublicRaffleCard {
    const total = dto.totalTickets || 0;
    const sold = dto.ticketsVendidos || 0;
    const progress = total > 0 ? Math.round((sold / total) * 100) : 0;

    const agotada = sold >= total || dto.estado !== 'ACTIVA';

    let badge: PublicRaffleCard['badge'];
    if (agotada) badge = 'AGOTADA';
    else if (progress >= 90) badge = 'POR TERMINAR';
    else if (progress <= 20) badge = 'NUEVA';
    else badge = 'HOT';

    return {
      id: dto._id,
      nombre: dto.titulo,
      imageUrl: dto.imagenes?.[0] || '',
      precioNumero: dto.precioTicket,
      totalNumeros: total,
      vendidos: sold,
      progressPercent: progress,
      agotada,
      status: dto.estado as PublicRaffleCard['status'],
      createdAt: dto.createdAt,
      closingAt: dto.fechaCierre || dto.fechaSorteo || undefined,
      badge,
    };
  }

  private toDetail(dto: RaffleApiDto): PublicRaffleDetail {
    const total = dto.totalTickets || 0;
    const vendidos = dto.ticketsVendidos || 0;
    const progressPercent = total > 0 ? Math.round((vendidos / total) * 100) : 0;

    return {
      id: dto._id,
      nombre: dto.titulo,
      descripcion: dto.descripcion,

      precioNumero: dto.precioTicket,
      totalNumeros: total,
      vendidos,
      progressPercent,

      limiteMaximoPorPersona: dto.limitePorUsuario,
      disponibles: Math.max(0, total - vendidos),

      status: dto.estado as any,
      drawAt: dto.fechaSorteo ?? dto.fechaCierre,

      imageUrl: dto.imagenes?.[0] || '',
      images: (dto.imagenes || []).slice(0, 3),

      agotada: vendidos >= total || dto.estado !== 'ACTIVA',
      badge: undefined,
    };
  }


  listActive() {
    return this.http
      .get<RaffleApiDto[]>(`${environment.apiBaseUrl}/public/raffles`)
      .pipe(map(list => list.map(x => this.toCard(x))));
  }

  getById(id: string) {
    return this.http
      .get<RaffleApiDto>(`${environment.apiBaseUrl}/public/raffles/${id}`)
      .pipe(map(x => this.toDetail(x)));
  }


  reserve(raffleId: string, quantity: number, buyerEmail?: string) {
    return this.http.post<ReserveResponse>(
      `${environment.apiBaseUrl}/public/raffles/${raffleId}/purchase`,
      { quantity, buyerEmail }
    );
  }

  createFlowPayment(reserveId: string) {
    return this.http.post<CreatePaymentResponse>(
      `${environment.apiBaseUrl}/public/payments/flow/create`,
      { reserveId }
    );
  }

  getPaymentResult(flowOrderId: string, status?: 'PAID' | 'FAILED' | 'PENDING') {
    return this.http.get<PaymentResult>(
      `${environment.apiBaseUrl}/public/payments/flow/result?flowOrderId=${encodeURIComponent(flowOrderId)}${status ? `&status=${encodeURIComponent(status)}` : ''}`
    );
  }

  getWinner(raffleId: string) {
    return this.http.get<WinnerInfo>(`${environment.apiBaseUrl}/public/raffles/${raffleId}/winner`);
  }

  purchase(raffleId: string, cantidad: number, compradorNombre: string, compradorEmail: string) {
    return this.http.post(
      `${environment.apiBaseUrl}/public/raffles/${raffleId}/purchase`,
      { compradorNombre, compradorEmail, cantidad }
    );
  }

}
