import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateRaffleDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsPositive()
  precioTicket: number;

  @IsInt()
  @IsPositive()
  totalTickets: number;

  @IsInt()
  @Min(0)
  limitePorUsuario: number;

  @IsDateString()
  @IsOptional()
  fechaCierre?: string;

  @IsString()
  @IsOptional()
  urlImagenPortada?: string;
}
