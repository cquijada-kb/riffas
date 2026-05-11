import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminPaymentsSummary {
  volumen24h: number;
  transacciones24h: number;
  pagosPendientes: number;
  solicitudesPendientes: number;
  metodoPredominante: string;
  totalResultados: number;
}

export interface AdminPaymentItem {
  id: string;
  flowOrderId: string | null;
  compradorNombre: string;
  compradorEmail: string;
  raffleId: string;
  raffleTitulo: string;
  cantidadTickets: number;
  montoTotal: number;
  estado: string;
  metodo: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminPaymentsResponse {
  summary: AdminPaymentsSummary;
  items: AdminPaymentItem[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminPaymentsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/payments`;

  constructor(private http: HttpClient) {}

  getPayments(): Observable<AdminPaymentsResponse> {
    return this.http.get<AdminPaymentsResponse>(this.baseUrl);
  }
}
