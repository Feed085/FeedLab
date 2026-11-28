import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TechnologyDocument = Technology & Document;

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
export class Technology {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ type: String, default: 'cpu' })
  icon: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const TechnologySchema = SchemaFactory.createForClass(Technology);
TechnologySchema.index({ isActive: 1 });
