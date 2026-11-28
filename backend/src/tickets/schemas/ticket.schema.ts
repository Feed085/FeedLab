import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketDocument = Ticket & Document;

export type TicketCategory =
  | 'TECHNICAL'
  | 'TECHNICAL_SUPPORT'
  | 'BILLING'
  | 'GENERAL'
  | 'ORDER'
  | 'ORDER_ISSUE'
  | 'REFUND';
export const TICKET_CATEGORIES: TicketCategory[] = [
  'TECHNICAL',
  'TECHNICAL_SUPPORT',
  'BILLING',
  'GENERAL',
  'ORDER',
  'ORDER_ISSUE',
  'REFUND',
];

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_USER'
  | 'WAITING_FOR_AUTHOR'
  | 'RESOLVED'
  | 'CLOSED';
export const TICKET_STATUSES: TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_USER',
  'WAITING_FOR_AUTHOR',
  'RESOLVED',
  'CLOSED',
];

export interface TicketMessageItem {
  senderId: Types.ObjectId;
  senderRole: string;
  senderName?: string;
  message: string;
  createdAt: Date;
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
      delete ret.__v;
      return ret;
    },
  },
})
export class Ticket {
  _id: Types.ObjectId;

  @Prop({ type: String, default: null, index: true, sparse: true })
  customId?: string;

  @Prop({ required: true, unique: true, index: true })
  ticketNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  authorId?: Types.ObjectId;

  @Prop({ type: Object, ref: 'Project', default: null })
  projectId?: any;

  @Prop({ type: Object, ref: 'Order', default: null })
  orderId?: any;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({
    type: String,
    enum: TICKET_CATEGORIES,
    required: true,
  })
  category: TicketCategory;

  @Prop({
    type: String,
    enum: TICKET_STATUSES,
    default: 'OPEN',
    index: true,
  })
  status: TicketStatus;

  @Prop({
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM',
  })
  priority: string;

  @Prop({
    type: [
      {
        senderId: { type: Types.ObjectId, ref: 'User', required: true },
        senderRole: { type: String, required: true },
        senderName: { type: String },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  messages: TicketMessageItem[];

  @Prop({ type: Date, default: null })
  resolvedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
TicketSchema.index({ userId: 1, status: 1 });
TicketSchema.index({ createdAt: -1 });
