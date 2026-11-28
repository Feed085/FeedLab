import path from 'node:path';

export interface TestConfig {
  apiUrl: string;
  webUrl: string;
  adminEmail: string;
  adminPassword: string;
  timeoutMs: number;
  browserTimeoutMs: number;
  headless: boolean;
  artifactsDir: string;
  reportPath: string;
}

export const config: TestConfig = {
  apiUrl: process.env.FEEDLAB_API_URL || 'http://localhost:3000/api/v1',
  webUrl: process.env.FEEDLAB_WEB_URL || 'http://localhost:5173',
  adminEmail: process.env.FEEDLAB_ADMIN_EMAIL || 'admin@feedlab.az',
  adminPassword: process.env.FEEDLAB_ADMIN_PASSWORD || 'Admin123!',
  timeoutMs: parseInt(process.env.TEST_TIMEOUT_MS || '10000', 10),
  browserTimeoutMs: parseInt(process.env.BROWSER_TIMEOUT_MS || '30000', 10),
  headless: process.env.HEADLESS !== 'false',
  artifactsDir: process.env.E2E_ARTIFACTS_DIR || path.resolve(import.meta.dirname, 'artifacts'),
  reportPath: process.env.REPORT_PATH || path.resolve(import.meta.dirname, 'test-report.json'),
};
