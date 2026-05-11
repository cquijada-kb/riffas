import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { RafflesService } from './raffles.service';
import { CreateRaffleDto } from './dto/create-raffle.dto';
import { UpdateRaffleDto } from './dto/update-raffle.dto';
import { ImagesInterceptor } from './interceptors/images.interceptor';

@Controller()
export class RafflesController {
  constructor(private readonly rafflesService: RafflesService) { }

  // Sitio público
  @Get('public/raffles')
  getPublicRaffles() {
    return this.rafflesService.findPublicActivas();
  }

  @Get('public/raffles/:id')
  getPublicRaffle(@Param('id') id: string) {
    return this.rafflesService.findOne(id);
  }

  // Admin
  @Get('admin/raffles')
  getAdminRaffles() {
    return this.rafflesService.findAllAdmin();
  }

  @Get('admin/raffles/summary')
  getAdminRafflesSummary() {
    return this.rafflesService.getAdminSummary();
  }

  @Post('admin/raffles')
  @UseInterceptors(ImagesInterceptor)
  create(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // body viene como strings porque es multipart/form-data
    const dto: CreateRaffleDto = {
      titulo: body.titulo,
      descripcion: body.descripcion,
      totalTickets: Number(body.totalTickets),
      precioTicket: Number(body.precioTicket),
      limitePorUsuario: Number(body.limitePorUsuario),
      fechaCierre: body.fechaCierre ? new Date(body.fechaCierre) : null,
      // imagenes se agregan en el service luego de subir a S3
    } as any;

    return this.rafflesService.create(dto, files);
  }

  @Put('admin/raffles/:id')
  @UseInterceptors(ImagesInterceptor)
  update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    console.log('aqui,,,,,,,,,,,,,,')
    const dto: UpdateRaffleDto = {
      titulo: body.titulo,
      descripcion: body.descripcion,
      totalTickets: body.totalTickets ? Number(body.totalTickets) : undefined,
      precioTicket: body.precioTicket ? Number(body.precioTicket) : undefined,
      limitePorUsuario: body.limitePorUsuario ? Number(body.limitePorUsuario) : undefined,
      fechaCierre: body.fechaCierre ? new Date(body.fechaCierre) : undefined,
    } as any;

    return this.rafflesService.update(id, dto, files);
  }

  @Patch('admin/raffles/:id/cerrar')
  cerrar(@Param('id') id: string) {
    return this.rafflesService.cerrar(id);
  }

  @Patch('admin/raffles/:id/sortear')
  sortear(@Param('id') id: string) {
    return this.rafflesService.drawWinner(id);
  }


  @Get('admin/raffles/:id')
  getAdminRaffle(@Param('id') id: string) {
    return this.rafflesService.findOne(id);
  }

  @Get('admin/raffles/:id/ganador')
  getGanador(@Param('id') id: string) {
    return this.rafflesService.getWinnerDetail(id);
  }

  @Patch('admin/raffles/:id/abrir')
  abrir(@Param('id') id: string) {
    return this.rafflesService.abrir(id);
  }

}
