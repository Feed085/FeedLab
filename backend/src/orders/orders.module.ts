import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import {
  AuthorBalance,
  AuthorBalanceSchema,
} from '../authors/schemas/author-balance.schema';
import { Refund, RefundSchema } from '../refunds/schemas/refund.schema';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: AuthorBalance.name, schema: AuthorBalanceSchema },
      { name: Refund.name, schema: RefundSchema },
    ]),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService, MongooseModule],
})
export class OrdersModule {}
