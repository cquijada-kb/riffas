import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TicketStatus = 'RESERVADO' | 'PENDIENTE' | 'PAGADO' | 'RECHAZADO';

@Schema({ timestamps: true })
export class Ticket {
  @Prop({ type: String, required: true })
  raffleId!: string;

  @Prop({ type: Number, required: true })
  numero!: number;

  @Prop({
    type: String,
    enum: ['RESERVADO', 'PENDIENTE', 'PAGADO', 'RECHAZADO'],
    default: 'RESERVADO',
  })
  estado!: TicketStatus;

  @Prop({ type: String, required: false })
  compradorId?: string;

  @Prop({ type: String, required: false })
  compradorNombre?: string;

  @Prop({ type: String, required: false })
  compradorEmail?: string;

  @Prop({ type: String, required: false })
  compradorTelefono?: string;

  @Prop({ type: String, required: false })
  compradorRut?: string;

  @Prop({ type: String, required: false })
  compradorCiudad?: string;

  @Prop({ type: String, required: false })
  flowOrderId?: string;

  @Prop({ type: String, required: false })
  metodoPago?: string;

  @Prop({ type: String, required: false })
  referenciaPago?: string;

  @Prop({ type: String, required: false })
  comprobanteUrl?: string;

  @Prop({ type: Number, required: false })
  montoPagoTotal?: number;

  @Prop({ type: Number, required: false })
  paqueteCantidad?: number;

  @Prop({ type: Number, required: false })
  paquetePrecio?: number;

  @Prop({ type: Date, required: false })
  paidAt?: Date;

  @Prop({ type: Date, required: false })
  rejectedAt?: Date;
}

export type TicketDocument = Ticket & Document;
export const TicketSchema = SchemaFactory.createForClass(Ticket);
TicketSchema.index({ raffleId: 1, numero: 1 }, { unique: true });
TicketSchema.index({ flowOrderId: 1 });
TicketSchema.index({ compradorEmail: 1 });
