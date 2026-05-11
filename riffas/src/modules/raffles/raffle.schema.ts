import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RaffleStatus } from '../../common/enums/raffle-status.enum';

@Schema({ timestamps: true })
export class Raffle {
  @Prop({ required: true, maxlength: 200 })
  titulo: string;

  @Prop({ type: String })
  descripcion?: string;

  @Prop({ required: true, type: Number, min: 0 })
  precioTicket: number;

  @Prop({ required: true, type: Number, min: 1 })
  totalTickets: number;

  @Prop({ type: Number, default: 0 })
  ticketsVendidos: number;

  @Prop({ type: Number, default: 0 })
  limitePorUsuario: number;

  @Prop({ type: Date, default: null })
  fechaCierre?: Date | null;

  @Prop({ type: Date, default: null })
  fechaSorteo?: Date | null;

  @Prop({
    type: String,
    enum: Object.values(RaffleStatus),
    default: RaffleStatus.BORRADOR,
  })

  @Prop({
    type: String,
    enum: RaffleStatus,
    default: RaffleStatus.BORRADOR,
  })
  estado: RaffleStatus;

  @Prop()
  urlImagenPortada?: string;

  @Prop({ type: String, default: null })
  ganadorTicketId?: string | null;

  @Prop({ type: String, default: null })
  codigoVerificacionSorteo?: string | null;

  @Prop({ type: [String], default: [] })
  imagenes: string[];
}

export type RaffleDocument = Raffle & Document;

export const RaffleSchema = SchemaFactory.createForClass(Raffle);
