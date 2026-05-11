import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Raffle, RaffleSchema } from './raffle.schema';
import { Ticket, TicketSchema } from '../tickets/ticket.schema';
import { RafflesService } from './raffles.service';
import { RafflesController } from './raffles.controller';
import { S3Module } from '../storage/s3.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Raffle.name, schema: RaffleSchema },
      { name: Ticket.name, schema: TicketSchema },
    ]),
    S3Module,
    MailModule,
  ],
  providers: [RafflesService],
  controllers: [RafflesController],
  exports: [MongooseModule],
})
export class RafflesModule {}
