import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { TicketsService } from './tickets.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PaymentReceiptInterceptor } from './interceptors/payment-receipt.interceptor';

@Controller()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // Proceso de compra público
  @Post('public/raffles/:raffleId/purchase')
  purchase(@Param('raffleId') raffleId: string, @Body() dto: CreatePurchaseDto) {
    return this.ticketsService.createPurchase(raffleId, dto);
  }

  @Post('public/raffles/:raffleId/manual-purchase')
  @UseInterceptors(PaymentReceiptInterceptor)
  manualPurchase(
    @Param('raffleId') raffleId: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.ticketsService.createManualPurchase(raffleId, body, file);
  }

  @Get('public/payments/flow/result')
  getPublicPaymentResult(
    @Query('flowOrderId') flowOrderId: string,
    @Query('status') status?: string,
  ) {
    return this.ticketsService.getPublicPaymentResult(flowOrderId, status);
  }

  @Post('public/tickets/lookup/request')
  requestPublicTicketsLookup(@Body('email') email: string) {
    return this.ticketsService.requestPublicTicketLookup(email);
  }

  @Get('public/tickets/lookup')
  getPublicTicketsByEmail(
    @Query('token') token?: string,
    @Query('email') email?: string,
  ) {
    if (token) {
      return this.ticketsService.getPublicTicketsByLookupToken(token);
    }

    return this.ticketsService.requestPublicTicketLookup(email || '');
  }

  @Get('admin/payments')
  getAdminPayments() {
    return this.ticketsService.getAdminPayments();
  }

  @Get('admin/payments/:id')
  getAdminPaymentDetail(@Param('id') id: string) {
    return this.ticketsService.getPaymentDetail(id);
  }

  @Patch('admin/payments/:id/confirm')
  confirmPayment(@Param('id') id: string, @Body() body: any) {
    return this.ticketsService.confirmPayment(id, body);
  }

  @Post('admin/payments/:id/receipt')
  @UseInterceptors(PaymentReceiptInterceptor)
  uploadPaymentReceipt(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.ticketsService.uploadPaymentReceipt(id, file);
  }

  @Get('admin/payments/:id/receipt/view')
  async viewPaymentReceipt(@Param('id') id: string, @Res() res: Response) {
    const object = await this.ticketsService.getPaymentReceipt(id);
    const contentType = object.ContentType || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    if (object.ContentLength) {
      res.setHeader('Content-Length', String(object.ContentLength));
    }

    const body = object.Body as any;
    if (body?.pipe) {
      body.pipe(res);
      return;
    }

    res.send(body);
  }

  @Patch('admin/payments/:id/reject')
  rejectPayment(@Param('id') id: string) {
    return this.ticketsService.rejectPayment(id);
  }

  @Get('admin/raffles/:raffleId/tickets')
  getRaffleTickets(
    @Param('raffleId') raffleId: string,
    @Query('status') status?: string,
  ) {
    return this.ticketsService.getTicketsByRaffle(raffleId, status);
  }
}
