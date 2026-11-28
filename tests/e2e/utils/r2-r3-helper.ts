import assert from 'node:assert/strict';
import { ApiClient } from './api-client.ts';
import type { ApiResponse } from './api-client.ts';
import {
  createAdminSession,
  createAuthorSession,
  generateUniqueEmail,
} from './user-session.ts';
import type { UserSession } from './user-session.ts';

export interface StepResult<T = any> {
  status: number;
  data: T;
  headers: Headers;
  isOffline: boolean;
}

export interface TestComponentHandle {
  id: string;
  slug: string;
  data: any;
  payload: Record<string, any>;
}

export interface ApprovedProjectHandle {
  id: string;
  slug: string;
  fileId: string;
  data: any;
  payload: Record<string, any>;
}

let cachedAdminSession: UserSession | null = null;
let cachedAuthorSession: UserSession | null = null;

/**
 * Returns true if the error represents a genuine network / transport offline condition
 * (e.g. backend down / DNS failure / connection refused / socket timeout).
 * HTTP 4xx/5xx responses are NEVER treated as offline errors.
 */
export function isNetworkOfflineError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as any;
  const causeCode = e.cause?.code;
  const errorCode = e.code;
  const message = typeof e.message === 'string' ? e.message : '';

  return (
    causeCode === 'ECONNREFUSED' ||
    causeCode === 'ENOTFOUND' ||
    causeCode === 'ECONNRESET' ||
    causeCode === 'UND_ERR_CONNECT_TIMEOUT' ||
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ENOTFOUND' ||
    errorCode === 'ECONNRESET' ||
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('connect ECONNREFUSED') ||
    message.includes('UND_ERR_CONNECT_TIMEOUT') ||
    message.includes('timed out')
  );
}

/**
 * Wraps a test body so that genuine network offline errors skip the test cleanly
 * unless E2E_STRICT_LIVE=1 is set. Any HTTP 4xx/5xx or assertion failure is NEVER
 * caught or masked and will fail the test immediately.
 */
export async function withOfflineSkip<T>(
  t: { skip: (msg?: string) => void },
  fn: () => Promise<T>
): Promise<T | void> {
  try {
    return await fn();
  } catch (err: any) {
    if (isNetworkOfflineError(err) && process.env.E2E_STRICT_LIVE !== '1') {
      t.skip(`Backend offline (${err.message || 'connection failed'})`);
      return;
    }
    throw err;
  }
}

/**
 * Executes an HTTP call strictly against the live backend.
 * Never falls back to mock data when the server responds (even with 4xx/5xx).
 * Re-throws genuine network errors so `withOfflineSkip` or strict live failure handles them.
 */
export async function executeStrictStep<T = any>(
  action: () => Promise<ApiResponse<T>>
): Promise<StepResult<T>> {
  const res = await action();
  return {
    status: res.status,
    data: res.data,
    headers: res.headers,
    isOffline: false,
  };
}

/**
 * Returns a cached Admin UserSession for the current test process,
 * preventing repeated POST /auth/login calls across specs.
 */
export async function getCachedAdminSession(): Promise<UserSession> {
  if (cachedAdminSession && cachedAdminSession.token) {
    return cachedAdminSession;
  }
  const session = await createAdminSession();
  assert.ok(session.token, 'Admin login must return a valid access token');
  cachedAdminSession = session;
  return session;
}

/**
 * Creates or returns a cached verified AUTHOR session for the current test process.
 * If /auth/register provisions the user as USER instead of AUTHOR, submits an author
 * application and approves it via adminSession.
 */
