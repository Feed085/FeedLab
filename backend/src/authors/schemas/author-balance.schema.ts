import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuthorBalanceDocument = AuthorBalance & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc, ret: Record<string, any>) => {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class AuthorBalance {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  authorId: Types.ObjectId;

  @Prop({ type: Number, default: 0, min: 0 })
  balance: number; // AZN available balance

  @Prop({ type: Number, default: 0 })
  totalSalesCount: number;

  @Prop({ type: Number, default: 0 })
  totalRevenueAzn: number;

  @Prop({ type: Number, default: 0 })
  totalEarningsAzn: number; // 80% author share

  @Prop({ type: String, enum: ['AZN'], default: 'AZN' })
  currency: 'AZN';

  createdAt: Date;
  updatedAt: Date;
}

export const AuthorBalanceSchema = SchemaFactory.createForClass(AuthorBalance);
