import React from 'react';
import { Scale } from 'lucide-react';
import { LegalPageLayout } from '../components/LegalPageLayout';
import { az } from '@/i18n/az';

export const LicensePage: React.FC = () => {
  return (
    <LegalPageLayout
      title={az.legal.licenseTitle}
      subtitle="Feed Lab üzərindən əldə edilən sxem, PCB və proqram kodları üçün standart istifadə hüquqları."
      icon={<Scale className="w-3.5 h-3.5" />}
    >
      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">1. İcazə Verilən İstifadə</h2>
        <p>
          Əldə etdiyiniz layihə fayllarını (mənbə kodları, Gerber faylları, 3D modellər və texniki
          bələdçilər) şəxsi öyrənmə, laboratoriya dərsləri, universitet layihələri və fərdi
          prototipləmə məqsədilə məhdudiyyətsiz istifadə edə və dəyişdirə bilərsiniz.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">2. Qadağan Olunan Fəaliyyətlər</h2>
        <p>
          Müəllifin yazılı icazəsi olmadan rəqəmsal layihə arxivlərini eyni formada üçüncü tərəf
          platformalarında yenidən satmaq, ictimai paylaşmaq və ya kommersiya məqsədli kütləvi
          tirajlamaq qadağandır.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">3. Tədris Müəssisələri üçün İstifadə</h2>
        <p>
          Müəllimlər pulsuz və ya lisenziyalı layihələri dərs prosesində tələbələrə izah və
          praktiki məşğələ nümunəsi kimi göstərə bilərlər.
        </p>
      </section>
    </LegalPageLayout>
  );
};
