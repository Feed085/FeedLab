import React from 'react';
import { FileCheck2 } from 'lucide-react';
import { LegalPageLayout } from '../components/LegalPageLayout';
import { az } from '@/i18n/az';

export const TermsPage: React.FC = () => {
  return (
    <LegalPageLayout
      title={az.legal.termsTitle}
      subtitle="Feed Lab rəqəmsal mühəndislik və elektronika layihələri platformasından istifadə qaydaları."
      icon={<FileCheck2 className="w-3.5 h-3.5" />}
    >
      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">1. Ümumi Müddəalar</h2>
        <p>
          Feed Lab — FEED Agency ekosistemi daxilində tələbələr, müəllimlər və elektronika
          mühəndisləri üçün rəqəmsal layihə fayllarının, sxemlərin, BOM siyahılarının və tədris
          materiallarının paylaşılması və satışı platformasıdır.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">2. İstifadəçi Hesabları və Öhdəliklər</h2>
        <p>
          Qeydiyyatdan keçən hər bir istifadəçi təqdim etdiyi məlumatların düzgünlüyünə və hesab
          təhlükəsizliyinə cavabdehdir. Platformada yerləşdirilən materiallar yalnız qanuni və
          tədris-mühəndislik məqsədləri üçün istifadə olunmalıdır.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">3. Müəllif Payı və Ödəniş Şərtləri</h2>
        <p>
          Ödənişli layihələrin satışından əldə olunan gəlirin 80%-i müəllifin balansına, 20%-i isə
          platforma xidmət haqqı kimi ayrılır. Pulsuz layihələr bütün qeydiyyatlı istifadəçilər
          üçün dərhal əlçatandır.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">4. Geri Qaytarma Qaydaları</h2>
        <p>
          Rəqəmsal layihə faylları təsvirə uyğun olmadıqda və ya texniki cəhətdən açılmadıqda,
          alıcı &ldquo;Sifarişlərim&rdquo; bölməsindən geri qaytarma müraciəti göndərə bilər.
          Müraciətlər administrasiya tərəfindən araşdırılaraq yekun qərar verilir.
        </p>
      </section>
    </LegalPageLayout>
  );
};
