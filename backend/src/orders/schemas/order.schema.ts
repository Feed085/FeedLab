import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'CANCELLED';
export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUND_REQUESTED',
  'REFUNDED',
  'CANCELLED',
];

export interface PaymentDetails {
  transactionId?: string;
  paymentMethod?: string;
  paidAt?: Date;
  status?: string;
}

export interface RefundDetails {
  requestedAt?: Date;
  reason?: string;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  rejectionReason?: string;
  adminNotes?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc, ret: Record<string, any>) => {
      if (ret.customId) {
        ret.id = ret.customId;
        ret._id = ret.customId;
      } else {
        ret.id = ret._id;
      }
      // Guarantee both aliases exist for backwards compatibility & tests
      ret.price = ret.price ?? ret.amount ?? 0;
      ret.totalPrice = ret.amount ?? ret.price ?? 0;
      ret.amount = ret.amount ?? ret.price ?? 0;
      ret.authorEarnings = ret.authorEarnings ?? ret.authorEarning ?? 0;
      ret.authorEarning = ret.authorEarning ?? ret.authorEarnings ?? 0;
      ret.platformFee = ret.platformFee ?? ret.platformCommission ?? 0;
      ret.platformCommission = ret.platformCommission ?? ret.platformFee ?? 0;
      delete ret.__v;
      return ret;
    },
  },
})
export class Order {
  _id: Types.ObjectId;

  @Prop({ type: String, default: null, index: true, sparse: true })
  customId?: string;

  @Prop({ required: true, unique: true, index: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  buyerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  authorId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, min: 0, default: 0 })
  price: number;

  @Prop({ type: String, enum: ['AZN'], default: 'AZN' })
  currency: 'AZN';

  @Prop({
    type: String,
    enum: ORDER_STATUSES,
    default: 'PENDING',
    index: true,
  })
  status: OrderStatus;

  @Prop({ type: String, default: 'FREE_CLAIM' })
  paymentMethod: string;

  @Prop({ type: Number, default: 0 })
  authorEarning: number;

  @Prop({ type: Number, default: 0 })
  authorEarnings: number;

  @Prop({ type: Number, default: 0 })
  platformCommission: number;

  @Prop({ type: Number, default: 0 })
  platformFee: number;

  @Prop({ type: Date, default: null })
  paidAt: Date | null;

  @Prop({
    type: {
      transactionId: { type: String, default: null },
      paymentMethod: { type: String, default: null },
      paidAt: { type: Date, default: null },
      status: { type: String, default: null },
    },
    default: null,
  })
  paymentDetails?: PaymentDetails;

  @Prop({
    type: {
      requestedAt: { type: Date, default: null },
      reason: { type: String, default: null },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: Types.ObjectId, ref: 'User', default: null },
      rejectionReason: { type: String, default: null },
      adminNotes: { type: String, default: null },
      status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    },
    default: null,
  })
  refundDetails?: RefundDetails;

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ buyerId: 1, projectId: 1, status: 1 });
