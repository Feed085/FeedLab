import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;
export type UserRole = 'USER' | 'AUTHOR' | 'MODERATOR' | 'ADMIN';
export const USER_ROLES: UserRole[] = ['USER', 'AUTHOR', 'MODERATOR', 'ADMIN'];

@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc, ret: Record<string, any>) => {
      ret.id = ret._id;
      delete ret.passwordHash;
      delete ret.refreshTokenHash;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.__v;
      return ret;
    },
  },
})
export class User {
  _id: Types.ObjectId;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({
    type: String,
    enum: USER_ROLES,
    default: 'USER',
    index: true,
  })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ type: String, default: null })
  refreshTokenHash: string | null;

  @Prop({ type: String, default: null, index: true, sparse: true })
  resetPasswordToken: string | null;

  @Prop({ type: Date, default: null })
  resetPasswordExpires: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
