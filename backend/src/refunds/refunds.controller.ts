import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RefundRequestDto } from '../orders/dto/refund-request.dto';

@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundsController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async requestRefund(
    @CurrentUser() user: any,
    @Body() body: { orderId: string; reason: string; details?: string },
  ) {
    return this.ordersService.requestRefund(body.orderId, user._id, {
      reason: body.reason,
      details: body.details,
    });
  }
}
