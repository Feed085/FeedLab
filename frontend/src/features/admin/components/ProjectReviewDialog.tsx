import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Project } from '../../marketplace/types';
import { az } from '@/i18n/az';

interface ProjectReviewDialogProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReject: (projectId: string, rejectionReason: string) => Promise<void>;
}

export const ProjectReviewDialog: React.FC<ProjectReviewDialogProps> = ({
  project,
  isOpen,
  onClose,
  onConfirmReject,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !project) return null;

  const projId = project._id || project.id || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
      setError(az.admin.queue.rejectionReasonRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmReject(projId, rejectionReason.trim());
      setRejectionReason('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'İmtina əməliyyatı uğursuz oldu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900">{az.admin.queue.rejectDialogTitle}</h3>
          <button
            type="button"
            aria-label={az.common.close}
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          <span className="font-semibold text-slate-900">{project.title}</span> adlı layihəni imtina etmək üzrəsiniz.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              {az.admin.queue.rejectionReasonLabel} *
            </label>
            <textarea
              rows={4}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={az.admin.queue.rejectionReasonPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition-colors"
            >
              {az.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
            >
              {isSubmitting ? '...' : az.admin.queue.reject}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
