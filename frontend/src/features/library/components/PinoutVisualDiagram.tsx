import React from 'react';
import { ZoomIn } from 'lucide-react';
import type { ComponentPin } from '../types';

export interface PinTypeStyle {
  label: string;
  badgeClass: string;
  dotColor: string;
}

const PIN_TYPE_STYLES: Record<string, PinTypeStyle> = {
  power: {
    label: 'Qida (Power)',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    dotColor: '#DC2626',
  },
  ground: {
    label: 'Torpaq (GND)',
    badgeClass: 'bg-slate-800 text-white border-slate-700',
    dotColor: '#1E293B',
  },
  data: {
    label: 'Data / Şin',
    badgeClass: 'bg-blue-50 text-[#0C64E1] border-blue-200',
    dotColor: '#147DF5',
  },
  analog: {
    label: 'Analoq',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: '#D97706',
  },
  digital: {
    label: 'Rəqəmsal',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: '#059669',
  },
  passive: {
    label: 'Passiv',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotColor: '#64748B',
  },
};

export function getPinTypeStyle(type?: string): PinTypeStyle {
  const key = (type || '').trim().toLowerCase();
  return (
    PIN_TYPE_STYLES[key] || {
      label: type?.trim() || 'Ümumi',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      dotColor: '#64748B',
    }
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildPinoutSvgDataUrl(componentName: string, pinout: ComponentPin[]): string {
  const rows = pinout.slice(0, 12);
  const rowHeight = 36;
  const height = Math.max(220, 110 + rows.length * rowHeight);
  const width = 720;

  const pinElements = rows
    .map((pin, idx) => {
      const y = 92 + idx * rowHeight;
      const style = getPinTypeStyle(pin.type);
      const pinCode = escapeXml(pin.pin);
      const pinName = escapeXml(pin.name);
      const pinTypeLabel = escapeXml(style.label);
      return `
        <line x1="210" y1="${y}" x2="290" y2="${y}" stroke="${style.dotColor}" stroke-width="2.5" />
        <circle cx="290" cy="${y}" r="5" fill="${style.dotColor}" />
        <rect x="40" y="${y - 13}" width="170" height="26" rx="6" fill="#F8FAFC" stroke="#CBD5E1" />
        <text x="125" y="${y + 4}" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#0F172A">${pinCode}</text>
        <text x="310" y="${y + 4}" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#0F172A">${pinName}</text>
        <text x="680" y="${y + 4}" text-anchor="end" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="${style.dotColor}">${pinTypeLabel}</text>
      `;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" rx="16" fill="#FFFFFF" />
    <rect x="16" y="16" width="${width - 32}" height="${height - 32}" rx="12" fill="#F8FAFC" stroke="#E2E8F0" />
    <text x="40" y="50" font-family="Inter, sans-serif" font-size="17" font-weight="800" fill="#0F172A">${escapeXml(componentName)} — Pinout Diaqramı</text>
    <line x1="40" y1="64" x2="${width - 40}" y2="64" stroke="#E2E8F0" stroke-width="1" />
    ${pinElements}
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface PinoutVisualDiagramProps {
  componentName: string;
  pinout: ComponentPin[];
  onZoom?: () => void;
}

export const PinoutVisualDiagram: React.FC<PinoutVisualDiagramProps> = ({
  componentName,
  pinout,
  onZoom,
}) => {
  if (!pinout || pinout.length === 0) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-700">
          {componentName} — Vizual Pinout Xəritəsi ({pinout.length} pin)
        </div>
        {onZoom && (
          <button
            type="button"
            onClick={onZoom}
            aria-label="Pinout diaqramını böyüt"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#147DF5] border border-slate-200 hover:border-[#147DF5] shadow-xs transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Diaqramı böyüt</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {pinout.map((item, idx) => {
            const style = getPinTypeStyle(item.type);
            return (
              <div
                key={`${item.pin}-${idx}`}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: style.dotColor }}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-xs font-bold text-slate-900 flex-shrink-0">
                    {item.pin}
                  </span>
                  <span className="text-xs text-slate-600 truncate">{item.name}</span>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex-shrink-0 ${style.badgeClass}`}
                >
                  {style.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
