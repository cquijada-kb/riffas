import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminUsersSummary {
  totalUsuarios: number;
  administradores: number;
  participantes: number;
  compradores: number;
  ganadores: number;
  nuevosHoy: number;
  ticketsTotales: number;
}

export interface AdminSystemUserItem {
  id: string;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'CLIENTE';
  estado: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminBuyerItem {
  id: string;
  nombre: string;
  email: string;
  ticketsComprados: number;
  rifasParticipadas: number;
  montoTotal: number;
  estado: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminWinnerItem {
  raffleId: string;
  raffleTitulo: string;
  ticketId: string;
  nombre: string;
  email: string;
  numero: number;
  fechaSorteo?: string | null;
  codigoVerificacion?: string | null;
}

export interface AdminUsersResponse {
  summary: AdminUsersSummary;
  items: AdminSystemUserItem[];
  systemUsers: AdminSystemUserItem[];
  buyers: AdminBuyerItem[];
  winners: AdminWinnerItem[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminUsersService {
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<AdminUsersResponse> {
    return this.http.get<AdminUsersResponse>(this.baseUrl);
  }
}
