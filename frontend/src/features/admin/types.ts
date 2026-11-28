import { Project, PaginationMeta } from '../marketplace/types';
import { AuthorApplicationResponse } from '../author/types';
import type {
  ComponentSpec,
  ComponentPinout,
  ComponentCodeExample,
  ComponentAlternative,
  ComponentDetail,
  ComponentSummary,
  ComponentsListResponse,
} from '@/types';

export interface AdminMetrics {
  totalUsers: number;
  totalAuthors: number;
  totalProjects: number;
  totalOrders: number;
  totalRevenueAZN: number;
  platformCommissionAZN: number;
  pendingProjectsCount: number;
  pendingApplicationsCount: number;
}

export interface ReviewProjectPayload {
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

export interface ReviewAuthorAppPayload {
  action: 'APPROVE' | 'REJECT';
  adminNotes?: string;
  rejectionReason?: string;
}

export interface AdminUser {
  _id: string;
  id?: string;
  fullName: string;
  email: string;
  role: 'USER' | 'AUTHOR' | 'MODERATOR' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserListResponse {
  data: AdminUser[];
  users?: AdminUser[];
  meta: PaginationMeta;
}

export interface ProjectQueueResponse {
  data: Project[];
  queue?: Project[];
  meta: PaginationMeta;
}

export interface AuthorApplicationListResponse {
  data: AuthorApplicationResponse[];
  meta: PaginationMeta;
}

export interface AdminComponentPayload {
  slug: string;
  name: string;
  aliases?: string[];
  category: string;
  categoryLabel: string;
  shortDescription: string;
  definition: string;
  workingPrinciple: string;
  applications?: string[];
  specs?: ComponentSpec[];
  pinout?: ComponentPinout[];
  pinoutImageUrl?: string | null;
  wiringGuide?: string;
  wiringImageUrl?: string | null;
  codeExample?: ComponentCodeExample | null;
  pros?: string[];
  limitations?: string[];
  alternatives?: ComponentAlternative[];
  imageUrl?: string | null;
  isActive?: boolean;
}

export type AdminComponentItem = ComponentDetail;
export type AdminComponentSummary = ComponentSummary;
export type AdminComponentsListResponse = ComponentsListResponse;
