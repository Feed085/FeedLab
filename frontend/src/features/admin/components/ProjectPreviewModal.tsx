import React from 'react';
import { AlertTriangle, FileText, X } from 'lucide-react';
import { Project } from '../../marketplace/types';
import { formatAZN } from '@/i18n/currency';
import { az } from '@/i18n/az';

interface ProjectPreviewModalProps {
  project: Project | null;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onReject?: (project: Project) => void;
}

export const ProjectPreviewModal: React.FC<ProjectPreviewModalProps> = ({
  project,
  onClose,
  onApprove,
  onReject,
}) => {
  if (!project) return null;

  const projId = project._id || project.id || '';

  const totalHardwareCost = (project.components || []).reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const cost = Number(item.estimatedCostAzn) || 0;
    return sum + qty * cost;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-start">
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md">
              {(az.status as Record<string, string>)[project.status] || project.status}
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2">{project.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Müəllif: {typeof project.authorId === 'object' && project.authorId !== null ? (project.authorId as any).fullName : project.author?.fullName || 'Bilinmir'} • Qiymət: {formatAZN(project.price)}
            </p>
          </div>
          <button
            type="button"
            aria-label={az.common.close}
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Descriptions */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Qısa Təsvir</h4>
            <p className="bg-slate-50 p-3 rounded-lg border border-slate-100">{project.shortDescription}</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Geniş Texniki Təsvir</h4>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 whitespace-pre-line">
              {project.fullDescription || 'Təsvir qeyd edilməyib'}
            </div>
          </div>

          {/* Objectives */}
          {project.objectives && project.objectives.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Layihənin Məqsədləri</h4>
              <ul className="list-disc list-inside space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                {project.objectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
          )}

          {/* BOM */}
          {project.components && project.components.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-semibold text-slate-900">{az.projectEditor.bom.title}</h4>
                <span className="text-xs font-semibold text-slate-900">
                  Cəmi aparat xərci: {formatAZN(totalHardwareCost, { showFree: false })}
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Komponent</th>
                      <th className="px-3 py-2 w-16">Say</th>
                      <th className="px-3 py-2 w-28">Qiymət (AZN)</th>
                      <th className="px-3 py-2">Qeyd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.components.map((comp, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-slate-900">{comp.name}</td>
                        <td className="px-3 py-2">{comp.quantity}</td>
                        <td className="px-3 py-2">{formatAZN(comp.estimatedCostAzn, { showFree: false })}</td>
                        <td className="px-3 py-2 text-slate-500">{comp.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Requirements & Installation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Aparat Tələbləri</h4>
              <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                {project.hardwareRequirements || 'Qeyd edilməyib'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Sistem Tələbləri</h4>
              <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                {project.systemRequirements || 'Qeyd edilməyib'}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Quraşdırma Bələdçisi</h4>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs whitespace-pre-line">
              {project.installationGuide || 'Quraşdırma təlimatı qeyd edilməyib'}
            </div>
          </div>

          {/* Attached Files */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Rəqəmsal Fayllar ({project.publicFiles?.length || 0})</h4>
            {(!project.publicFiles || project.publicFiles.length === 0) ? (
              <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Layihəyə heç bir fayl yüklənməyib!</span>
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {project.publicFiles.map((f) => (
                  <li key={f.fileId} className="px-3 py-2 flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-900 inline-flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{f.originalName}</span>
                    </span>
                    <span className="text-slate-500">{f.fileType} • {(f.fileSize / 1024).toFixed(1)} KB</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition-colors"
          >
            Bağla
          </button>

          {onReject && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onReject(project);
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
            >
              {az.admin.queue.reject}
            </button>
          )}

          {onApprove && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onApprove(projId);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
            >
              {az.admin.queue.approve}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
