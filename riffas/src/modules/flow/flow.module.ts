import { Module } from '@nestjs/common';
import { FlowController } from './flow.controller';
import { FlowService } from './flow.service';
import { TicketsModule } from '../tickets/tickets.module';
import { MailService } from '../mail/mail.service';
@Module({
  imports: [TicketsModule],
  controllers: [FlowController],
  providers: [FlowService, MailService],
})
export class FlowModule {}
