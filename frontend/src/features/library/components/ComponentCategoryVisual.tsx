import React from 'react';
import {
  Activity,
  BatteryCharging,
  Cog,
  Cpu,
  Monitor,
  Radio,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryVisualMeta {
  Icon: LucideIcon;
  bgClass: string;
  iconBgClass: string;
  iconColorClass: string;
  badgeClass: string;
  accentHex: string;
  gridHex: string;
}

const CATEGORY_MAP: Record<string, CategoryVisualMeta> = {
  microcontrollers: {
    Icon: Cpu,
    bgClass: 'from-[#EEF4FB] via-blue-50/70 to-slate-50',
    iconBgClass: 'bg-blue-100/80 border-blue-200',
    iconColorClass: 'text-[#147DF5]',
    badgeClass: 'bg-blue-50 text-[#0C64E1] border-blue-200',
    accentHex: '#147DF5',
    gridHex: '#BFDBFE',
  },
  sensors: {
    Icon: Activity,
    bgClass: 'from-emerald-50 via-teal-50/60 to-slate-50',
    iconBgClass: 'bg-emerald-100/80 border-emerald-200',
    iconColorClass: 'text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentHex: '#059669',
    gridHex: '#A7F3D0',
  },
  actuators: {
    Icon: Cog,
    bgClass: 'from-amber-50 via-orange-50/60 to-slate-50',
    iconBgClass: 'bg-amber-100/80 border-amber-200',
    iconColorClass: 'text-amber-600',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    accentHex: '#D97706',
    gridHex: '#FDE68A',
  },
  communication: {
    Icon: Radio,
    bgClass: 'from-indigo-50 via-sky-50/60 to-slate-50',
    iconBgClass: 'bg-indigo-100/80 border-indigo-200',
    iconColorClass: 'text-indigo-600',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentHex: '#4F46E5',
    gridHex: '#C7D2FE',
  },
  displays: {
    Icon: Monitor,
    bgClass: 'from-cyan-50 via-sky-50/60 to-slate-50',
    iconBgClass: 'bg-cyan-100/80 border-cyan-200',
    iconColorClass: 'text-cyan-600',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    accentHex: '#0891B2',
    gridHex: '#A5F3FC',
  },
  passive: {
    Icon: Wrench,
    bgClass: 'from-slate-100 via-slate-50 to-white',
    iconBgClass: 'bg-slate-200/70 border-slate-300',
    iconColorClass: 'text-slate-700',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    accentHex: '#475569',
    gridHex: '#CBD5E1',
  },
  power: {
    Icon: BatteryCharging,
    bgClass: 'from-emerald-50 via-lime-50/60 to-slate-50',
    iconBgClass: 'bg-lime-100/80 border-lime-200',
    iconColorClass: 'text-emerald-700',
    badgeClass: 'bg-lime-50 text-emerald-800 border-lime-200',
    accentHex: '#15803D',
    gridHex: '#BBF7D0',
  },
};

const DEFAULT_META: CategoryVisualMeta = {
  Icon: Cpu,
  bgClass: 'from-[#EEF4FB] via-slate-50 to-white',
  iconBgClass: 'bg-brand-50 border-brand-200',
  iconColorClass: 'text-[#147DF5]',
  badgeClass: 'bg-brand-50 text-[#0C64E1] border-brand-200',
  accentHex: '#147DF5',
  gridHex: '#CBD5E1',
};

export function getCategoryVisualMeta(category?: string): CategoryVisualMeta {
  const key = (category || '').trim().toLowerCase();
  return CATEGORY_MAP[key] || DEFAULT_META;
}

interface ComponentCategoryVisualProps {
  category?: string;
  categoryLabel?: string;
  name: string;
  compact?: boolean;
  className?: string;
}

export const ComponentCategoryVisual: React.FC<ComponentCategoryVisualProps> = ({
  category,
  categoryLabel,
  name,
  compact = false,
  className = '',
}) => {
  const meta = getCategoryVisualMeta(category);
  const { Icon } = meta;

  return (
    <div
      className={`relative w-full h-full bg-gradient-to-br ${meta.bgClass} flex flex-col items-center justify-center overflow-hidden select-none ${className}`.trim()}
      aria-label={`${name} — ${categoryLabel || category || 'Komponent'}`}
    >
      {/* Decorative PCB Schematic Grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-45 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={`pcb-grid-${(category || 'default').replace(/[^a-z0-9]/gi, '')}`}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke={meta.gridHex}
              strokeWidth="0.75"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`url(#pcb-grid-${(category || 'default').replace(/[^a-z0-9]/gi, '')})`}
        />
        {/* Subtle PCB traces */}
        <path
          d="M 16 28 H 64 L 78 42 H 124"
          fill="none"
          stroke={meta.accentHex}
          strokeOpacity="0.18"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="28" r="3" fill={meta.accentHex} fillOpacity="0.22" />
        <path
          d="M 260 120 H 210 L 196 106 H 152"
          fill="none"
          stroke={meta.accentHex}
          strokeOpacity="0.18"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* Center Module Emblem */}
      <div className="relative z-10 flex flex-col items-center gap-2.5 px-4 text-center">
        <div
          className={`${
            compact ? 'w-14 h-14 rounded-2xl' : 'w-16 h-16 rounded-2xl'
          } border ${meta.iconBgClass} shadow-sm flex items-center justify-center bg-white/85 backdrop-blur-xs transition-transform duration-300 group-hover:scale-105`}
        >
          <Icon className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} ${meta.iconColorClass}`} />
        </div>
        {categoryLabel && (
          <span className="text-[11px] font-semibold tracking-wide text-slate-600 bg-white/85 border border-slate-200/80 px-2.5 py-0.5 rounded-full shadow-xs">
            {categoryLabel}
          </span>
        )}
      </div>
    </div>
  );
};
