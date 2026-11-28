export const AZERBAIJANI_ERROR_MESSAGES = {
  VAL_REQUIRED_FIELD: 'Bu xana mütləq doldurulmalıdır',
  VAL_INVALID_EMAIL: 'Düzgün e-poçt ünvanı daxil edin',
  VAL_SHORT_PASSWORD: 'Şifrə ən azı 8 simvol olmalıdır',
  VAL_PASSWORD_MISMATCH: 'Şifrələr uyğun gəlmir',
  VAL_INVALID_PRICE: 'Qiymət 0 və ya daha böyük olmalıdır',
  VAL_INVERTED_PRICE: 'Minimum qiymət maksimum qiymətdən böyük ola bilməz',
  VAL_INVALID_RATING: 'Reytinq 1 ilə 5 arasında olmalıdır',
  AUTH_UNAUTHORIZED: 'Zəhmət olmasa, əvvəlcə daxil olun',
  AUTH_INVALID_CREDENTIALS: 'E-poçt və ya şifrə yanlışdır',
  AUTH_INVALID_REFRESH_TOKEN: 'Yeniləmə tokeni etibarsızdır və ya müddəti bitib',
  AUTH_EMAIL_EXISTS: 'Bu e-poçt ünvanı artıq qeydiyyatdan keçib',
  AUTH_INVALID_RESET_TOKEN: 'Şifrə sıfırlama linki etibarsızdır və ya müddəti bitib',
  RBAC_FORBIDDEN: 'Bu əməliyyat üçün icazəniz yoxdur',
  AUTH_APP_PENDING: 'Sizin artıq baxılmaqda olan müraciətiniz var',
  AUTH_APP_ALREADY_AUTHOR: 'Siz artıq təsdiqlənmiş müəllifsiniz',
  PROJ_SHORT_TITLE: 'Layihənin adı ən azı 5 simvol olmalıdır',
  PROJ_MISSING_FILES: 'Layihə faylı yüklənməlidir',
  PROJ_MISSING_REJECTION_REASON: 'Rədd edilmə səbəbi qeyd olunmalıdır',
  PROJ_DISALLOWED_EXTENSION: 'Yalnız icazə verilən fayl formatları qəbul edilir',
  PROJ_FILE_TOO_LARGE: 'Fayl ölçüsü maksimum həddi aşır',
  ORD_SELF_PURCHASE: 'Öz layihənizi satın ala bilməzsiniz',
  ORD_ALREADY_OWNED: 'Bu layihəni artıq satın almısınız',
  ORD_PAID_AS_FREE: 'Bu layihə ödənişlidir, pulsuz əldə edilə bilməz',
  ORD_ALREADY_PAID: 'Sifariş artıq ödənilib',
  DOWN_UNAUTHENTICATED: 'Faylı yükləmək üçün daxil olun',
  DOWN_UNPURCHASED: 'Bu faylı yükləmək üçün layihəni satın almalısınız',
  REV_NOT_PURCHASER: 'Yalnız layihəni satın alan istifadəçilər rəy yaza bilər',
  REV_DUPLICATE: 'Bu sifariş üçün artıq rəy bildirmisiniz',
  REV_NON_AUTHOR_REPLY: 'Yalnız layihə müəllifi cavab yaza bilər',
  REF_UNPAID: 'Yalnız ödənilmiş sifarişlər üçün refund tələb edilə bilər',
  REF_DUPLICATE: 'Bu sifariş üçün artıq refund müraciəti mövcuddur',
  NF_GENERIC: 'Məlumat tapılmadı',
  NF_PROJECT: 'Layihə tapılmadı',
  NF_ORDER: 'Sifariş tapılmadı',
  NF_FILE: 'Fayl tapılmadı',
};

