import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RafflesModule } from './modules/raffles/raffles.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { FlowModule } from './modules/flow/flow.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017/rifas_db',
      }),
    }),
    UsersModule,
    AuthModule,
    RafflesModule,
    TicketsModule,
    FlowModule,
    MailModule
  ],
})
export class AppModule {}
