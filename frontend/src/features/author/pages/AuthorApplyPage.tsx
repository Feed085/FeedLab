import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, GraduationCap } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { authorApi } from '../api/authorApi';
import { az } from '@/i18n/az';

export const AuthorApplyPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If user already is AUTHOR or ADMIN
  if (user?.role === 'AUTHOR' || user?.role === 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {az.author.applyForm.alreadyAuthorTitle}
        </h2>
        <p className="text-slate-600 mb-6">{az.author.applyForm.alreadyAuthorDesc}</p>
        <Link
          to="/author/dashboard"
          className="inline-flex items-center px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl shadow-sm transition-colors"
        >
          {az.author.applyForm.goToDashboard}
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedSkills = skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!bio.trim() || bio.trim().length < 10) {
      setErrorMessage('Bioqrafiya ən azı 10 simvol olmalıdır');
      return;
    }

    if (parsedSkills.length === 0) {
      setErrorMessage('Ən azı 1 texniki bacarıq qeyd edilməlidir');
      return;
    }

    setIsSubmitting(true);

    try {
      await authorApi.apply({
        fullName: user?.fullName,
        bio: bio.trim(),
        skills: parsedSkills,
        portfolioUrl: portfolioUrl.trim() || undefined,
      });

      setIsSubmitted(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Müraciət göndərilərkən xəta baş verdi';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {az.author.applyForm.pendingTitle}
        </h2>
        <p className="text-slate-600 mb-6">{az.author.applyForm.pendingDesc}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium rounded-xl transition-colors"
        >
          Ana səhifəyə qayıt
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-12 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">{az.author.applyTitle}</h2>
          <p className="text-sm text-slate-600 mt-1">{az.author.applySubtitle}</p>
        </div>

        {errorMessage && (
          <div
            className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm"
            data-testid="error-message"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              {az.author.applyForm.bioLabel} *
            </label>
            <textarea
              rows={4}
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={az.author.applyForm.bioPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              {az.author.applyForm.skillsLabel} *
            </label>
            <input
              type="text"
              required
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder={az.author.applyForm.skillsPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Portfolio */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              {az.author.applyForm.portfolioLabel}
            </label>
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder={az.author.applyForm.portfolioPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              {isSubmitting ? az.author.applyForm.submitting : az.author.applyForm.submitButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