export const BACKEND_VALIDATION_MESSAGES = {
  // Required fields & Empty checks
  IS_NOT_EMPTY: 'Bu xana mütləq doldurulmalıdır',
  IS_DEFINED: 'Bu parametr mütləq təyin edilməlidir',

  // String & Character Lengths
  IS_STRING: '$property mətn (string) formatında olmalıdır',
  MIN_LENGTH: '$property ən azı $constraint1 simvol olmalıdır',
  MAX_LENGTH: '$property ən çoxu $constraint1 simvol ola bilər',
  LENGTH: '$property $constraint1 ilə $constraint2 simvol arasında olmalıdır',

  // Formats & Types
  IS_EMAIL: 'Düzgün bir e-poçt ünvanı daxil edin',
  IS_NUMBER: '$property rəqəm formatında olmalıdır',
  IS_INT: '$property tam ədəd olmalıdır',
  IS_POSITIVE: '$property müsbət ədəd olmalıdır',
  IS_BOOLEAN: '$property boolean (hə/yox) formatında olmalıdır',
  IS_ARRAY: '$property massiv (siyahı) formatında olmalıdır',
  ARRAY_MIN_SIZE: '$property ən azı $constraint1 elementdən ibarət olmalıdır',
  ARRAY_MAX_SIZE: '$property ən çoxu $constraint1 elementdən ibarət ola bilər',
  IS_DATE_STRING: '$property düzgün tarix formatında (ISO 8601) olmalıdır',
  IS_URL: '$property düzgün URL formatında olmalıdır',
  IS_MONGO_ID: '$property düzgün identifikator (ID) formatında deyil',
  IS_ENUM: '$property yalnız icazə verilən dəyərlərdən biri ola bilər: $constraint1',
  IS_IN: '$property yalnız göstərilən dəyərlərdən biri ola bilər: $constraint1',

  // Numerical Range & Price
  MIN_VALUE: '$property ən azı $constraint1 olmalıdır',
  MAX_VALUE: '$property ən çoxu $constraint1 ola bilər',
  IS_PRICE_VALID: 'Qiymət düzgün daxil edilməyib (müsbət ədəd olmalıdır)',

  // Match & Patterns
  MATCHES_PATTERN: '$property tələb olunan formata uyğun deyil',
  PASSWORD_COMPLEXITY: 'Şifrə ən azı bir böyük hərf, bir kiçik hərf və bir rəqəm ehtiva etməlidir',
};

export const HTTP_EXCEPTION_MESSAGES: Record<number, { error: string; defaultMessage: string }> = {
  400: {
    error: 'Bad Request',
    defaultMessage: 'Sorğu parametrləri yalnışdır və ya natamamdır',
  },
  401: {
    error: 'Unauthorized',
    defaultMessage: 'Zəhmət olmasa, əvvəlcə daxil olun',
  },
  403: {
    error: 'Forbidden',
    defaultMessage: 'Bu əməliyyat üçün icazəniz yoxdur',
  },
  404: {
    error: 'Not Found',
    defaultMessage: 'Axtarılan resurs və ya səhifə tapılmadı',
  },
  405: {
    error: 'Method Not Allowed',
    defaultMessage: 'Bu HTTP metodu tələb olunan ünvan üçün dəstəklənmir',
  },
  409: {
    error: 'Conflict',
    defaultMessage: 'Bu məlumat artıq mövcuddur və ya ziddiyyət təşkil edir',
  },
  413: {
    error: 'Payload Too Large',
    defaultMessage: 'Yüklənən faylın və ya sorğunun həcmi icazə verilən limiti aşır',
  },
  415: {
    error: 'Unsupported Media Type',
    defaultMessage: 'Bu fayl və ya media tipi dəstəklənmir',
  },
  422: {
    error: 'Unprocessable Entity',
    defaultMessage: 'Göndərilən məlumatlar emal edilə bilmədi',
  },
  429: {
    error: 'Too Many Requests',
    defaultMessage: 'Çox sayda sorğu göndərildi. Zəhmət olmasa bir qədər sonra yenidən cəhd edin',
  },
  500: {
    error: 'Internal Server Error',
    defaultMessage: 'Daxili server xətası baş verdi. Zəhmət olmasa texniki dəstəyə müraciət edin',
  },
  502: {
    error: 'Bad Gateway',
    defaultMessage: 'Şəbəkə qapısı xətası. Əlaqəli xidmət cavab vermir',
  },
  503: {
    error: 'Service Unavailable',
    defaultMessage: 'Xidmət müvəqqəti olaraq əlçatmazdır və ya profilaktik işlər aparılır',
  },
};
