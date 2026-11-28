import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ComponentDocument = Component & Document;

export interface ComponentSpec {
  label: string;
  value: string;
}

export interface ComponentPin {
  pin: string;
  name: string;
  function: string;
  type?: string;
}

export interface ComponentCodeExample {
  language: string;
  title?: string;
  code: string;
}

export interface ComponentAlternative {
  slug?: string;
  name: string;
  reason: string;
}

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: Record<string, any>) => {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Component {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: [String], default: [], index: true })
  aliases: string[];

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  category: string;

  @Prop({ required: true, trim: true })
  categoryLabel: string;

  @Prop({ required: true, trim: true })
  shortDescription: string;

  @Prop({ required: true })
  definition: string;

  @Prop({ required: true })
  workingPrinciple: string;

  @Prop({ type: [String], default: [] })
  applications: string[];

  @Prop({
    type: [
      {
        _id: false,
        label: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    default: [],
  })
  specs: ComponentSpec[];

  @Prop({
    type: [
      {
        _id: false,
        pin: { type: String, required: true },
        name: { type: String, required: true },
        function: { type: String, required: true },
        type: { type: String, default: '' },
      },
    ],
    default: [],
  })
  pinout: ComponentPin[];

  @Prop({ type: String, default: null })
  pinoutImageUrl?: string | null;

  @Prop({ type: String, default: '' })
  wiringGuide: string;

  @Prop({ type: String, default: null })
  wiringImageUrl?: string | null;

  @Prop({
    type: {
      _id: false,
      language: { type: String, required: true },
      title: { type: String, default: '' },
      code: { type: String, required: true },
    },
    default: null,
  })
  codeExample?: ComponentCodeExample | null;

  @Prop({ type: [String], default: [] })
  pros: string[];

  @Prop({ type: [String], default: [] })
  limitations: string[];

  @Prop({
    type: [
      {
        _id: false,
        slug: { type: String, default: '' },
        name: { type: String, required: true },
        reason: { type: String, required: true },
      },
    ],
    default: [],
  })
  alternatives: ComponentAlternative[];

  @Prop({ type: String, default: null })
  imageUrl?: string | null;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const ComponentSchema = SchemaFactory.createForClass(Component);

ComponentSchema.index({ isActive: 1, category: 1, name: 1 });
ComponentSchema.index(
  { name: 'text', slug: 'text', aliases: 'text', shortDescription: 'text', definition: 'text' },
  { default_language: 'none' },
);
