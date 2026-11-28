import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import { authorApi } from '../api/authorApi';
import { marketplaceApi } from '../../marketplace/marketplace.api';
import {
  Category,
  Technology,
  BOMComponent,
  PublicFile,
  PROJECT_DOMAINS,
  PROJECT_DIFFICULTIES,
  type ProjectDifficulty,
} from '../../marketplace/types';
import { BOMEditor } from '../components/BOMEditor';
import { ProjectFileUpload } from '../components/ProjectFileUpload';
import { az } from '@/i18n/az';

export const ProjectEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [activeTab, setActiveTab] = useState<'basics' | 'specs' | 'bom' | 'guide' | 'files'>('basics');

  // Form Fields
  const [projectId, setProjectId] = useState<string | undefined>(id);
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [categoryId, setCategoryId] = useState('');
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<ProjectDifficulty | ''>('');
  const [objectives, setObjectives] = useState<string[]>(['']);
  const [workingPrinciple, setWorkingPrinciple] = useState('');
  const [hardwareRequirements, setHardwareRequirements] = useState('');
  const [systemRequirements, setSystemRequirements] = useState('');
  const [installationGuide, setInstallationGuide] = useState('');
  const [components, setComponents] = useState<BOMComponent[]>([]);
  const [files, setFiles] = useState<PublicFile[]>([]);
  const [projectStatus, setProjectStatus] = useState<string>('DRAFT');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Metadata Dropdowns
  const [categories, setCategories] = useState<Category[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Fetch categories and technologies
    const loadMetadata = async () => {
      try {
        const [cats, techs] = await Promise.all([
          marketplaceApi.getCategories(),
          marketplaceApi.getTechnologies(),
        ]);
        setCategories(cats);
        setTechnologies(techs);
      } catch (err) {
        console.warn('Metadata load warning', err);
      }
    };
    loadMetadata();

    // If edit mode, load project
    if (id) {
      const loadProject = async () => {
        try {
          setIsLoading(true);
          const p = await authorApi.getProjectById(id);
          setProjectId(p._id || p.id);
          setTitle(p.title || '');
          setShortDescription(p.shortDescription || '');
          setFullDescription(p.fullDescription || '');
          setPrice(p.price || 0);

          if (p.categoryId) {
            setCategoryId(
              typeof p.categoryId === 'object' ? (p.categoryId as any)._id : p.categoryId,
            );
          }
          if (p.technologies && Array.isArray(p.technologies)) {
            setSelectedTechs(
              p.technologies.map((t: any) => (typeof t === 'object' ? t._id : t)),
            );
          }
          if (p.objectives && p.objectives.length > 0) {
            setObjectives(p.objectives);
          }
          setWorkingPrinciple(p.workingPrinciple || '');
          setHardwareRequirements(p.hardwareRequirements || '');
          setSystemRequirements(p.systemRequirements || '');
          setInstallationGuide(p.installationGuide || '');
          setDomains(Array.isArray(p.domains) ? p.domains : []);
          setDifficulty(p.difficulty || '');
          setComponents(p.components || []);
          setFiles(p.publicFiles || []);
          setProjectStatus(p.status || 'DRAFT');
          setRejectionReason((p as any).rejectionReason || null);
        } catch (err: any) {
          setErrorMessage(err.response?.data?.message || 'Layihəni yükləmək mümkün olmadı');
        } finally {
          setIsLoading(false);
        }
      };
      loadProject();
    }
  }, [id]);

  const handleTechToggle = (techId: string) => {
    setSelectedTechs((prev) =>
      prev.includes(techId) ? prev.filter((t) => t !== techId) : [...prev, techId],
    );
  };

  const handleDomainToggle = (domain: string) => {
    setDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain],
    );
  };

  const handleObjectiveChange = (index: number, val: string) => {
    const updated = [...objectives];
    updated[index] = val;
    setObjectives(updated);
  };

  const handleAddObjective = () => {
    setObjectives([...objectives, '']);
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim() || title.trim().length < 5) {
      setErrorMessage(az.projectEditor.fields.title + ' ən azı 5 simvol olmalıdır');
      setActiveTab('basics');
      return;
    }

    setIsSaving(true);

    const normalizedComponents = components.map((comp) => ({
      ...comp,
      componentSlug: comp.componentSlug?.trim() ? comp.componentSlug.trim() : null,
    }));

    const payload = {
      title: title.trim(),
      shortDescription: shortDescription.trim() || title.trim(),
      fullDescription: fullDescription.trim() || title.trim(),
      price: Number(price) || 0,
      categoryId: categoryId || undefined,
      technologies: selectedTechs as any,
      domains,
      difficulty: difficulty || undefined,
      objectives: objectives.filter(Boolean),
      workingPrinciple,
      hardwareRequirements,
      systemRequirements,
      installationGuide,
      components: normalizedComponents,
    };

    try {
      if (projectId) {
        const updated = await authorApi.updateProject(projectId, payload);
        setSuccessMessage('Layihə qaralama kimi yadda saxlanıldı');
        setProjectStatus(updated.status);
      } else {
        const created = await authorApi.createProjectDraft(payload);
        const createdId = created._id || created.id;
        setProjectId(createdId);
        setProjectStatus('DRAFT');
        setSuccessMessage('Layihə uğurla yaradıldı! İndi faylları əlavə edə bilərsiniz.');
        // Update URL to edit mode without full reload
        navigate(`/author/projects/${createdId}/edit`, { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Yadda saxlanılarkən xəta baş verdi';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Save draft first to ensure latest edits are saved
    if (!title.trim() || title.trim().length < 5) {
      setErrorMessage(az.projectEditor.fields.title + ' ən azı 5 simvol olmalıdır');
      setActiveTab('basics');
      return;
    }

    if (!projectId) {
      setErrorMessage('Layihəni təsdiqə göndərmək üçün əvvəlcə yadda saxlayın və fayl əlavə edin');
      return;
    }

    if (files.length === 0) {
      setErrorMessage('Təsdiqə göndərmək üçün ən azı 1 layihə faylı (arxiv/sxem) yüklənməlidir');
      setActiveTab('files');
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedComponents = components.map((comp) => ({
        ...comp,
        componentSlug: comp.componentSlug?.trim() ? comp.componentSlug.trim() : null,
      }));

      // First persist any changes
      await authorApi.updateProject(projectId, {
        title: title.trim(),
        shortDescription: shortDescription.trim() || title.trim(),
        fullDescription: fullDescription.trim() || title.trim(),
        price: Number(price) || 0,
        categoryId: categoryId || undefined,
        technologies: selectedTechs as any,
        domains,
        difficulty: difficulty || undefined,
        objectives: objectives.filter(Boolean),
        workingPrinciple,
        hardwareRequirements,
        systemRequirements,
        installationGuide,
        components: normalizedComponents,
      });

      // Submit for moderation
      const res = await authorApi.submitProject(projectId);
      setProjectStatus(res.status);
      setSuccessMessage('Layihə uğurla moderasiyaya göndərildi!');
      setTimeout(() => navigate('/author/dashboard'), 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Təsdiqə göndərilərkən xəta baş verdi';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-2" />
        <p>Layihə məlumatları yüklənir...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? az.projectEditor.editTitle : az.projectEditor.newTitle}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Status: <span className="font-semibold text-slate-800">{az.status[projectStatus as keyof typeof az.status] || projectStatus}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/author/dashboard')}
            className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition-colors"
          >
            {az.projectEditor.actions.cancel}
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium text-sm rounded-xl transition-colors shadow-sm"
          >
            {isSaving ? az.projectEditor.actions.saving : az.projectEditor.actions.saveDraft}
          </button>
          <button
            type="button"
            onClick={handleSubmitForReview}
            disabled={isSubmitting}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
          >
            {isSubmitting ? az.projectEditor.actions.submitting : az.projectEditor.actions.submitReview}
          </button>
        </div>
      </div>

      {/* Rejection Alert Callout */}
      {projectStatus === 'REJECTED' && rejectionReason && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
          <p className="font-semibold mb-1">{az.projectEditor.rejectionAlertTitle}</p>
          <p>{rejectionReason}</p>
        </div>
      )}

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm" data-testid="editor-error">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm" data-testid="editor-success">
          {successMessage}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('basics')}
          className={`py-3 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'basics'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {az.projectEditor.tabs.basics}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('specs')}
          className={`py-3 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'specs'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {az.projectEditor.tabs.specs}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bom')}
          className={`py-3 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'bom'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {az.projectEditor.tabs.bom}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`py-3 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'guide'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {az.projectEditor.tabs.guide}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('files')}
          className={`py-3 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'files'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {az.projectEditor.tabs.files} ({files.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Tab 1: Basics */}
        {activeTab === 'basics' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                {az.projectEditor.fields.title} *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={az.projectEditor.fields.titlePlaceholder}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  {az.projectEditor.fields.category}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="">{az.projectEditor.fields.categorySelect}</option>
                  {categories.map((cat) => (
                    <option key={cat._id || cat.id} value={cat._id || cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="project-difficulty"
                  className="block text-sm font-semibold text-slate-800 mb-1"
                >
                  {az.projectEditor.fields.difficulty}
                </label>
                <select
                  id="project-difficulty"
                  aria-label={az.projectEditor.fields.difficulty}
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as ProjectDifficulty | '')}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="">{az.projectEditor.fields.difficultySelect}</option>
                  {PROJECT_DIFFICULTIES.map((diff) => (
                    <option key={diff} value={diff}>
                      {az.projectEditor.fields.difficulties[diff]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  {az.projectEditor.fields.price} *
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-500 mt-1">{az.projectEditor.fields.priceFreeHint}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                {az.projectEditor.fields.domains}
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PROJECT_DOMAINS.map((domain) => {
                  const isSelected = domains.includes(domain);
                  return (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => handleDomainToggle(domain)}
                      aria-pressed={isSelected}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {domain}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                {az.projectEditor.fields.technologies}
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {technologies.map((tech) => {
                  const techId = tech._id || tech.id || '';
                  const isSelected = selectedTechs.includes(techId);
                  return (
                    <button
                      key={techId}
                      type="button"
                      onClick={() => handleTechToggle(techId)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tech.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-slate-800">
                  {az.projectEditor.fields.shortDescription}
                </label>
                <span className="text-xs text-slate-400">{shortDescription.length} / 500</span>
              </div>
              <textarea
                rows={3}
                maxLength={500}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Layihənin əsas məqsədi və funksiyalarını ümumiləşdirin..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Specs */}
        {activeTab === 'specs' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                {az.projectEditor.fields.fullDescription}
              </label>
              <textarea
                rows={6}
                value={fullDescription}
                onChange={(e) => setFullDescription(e.target.value)}
                placeholder="Layihənin ətraflı arxitekturası, iş prinsipləri və texniki imkanları..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-slate-800">
                  {az.projectEditor.fields.objectives}
                </label>
                <button
                  type="button"
                  onClick={handleAddObjective}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800"
                >
                  {az.projectEditor.fields.addObjective}
                </button>
              </div>
              <div className="space-y-2">
                {objectives.map((obj, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={obj}
                      onChange={(e) => handleObjectiveChange(i, e.target.value)}
                      placeholder={`Məqsəd ${i + 1}`}
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    {objectives.length > 1 && (
                      <button
                        type="button"
                        aria-label={az.common.delete}
                        onClick={() => handleRemoveObjective(i)}
                        className="px-2 text-slate-400 hover:text-rose-600 inline-flex items-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                {az.projectEditor.fields.workingPrinciple}
              </label>
              <textarea
                rows={4}
                value={workingPrinciple}
                onChange={(e) => setWorkingPrinciple(e.target.value)}
                placeholder="Elektrik dövrəsi və mikrokontroller proqram təminatının qarşılıqlı əlaqəsi..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}

        {/* Tab 3: BOM */}
        {activeTab === 'bom' && (
          <BOMEditor components={components} onChange={setComponents} />
        )}

        {/* Tab 4: Guide & Requirements */}
        {activeTab === 'guide' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                {az.projectEditor.fields.hardwareRequirements}
              </label>
              <input
                type="text"
                value={hardwareRequirements}
                onChange={(e) => setHardwareRequirements(e.target.value)}
                placeholder="Məsələn: 5V 2A enerji bloku, lehimləmə avadanlığı"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                {az.projectEditor.fields.systemRequirements}
              </label>
              <input
                type="text"
                value={systemRequirements}
                onChange={(e) => setSystemRequirements(e.target.value)}
                placeholder="Məsələn: Arduino IDE 2.0+, Windows 10/11 və ya Linux"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                {az.projectEditor.fields.installationGuide}
              </label>
              <textarea
                rows={6}
                value={installationGuide}
                onChange={(e) => setInstallationGuide(e.target.value)}
                placeholder="1. Komponentləri sxemə uyğun breadboard üzərində quraşdırın.&#10;2. Kitabxanaları quraşdırın.&#10;3. Kodu kontrollerə köçürün."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}

        {/* Tab 5: Files */}
        {activeTab === 'files' && (
          <ProjectFileUpload
            projectId={projectId}
            files={files}
            onFilesChanged={setFiles}
          />
        )}
      </div>
    </div>
  );
};
