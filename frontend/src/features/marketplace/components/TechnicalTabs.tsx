import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Cpu,
  BookOpen,
  User,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  FileCode,
  HardDrive,
  ExternalLink,
  ZoomIn,
} from 'lucide-react';
import { CodeBlockWithCopy } from '@/components/common/CodeBlockWithCopy';
import { LightboxImageModal } from '@/components/common/LightboxImageModal';
import { az } from '@/i18n/az';
import { formatAZN } from '@/i18n/currency';
import type { Project, PublicFile } from '../types';

interface TechnicalTabsProps {
  project: Project;
}

type TabKey = 'overview' | 'bom' | 'guide' | 'author' | 'files';

export const TechnicalTabs: React.FC<TechnicalTabsProps> = ({ project }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [previewFile, setPreviewFile] = useState<PublicFile | null>(null);

  const author =
    typeof project.author === 'object' && project.author !== null
      ? project.author
      : typeof project.authorId === 'object' && project.authorId !== null
        ? project.authorId
        : null;

  // Compute BOM total cost
  const bomTotal = project.components?.reduce(
    (sum, c) => sum + (c.estimatedCostAzn || 0) * (c.quantity || 1),
    0,
  ) || 0;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: az.projectDetails.tabs.overview, icon: <FileText className="w-4 h-4" /> },
    { key: 'bom', label: az.projectDetails.tabs.bom, icon: <Cpu className="w-4 h-4" /> },
    { key: 'guide', label: az.projectDetails.tabs.guide, icon: <BookOpen className="w-4 h-4" /> },
    { key: 'author', label: az.projectDetails.tabs.author, icon: <User className="w-4 h-4" /> },
    { key: 'files', label: az.projectDetails.tabs.files, icon: <Paperclip className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Tabs Nav */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50/50">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-[2px] ${
                isActive
                  ? 'border-brand-600 text-brand-700 bg-white shadow-sm'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs Content */}
      <div className="p-6 md:p-8">
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Objectives */}
            {project.objectives && project.objectives.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-brand-600" />
                  {az.projectDetails.overview.objectivesTitle}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {project.objectives.map((obj, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-700">{obj}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-3">
                {az.projectDetails.overview.descriptionTitle}
              </h3>
              <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed space-y-4">
                <p>{project.fullDescription || project.shortDescription}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: BOM */}
        {activeTab === 'bom' && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {az.projectDetails.bom.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Layihənin aparatı üçün tələb olunan komponentlər və təxmini xərclər
                </p>
              </div>
              {bomTotal > 0 && (
                <div className="mt-2 sm:mt-0 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-bold border border-emerald-200">
                  {az.projectDetails.bom.totalEstimated}: {formatAZN(bomTotal, { useCode: true })}
                </div>
              )}
            </div>

            {project.components && project.components.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">{az.projectDetails.bom.componentName}</th>
                      <th className="py-3 px-4 text-center">{az.projectDetails.bom.quantity}</th>
                      <th className="py-3 px-4">{az.projectDetails.bom.estimatedCost}</th>
                      <th className="py-3 px-4">{az.projectDetails.bom.notes}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.components.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {item.componentSlug ? (
                            <Link
                              to={`/library/${item.componentSlug}`}
                              className="text-[#147DF5] hover:underline inline-flex items-center gap-1.5 font-semibold"
                            >
                              <span>{item.name}</span>
                              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                            </Link>
                          ) : (
                            item.name
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-700">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-xs font-semibold">
                            {item.quantity} ədəd
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-semibold">
                          {item.estimatedCostAzn !== undefined
                            ? formatAZN(item.estimatedCostAzn, { useCode: true })
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {item.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">
                {az.projectDetails.bom.empty}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Guide & Requirements */}
        {activeTab === 'guide' && (
          <div className="space-y-8">
            {/* Working Principle */}
            {project.workingPrinciple && (
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {az.projectDetails.guide.workingPrinciple}
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {project.workingPrinciple}
                </p>
              </div>
            )}

            {/* Hardware & System Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {project.hardwareRequirements && (
                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 font-bold text-slate-900 text-sm">
                    <HardDrive className="w-4 h-4 text-brand-600" />
                    <span>{az.projectDetails.guide.hardwareRequirements}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {project.hardwareRequirements}
                  </p>
                </div>
              )}

              {project.systemRequirements && (
                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 font-bold text-slate-900 text-sm">
                    <FileCode className="w-4 h-4 text-[#147DF5]" />
                    <span>{az.projectDetails.guide.systemRequirements}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {project.systemRequirements}
                  </p>
                </div>
              )}
            </div>

            {/* Installation Guide */}
            {project.installationGuide && (
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-3">
                  {az.projectDetails.guide.installationGuide}
                </h3>
                <CodeBlockWithCopy
                  code={project.installationGuide}
                  title={az.projectDetails.guide.installationGuide}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Author */}
        {activeTab === 'author' && (
          <div>
            <div className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-200 rounded-xl mb-6">
              <div className="w-14 h-14 rounded-full bg-brand-600 text-white font-bold text-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                {author?.fullName ? author.fullName.charAt(0).toUpperCase() : 'M'}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 text-lg">
                    {author?.fullName || 'Feed Lab Müəllifi'}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-100 text-brand-800 border border-brand-200">
                    {az.projectDetails.author.verifiedAuthor}
                  </span>
                </div>
                {author?.email && (
                  <p className="text-xs text-slate-500 mb-2">{author.email}</p>
                )}
                <p className="text-xs text-slate-600 leading-relaxed">
                  {author?.bio ||
                    'Elektronika, mikrokontrollerlər və IoT sahəsində ixtisaslaşmış təcrübəli mühəndis və layihə tərtibatçısı.'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-brand-50/50 border border-brand-100 rounded-xl text-xs text-brand-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span>{az.projectDetails.author.contactNote}</span>
            </div>
          </div>
        )}

        {/* Tab 5: Files */}
        {activeTab === 'files' && (
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {az.projectDetails.files.title}
              </h3>
              <span className="text-xs text-slate-500">
                {project.publicFiles?.length || 0} fayl
              </span>
            </div>

            {project.publicFiles && project.publicFiles.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden mb-6">
                {project.publicFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Paperclip className="w-4 h-4 text-brand-600" />
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          {file.originalName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {(file.fileSize / 1024).toFixed(1)} KB • {file.fileType}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.url && file.fileType?.startsWith('image/') && (
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-50 text-[#147DF5] hover:bg-brand-100 transition-colors"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span>Böyüt</span>
                        </button>
                      )}
                      {file.isPreview && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          Önbaxış
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 mb-6">
                Fayl siyahısı qeyd edilməyib.
              </div>
            )}

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span>{az.projectDetails.files.publicNotice}</span>
            </div>

            {previewFile?.url && (
              <LightboxImageModal
                isOpen={true}
                onClose={() => setPreviewFile(null)}
                src={previewFile.url}
                alt={previewFile.originalName}
                caption={previewFile.originalName}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
