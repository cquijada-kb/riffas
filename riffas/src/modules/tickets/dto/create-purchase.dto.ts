import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreatePurchaseDto {
  @IsString()
  @IsNotEmpty()
  compradorNombre: string;

  @IsEmail()
  compradorEmail: string;

  @IsString()
  @IsOptional()
  compradorTelefono?: string;

  @IsString()
  @IsOptional()
  compradorRut?: string;

  @IsString()
  @IsOptional()
  compradorCiudad?: string;

  @IsInt()
  @IsPositive()
  cantidad: number;

  @IsString()
  @IsOptional()
  paqueteId?: string;
}
