import type { AuthorSummary, BOMComponent, Category, Project, Technology } from '@/features/marketplace/types';

export type ProjectDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type PriceType = 'all' | 'free' | 'paid';

export interface ComponentCategoryFacet {
  key: string;
  label: string;
  count: number;
}

export interface ComponentSpec {
  label: string;
  value: string;
}

export interface ComponentPinoutItem {
  pin: string;
  name: string;
  function: string;
  type?: string;
}

export interface ComponentAlternative {
  slug?: string;
  name: string;
  reason: string;
}

export interface ComponentCodeExample {
  language: string;
  title?: string;
  code: string;
}

export interface ComponentSummary {
  _id: string;
  id?: string;
  slug: string;
  name: string;
  aliases: string[];
  category: string;
  categoryLabel: string;
  shortDescription: string;
  definition?: string;
  workingPrinciple?: string;
  applications?: string[];
  specs?: ComponentSpec[];
  pinout?: ComponentPinoutItem[];
  pinoutImageUrl?: string | null;
  wiringGuide?: string;
  wiringImageUrl?: string | null;
  codeExample?: ComponentCodeExample | null;
  pros?: string[];
  limitations?: string[];
  alternatives?: ComponentAlternative[];
  imageUrl?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComponentListResponse {
  items: ComponentSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories: ComponentCategoryFacet[];
}

export interface GetComponentsParams {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface ComponentFinderBOMItem extends BOMComponent {
  componentSlug?: string | null;
  _id?: string;
}

export interface ComponentFinderProject
  extends Omit<Project, 'components' | 'category' | 'categoryId' | 'author' | 'authorId' | 'technologies'> {
  components?: ComponentFinderBOMItem[];
  domains?: string[];
  difficulty?: ProjectDifficulty;
  isFree?: boolean;
  averageRating?: number;
  totalReviews?: number;
  category?: Category | string;
  categoryId?: Category | string;
  author?: AuthorSummary | string;
  authorId?: AuthorSummary | string;
  technologies?: Array<Technology | string>;
}

export interface MatchComponentsPayload {
  components: string[];
  domain?: string;
  priceType?: PriceType;
  minPrice?: number;
  maxPrice?: number;
  difficulty?: ProjectDifficulty;
}

export interface MatchEntry {
  project: ComponentFinderProject;
  matchedCount: number;
  totalRequired: number;
  matchLabel: string;
  matchedComponents: string[];
  missingComponents: string[];
}

export interface MatchComponentsResponse {
  selectedComponents: string[];
  fullMatches: MatchEntry[];
  partialMatches: MatchEntry[];
  totalFull: number;
  totalPartial: number;
}

export interface SelectedComponentItem {
  slug: string;
  name: string;
  category?: string;
  categoryLabel?: string;
  isCustom?: boolean;
}

export interface FinderFilters {
  domain: string;
  priceType: PriceType;
  minPrice: string;
  maxPrice: string;
  difficulty: '' | ProjectDifficulty;
}
