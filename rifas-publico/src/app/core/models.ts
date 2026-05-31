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
  stickers?: string[];
  subtitulo?: string;
  condiciones?: string;
  paquetes?: Array<{ cantidad: number; precio: number; etiqueta?: string }>;
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
export interface TicketLookupResult {
  ok: boolean;
  email: string;
  total: number;
  items: Array<{
    ticketId: string;
    raffleId: string;
    raffleTitulo: string;
    raffleImagen?: string;
    stickers?: string[];
    numero: number;
    estado: 'VENDIDO' | 'POR_VERIFICAR' | 'DISPONIBLE';
    compradorNombre: string;
    compradorEmail: string;
    flowOrderId?: string | null;
    createdAt?: string | null;
  }>;
}
export interface TicketLookupRequestResult {
  ok: boolean;
  message: string;
}
