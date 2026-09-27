// @ts-check
// Lighthouse budgets for the production build (`npm run build` first).
//
// Serves dist/ with `vite preview`, runs Lighthouse (mobile preset, simulated
// throttling) several times, takes the median run by performance score and checks it
// against BUDGETS. "error" budgets fail the command; "warn" budgets only report,
// because lab timings vary between machines. Reports go to lighthouse-report/.
//
// CHROME_PATH selects the browser (default: the installed Chrome); LH_RUNS the run count.
import { mkdir, writeFile } from 'node:fs/promises';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { preview } from 'vite';

/** @typedef {NonNullable<Awaited<ReturnType<typeof lighthouse>>>['lhr']} Lhr */
/** @typedef {{ name: string, value: (lhr: Lhr) => number | null, min?: number, max?: number, level: 'error' | 'warn' }} Budget */

/** @type {Budget[]} */
const BUDGETS = [
  {
    name: 'accessibility score',
    value: (r) => r.categories.accessibility?.score ?? null,
    min: 1,
    level: 'error',
  },
  {
    name: 'best-practices score',
    value: (r) => r.categories['best-practices']?.score ?? null,
    min: 1,
    level: 'error',
  },
  { name: 'SEO score', value: (r) => r.categories.seo?.score ?? null, min: 1, level: 'error' },
  { name: 'cumulative layout shift', value: audit('cumulative-layout-shift'), max: 0.1, level: 'error' },
  {
    name: 'performance score',
    value: (r) => r.categories.performance?.score ?? null,
    min: 0.7,
    level: 'error',
  },
  {
    name: 'performance score (target)',
    value: (r) => r.categories.performance?.score ?? null,
    min: 0.9,
    level: 'warn',
  },
  {
    name: 'largest contentful paint (ms)',
    value: audit('largest-contentful-paint'),
    max: 2500,
    level: 'warn',
  },
  { name: 'total blocking time (ms)', value: audit('total-blocking-time'), max: 200, level: 'warn' },
];

const RUNS = Number(process.env.LH_RUNS ?? 3);
const OUT = 'lighthouse-report';
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

/** @param {string} id */
function audit(id) {
  return /** @param {Lhr} lhr */ (lhr) => lhr.audits[id]?.numericValue ?? null;
}

const server = await preview({
  preview: { port: 4174, strictPort: false, host: '127.0.0.1' },
  logLevel: 'warn',
});
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('lighthouse: preview server has no URL');

// Chrome refuses to run its sandbox as root (containers); CI runners are not root.
const chromeFlags = ['--headless=new', ...(process.getuid?.() === 0 ? ['--no-sandbox'] : [])];
const chrome = await chromeLauncher.launch({ chromeFlags });

/** @type {Lhr[]} */
const runs = [];
try {
  await mkdir(OUT, { recursive: true });
  for (let i = 1; i <= RUNS; i++) {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'html',
      logLevel: 'error',
      onlyCategories: CATEGORIES,
    });
    if (!result) throw new Error('lighthouse: no result');
    runs.push(result.lhr);
    await writeFile(`${OUT}/run-${String(i)}.html`, String(result.report));
    await writeFile(`${OUT}/run-${String(i)}.json`, JSON.stringify(result.lhr));
    console.log(`run ${String(i)}/${String(RUNS)}: ${summarize(result.lhr)}`);
  }
} finally {
  chrome.kill();
  await server.close();
}

const median = [...runs].sort(
  (a, b) => (a.categories.performance?.score ?? 0) - (b.categories.performance?.score ?? 0),
)[Math.floor(runs.length / 2)];
if (!median) throw new Error('lighthouse: no runs');
console.log(`median: ${summarize(median)}\n`);

let failed = false;
for (const budget of BUDGETS) {
  const value = budget.value(median);
  const ok =
    value !== null &&
    (budget.min === undefined || value >= budget.min) &&
    (budget.max === undefined || value <= budget.max);
  const limit = budget.min === undefined ? `<= ${String(budget.max)}` : `>= ${String(budget.min)}`;
  const status = ok ? 'pass' : budget.level === 'error' ? 'FAIL' : 'warn';
  console.log(`${status.padEnd(4)}  ${budget.name}: ${String(value)} (budget ${limit})`);
  if (!ok && budget.level === 'error') failed = true;
}
await writeFile(`${OUT}/median.json`, JSON.stringify(median));
if (failed) process.exitCode = 1;

/** @param {Lhr} lhr */
function summarize(lhr) {
  const score = (/** @type {string} */ id) => Math.round((lhr.categories[id]?.score ?? 0) * 100);
  const ms = (/** @type {string} */ id) => Math.round(lhr.audits[id]?.numericValue ?? 0);
  return [
    `perf ${String(score('performance'))}`,
    `a11y ${String(score('accessibility'))}`,
    `bp ${String(score('best-practices'))}`,
    `seo ${String(score('seo'))}`,
    `LCP ${String(ms('largest-contentful-paint'))} ms`,
    `CLS ${(lhr.audits['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)}`,
    `TBT ${String(ms('total-blocking-time'))} ms`,
  ].join(' | ');
}
