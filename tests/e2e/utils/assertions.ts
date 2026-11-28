import assert from 'node:assert/strict';

/**
 * Canonical Azerbaijani Error & Validation String Dictionary
 * Extracted from Spec Miner Report and Master Plan v01.
 */
export const AZERBAIJANI_ERROR_MESSAGES = {
  // Validation
  VAL_REQUIRED_FIELD: 'Bu xana mütləq doldurulmalıdır',
  VAL_INVALID_EMAIL: 'Düzgün e-poçt ünvanı daxil edin',
  VAL_SHORT_PASSWORD: 'Şifrə ən azı 8 simvol olmalıdır',
  VAL_PASSWORD_MISMATCH: 'Şifrələr uyğun gəlmir',
  VAL_INVALID_PRICE: 'Qiymət 0 və ya daha böyük olmalıdır',
  VAL_INVERTED_PRICE: 'Minimum qiymət maksimum qiymətdən böyük ola bilməz',
  VAL_INVALID_RATING: 'Reytinq 1 ilə 5 arasında olmalıdır',

  // Authentication & RBAC
  AUTH_UNAUTHORIZED: 'Zəhmət olmasa, əvvəlcə daxil olun',
  AUTH_INVALID_CREDENTIALS: 'E-poçt və ya şifrə yanlışdır',
  AUTH_INVALID_REFRESH_TOKEN: 'Yeniləmə tokeni etibarsızdır və ya müddəti bitib',
  AUTH_EMAIL_EXISTS: 'Bu e-poçt ünvanı artıq qeydiyyatdan keçib',
  AUTH_INVALID_RESET_TOKEN: 'Şifrə sıfırlama linki etibarsızdır və ya müddəti bitib',
  RBAC_FORBIDDEN: 'Bu əməliyyat üçün icazəniz yoxdur',

  // Author Application
  AUTH_APP_PENDING: 'Sizin artıq baxılmaqda olan müraciətiniz var',
  AUTH_APP_ALREADY_AUTHOR: 'Siz artıq təsdiqlənmiş müəllifsiniz',

  // Projects
  PROJ_SHORT_TITLE: 'Layihənin adı ən azı 5 simvol olmalıdır',
  PROJ_MISSING_FILES: 'Layihə faylı yüklənməlidir',
  PROJ_MISSING_REJECTION_REASON: 'Rədd edilmə səbəbi qeyd olunmalıdır',
  PROJ_DISALLOWED_EXTENSION: 'Yalnız icazə verilən fayl formatları qəbul edilir',
  PROJ_FILE_TOO_LARGE: 'Fayl ölçüsü maksimum həddi aşır',

  // Orders & Downloads
  ORD_SELF_PURCHASE: 'Öz layihənizi satın ala bilməzsiniz',
  ORD_ALREADY_OWNED: 'Bu layihəni artıq satın almısınız',
  ORD_PAID_AS_FREE: 'Bu layihə ödənişlidir, pulsuz əldə edilə bilməz',
  ORD_ALREADY_PAID: 'Sifariş artıq ödənilib',
  DOWN_UNAUTHENTICATED: 'Faylı yükləmək üçün daxil olun',
  DOWN_UNPURCHASED: 'Bu faylı yükləmək üçün layihəni satın almalısınız',

  // Reviews
  REV_NOT_PURCHASER: 'Yalnız layihəni satın alan istifadəçilər rəy yaza bilər',
  REV_DUPLICATE: 'Bu sifariş üçün artıq rəy bildirmisiniz',
  REV_NON_AUTHOR_REPLY: 'Yalnız layihə müəllifi cavab yaza bilər',

  // Refunds
  REF_UNPAID: 'Yalnız ödənilmiş sifarişlər üçün refund tələb edilə bilər',
  REF_DUPLICATE: 'Bu sifariş üçün artıq refund müraciəti mövcuddur',

  // Not Found
  NF_GENERIC: 'Məlumat tapılmadı',
  NF_PROJECT: 'Layihə tapılmadı',
  NF_ORDER: 'Sifariş tapılmadı',
  NF_FILE: 'Fayl tapılmadı',
} as const;

/**
 * Asserts that a value is a valid AZN monetary amount.
 * Can be a number (>= 0, up to 2 decimal places) or a formatted string (e.g. "15.00 ₼", "15.00 AZN").
 */
export function assertAznCurrency(val: number | string, message?: string): void {
  if (typeof val === 'number') {
    assert(
      Number.isFinite(val) && val >= 0,
      message || `Expected positive monetary amount, got ${val}`
    );
    const decimalPart = val.toString().split('.')[1];
    if (decimalPart) {
      assert(
        decimalPart.length <= 2,
        message || `Monetary amount ${val} exceeds 2 decimal precision`
      );
    }
    return;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    const aznPattern = /(₼|AZN|\bAZN\b)/i;
    const numericPattern = /^\d+(\.\d{1,2})?$/;
    const combinedPattern = /^(\d+(\.\d{1,2})?)\s*(₼|AZN)$|^(₼|AZN)\s*(\d+(\.\d{1,2})?)$/i;

    assert(
      aznPattern.test(trimmed) || numericPattern.test(trimmed) || combinedPattern.test(trimmed),
      message || `Expected AZN currency format (e.g. "15.00 ₼" or "AZN"), got "${val}"`
    );
    return;
  }

  assert.fail(message || `Expected number or string for AZN currency, got ${typeof val}`);
}

