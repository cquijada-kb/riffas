export interface PublicRaffleCard {
  id: string; nombre: string; imageUrl?: string;
  precioNumero: number; totalNumeros: number; vendidos: number;
  progressPercent: number; agotada: boolean;
  status?: 'ACTIVA'|'CERRADA'|'FINALIZADA';
  createdAt?: string;
  closingAt?: string;
  badge?: 'HOT'|'POR TERMINAR'|'AGOTADA'|'NUEVA';
}
export interface PublicRaffleDetail extends PublicRaffleCard {
  descripcion: string; limiteMaximoPorPersona: number; disponibles: number;
  drawAt?: string; status?: 'ACTIVA'|'CERRADA'|'FINALIZADA';
  images?: string[];
}
export interface ReserveResponse {
  ok: boolean; reserveId: string; raffleId: string; quantity: number;
  totalAmount: number; numbers: number[]; expiresAt: string;
}
export interface CreatePaymentResponse { ok: boolean; paymentUrl: string; token?: string; }
export interface PaymentResult {
  ok: boolean; status: 'PAID'|'FAILED'|'PENDING';
  flowOrderId: string; raffleId: string; quantity: number; totalAmount: number; numbers: number[]; message?: string;
}
export interface WinnerInfo {
  raffleId: string; raffleName: string; winnerNumber: number; winnerName?: string; drawAt: string;
}
