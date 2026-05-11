import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Rifa } from '../models/rifa.model';

export interface RifasSummary {
  activos: number;
  ventasHoy: number;
  ticketsVendidos: number;
  borradores: number;
  pausadas: number;
  cerradas: number;
  pendientesSorteo: number;
  finalizadas: number;
  totalRifas: number;
}

@Injectable({
  providedIn: 'root'
})
export class RifasService {
  private baseUrl = `${environment.apiBaseUrl}/admin/raffles`;

  constructor(private http: HttpClient) { }

  getRifas(): Observable<Rifa[]> {
    return this.http.get<any[]>(this.baseUrl).pipe(
      map(list => list.map(api => this.mapRifa(api)))
    );
  }

  getRifasSummary(): Observable<RifasSummary> {
    return this.http.get<RifasSummary>(`${this.baseUrl}/summary`);
  }

  getRifaById(id: string): Observable<Rifa> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map(api => this.mapRifa(api))
    );
  }

  crearRifa(payload: Partial<Rifa>): Observable<Rifa> {
    return this.http.post<any>(this.baseUrl, this.toApiPayload(payload)).pipe(
      map(api => this.mapRifa(api))
    );
  }

  actualizarRifa(id: string, payload: Partial<Rifa>): Observable<Rifa> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, this.toApiPayload(payload)).pipe(
      map(api => this.mapRifa(api))
    );
  }

  cerrarRifa(id: string): Observable<Rifa> {
    return this.http.patch<any>(`${this.baseUrl}/${id}/cerrar`, {}).pipe(
      map(api => this.mapRifa(api))
    );
  }

  ejecutarSorteo(id: string): Observable<{ ganador: string }> {
    return this.http.patch<any>(`${this.baseUrl}/${id}/sortear`, {}).pipe(
      map(res => ({ ganador: res?.winner ?? 'Ganador generado' }))
    );
  }

  // =====================
  // Mapeos correctos
  // =====================

  private mapRifa(api: any): Rifa {
    return {
      id: api._id,
      titulo: api.titulo,
      descripcionPremio: api.descripcion ?? '',
      cantidadNumeros: Number(api.totalTickets ?? 0),
      precioPorNumero: Number(api.precioTicket ?? 0),
      limitePorUsuario: Number(api.limitePorUsuario ?? 0),
      fechaCierre: api.fechaCierre ? new Date(api.fechaCierre).toISOString() : undefined,
      estado: this.mapEstado(api.estado),
      numerosVendidos: Number(api.ticketsVendidos ?? 0),
      imagenes: Array.isArray(api.imagenes) ? api.imagenes : [],
      createdAt: api.createdAt ? new Date(api.createdAt).toISOString() : undefined,
      updatedAt: api.updatedAt ? new Date(api.updatedAt).toISOString() : undefined
    };
  }

  private toApiPayload(front: Partial<Rifa>): any {
    return {
      titulo: front.titulo,
      descripcion: front.descripcionPremio,
      totalTickets: front.cantidadNumeros,
      precioTicket: front.precioPorNumero,
      limitePorUsuario: front.limitePorUsuario,
      fechaCierre: front.fechaCierre ? new Date(front.fechaCierre).toISOString() : null
    };
  }

  private mapEstado(estado: string): 'ABIERTA' | 'CERRADA' | 'FINALIZADA' {
    switch (estado) {
      case 'ACTIVA':
        return 'ABIERTA';
      case 'CERRADA':
        return 'CERRADA';
      case 'FINALIZADA':
        return 'FINALIZADA';
      default:
        return 'ABIERTA';
    }
  }


  crearRifaFormData(formData: FormData) {
    return this.http.post(`${this.baseUrl}`, formData);
  }

  actualizarRifaFormData(id: string, fd: FormData) {
    return this.http.put(`${this.baseUrl}/${id}`, fd);
  }

  getGanadorDetalle(raffleId: string) {
    return this.http.get<any>(`${environment.apiBaseUrl}/admin/raffles/${raffleId}/ganador`);
  }

  abrirRifa(id: string) {
    return this.http.patch<any>(`${environment.apiBaseUrl}/admin/raffles/${id}/abrir`, {}).pipe(
      map(api => this.mapRifa(api))
    );
  }

}