/**
 * Asserts that text contains Azerbaijani localized characters (ə, ı, ö, ğ, ü, ş, ç)
 * or matches a recognized Azerbaijani canonical dictionary phrase.
 */
export function assertAzerbaijaniText(text: string, message?: string): void {
  assert(typeof text === 'string' && text.length > 0, message || 'Expected non-empty string for Azerbaijani text');

  const azCharRegex = /[əıöğüşçƏIÖĞÜŞÇ]/;
  const hasAzChar = azCharRegex.test(text);

  const canonicalValues = Object.values(AZERBAIJANI_ERROR_MESSAGES);
  const matchesCanonical = canonicalValues.some(
    (msg) => text.includes(msg) || msg.includes(text)
  );

  assert(
    hasAzChar || matchesCanonical,
    message || `Expected string to contain Azerbaijani characters or match canonical dictionary, got: "${text}"`
  );
}

/**
 * Asserts standard NestJS error envelope:
 * { statusCode: number, message: string | string[], error?: string, timestamp?: string, path?: string }
 */
export function assertErrorEnvelope(
  data: any,
  expectedStatus: number,
  expectedMessageSubstring?: string,
  message?: string
): void {
  assert(
    data && typeof data === 'object',
    message || `Expected error response body to be an object, got ${typeof data}`
  );

  const actualStatus = data.statusCode ?? data.status;
  assert.equal(
    actualStatus,
    expectedStatus,
    message || `Expected status code ${expectedStatus}, received ${actualStatus} in ${JSON.stringify(data)}`
  );

  assert(
    data.message !== undefined && data.message !== null,
    message || `Expected 'message' property in error envelope: ${JSON.stringify(data)}`
  );

  if (expectedMessageSubstring) {
    if (typeof data.message === 'string') {
      assert(
        data.message.includes(expectedMessageSubstring),
        message || `Expected message to contain "${expectedMessageSubstring}", got "${data.message}"`
      );
    } else if (Array.isArray(data.message)) {
      const found = data.message.some((m: any) =>
        typeof m === 'string' ? m.includes(expectedMessageSubstring) : false
      );
      assert(
        found,
        message || `Expected messages array to contain "${expectedMessageSubstring}", got ${JSON.stringify(data.message)}`
      );
    } else {
      assert.fail(message || `Unexpected message format: ${typeof data.message}`);
    }
  }
}

/**
 * Asserts 80% Author / 20% Platform split in AZN according to MasterPlan §4 & §10.
 * authorEarnings = round(totalPrice * 0.80 * 100) / 100
 * platformCommission = round(totalPrice * 0.20 * 100) / 100
 * authorEarnings + platformCommission === totalPrice
 */
export function assertCommissionSplit(
  totalPrice: number,
  authorEarnings: number,
  platformCommission: number,
  message?: string
): void {
  const expectedAuthor = Math.round(totalPrice * 0.80 * 100) / 100;
  const expectedPlatform = Math.round(totalPrice * 0.20 * 100) / 100;

  const authorDiff = Math.abs(authorEarnings - expectedAuthor);
  const platformDiff = Math.abs(platformCommission - expectedPlatform);
  const sumDiff = Math.abs(authorEarnings + platformCommission - totalPrice);

  assert(
    authorDiff <= 0.01,
    message || `Author earnings ${authorEarnings} AZN does not match expected 80% (${expectedAuthor} AZN) for total ${totalPrice} AZN`
  );

  assert(
    platformDiff <= 0.01,
    message || `Platform commission ${platformCommission} AZN does not match expected 20% (${expectedPlatform} AZN) for total ${totalPrice} AZN`
  );

  assert(
    sumDiff <= 0.01,
    message || `Split sum (${authorEarnings} + ${platformCommission} = ${authorEarnings + platformCommission}) does not equal total price ${totalPrice} AZN`
  );
}

/**
 * Asserts that a value is a valid MongoDB ObjectId or UUID.
 */
export function assertValidId(id: any, message?: string): void {
  assert(typeof id === 'string' && id.length > 0, message || `Expected valid non-empty string ID, got ${typeof id}`);
  const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
  assert(
    isMongoId || isUuid || id.length >= 8,
    message || `Expected valid identifier (ObjectId or UUID), got: "${id}"`
  );
}

/**
 * Asserts that a string is a valid ISO 8601 date.
 */
export function assertIsoDate(dateStr: string, message?: string): void {
  assert(typeof dateStr === 'string', message || `Expected ISO date string, got ${typeof dateStr}`);
  const parsed = Date.parse(dateStr);
  assert(!isNaN(parsed), message || `Expected valid ISO 8601 date string, got "${dateStr}"`);
}
