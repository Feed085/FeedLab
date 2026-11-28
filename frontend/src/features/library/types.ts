import type { Project } from '@/features/marketplace/types';

export interface ComponentCategoryFacet {
  key: string;
  label: string;
  count: number;
}

export interface ComponentSpec {
  label: string;
  value: string;
}

export interface ComponentPin {
  pin: string;
  name: string;
  function: string;
  type?: 'power' | 'ground' | 'data' | 'analog' | 'digital' | 'passive' | string;
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

export interface ElectronicsComponent {
  id: string;
  _id: string;
  slug: string;
  name: string;
  aliases: string[];
  category: string;
  categoryLabel: string;
  shortDescription: string;
  definition: string;
  workingPrinciple: string;
  applications: string[];
  specs: ComponentSpec[];
  pinout: ComponentPin[];
  pinoutImageUrl?: string | null;
  wiringGuide: string;
  wiringImageUrl?: string | null;
  codeExample?: ComponentCodeExample | null;
  pros: string[];
  limitations: string[];
  alternatives: ComponentAlternative[];
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentListParams {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface ComponentListResponse {
  items: ElectronicsComponent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories: ComponentCategoryFacet[];
}

export interface ComponentDetailResponse extends ElectronicsComponent {
  featuredProjects: Project[];
  totalProjectsCount: number;
}

export interface ComponentProjectsResponse {
  items: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
