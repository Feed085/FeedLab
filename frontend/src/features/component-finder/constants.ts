import type { FinderFilters, PriceType, ProjectDifficulty } from './types';

export const PROJECT_DOMAINS = [
  'Energetika',
  'Ekologiya',
  'İT',
  'Kompüter mühəndisliyi',
  'İnformasiya təhlükəsizliyi',
  'Səhiyyə',
  'Kənd təsərrüfatı',
  'Digər',
] as const;

export const DIFFICULTY_OPTIONS: ReadonlyArray<{
  value: ProjectDifficulty;
  label: string;
}> = [
  { value: 'BEGINNER', label: 'Başlanğıc' },
  { value: 'INTERMEDIATE', label: 'Orta' },
  { value: 'ADVANCED', label: 'Çətin' },
];

export const DIFFICULTY_LABELS: Record<ProjectDifficulty, string> = {
  BEGINNER: 'Başlanğıc',
  INTERMEDIATE: 'Orta',
  ADVANCED: 'Çətin',
};

export const PRICE_TYPE_OPTIONS: ReadonlyArray<{
  value: PriceType;
  label: string;
}> = [
  { value: 'all', label: 'Hamısı' },
  { value: 'free', label: 'Pulsuz' },
  { value: 'paid', label: 'Ödənişli' },
];

export const DEFAULT_FINDER_FILTERS: FinderFilters = {
  domain: '',
  priceType: 'all',
  minPrice: '',
  maxPrice: '',
  difficulty: '',
};

export const COMPONENT_FINDER_COPY = {
  badge: 'Ağıllı Komponent Uyğunlaşdırması',
  pageTitle: 'Komponentlərimlə layihə tap',
  pageSubtitle:
    'Əlinizdə olan elektronika komponentlərini seçin — sistem tam uyğun layihələri və çatışmayan hissələri göstərməklə qismən uyğun layihələri sizin üçün tapsın.',
  pickerTitle: 'Komponent kataloqu',
  pickerSubtitle: 'Axtarış edin və ya kateqoriyadan seçib siyahınıza əlavə edin',
  searchPlaceholder: 'Komponent axtar (məs: ESP32, DHT22, rele)...',
  clearSearchAria: 'Axtarışı təmizlə',
  allCategories: 'Hamısı',
  addComponent: '+ Əlavə et',
  removeComponent: 'Çıxar',
  deleteItem: 'Sil',
  selectedBadge: 'Seçildi',
  viewInLibrary: 'Kitabxanada bax',
  addCustomButton: 'Xüsusi komponent kimi əlavə et',
  catalogLoading: 'Komponentlər yüklənir...',
  catalogErrorTitle: 'Komponent kataloqu yüklənmədi',
  catalogErrorDesc: 'Zəhmət olmasa bağlantını yoxlayıb yenidən cəhd edin.',
  catalogEmptyTitle: 'Uyğun komponent tapılmadı',
  catalogEmptyDesc: 'Axtarış sözünü və ya seçilmiş kateqoriyanı dəyişərək yenidən yoxlayın.',
  resetPickerSearch: 'Axtarışı sıfırla',
  trayTitle: 'Mənim komponentlərim',
  clearAllComponents: 'Hamısını təmizlə',
  emptySelectionTitle: 'Hələ komponent seçilməyib',
  emptySelectionGuidance:
    'Başlamaq üçün əlinizdəki komponentləri axtarın və ya kateqoriyadan seçin',
  filtersTitle: 'Layihə filtrləri',
  resetFilters: 'Filtrləri sıfırla',
  domainLabel: 'Sahə',
  allDomains: 'Hamısı',
  priceLabel: 'Qiymət',
  minPriceLabel: 'Min. qiymət (AZN)',
  maxPriceLabel: 'Maks. qiymət (AZN)',
  minPricePlaceholder: '0',
  maxPricePlaceholder: '500',
  difficultyLabel: 'Çətinlik',
  allDifficulties: 'Hamısı',
  priceRangeInvertedError: 'Minimum qiymət maksimum qiymətdən böyük ola bilməz',
  priceNegativeError: 'Qiymət 0 və ya daha böyük olmalıdır',
  resultsLoading: 'Uyğun layihələr axtarılır...',
  resultsErrorTitle: 'Layihələr axtarılarkən xəta baş verdi',
  resultsErrorDesc: 'Serverlə əlaqə zamanı xəta yarandı. Zəhmət olmasa yenidən cəhd edin.',
  retry: 'Yenidən cəhd et',
  noMatchesTitle: 'Seçilmiş filtrlərə uyğun layihə tapılmadı',
  noMatchesDesc:
    'Daha çox komponent əlavə edin və ya sahə, qiymət və çətinlik filtrlərini sıfırlayın.',
  summarySelectedLabel: 'Seçilmiş komponent:',
  fullMatchesHeading: 'Tam uyğun layihələr',
  fullMatchesSubheading:
    'Bu layihələri hazırlamaq üçün bütün lazım olan komponentlər sizdə mövcuddur.',
  fullMatchBadge: 'Tam uyğun',
  noFullMatchesNote:
    'Seçdiyiniz komponentlərlə tam uyğun layihə hələ tapılmadı, lakin aşağıdakı qismən uyğun layihələrə baxa bilərsiniz.',
  partialMatchesHeading: 'Qismən uyğun layihələr (Çatışmayan komponentlərlə)',
  partialMatchesSubheading:
    'Əlinizdə olan komponentlərin bir hissəsi bu layihələrə uyğundur. Çatışmayan hissələr aşağıda qeyd olunub.',
  matchedComponentsCount: 'Mövcud komponentlər',
  missingComponentsHeading: 'Çatışmayan komponentlər',
  viewProject: 'Layihəyə bax',
  defaultAuthorName: 'Feed Lab Müəllifi',
  freeLabel: 'Pulsuz',
} as const;
