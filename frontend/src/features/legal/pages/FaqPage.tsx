import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { LegalPageLayout } from '../components/LegalPageLayout';
import { az } from '@/i18n/az';

const FAQ_ITEMS = [
  {
    q: 'Feed Lab nədir və kimlər üçün nəzərdə tutulub?',
    a: 'Feed Lab elektronika, Arduino, ESP32, Raspberry Pi və robototexnika layihələrini öyrənmək, yığmaq və paylaşmaq istəyən tələbələr, müəllimlər və mühəndislər üçün hazırlanmış platformadır.',
  },
  {
    q: '“Komponentlərimlə Tap” aləti necə işləyir?',
    a: 'Əlinizdə olan komponentləri axtarıb siyahıya əlavə edirsiniz. Sistem həm bütün tələblərə tam uyğun layihələri, həm də cüzi çatışmayan hissələri olan qismən uyğun layihələri (məsələn, "4/5 komponent mövcuddur") sizə göstərir.',
  },
  {
    q: 'Elektronika Kitabxanası nə üçündür?',
    a: 'Kitabxana hər komponent haqqında tərif, iş prinsipi, texniki göstəricilər, pinout cədvəli, qoşulma qaydası, nümunə kodu və həmin komponentlə hazırlanmış layihələri bir yerdə təqdim edən ensiklopediyadır.',
  },
  {
    q: 'Pulsuz layihələri necə əldə edə bilərəm?',
    a: 'Hesabınıza daxil olduqdan sonra istənilən pulsuz layihənin səhifəsində “Pulsuz Əldə Et” düyməsini klikləyərək faylları dərhal “Sifarişlərim” bölməsindən yükləyə bilərsiniz.',
  },
  {
    q: 'Necə müəllif olub öz layihələrimi paylaşa bilərəm?',
    a: 'Profilinizdən və ya “Müəllif ol” səhifəsindən mühəndislik bioqrafiyanızı və bacarıqlarınızı göndərərək müraciət edə bilərsiniz. Təsdiqdən sonra layihə redaktoru aktivləşir.',
  },
];

export const FaqPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <LegalPageLayout
      title={az.legal.faqTitle}
      subtitle="Platforma, komponent alətləri, sifarişlər və müəlliflik barədə ən çox soruşulan suallar."
      icon={<HelpCircle className="w-3.5 h-3.5" />}
    >
      <div className="space-y-3">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={item.q}
              className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 bg-white hover:bg-slate-50 transition-colors"
              >
                <span className="font-bold text-slate-900 text-sm">{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[#147DF5]' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 py-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/60">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </LegalPageLayout>
  );
};
