export type RifaEstado = 'ABIERTA' | 'CERRADA' | 'FINALIZADA';

export interface Rifa {
  id: string;
  titulo: string;
  subtitulo?: string;
  descripcionPremio: string;
  condiciones?: string;
  cantidadNumeros: number;
  precioPorNumero: number;
  limitePorUsuario: number;
  fechaCierre?: string;
  fechaInicioVenta?: string;
  fechaTerminoVenta?: string;
  fechaSorteo?: string;
  estado: RifaEstado;
  numerosVendidos: number;
  createdAt?: string;
  updatedAt?: string;
  imagenes?: string[]; // URLs
  stickers?: string[];
  paquetes?: Array<{ cantidad: number; precio: number; etiqueta?: string }>;
}
