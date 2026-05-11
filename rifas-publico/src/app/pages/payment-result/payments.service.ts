import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  constructor(private http: HttpClient) {}

  getLastPaymentStatus() {
    return this.http.get<{
      status: 'PAID' | 'FAILED' | 'PENDING';
      message: string;
      raffleId?: string;
      tickets?: number[];
    }>(`${environment.apiBaseUrl}/api/public/payments/last`);
  }
}
