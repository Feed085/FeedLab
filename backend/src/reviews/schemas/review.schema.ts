import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

export interface AuthorReply {
  text: string;
  message?: string;
  response?: string;
  authorName?: string;
  repliedAt: Date;
  repliedBy?: Types.ObjectId;
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
      if (ret.buyerId && typeof ret.buyerId === 'object' && ret.buyerId._id) {
        ret.buyer = {
          id: ret.buyerId._id,
          fullName: ret.buyerId.fullName,
          avatarUrl: ret.buyerId.avatarUrl,
        };
      }
      if (ret.authorReply) {
        const replyContent = ret.authorReply.response || ret.authorReply.text || ret.authorReply.message || '';
        ret.authorReply.text = replyContent;
        ret.authorReply.message = replyContent;
        ret.authorReply.response = replyContent;
      }
      delete ret.__v;
      return ret;
    },
  },
})
export class Review {
  _id: Types.ObjectId;

  @Prop({ type: String, default: null, index: true, sparse: true })
  customId?: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  buyerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true, trim: true })
  comment: string;

  @Prop({
    type: {
      quality: { type: Number, min: 1, max: 5 },
      functionality: { type: Number, min: 1, max: 5 },
      clarity: { type: Number, min: 1, max: 5 },
    },
    default: null,
  })
  detailedScores?: {
    quality?: number;
    functionality?: number;
    clarity?: number;
  };

  @Prop({
    type: {
      text: { type: String },
      message: { type: String },
      response: { type: String },
      authorName: { type: String },
      repliedAt: { type: Date, default: Date.now },
      repliedBy: { type: Types.ObjectId, ref: 'User' },
    },
    default: null,
  })
  authorReply?: AuthorReply;

  @Prop({ type: Boolean, default: true })
  isVerifiedPurchase: boolean;

  @Prop({ type: String, enum: ['APPROVED', 'HIDDEN'], default: 'APPROVED', index: true })
  status: string;

  createdAt: Date;
  updatedAt: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
ReviewSchema.index({ projectId: 1, createdAt: -1 });
ReviewSchema.index({ buyerId: 1, projectId: 1 });
