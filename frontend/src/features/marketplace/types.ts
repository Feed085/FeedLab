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

export interface Category {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
}

export interface Technology {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  icon?: string;
  isActive?: boolean;
}

export interface BOMComponent {
  name: string;
  quantity: number;
  estimatedCostAzn?: number;
  notes?: string;
  componentSlug?: string | null;
}

export interface PublicFile {
  fileId: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  isPreview?: boolean;
  url?: string | null;
}

export interface AuthorSummary {
  _id: string;
  id?: string;
  fullName: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt?: string;
}

export interface Project {
  _id: string;
  id?: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription?: string;
  objectives?: string[];
  workingPrinciple?: string;
  components?: BOMComponent[];
  installationGuide?: string;
  hardwareRequirements?: string;
  systemRequirements?: string;
  price: number;
  currency: 'AZN';
  isFree?: boolean;
  category?: Category | string;
  categoryId?: Category | string;
  technologies?: Technology[];
  domains?: string[];
  difficulty?: ProjectDifficulty;
  author?: AuthorSummary;
  authorId?: AuthorSummary | string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  featured?: boolean;
  rating: number;
  averageRating?: number;
  reviewsCount?: number;
  totalReviews?: number;
  salesCount: number;
  viewsCount?: number;
  publicFiles?: PublicFile[];
  thumbnailUrl?: string | null;
  images?: string[];
  createdAt: string;
  updatedAt?: string;
}

export type ProjectSortOption = 'newest' | 'price_asc' | 'price_desc' | 'popular';

export interface ProjectQueryParams {
  q?: string;
  category?: string;
  tech?: string;
  domain?: string;
  difficulty?: ProjectDifficulty;
  component?: string;
  minPrice?: number;
  maxPrice?: number;
  freeOnly?: boolean;
  sort?: ProjectSortOption;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ProjectListResponse {
  data: Project[];
  meta: PaginationMeta;
}

export interface ClaimFreeResponse {
  success: boolean;
  message: string;
  orderId: string;
  orderNumber?: string;
  projectId?: string;
  alreadyClaimed?: boolean;
}
