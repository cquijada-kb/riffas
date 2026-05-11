import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TicketStatus = 'RESERVADO' | 'PAGADO';

@Schema({ timestamps: true })
export class Ticket {
  @Prop({ type: String, required: true })
  raffleId!: string;

  @Prop({ type: Number, required: true })
  numero!: number;

  @Prop({ type: String, enum: ['RESERVADO', 'PAGADO'], default: 'RESERVADO' })
  estado!: TicketStatus;

  @Prop({ type: String, required: false })
  compradorId?: string;

  @Prop({ type: String, required: false })
  compradorNombre?: string;

  @Prop({ type: String, required: false })
  compradorEmail?: string;

  @Prop({ type: String, required: false })
  flowOrderId?: string;
}

export type TicketDocument = Ticket & Document;
export const TicketSchema = SchemaFactory.createForClass(Ticket);