export async function ensureAuthorSession(adminSession?: UserSession): Promise<UserSession> {
  if (cachedAuthorSession && cachedAuthorSession.token) {
    return cachedAuthorSession;
  }

  const author = await createAuthorSession();
  if (author.user?.role === 'AUTHOR') {
    cachedAuthorSession = author;
    return author;
  }

  const meRes = await author.client.get('/auth/me');
  const currentRole = meRes.data?.user?.role || meRes.data?.role;
  if (currentRole === 'AUTHOR') {
    author.role = 'AUTHOR';
    author.user = { ...author.user, role: 'AUTHOR' };
    cachedAuthorSession = author;
    return author;
  }

  const admin = adminSession || (await getCachedAdminSession());
  const applyRes = await author.client.post('/authors/apply', {
    fullName: author.user.fullName || 'Test Müəllif',
    bio: 'Elektronika, IoT və mikrokontroller sistemləri üzrə təcrübəli müəllif.',
    portfolioUrl: 'https://github.com/feedlab-e2e-author',
    skills: ['ESP32', 'Arduino', 'Sensorlar'],
  });

  const appId = applyRes.data?._id || applyRes.data?.id || applyRes.data?.application?._id;
  if (appId) {
    await admin.client.patch(`/admin/author-applications/${appId}`, {
      action: 'APPROVE',
      adminNotes: 'E2E test müəllif təsdiqi',
    });
    const loginRes = await author.client.post('/auth/login', {
      email: author.user.email,
      password: 'Password123!',
    });
    const refreshedToken = loginRes.data?.accessToken || loginRes.data?.token;
    if (refreshedToken) {
      author.client.setToken(refreshedToken);
      author.token = refreshedToken;
      author.role = 'AUTHOR';
      author.user = loginRes.data?.user || { ...author.user, role: 'AUTHOR' };
    }
  }

  if (author.token && (author.role === 'AUTHOR' || author.user?.role === 'AUTHOR')) {
    cachedAuthorSession = author;
  }

  return author;
}

/**
 * Fetches seeded components from GET /components?limit=100.
 */
export async function fetchSeededComponents(client: ApiClient): Promise<{
  items: any[];
  categories: Array<{ key: string; label: string; count: number }>;
  total: number;
  raw: any;
}> {
  const res = await client.get('/components?limit=100');
  assert.equal(res.status, 200, `GET /components?limit=100 expected 200, got ${res.status}`);
  const items = Array.isArray(res.data?.items)
    ? res.data.items
    : Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data)
        ? res.data
        : [];
  const categories = Array.isArray(res.data?.categories) ? res.data.categories : [];
  const total = typeof res.data?.total === 'number' ? res.data.total : items.length;
  return { items, categories, total, raw: res.data };
}

/**
 * Fetches the first valid category slug from GET /categories for project creation.
 */
export async function fetchFirstValidCategorySlug(client: ApiClient): Promise<string> {
  const res = await client.get('/categories');
  if (res.status === 200) {
    const list = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data)
        ? res.data
        : [];
    if (list.length > 0 && list[0]?.slug) {
      return list[0].slug;
    }
  }
  return 'electronics-iot';
}

/**
 * Creates an educational component via Admin POST /components.
 * Caller should delete it via `deleteTestComponent` inside a `try/finally` block.
 */
