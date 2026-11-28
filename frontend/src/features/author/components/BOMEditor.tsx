import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import type { ComponentSummary, ComponentsListResponse } from '@/types';
import { BOMComponent } from '../../marketplace/types';
import { formatAZN } from '@/i18n/currency';
import { az } from '@/i18n/az';

interface BOMEditorProps {
  components: BOMComponent[];
  onChange: (components: BOMComponent[]) => void;
}

export const BOMEditor: React.FC<BOMEditorProps> = ({ components, onChange }) => {
  const [catalogComponents, setCatalogComponents] = useState<ComponentSummary[]>([]);

  useEffect(() => {
    let active = true;
    apiClient
      .get<ComponentsListResponse>('/components', { params: { limit: 100 } })
      .then((res) => {
        if (active && Array.isArray(res.data?.items)) {
          setCatalogComponents(res.data.items);
        }
      })
      .catch(() => {
        // Graceful fallback when component catalog is unavailable
      });
    return () => {
      active = false;
    };
  }, []);

  const handleAddComponent = () => {
    const updated = [
      ...components,
      { name: '', quantity: 1, estimatedCostAzn: 0, notes: '', componentSlug: '' },
    ];
    onChange(updated);
  };

  const handleRemoveComponent = (index: number) => {
    const updated = components.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleFieldChange = (
    index: number,
    field: keyof BOMComponent,
    value: string | number | null | undefined,
  ) => {
    const updated = components.map((comp, i) => {
      if (i === index) {
        return { ...comp, [field]: value };
      }
      return comp;
    });
    onChange(updated);
  };

  // Real-time calculated hardware cost in AZN
  const totalHardwareCost = components.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const cost = Number(item.estimatedCostAzn) || 0;
    return sum + qty * cost;
  }, 0);

  return (
    <div className="space-y-4">
      <datalist id="bom-component-slugs">
        {catalogComponents.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.name}
          </option>
        ))}
      </datalist>

      <div className="flex justify-between items-center">
        <h4 className="text-base font-semibold text-slate-900">
          {az.projectEditor.bom.title}
        </h4>
        <button
          type="button"
          onClick={handleAddComponent}
          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
        >
          {az.projectEditor.bom.addComponent}
        </button>
      </div>

      {components.length === 0 ? (
        <div className="p-6 border border-dashed border-slate-300 rounded-lg text-center text-slate-500 text-sm">
          Aparat hissəsi əlavə edilməyib. Yuxarıdakı düymə ilə komponentlər əlavə edin.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">{az.projectEditor.bom.name} *</th>
                <th className="px-4 py-3 w-24">{az.projectEditor.bom.quantity} *</th>
                <th className="px-4 py-3 w-36">{az.projectEditor.bom.cost}</th>
                <th className="px-4 py-3">{az.projectEditor.bom.notes}</th>
                <th className="px-4 py-3 w-48">{az.projectEditor.bom.componentSlug}</th>
                <th className="px-4 py-3 w-16 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {components.map((comp, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      placeholder="Məsələn: Arduino Uno R3"
                      value={comp.name}
                      onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min={1}
                      value={comp.quantity}
                      onChange={(e) =>
                        handleFieldChange(idx, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={comp.estimatedCostAzn ?? 0}
                      onChange={(e) =>
                        handleFieldChange(idx, 'estimatedCostAzn', Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      placeholder="Model, xüsusiyyət və s."
                      value={comp.notes ?? ''}
                      onChange={(e) => handleFieldChange(idx, 'notes', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      list="bom-component-slugs"
                      placeholder={az.projectEditor.bom.componentSlugPlaceholder}
                      value={comp.componentSlug ?? ''}
                      onChange={(e) => handleFieldChange(idx, 'componentSlug', e.target.value)}
                      aria-label={az.projectEditor.bom.componentSlug}
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(idx)}
                      title={az.projectEditor.bom.remove}
                      aria-label={az.projectEditor.bom.remove}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1 inline-flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Real-time Hardware Cost Footer */}
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-between items-center text-sm font-medium">
            <span className="text-slate-700">{az.projectEditor.bom.totalHardwareCost}:</span>
            <span className="text-base font-bold text-slate-900" data-testid="bom-total-cost">
              {formatAZN(totalHardwareCost, { showFree: false })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
