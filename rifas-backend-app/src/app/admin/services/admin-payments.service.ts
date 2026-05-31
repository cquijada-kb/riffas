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
  compradorTelefono?: string;
  compradorRut?: string;
  compradorCiudad?: string;
  raffleId: string;
  raffleTitulo: string;
  cantidadTickets: number;
  montoTotal: number;
  estado: string;
  metodo: string;
  referenciaPago?: string | null;
  comprobanteUrl?: string | null;
  numeros?: number[];
  rawTicketText?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminPaymentDetail extends AdminPaymentItem {
  numeros: number[];
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

  getPaymentDetail(id: string): Observable<AdminPaymentDetail> {
    return this.http.get<AdminPaymentDetail>(`${this.baseUrl}/${id}`);
  }

  confirmPayment(id: string, referenciaPago: string, comprobanteUrl?: string): Observable<AdminPaymentDetail> {
    return this.http.patch<AdminPaymentDetail>(`${this.baseUrl}/${id}/confirm`, {
      referenciaPago,
      comprobanteUrl
    });
  }

  uploadReceipt(id: string, file: File): Observable<AdminPaymentDetail> {
    const formData = new FormData();
    formData.append('comprobante', file);
    return this.http.post<AdminPaymentDetail>(`${this.baseUrl}/${id}/receipt`, formData);
  }

  rejectPayment(id: string): Observable<{ ok: boolean; rejected: number }> {
    return this.http.patch<{ ok: boolean; rejected: number }>(`${this.baseUrl}/${id}/reject`, {});
  }
}
