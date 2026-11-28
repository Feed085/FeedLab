import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { HomePage } from '@/features/marketplace/HomePage';
import { CatalogPage } from '@/features/marketplace/CatalogPage';
import { AuthorsPage } from '@/features/marketplace/AuthorsPage';
import { ProjectDetailsPage } from '@/features/marketplace/ProjectDetailsPage';
import { ComponentFinderPage } from '@/features/component-finder/ComponentFinderPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { ComponentDetailPage } from '@/features/library/ComponentDetailPage';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import { FaqPage } from '@/features/legal/pages/FaqPage';
import { TermsPage } from '@/features/legal/pages/TermsPage';
import { PrivacyPage } from '@/features/legal/pages/PrivacyPage';
import { LicensePage } from '@/features/legal/pages/LicensePage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AuthorApplyPage } from '@/features/author/pages/AuthorApplyPage';
import { AuthorDashboardPage } from '@/features/author/pages/AuthorDashboardPage';
import { ProjectEditorPage } from '@/features/author/pages/ProjectEditorPage';
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage';
import { ProjectReviewQueuePage } from '@/features/admin/pages/ProjectReviewQueuePage';
import { AuthorApplicationsPage } from '@/features/admin/pages/AuthorApplicationsPage';
import { UserManagementPage } from '@/features/admin/pages/UserManagementPage';
import { AdminRefundsPage } from '@/features/admin/pages/AdminRefundsPage';
import { MyOrdersPage } from '@/features/orders/pages/MyOrdersPage';
import { SupportTicketsPage } from '@/features/tickets/pages/SupportTicketsPage';
import { TicketDetailsPage } from '@/features/tickets/pages/TicketDetailsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Marketplace Core Routes */}
        <Route index element={<HomePage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="projects" element={<CatalogPage />} />
        <Route path="projects/:slug" element={<ProjectDetailsPage />} />
        <Route path="categories" element={<CatalogPage />} />
        <Route path="authors" element={<AuthorsPage />} />

        {/* Feature: Komponentlərimlə Layihə Tap */}
        <Route path="component-finder" element={<ComponentFinderPage />} />
        <Route path="component-matcher" element={<Navigate to="/component-finder" replace />} />
        <Route path="komponentler" element={<Navigate to="/component-finder" replace />} />

        {/* Feature: Elektronika Ensiklopediyası / Kitabxanası */}
        <Route path="library" element={<LibraryPage />} />
        <Route path="library/:slug" element={<ComponentDetailPage />} />
        <Route path="kitabxana" element={<Navigate to="/library" replace />} />

        {/* Legal & Informational Pages */}
        <Route path="faq" element={<FaqPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="license" element={<LicensePage />} />

        {/* Auth Public Pages */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />

        {/* Protected Authenticated Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="orders/my" element={<MyOrdersPage />} />
          <Route path="tickets" element={<SupportTicketsPage />} />
          <Route path="tickets/:id" element={<TicketDetailsPage />} />
          <Route path="become-author" element={<AuthorApplyPage />} />
          <Route path="author/apply" element={<AuthorApplyPage />} />
        </Route>

        {/* Role Protected Author Routes */}
        <Route element={<ProtectedRoute allowedRoles={['AUTHOR', 'ADMIN']} />}>
          <Route path="author/dashboard" element={<AuthorDashboardPage />} />
          <Route path="author/projects/new" element={<ProjectEditorPage />} />
          <Route path="author/projects/:id/edit" element={<ProjectEditorPage />} />
        </Route>

        {/* Role Protected Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="admin/projects/review" element={<ProjectReviewQueuePage />} />
          <Route path="admin/projects/queue" element={<ProjectReviewQueuePage />} />
          <Route path="admin/author-applications" element={<AuthorApplicationsPage />} />
          <Route path="admin/users" element={<UserManagementPage />} />
          <Route path="admin/refunds" element={<AdminRefundsPage />} />
        </Route>

        {/* 404 Fallback */}
        <Route
          path="*"
          element={
            <div className="py-20 text-center">
              <h2 className="text-2xl font-bold text-slate-900">404 — Səhifə tapılmadı</h2>
              <p className="text-slate-500 mt-2">Axtardığınız səhifə mövcud deyil.</p>
            </div>
          }
        />
      </Route>
    </Routes>
  );
};
