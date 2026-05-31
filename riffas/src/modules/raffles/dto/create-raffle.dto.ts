import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RafflePackageOptionDto {
  @IsInt()
  @IsPositive()
  cantidad: number;

  @IsPositive()
  precio: number;

  @IsString()
  @IsOptional()
  etiqueta?: string;
}

export class CreateRaffleDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsOptional()
  subtitulo?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  condiciones?: string;

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

  @IsDateString()
  @IsOptional()
  fechaInicioVenta?: string;

  @IsDateString()
  @IsOptional()
  fechaTerminoVenta?: string;

  @IsDateString()
  @IsOptional()
  fechaSorteo?: string;

  @IsString()
  @IsOptional()
  urlImagenPortada?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RafflePackageOptionDto)
  @IsOptional()
  paquetes?: RafflePackageOptionDto[];
}
