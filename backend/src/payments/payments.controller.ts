import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @Body()
    body: {
      orderId: string;
      transactionId?: string;
      status?: string;
      amount?: number;
      paymentMethod?: string;
    },
  ) {
    return this.paymentsService.confirmPayment(body);
  }

  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  async simulatePayment(
    @Body()
    body: {
      orderId: string;
      status?: string;
      transactionId?: string;
    },
  ) {
    return this.paymentsService.simulatePayment(body);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers('x-feedlab-signature') signature: string,
    @Body()
    body: {
      event?: string;
      orderId?: string;
      transactionId?: string;
      status?: string;
    },
  ) {
    return this.paymentsService.handleWebhook(signature, body);
  }
}
