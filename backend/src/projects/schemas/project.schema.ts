import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;
export type ProjectStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
export const PROJECT_STATUSES: ProjectStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PUBLISHED'];

export const PROJECT_DOMAINS = [
  'Energetika',
  'Ekologiya',
  'İT',
  'Kompüter mühəndisliyi',
  'İnformasiya təhlükəsizliyi',
  'Səhiyyə',
  'Kənd təsərrüfatı',
  'Digər',
] as const;
export type ProjectDomain = (typeof PROJECT_DOMAINS)[number];

export const PROJECT_DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type ProjectDifficulty = (typeof PROJECT_DIFFICULTIES)[number];

export interface BOMComponent {
  name: string;
  quantity: number;
  estimatedCostAzn?: number;
  notes?: string;
  componentSlug?: string | null;
}

export interface PublicFileMetadata {
  fileId: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  storagePath?: string;
  url?: string;
  isPreview?: boolean;
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
      if (ret.categoryId && typeof ret.categoryId === 'object') {
        ret.category = ret.categoryId.slug || ret.categoryId;
      }
      if (ret.authorId && typeof ret.authorId === 'object') {
        ret.author = ret.authorId;
      }
      if (ret.publicFiles && !ret.files) {
        ret.files = ret.publicFiles;
      }
      ret.isFree = ret.price === 0 || ret.isFree === true;
      ret.averageRating = ret.rating;
      ret.totalReviews = ret.reviewsCount;
      delete ret.__v;
      return ret;
    },
  },
})
export class Project {
  _id: Types.ObjectId;

  @Prop({ type: String, default: null, index: true, sparse: true })
  customId?: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  shortDescription: string;

  @Prop({ required: true })
  fullDescription: string;

  @Prop({ type: [String], default: [] })
  objectives: string[];

  @Prop({ default: '' })
  workingPrinciple: string;

  @Prop({
    type: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        estimatedCostAzn: { type: Number, default: 0 },
        notes: { type: String, default: '' },
        componentSlug: { type: String, default: null },
      },
    ],
    default: [],
  })
  components: BOMComponent[];

  @Prop({ type: [String], default: [], index: true })
  domains?: string[];

  @Prop({ type: String, enum: PROJECT_DIFFICULTIES, default: undefined, index: true })
  difficulty?: ProjectDifficulty;

  @Prop({ default: '' })
  installationGuide: string;

  @Prop({ default: '' })
  hardwareRequirements: string;

  @Prop({ default: '' })
  systemRequirements: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: String, enum: ['AZN'], default: 'AZN' })
  currency: 'AZN';

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Technology' }], default: [], index: true })
  technologies: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  authorId: Types.ObjectId;

  @Prop({
    type: String,
    enum: PROJECT_STATUSES,
    default: 'DRAFT',
    index: true,
  })
  status: ProjectStatus;

  @Prop({ type: Boolean, default: false, index: true })
  featured: boolean;

  @Prop({ type: Number, default: 0, min: 0, max: 5 })
  rating: number;

  @Prop({ type: Number, default: 0, min: 0 })
  reviewsCount: number;

  @Prop({ type: Number, default: 0, min: 0, index: true })
  salesCount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  viewsCount: number;

  @Prop({
    type: [
      {
        _id: { type: String, default: () => new Types.ObjectId().toString() },
        fileId: { type: String, required: true },
        originalName: { type: String, required: true },
        fileSize: { type: Number, required: true },
        fileType: { type: String, required: true },
        storagePath: { type: String, default: null },
        url: { type: String, default: null },
        isPreview: { type: Boolean, default: true },
      },
    ],
    default: [],
  })
  publicFiles: PublicFileMetadata[];

  @Prop({ type: String, default: null })
  rejectionReason: string | null;

  @Prop({ type: Date, default: null })
  submittedAt?: Date | null;

  @Prop({ type: String, default: null })
  thumbnailUrl: string | null;

  @Prop({ type: [String], default: [] })
  images: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Database Indexes
ProjectSchema.index(
  { title: 'text', shortDescription: 'text', fullDescription: 'text' },
  { weights: { title: 10, shortDescription: 5, fullDescription: 1 }, default_language: 'none' }
);
ProjectSchema.index({ status: 1, categoryId: 1, price: 1, createdAt: -1 });
ProjectSchema.index({ status: 1, createdAt: -1 });
ProjectSchema.index({ status: 1, salesCount: -1 });
ProjectSchema.index({ status: 1, rating: -1 });
ProjectSchema.index({ status: 1, featured: -1, createdAt: -1 });
ProjectSchema.index({ status: 1, domains: 1, difficulty: 1 });
ProjectSchema.index({ status: 1, 'components.componentSlug': 1 });
