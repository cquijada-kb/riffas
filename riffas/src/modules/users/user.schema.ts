import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserRole = 'ADMIN' | 'CLIENTE';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, maxlength: 150 })
  nombre: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: String, enum: ['ADMIN', 'CLIENTE'], default: 'CLIENTE' })
  rol: UserRole;
}

export type UserDocument = User & Document;

export const UserSchema = SchemaFactory.createForClass(User);
