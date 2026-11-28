import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  Bot,
  CircuitBoard,
  Cpu,
  GraduationCap,
  Home,
  Radio,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import type { Category } from '../types';

interface CategoryCardProps {
  category: Category;
}

const getCategoryIcon = (category: Category): React.ReactNode => {
  const slug = (category.slug || '').toLowerCase();
  const icon = (category.icon || '').toLowerCase();
  const iconClass =
    'w-5 h-5 stroke-[1.75] text-slate-800 group-hover:text-[#147DF5] transition-colors';

  if (slug === 'smart-home' || icon === 'home') {
    return <Home className={iconClass} />;
  }
  if (slug === 'robotics' || icon === 'bot') {
    return <Bot className={iconClass} />;
  }
  if (slug === 'sensors' || icon === 'activity') {
    return <Activity className={iconClass} />;
  }
  if (slug === 'pcb' || icon === 'circuit-board') {
    return <CircuitBoard className={iconClass} />;
  }
  if (slug === 'schematics') {
    return <SlidersHorizontal className={iconClass} />;
  }
  if (slug === 'wireless' || icon === 'radio') {
    return <Radio className={iconClass} />;
  }
  if (
    slug === 'mektebli' ||
    slug === 'school' ||
    slug === 'student' ||
    slug === 'student-free' ||
    icon === 'graduation-cap'
  ) {
    return <GraduationCap className={iconClass} />;
  }
  if (slug === 'education' || icon === 'book-open') {
    return <BookOpen className={iconClass} />;
  }
  if (slug === 'power' || slug === 'energy' || slug === 'power-energy' || slug === 'energetika' || icon === 'zap') {
    return <Zap className={iconClass} />;
  }
  return <Cpu className={iconClass} />;
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  return (
    <Link
      to={`/catalog?category=${category.slug}`}
      className="group flex items-center gap-3.5 px-4 py-4 bg-white border border-slate-200 hover:border-[#147DF5] rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200"
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-slate-50 group-hover:bg-[#EEF4FB] flex items-center justify-center transition-colors">
        {getCategoryIcon(category)}
      </div>
      <h3 className="font-semibold text-slate-900 group-hover:text-[#147DF5] text-sm sm:text-[15px] truncate transition-colors">
        {category.name}
      </h3>
    </Link>
  );
};
