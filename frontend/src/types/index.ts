export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
  uptime?: number;
  environment?: string;
  version?: string;
  error?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

export {
  PROJECT_DOMAINS,
  PROJECT_DIFFICULTIES,
  type ProjectDomain,
  type ProjectDifficulty,
  type Project,
  type Project as ProjectSummary,
  type BOMComponent,
  type PublicFile,
  type Category,
  type Technology,
  type AuthorSummary,
} from '@/features/marketplace/types';

export interface ComponentSpec {
  label: string;
  value: string;
}

export interface ComponentPinout {
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

export interface ComponentCategoryCount {
  key: string;
  label: string;
  count: number;
}

export interface ComponentSummary {
  id: string;
  _id?: string;
  slug: string;
  name: string;
  aliases: string[];
  category: string;
  categoryLabel: string;
  shortDescription: string;
  imageUrl?: string | null;
  specs?: ComponentSpec[];
  pinoutCount?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComponentDetail extends ComponentSummary {
  definition: string;
  workingPrinciple: string;
  applications: string[];
  specs: ComponentSpec[];
  pinout: ComponentPinout[];
  pinoutImageUrl?: string | null;
  wiringGuide?: string;
  wiringImageUrl?: string | null;
  codeExample?: ComponentCodeExample | null;
  pros: string[];
  limitations: string[];
  alternatives: ComponentAlternative[];
  featuredProjects?: import('@/features/marketplace/types').Project[];
  totalProjectsCount?: number;
}

export interface ComponentsListResponse {
  items: ComponentSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories: ComponentCategoryCount[];
}
