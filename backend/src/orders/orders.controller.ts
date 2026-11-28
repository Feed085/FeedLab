import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckoutDto } from './dto/checkout.dto';
import { RefundRequestDto } from './dto/refund-request.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  async checkout(
    @CurrentUser() user: any,
    @Body() dto: CheckoutDto,
  ) {
    return this.ordersService.checkout(user._id, dto);
  }

  @Post('claim-free/:id')
  async claimFree(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.ordersService.claimFreeProject(user._id, id);
  }

  @Get('my')
  async getMyOrders(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.ordersService.getMyOrders(user._id, pageNum, limitNum);
  }

  @Get(':id')
  async getOrderById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.getOrderById(id, user);
  }

  @Post(':id/confirm-payment')
  async confirmPayment(
    @Param('id') id: string,
    @Body()
    body: {
      transactionId?: string;
      status?: string;
      amount?: number;
      paymentMethod?: string;
    },
  ) {
    return this.ordersService.confirmPayment(id, body);
  }

  @Post(':id/refund-request')
  async requestRefund(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: RefundRequestDto,
  ) {
    return this.ordersService.requestRefund(id, user._id, dto);
  }
}
