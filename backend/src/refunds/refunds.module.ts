import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Refund, RefundSchema } from './schemas/refund.schema';
import { RefundsController } from './refunds.controller';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Refund.name, schema: RefundSchema }]),
    OrdersModule,
    AuthModule,
  ],
  controllers: [RefundsController],
  exports: [MongooseModule],
})
export class RefundsModule {}
