import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RefundDocument = Refund & Document;
export type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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
      ret.amount = ret.refundAmount ?? ret.amount;
      delete ret.__v;
      return ret;
    },
  },
})
export class Refund {
  _id: Types.ObjectId;

  @Prop({ type: String, default: null, index: true, sparse: true })
  customId?: string;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  buyerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null })
  projectId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  reason: string;

  @Prop({ type: String, default: null })
  details?: string | null;

  @Prop({
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    index: true,
  })
  status: RefundStatus;

  @Prop({ required: true, min: 0 })
  refundAmount: number;

  @Prop({ type: String, enum: ['AZN'], default: 'AZN' })
  currency: 'AZN';

  @Prop({ type: String, default: null })
  adminNotes?: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const RefundSchema = SchemaFactory.createForClass(Refund);
RefundSchema.index({ buyerId: 1, status: 1 });
RefundSchema.index({ status: 1, createdAt: -1 });
