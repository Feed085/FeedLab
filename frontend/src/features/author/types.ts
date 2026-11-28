import { Project } from '../marketplace/types';

export interface AuthorApplicationPayload {
  fullName?: string;
  bio: string;
  skills: string[];
  portfolioUrl?: string;
}

export interface AuthorApplicationResponse {
  _id: string;
  userId: string;
  fullName?: string;
  bio: string;
  skills: string[];
  portfolioUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface AuthorBalanceInfo {
  totalEarnings: number;
  availableBalance: number;
  pendingClearance: number;
  currency: 'AZN';
}

export interface AuthorStatsInfo {
  totalSales: number;
  totalRevenue?: number;
  totalProjects: number;
  draftProjects?: number;
  submittedProjects?: number;
  approvedProjects?: number;
  rejectedProjects?: number;
  averageRating: number;
}

export interface AuthorDashboardData {
  balance: AuthorBalanceInfo;
  stats: AuthorStatsInfo;
  projects: Project[];
}

export interface AuthorProjectsQueryParams {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}
