import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ticket, TicketSchema } from './ticket.schema';
import { Raffle, RaffleSchema } from '../raffles/raffle.schema';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: Raffle.name, schema: RaffleSchema },
    ]),
  ],
  providers: [TicketsService],
  controllers: [TicketsController],
  exports: [MongooseModule, TicketsService],
})
export class TicketsModule {}
