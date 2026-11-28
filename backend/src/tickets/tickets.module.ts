import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ticket, TicketSchema } from './schemas/ticket.schema';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
    ]),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService, MongooseModule],
})
export class TicketsModule {}
