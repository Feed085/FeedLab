import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.ts';

type SuiteFilter = 'all' | 'api' | 'browser';

interface CliArgs {
  suite: SuiteFilter;
  tier?: number;
  grep?: string;
  checkHealth: boolean;
  reportPath: string;
  help: boolean;
}

const SKIPPED_DIRS = new Set(['node_modules', 'artifacts', '.git']);

function parseSuite(value: string | undefined): SuiteFilter {
  if (value === 'api' || value === 'browser' || value === 'all') {
    return value;
  }
  throw new Error(`Invalid --suite value "${value}". Expected one of: all, api, browser`);
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    suite: 'all',
    checkHealth: false,
    reportPath: config.reportPath,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg.startsWith('--suite=')) {
      result.suite = parseSuite(arg.split('=')[1]);
    } else if (arg === '--suite' || arg === '-s') {
      result.suite = parseSuite(args[++i]);
    } else if (arg.startsWith('--tier=')) {
      result.tier = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--tier' || arg === '-t') {
      result.tier = parseInt(args[++i], 10);
    } else if (arg.startsWith('--grep=')) {
      result.grep = arg.split('=')[1];
    } else if (arg === '--grep' || arg === '-g') {
      result.grep = args[++i];
    } else if (arg === '--check-health') {
      result.checkHealth = true;
    } else if (arg.startsWith('--report=')) {
      result.reportPath = arg.split('=')[1];
    } else if (arg === '--report' || arg === '-r') {
      result.reportPath = args[++i];
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
FeedLab E2E Test Runner
=======================
Usage:
  node tests/e2e/runner.ts [options]

Options:
  --suite=<all|api|browser>, -s   Filter test suite (default: all):
                                    all:     Run both API and Playwright browser tests
                                    api:     Run only HTTP API tests (excludes /browser/)
                                    browser: Run only Playwright browser tests (under /browser/)
  --tier=<1|2|3|4|5>, -t          Run tests only for the specified tier:
                                    1: Tier 1 - Feature Coverage (tier1-features/)
                                    2: Tier 2 - Boundaries & Negative (tier2-boundaries/)
                                    3: Tier 3 - Combinations (tier3-combinations/)
                                    4: Tier 4 - Real-World Scenarios (tier4-scenarios/)
                                    5: Tier 5 - Adversarial Coverage (tier5-adversarial/)
  --grep=<pattern>, -g            Filter test file paths matching the given regex/pattern
  --check-health                  Perform pre-flight health check ping to API backend
  --report=<path>, -r             Custom output path for test-report.json (default: tests/e2e/test-report.json)
  --help, -h                      Display this help message
`);
}

async function performHealthCheck(): Promise<boolean> {
  const healthUrl = `${config.apiUrl.replace(/\/+$/, '')}/health`;
  console.log(`[HEALTH CHECK] Pinging backend at ${healthUrl}...`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(healthUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      console.log(`[HEALTH CHECK] ✓ Backend is ONLINE (status ${res.status})`);
      return true;
    } else {
      console.warn(`[HEALTH CHECK] ⚠ Backend returned status ${res.status}`);
      return false;
    }
  } catch (err: any) {
    clearTimeout(timer);
    console.warn(`[HEALTH CHECK] ⚠ Backend is OFFLINE or UNREACHABLE (${err.message})`);
    return false;
  }
}

function discoverFiles(
  baseDir: string,
  suite: SuiteFilter,
  tier?: number,
  grep?: string
): string[] {
  const results: string[] = [];

  function walk(currentDir: string): void {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIPPED_DIRS.has(entry.name)) {
          continue;
        }
        walk(path.join(currentDir, entry.name));
      } else if (entry.isFile()) {
        const isTestFile = entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts');
        if (isTestFile) {
          results.push(path.join(currentDir, entry.name));
        }
      }
    }
  }

  walk(baseDir);

  const tierSubdirMap: Record<number, string> = {
    1: 'tier1-features',
    2: 'tier2-boundaries',
    3: 'tier3-combinations',
    4: 'tier4-scenarios',
    5: 'tier5-adversarial',
  };

  return results
    .sort((a, b) => a.localeCompare(b))
    .filter((file) => {
      const relNormalized = path.relative(baseDir, file).replace(/\\/g, '/');
      const fullNormalized = file.replace(/\\/g, '/');
      const isBrowserFile = relNormalized.startsWith('browser/') || fullNormalized.includes('/browser/');

      if (suite === 'api' && isBrowserFile) {
        return false;
      }
      if (suite === 'browser' && !isBrowserFile) {
        return false;
      }

      if (tier !== undefined) {
        const expectedDir = tierSubdirMap[tier];
        if (!expectedDir || !fullNormalized.includes(`/${expectedDir}/`)) {
          return false;
        }
      }

      if (grep) {
        const regex = new RegExp(grep, 'i');
        if (!regex.test(fullNormalized)) {
          return false;
        }
      }

      return true;
    });
}

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv.slice(2));

  if (cliArgs.help) {
    printHelp();
    process.exit(0);
  }

  console.log(`====================================================`);
  console.log(` FeedLab Standalone Opaque-Box E2E Test Runner      `);
  console.log(` Target API: ${config.apiUrl}`);
  console.log(` Target Web: ${config.webUrl}`);
  console.log(` Target Suite: ${cliArgs.suite}`);
  if (cliArgs.tier) console.log(` Target Tier: Tier ${cliArgs.tier}`);
  if (cliArgs.grep) console.log(` Filter Pattern: "${cliArgs.grep}"`);
  console.log(`====================================================\n`);

  if (cliArgs.checkHealth) {
    await performHealthCheck();
  }

  const baseDir = import.meta.dirname;
  const files = discoverFiles(baseDir, cliArgs.suite, cliArgs.tier, cliArgs.grep);

  console.log(`[FeedLab Runner] Discovered ${files.length} matching test file(s):`);
  for (const f of files) {
    console.log(`  - ${path.relative(baseDir, f).replace(/\\/g, '/')}`);
  }
  console.log('');

  if (files.length === 0) {
    console.log('[FeedLab Runner] No test files to execute.');
    const emptyReport = {
      timestamp: new Date().toISOString(),
      suite: cliArgs.suite,
      tier: cliArgs.tier ?? 'all',
      grep: cliArgs.grep ?? null,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        cancelled: 0,
        todo: 0,
        durationMs: 0,
        success: true,
      },
      files: [],
      failures: [],
    };

    const outPath = path.resolve(cliArgs.reportPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(emptyReport, null, 2), 'utf-8');
    console.log(`[FeedLab Runner] Report saved to ${outPath}`);
    process.exit(0);
  }

  const failures: Array<{ name: string; error: any }> = [];
  let summaryStats: any = null;

  const testStream = run({
    files,
    concurrency: 1,
  });

  testStream.on('test:fail', (data) => {
    failures.push({
      name: data.name,
      error: data.details?.error?.message || data.details?.error || 'Unknown failure',
    });
  });

  testStream.on('test:summary', (s) => {
    summaryStats = s;
  });

  testStream.compose(new spec()).pipe(process.stdout);

  await new Promise<void>((resolve) => {
    testStream.on('end', () => resolve());
  });

  const durationMs = summaryStats?.duration_ms ?? 0;
  const counts = summaryStats?.counts ?? {
    tests: 0,
    failed: failures.length,
    passed: 0,
    skipped: 0,
    cancelled: 0,
    todo: 0,
  };

  const report = {
    timestamp: new Date().toISOString(),
    suite: cliArgs.suite,
    tier: cliArgs.tier ?? 'all',
    grep: cliArgs.grep ?? null,
    summary: {
      total: counts.tests,
      passed: counts.passed,
      failed: counts.failed,
      skipped: counts.skipped,
      cancelled: counts.cancelled,
      todo: counts.todo,
      durationMs,
      success: counts.failed === 0,
    },
    files: files.map((f) => path.relative(baseDir, f).replace(/\\/g, '/')),
    failures,
  };

  const outPath = path.resolve(cliArgs.reportPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n[FeedLab Runner] Structured report written to: ${outPath}`);

  if (counts.failed > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error('[FeedLab Runner] Fatal execution error:', err);
  process.exit(1);
});
