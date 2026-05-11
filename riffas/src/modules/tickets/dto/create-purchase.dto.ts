import { IsEmail, IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreatePurchaseDto {
  @IsString()
  @IsNotEmpty()
  compradorNombre: string;

  @IsEmail()
  compradorEmail: string;

  @IsInt()
  @IsPositive()
  cantidad: number;
}
