import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly ordersService: OrdersService) {}

  async confirmPayment(payload: {
    orderId: string;
    transactionId?: string;
    status?: string;
    amount?: number;
    paymentMethod?: string;
  }) {
    if (!payload.orderId) {
      throw new BadRequestException('orderId tələb olunur');
    }
    return this.ordersService.confirmPayment(payload.orderId, payload);
  }

  async simulatePayment(payload: {
    orderId: string;
    status?: 'SUCCESS' | 'FAILED' | string;
    transactionId?: string;
  }) {
    if (!payload.orderId) {
      throw new BadRequestException('orderId tələb olunur');
    }
    const transactionId = payload.transactionId || `SIM-TXN-${Date.now()}`;
    return this.ordersService.confirmPayment(payload.orderId, {
      transactionId,
      status: payload.status || 'SUCCESS',
      paymentMethod: 'SIMULATED',
    });
  }

  async handleWebhook(
    signature: string | undefined,
    body: {
      event?: string;
      orderId?: string;
      transactionId?: string;
      status?: string;
    },
  ) {
    if (!signature) {
      throw new UnauthorizedException('Webhook imzası tələb olunur');
    }

    const webhookSecret =
      process.env.PAYMENT_WEBHOOK_SECRET || 'feedlab_payment_webhook_secret_key_2026';
    const rawPayload = typeof body === 'string' ? body : JSON.stringify(body);
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    let isValid = false;
    try {
      const sigBuf = Buffer.from(signature, 'hex');
      const expBuf = Buffer.from(expectedSignature, 'hex');
      isValid = sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
    } catch {
      isValid = false;
    }

    if (!isValid) {
      throw new UnauthorizedException('Etibarsız webhook imzası');
    }

    if (!body.orderId) {
      throw new BadRequestException('orderId mütləqdir');
    }

    const transactionId = body.transactionId || `WH-${Date.now()}`;
    return this.ordersService.confirmPayment(body.orderId, {
      transactionId,
      status: body.status || 'SUCCESS',
      paymentMethod: 'WEBHOOK',
    });
  }
}
