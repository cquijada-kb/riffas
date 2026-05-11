import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Controller()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // Proceso de compra público
  @Post('public/raffles/:raffleId/purchase')
  purchase(@Param('raffleId') raffleId: string, @Body() dto: CreatePurchaseDto) {
    return this.ticketsService.createPurchase(raffleId, dto);
  }

  @Get('public/payments/flow/result')
  getPublicPaymentResult(
    @Query('flowOrderId') flowOrderId: string,
    @Query('status') status?: string,
  ) {
    return this.ticketsService.getPublicPaymentResult(flowOrderId, status);
  }

  @Get('admin/payments')
  getAdminPayments() {
    return this.ticketsService.getAdminPayments();
  }
}
