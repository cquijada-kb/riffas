export type RifaEstado = 'ABIERTA' | 'CERRADA' | 'FINALIZADA';

export interface Rifa {
  id: string;
  titulo: string;
  descripcionPremio: string;
  cantidadNumeros: number;
  precioPorNumero: number;
  limitePorUsuario: number;
  fechaCierre?: string;
  estado: RifaEstado;
  numerosVendidos: number;
  createdAt?: string;
  updatedAt?: string;
    imagenes?: string[]; // URLs
}
