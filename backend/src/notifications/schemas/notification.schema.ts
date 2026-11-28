import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export type NotificationType =
  | 'ORDER_SUCCESS'
  | 'PURCHASE'
  | 'NEW_SALE'
  | 'REVIEW'
  | 'NEW_REVIEW'
  | 'REVIEW_RECEIVED'
  | 'REVIEW_REPLIED'
  | 'TICKET'
  | 'TICKET_UPDATE'
  | 'REFUND'
  | 'REFUND_UPDATE'
  | 'REFUND_APPROVED'
  | 'ORDER_REFUNDED'
  | 'PROJECT_APPROVED'
  | 'MODERATION'
  | 'SYSTEM';

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
export class Notification {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  type: NotificationType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({ type: String, default: null })
  link?: string | null;

  @Prop({ type: Boolean, default: false, index: true })
  isRead: boolean;

  @Prop({ type: Date, default: null })
  readAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