export async function createTestComponent(
  adminClient: ApiClient,
  overrides: Record<string, any> = {}
): Promise<TestComponentHandle> {
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const slug = overrides.slug || `e2e-sensor-${unique}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  const payload: Record<string, any> = {
    slug,
    name: `E2E Test Sensor ${unique}`,
    aliases: [`e2e-alias-${unique}`],
    category: 'sensors',
    categoryLabel: 'Sensorlar',
    shortDescription: 'E2E test üçün yaradılmış rəqəmsal temperatur və rütubət sensoru.',
    definition:
      'Bu komponent ətraf mühitin temperatur və rütubət göstəricilərini ölçən tədris elektronika moduludur.',
    workingPrinciple:
      'Daxili həssas element ətraf mühitdəki dəyişiklikləri rəqəmsal siqnala çevirərək mikrokontrollerə ötürür.',
    applications: [
      'Ağıllı istixana monitorinqi',
      'Məktəb STEM laboratoriyası',
      'Hava keyfiyyəti stansiyası',
    ],
    specs: [
      { label: 'İş gərginliyi', value: '3.3V - 5V DC' },
      { label: 'Ölçmə diapazonu', value: '-40°C ~ +80°C' },
    ],
    pinout: [
      { pin: '1', name: 'VCC', function: 'Enerji təchizatı (3.3V-5V)', type: 'POWER' },
      { pin: '2', name: 'DATA', function: 'Rəqəmsal məlumat çıxışı', type: 'IO' },
      { pin: '3', name: 'GND', function: 'Torpaq xətti', type: 'GROUND' },
    ],
    wiringGuide:
      'VCC pinini 3.3V-a, GND pinini GND-yə, DATA pinini isə 10kΩ rezistor ilə GPIO4 pininə qoşun.',
    codeExample: {
      language: 'cpp',
      title: 'ESP32 Nümunə Kodu',
      code: 'void setup() { Serial.begin(115200); }\nvoid loop() { delay(1000); }',
    },
    pros: ['Asan qoşulma', 'Aşağı enerji sərfiyyatı'],
    limitations: ['2 saniyəlik ölçmə intervalı'],
    alternatives: [{ name: 'BME280', reason: 'Daha yüksək dəqiqlik tələb olunduqda' }],
    ...overrides,
  };

  const res = await adminClient.post('/components', payload);
  assert.ok(
    res.status === 201 || res.status === 200,
    `Expected 201/200 from POST /components, got ${res.status}: ${res.raw}`
  );

  const id = res.data?.id || res.data?._id;
  assert.ok(id, `POST /components response missing id/_id: ${res.raw}`);

  return {
    id,
    slug: res.data?.slug || payload.slug,
    data: res.data,
    payload,
  };
}

/**
 * Deletes a test component via Admin DELETE /components/:id (ignores 404).
 */
export async function deleteTestComponent(adminClient: ApiClient, id?: string | null): Promise<void> {
  if (!id) return;
  try {
    const res = await adminClient.delete(`/components/${id}`);
    if (res.status !== 200 && res.status !== 204 && res.status !== 404) {
      throw new Error(`Unexpected DELETE /components/${id} status ${res.status}`);
    }
  } catch (err) {
    if (!isNetworkOfflineError(err)) {
      throw err;
    }
  }
}

/**
 * Transitions a synthetic E2E project out of APPROVED status via Admin REJECT
 * so it does not pollute public catalog, homepage, or component-matching queries.
 */
export async function rejectTestProject(
  adminSession: UserSession,
  projectId?: string | null
): Promise<void> {
  if (!projectId) return;
  try {
    const res = await adminSession.client.post(`/admin/projects/${projectId}/review`, {
      action: 'REJECT',
      rejectionReason: 'E2E cleanup',
    });
    if (res.status !== 200 && res.status !== 201 && res.status !== 404) {
      throw new Error(
        `Unexpected POST /admin/projects/${projectId}/review REJECT status ${res.status}`
      );
    }
  } catch (err) {
    if (!isNetworkOfflineError(err)) {
      throw err;
    }
  }
}

/**
 * Creates a DRAFT project with BOM components, domains, and difficulty (does not submit or approve).
 */
export async function createDraftProjectWithBom(
  authorSession: UserSession,
  overrides: Record<string, any> = {}
): Promise<{ id: string; slug: string; data: any; payload: Record<string, any> }> {
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const category = overrides.category || (await fetchFirstValidCategorySlug(authorSession.client));

  const payload: Record<string, any> = {
    title: `E2E Elektronika Layihəsi ${unique}`,
    shortDescription: 'ESP32 və sensorlar əsaslı praktiki mühəndislik layihəsi.',
    fullDescription:
      'Bu layihə tələbələr və müəllimlər üçün hazırlanmış addım-addım elektronika və proqramlaşdırma layihəsidir.',
    objectives: 'Tələbələrin sensorlarla işləmə bacarığını artırmaq.',
    workingPrinciple: 'Mikrokontroller sensorlardan oxunan məlumatı emal edərək çıxış modulunu idarə edir.',
    installationGuide: '1. Sxemi yığın. 2. Kodu yükləyin. 3. Qidalanmanı qoşun.',
    hardwareRequirements: 'ESP32 və əsas sensor dəsti',
    systemRequirements: 'Arduino IDE 2.0+',
    category,
    price: 25.0,
    domains: ['Ekologiya'],
    difficulty: 'BEGINNER',
    components: [
      { name: 'ESP32', quantity: 1, estimatedCostAzn: 12, componentSlug: 'esp32' },
      { name: 'DHT22', quantity: 1, estimatedCostAzn: 8, componentSlug: 'dht22' },
    ],
    ...overrides,
  };

  const draftRes = await authorSession.client.post('/projects', payload);
  assert.equal(
    draftRes.status,
    201,
    `Expected 201 Created from POST /projects, got ${draftRes.status}: ${draftRes.raw}`
  );
  const id = draftRes.data?._id || draftRes.data?.id;
  assert.ok(id, 'Draft project response must include _id or id');

  return {
    id,
    slug: draftRes.data?.slug || '',
    data: draftRes.data,
    payload,
  };
}

/**
 * Creates a project draft with BOM/domains/difficulty, uploads a dummy ZIP archive,
 * submits it for moderation, and approves it as Admin so it is immediately searchable/matchable.
 */
export async function createApprovedProjectWithBom(
  authorSession: UserSession,
  adminSession: UserSession,
  overrides: Record<string, any> = {}
): Promise<ApprovedProjectHandle> {
  const draft = await createDraftProjectWithBom(authorSession, overrides);

  const formData = new FormData();
  const dummyZip = new Blob(['PK\x03\x04FeedLabE2ETestProjectArchive'], { type: 'application/zip' });
  formData.append('file', dummyZip, `project_${draft.id}.zip`);

  const uploadRes = await authorSession.client.upload(`/projects/${draft.id}/files`, formData);
  assert.ok(
    uploadRes.status === 201 || uploadRes.status === 200,
    `Expected 201/200 from POST /projects/${draft.id}/files, got ${uploadRes.status}: ${uploadRes.raw}`
  );

  const uploadedFileId =
    uploadRes.data?.fileId ||
    uploadRes.data?._id ||
    uploadRes.data?.id ||
    uploadRes.data?.files?.[0]?.fileId ||
    uploadRes.data?.files?.[0]?._id ||
    '';

  const submitRes = await authorSession.client.post(`/projects/${draft.id}/submit`);
  assert.ok(
    submitRes.status === 200 || submitRes.status === 201,
    `Expected 200/201 from POST /projects/${draft.id}/submit, got ${submitRes.status}: ${submitRes.raw}`
  );

  const approveRes = await adminSession.client.post(`/admin/projects/${draft.id}/review`, {
    action: 'APPROVE',
    moderatorNotes: 'E2E test layihəsi təsdiqləndi.',
  });
  assert.ok(
    approveRes.status === 200 || approveRes.status === 201,
    `Expected 200/201 from POST /admin/projects/${draft.id}/review, got ${approveRes.status}: ${approveRes.raw}`
  );

  const finalSlug = approveRes.data?.slug || draft.slug || draft.id;
  let finalData = approveRes.data;
  let finalFileId = uploadedFileId;

  if (finalSlug) {
    const detailRes = await adminSession.client.get(`/projects/${finalSlug}`);
    if (detailRes.status === 200 && detailRes.data) {
      finalData = detailRes.data;
      finalFileId =
        finalData.files?.[0]?.fileId || finalData.files?.[0]?._id || finalFileId;
    }
  }

  return {
    id: draft.id,
    slug: finalSlug,
    fileId: finalFileId,
    data: finalData,
    payload: draft.payload,
  };
}

/**
 * Extracts project array from either paginated `{ data }`, `{ items }`, `{ projects }`, or raw array.
 */
export function extractList(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.projects)) return data.projects;
  return [];
}

/**
 * Generates a unique slug-safe tag for isolated test assertions.
 */
export function uniqueTag(prefix: string = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export { generateUniqueEmail };
