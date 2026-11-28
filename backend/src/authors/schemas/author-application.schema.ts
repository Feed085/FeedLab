import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuthorApplicationDocument = AuthorApplication & Document;
export type AuthorApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export const AUTHOR_APPLICATION_STATUSES: AuthorApplicationStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc, ret: Record<string, any>) => {
      ret.id = ret._id;
      if (ret.userId && typeof ret.userId === 'object') {
        ret.user = ret.userId;
      }
      delete ret.__v;
      return ret;
    },
  },
})
export class AuthorApplication {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ trim: true })
  fullName?: string;

  @Prop({ required: true, trim: true })
  bio: string;

  @Prop({ type: [String], required: true, default: [] })
  skills: string[];

  @Prop({ type: [String], default: [] })
  technicalSkills?: string[];

  @Prop({ type: String, default: null })
  portfolioUrl?: string;

  @Prop({ type: [String], default: [] })
  portfolioLinks?: string[];

  @Prop({ type: String, default: null })
  githubUrl?: string;

  @Prop({ type: String, default: null })
  linkedinUrl?: string;

  @Prop({ type: Number, default: 0 })
  experienceYears?: number;

  @Prop({ type: String, default: null })
  motivation?: string;

  @Prop({
    type: String,
    enum: AUTHOR_APPLICATION_STATUSES,
    default: 'PENDING',
    index: true,
  })
  status: AuthorApplicationStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewerId?: Types.ObjectId;

  @Prop({ type: String, default: null })
  adminNotes?: string;

  @Prop({ type: String, default: null })
  rejectionReason?: string;

  @Prop({ type: Date, default: null })
  reviewedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const AuthorApplicationSchema = SchemaFactory.createForClass(AuthorApplication);

AuthorApplicationSchema.index({ status: 1, createdAt: -1 });
AuthorApplicationSchema.index({ userId: 1, status: 1 });
