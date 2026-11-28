import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { LegalPageLayout } from '../components/LegalPageLayout';
import { az } from '@/i18n/az';

export const PrivacyPage: React.FC = () => {
  return (
    <LegalPageLayout
      title={az.legal.privacyTitle}
      subtitle="İstifadəçilərin şəxsi məlumatlarının toplanması, qorunması və emalı prinsipləri."
      icon={<ShieldCheck className="w-3.5 h-3.5" />}
    >
      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">1. Toplanan Məlumatlar</h2>
        <p>
          Feed Lab yalnız platforma xidmətlərinin göstərilməsi üçün zəruri olan məlumatları — ad,
          soyad, e-poçt ünvanı, sifariş tarixçəsi və müəllif müraciəti məlumatlarını toplayır.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">2. Məlumatların İstifadə Məqsədi</h2>
        <p>
          Toplanan məlumatlar hesab autentifikasiyası, rəqəmsal layihələrin çatdırılması, dəstək
          biletlərinin cavablandırılması və müəllif ödənişlərinin hesablanması üçün istifadə
          olunur.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">3. Təhlükəsizlik və Üçüncü Tərəflər</h2>
        <p>
          İstifadəçi şifrələri şifrələnmiş formada saxlanılır və JWT əsaslı sessiya mexanizmi ilə
          qorunur. Şəxsi məlumatlar qanunvericiliklə nəzərdə tutulan hallar istisna olmaqla üçüncü
          tərəflərə ötürülmür.
        </p>
      </section>
    </LegalPageLayout>
  );
};
