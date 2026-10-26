import { writeFile } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const frontendDir = path.resolve(rootDir, 'frontend');
const prototypePath = path.resolve(rootDir, 'design', 'prototype', 'caasm-console.html');
const prototypeUrl = `file://${prototypePath}`;
const previewPort = 4173;
const portUrl = `http://127.0.0.1:${previewPort}/?audit=${Date.now()}`;
const reportPath = path.resolve(__dirname, 'typography-cards-report.json');
const summaryPath = path.resolve(__dirname, 'typography-cards-summary.md');
const previewProcessPids = new Set<number>();

type ElementSpec = {
  name: string;
  selectors: readonly string[];
};

type MatchInfo = {
  tagName: string | null;
  text: string;
  outerHtml: string;
};

type DetailIssue = {
  element: string;
  property: string;
  prototype: string;
  port: string;
  status: 'MISMATCH' | 'NOT FOUND';
  prototypeMatch: MatchInfo | null;
  portMatch: MatchInfo | null;
};

type Scenario = {
  name: string;
  kind: 'device' | 'account';
  recordName: string;
  tab: string;
  elements: readonly ElementSpec[];
};

const properties = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'color',
  'backgroundColor',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderRadius',
  'renderedHeight',
] as const;

const MANIFEST: readonly ElementSpec[] = [
  { name: 'detail summary pill', selectors: ['[class*="detailOverviewSummary"] span:visible', 'div:has-text("All sources agree") span:visible'] },
  { name: 'detail source coverage header', selectors: ['[data-testid="source-coverage-card"] h3:visible:text-is("Exposure gaps")', 'h3:visible:text-is("Exposure gaps")'] },
  { name: 'detail overview lead', selectors: ['[class*="detailOverviewLead"]:visible', 'div:has-text("Last seen by sources")', 'div:has-text("Last login by sources")'] },
  { name: 'detail agreement header', selectors: ['[class*="detailAgreementHeader"] span:visible', 'div.detailAgreementHeader span:has-text("Field")'] },
  { name: 'detail raw values toggle', selectors: ['button:visible:text-is("View raw values")', 'button:has-text("View raw values")'] },
  { name: 'detail source coverage search', selectors: ['input[aria-label="Find a source"]', 'input[placeholder="Find a source"]'] },
  { name: 'detail source coverage source row', selectors: ['[data-testid="source-coverage-source"]', 'dt:has-text("Portnox AgentP")', 'dt:has-text("CrowdStrike")'] },
  { name: 'detail source coverage time', selectors: ['[data-testid="source-coverage-time"]', 'dd span:has-text("ago")'] },
];

const SCENARIOS: readonly Scenario[] = [
  {
    name: 'device overview',
    kind: 'device',
    recordName: 'IOT-1049',
    tab: 'Overview',
    elements: MANIFEST,
  },
  {
    name: 'device exposure coverage',
    kind: 'device',
    recordName: 'IOT-1049',
    tab: 'Exposure coverage',
    elements: MANIFEST,
  },
  {
    name: 'account overview',
    kind: 'account',
    recordName: 'avery@acme.com',
    tab: 'Overview',
    elements: MANIFEST,
  },
  {
    name: 'account exposure coverage',
    kind: 'account',
    recordName: 'avery@acme.com',
    tab: 'Exposure coverage',
    elements: MANIFEST,
  },
];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+#\d+$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function toNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeColor(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  const srgbMatch = trimmed.match(/color\(srgb\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/i);
  if (srgbMatch) {
    const [r, g, b] = srgbMatch.slice(1).map((part) => Number.parseFloat(part));
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  }

  const rgbMatch = trimmed.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const numbers = rgbMatch[1].split(',').map((part) => Number.parseFloat(part.trim()));
    const [r, g, b, a] = numbers;
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      if (a !== undefined && Number.isFinite(a) && a !== 1) {
        return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
      }
      return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }
  }

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1).replace(/\s+/g, '');
    if (hex.length === 3 || hex.length === 4) {
      const expanded = hex.split('').map((char) => char + char).join('');
      return `rgb(${Number.parseInt(expanded.slice(0, 2), 16)}, ${Number.parseInt(expanded.slice(2, 4), 16)}, ${Number.parseInt(expanded.slice(4, 6), 16)})`;
    }
    if (hex.length >= 6) {
      return `rgb(${Number.parseInt(hex.slice(0, 2), 16)}, ${Number.parseInt(hex.slice(2, 4), 16)}, ${Number.parseInt(hex.slice(4, 6), 16)})`;
    }
  }

  return trimmed.toLowerCase();
}

function normalizeFontFamily(value: string | null | undefined): string {
  if (!value) return '';
  const [candidate] = value
    .split(',')
    .map((part) => part.trim().replace(/^"|"$/g, '').trim())
    .filter(Boolean);
  return (candidate ?? '').toLowerCase();
}

function compareProperty(property: string, left: string | null | undefined, right: string | null | undefined): boolean {
  if (left === 'NOT FOUND' || right === 'NOT FOUND') return left === right;
  if (left === 'ERROR:' || right === 'ERROR:') return left === right;
  if (property === 'fontFamily') return normalizeFontFamily(left) === normalizeFontFamily(right);
  if (property.includes('Color')) return normalizeColor(left) === normalizeColor(right);
  if (property === 'fontWeight') {
    const leftWeight = left?.replace(/[^0-9]/g, '') || left;
    const rightWeight = right?.replace(/[^0-9]/g, '') || right;
    if (leftWeight && rightWeight) return Math.abs(Number(leftWeight) - Number(rightWeight)) <= 1;
    return left === right;
  }
  if (['fontSize', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderRadius', 'renderedHeight'].includes(property)) {
    const leftNumber = toNumber(left);
    const rightNumber = toNumber(right);
    if (leftNumber !== null && rightNumber !== null) return Math.abs(leftNumber - rightNumber) <= 0.5;
    return left === right;
  }
  return left === right;
}

function statusForComparison(
  property: string,
  prototypeValue: string | null | undefined,
  portValue: string | null | undefined,
): 'OK' | 'MISMATCH' | 'NOT FOUND' {
  if (prototypeValue === 'NOT FOUND' || portValue === 'NOT FOUND') return 'NOT FOUND';
  return compareProperty(property, String(prototypeValue), String(portValue)) ? 'OK' : 'MISMATCH';
}

async function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function httpStatusCode(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const request = http.get(url, { agent: new http.Agent({ keepAlive: false }), timeout: 2000, headers: { Connection: 'close' } }, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });

    request.on('timeout', () => {
      request.destroy(new Error('HTTP timeout'));
      resolve(null);
    });

    request.on('error', () => {
      resolve(null);
    });
  });
}

async function ensurePortFree(port: number): Promise<void> {
  if (!(await portInUse(port))) return;

  if (process.platform === 'win32') {
    throw new Error(`Port ${port} is already in use; free it with: netstat -ano | findstr :${port}`);
  }

  try {
    execFileSync('pkill', ['-f', 'vite preview'], { stdio: 'inherit' });
  } catch {
    // ignore if no matching process exists
  }

  const until = Date.now() + 3000;
  while (Date.now() < until) {
    if (!(await portInUse(port))) return;
    await wait(250);
  }

  if (await portInUse(port)) {
    throw new Error(`Port ${port} is still in use; free it with: lsof -nP -iTCP:${port} -sTCP:LISTEN`);
  }
}

function stopProcessGroup(pid: number | null | undefined): void {
  if (!pid) return;
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    // ignore already-exited processes
  }
  previewProcessPids.delete(pid);
}

process.on('exit', () => {
  for (const pid of [...previewProcessPids]) stopProcessGroup(pid);
});
process.on('SIGINT', () => {
  for (const pid of [...previewProcessPids]) stopProcessGroup(pid);
  process.exit(130);
});
process.on('SIGTERM', () => {
  for (const pid of [...previewProcessPids]) stopProcessGroup(pid);
  process.exit(143);
});

async function ensureFreshPreview(): Promise<number> {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  await new Promise<void>((resolve, reject) => {
    const build = spawn(npmCommand, ['run', 'build'], { cwd: frontendDir, stdio: 'inherit' });
    build.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm run build failed with exit code ${code}`));
    });
    build.on('error', reject);
  });

  await ensurePortFree(previewPort);

  const preview = spawn(npxCommand, ['vite', 'preview', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'], {
    cwd: frontendDir,
    stdio: 'inherit',
    detached: true,
  });

  const previewPid = preview.pid;
  if (previewPid) {
    previewProcessPids.add(previewPid);
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    const statusCode = await httpStatusCode(portUrl);
    if (statusCode === 200) {
      return previewPid;
    }
    await wait(500);
  }

  throw new Error(`vite preview did not serve the app on port ${previewPort} within 30 seconds`);
}

async function launchFreshBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}

async function findFirstMatch(page: Page, selectors: readonly string[]): Promise<MatchInfo | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (!(await locator.count())) continue;
    const tagName = await locator.evaluate((node) => node.tagName).catch(() => null);
    const text = (await locator.textContent().catch(() => '') ?? '').replace(/\s+/g, ' ').trim();
    const outerHtml = await locator.evaluate((node) => node.outerHTML.slice(0, 160)).catch(() => '');
    return { tagName, text, outerHtml };
  }
  return null;
}

async function getElementCSS(page: Page, selectors: readonly string[]): Promise<Record<string, string> | 'NOT FOUND'> {
  for (const selector of selectors) {
    try {
      const candidate = page.locator(selector).first();
      if (!(await candidate.count())) continue;
      await candidate.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {
        throw new Error('element not found');
      });
      return await candidate.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          color: style.color,
          backgroundColor: style.backgroundColor,
          paddingTop: style.paddingTop,
          paddingRight: style.paddingRight,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          borderRadius: style.borderRadius,
          renderedHeight: `${Math.round(node.getBoundingClientRect().height * 10) / 10}px`,
        };
      });
    } catch {
      continue;
    }
  }

  return 'NOT FOUND';
}

async function openPrototypeRecord(page: Page, scenario: Scenario): Promise<void> {
  await page.goto(prototypeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const topLevelButton = page.locator('button:has-text("Assets")').first();
  if (await topLevelButton.count()) {
    await topLevelButton.click({ timeout: 2000 }).catch(() => undefined);
  }

  const kindButton = page.locator(`button:has-text("${scenario.kind === 'device' ? 'Devices' : 'Accounts'}")`).first();
  if (await kindButton.count()) {
    await kindButton.click({ timeout: 2000 }).catch(() => undefined);
  }

  const row = page.locator('tbody tr').filter({ hasText: scenario.recordName }).first();
  if (await row.count()) {
    await row.click({ timeout: 2000 }).catch(() => undefined);
    await page.waitForTimeout(350);
    return;
  }

  const search = page.locator('input[type="search"], input[placeholder*="Search"], input[aria-label*="Search"]').first();
  if (await search.count()) {
    await search.fill(scenario.recordName);
    await page.waitForTimeout(200);
    const filteredRow = page.locator('tbody tr').filter({ hasText: scenario.recordName }).first();
    if (await filteredRow.count()) {
      await filteredRow.click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(350);
      return;
    }
  }
}

async function openPortRecord(page: Page, scenario: Scenario): Promise<void> {
  await page.goto(portUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const kindButton = page.locator(`button:has-text("${scenario.kind === 'device' ? 'Devices' : 'Accounts'}")`).first();
  if (await kindButton.count()) {
    await kindButton.click({ timeout: 2000 }).catch(() => undefined);
  }

  const row = page.locator('tbody tr').filter({ hasText: scenario.recordName }).first();
  if (await row.count()) {
    await row.click({ timeout: 2000 }).catch(() => undefined);
    await page.waitForTimeout(350);
    return;
  }

  const search = page.locator('input[aria-label*="Search"], input[placeholder*="Search"]').first();
  if (await search.count()) {
    await search.fill(scenario.recordName);
    await page.waitForTimeout(200);
    const filteredRow = page.locator('tbody tr').filter({ hasText: scenario.recordName }).first();
    if (await filteredRow.count()) {
      await filteredRow.click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(350);
      return;
    }
  }
}

async function activateTab(page: Page, label: string): Promise<boolean> {
  if (label === 'Overview') return true;
  const tab = page.locator(`button:has-text("${label}")`).first();
  if (!(await tab.count())) return false;
  await tab.click({ timeout: 2000 }).catch(() => undefined);
  await page.waitForTimeout(250);
  return true;
}

async function getPageHeading(page: Page): Promise<string> {
  const candidates = await page.locator('h1, h2, h3, [class*="detailCrumbCurrent"], [class*="detailPageTitle"], [data-testid="detail-title"]').evaluateAll((nodes) =>
    nodes
      .map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter((value) => value.length > 0)
  );
  return candidates.find((value) => value.length > 0) ?? '';
}

async function getActiveTab(page: Page): Promise<string> {
  const active = await page.locator('[aria-selected="true"], [aria-current="page"], [class*="detailTabActive"], button[aria-pressed="true"], button.active, button[selected]').evaluateAll((nodes) =>
    nodes
      .map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter((value) => value.length > 0)
  );
  if (active.length) return active[0];

  const buttons = await page.locator('button').evaluateAll((nodes) =>
    nodes
      .map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter((value) => value.length > 0)
  );
  const match = buttons.find((value) => ['Overview', 'Exposure coverage', 'Alerts', 'On this device', 'Connection history'].includes(value));
  return match ?? '';
}

async function verifyScenario(page: Page, scenario: Scenario): Promise<string | null> {
  const heading = await getPageHeading(page);
  if (normalizeName(heading) !== normalizeName(scenario.recordName)) {
    const body = normalizeText(await page.locator('body').textContent());
    if (!body.includes(scenario.recordName)) {
      return `missing record heading for ${scenario.recordName}; found ${heading || 'none'}`;
    }
  }

  const tabText = await getActiveTab(page);
  if (normalizeName(tabText) !== normalizeName(scenario.tab)) {
    return `active tab mismatch: expected ${scenario.tab} but found ${tabText || 'none'}`;
  }

  return null;
}

function summarizeMarkdownRows(rows: readonly string[]) {
  const counts = { total: 0, ok: 0, mismatches: 0, notFound: 0 };

  for (const row of rows) {
    if (!row.startsWith('| ') || row.startsWith('| element |') || row.startsWith('| --- |')) continue;
    const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 5) continue;
    const [, , , , status] = cells;
    if (!status || status === '---') continue;
    counts.total += 1;
    if (status === 'OK') counts.ok += 1;
    else if (status === 'MISMATCH') counts.mismatches += 1;
    else if (status === 'NOT FOUND') counts.notFound += 1;
  }

  return counts;
}

function formatCell(value: string | null | undefined): string {
  if (value === undefined || value === null) return 'NOT FOUND';
  return value;
}

async function main() {
  const rows: string[] = ['| element | property | prototype | port | status |', '| --- | --- | --- | --- | --- |'];
  const issues: DetailIssue[] = [];
  const brokenByElement = new Map<string, DetailIssue[]>();
  const failedScenarios: Array<{ name: string; reason: string }> = [];
  const scenarioResults: Array<{ name: string; verified: boolean; reason?: string }> = [];

  let previewPid: number | undefined;
  let prototypeBrowser: Browser | null = null;
  let portBrowser: Browser | null = null;

  try {
    previewPid = await ensureFreshPreview();
    prototypeBrowser = await launchFreshBrowser();
    portBrowser = await launchFreshBrowser();

    const prototypePage = await prototypeBrowser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const portPage = await portBrowser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

    for (const scenario of SCENARIOS) {
      await openPrototypeRecord(prototypePage, scenario);
      await openPortRecord(portPage, scenario);
      await activateTab(prototypePage, scenario.tab);
      await activateTab(portPage, scenario.tab);

      const prototypeFailure = await verifyScenario(prototypePage, scenario);
      const portFailure = await verifyScenario(portPage, scenario);

      if (prototypeFailure || portFailure) {
        const reason = prototypeFailure ?? portFailure ?? 'page verification failed';
        console.log(`SCENARIO FAILED: ${scenario.name}: ${reason}`);
        failedScenarios.push({ name: scenario.name, reason });
        scenarioResults.push({ name: scenario.name, verified: false, reason });

        for (const element of scenario.elements) {
          const prototypeMatch = await findFirstMatch(prototypePage, element.selectors);
          const portMatch = await findFirstMatch(portPage, element.selectors);
          for (const property of properties) {
            rows.push(`| ${element.name} | ${property} | NOT FOUND | NOT FOUND | NOT FOUND |`);
            const issue: DetailIssue = {
              element: element.name,
              property,
              prototype: 'NOT FOUND',
              port: 'NOT FOUND',
              status: 'NOT FOUND',
              prototypeMatch,
              portMatch,
            };
            issues.push(issue);
            const bucket = brokenByElement.get(element.name) ?? [];
            bucket.push(issue);
            brokenByElement.set(element.name, bucket);
          }
        }
        continue;
      }

      scenarioResults.push({ name: scenario.name, verified: true });

      for (const element of scenario.elements) {
        const prototypeMatch = await findFirstMatch(prototypePage, element.selectors);
        const portMatch = await findFirstMatch(portPage, element.selectors);
        const prototypeStyle = prototypeMatch ? await getElementCSS(prototypePage, element.selectors) : 'NOT FOUND';
        const portStyle = portMatch ? await getElementCSS(portPage, element.selectors) : 'NOT FOUND';
        const prototypeValues = typeof prototypeStyle === 'string' ? null : prototypeStyle;
        const portValues = typeof portStyle === 'string' ? null : portStyle;

        for (const property of properties) {
          const prototypeValue = prototypeValues ? prototypeValues[property] ?? 'NOT FOUND' : prototypeStyle;
          const portValue = portValues ? portValues[property] ?? 'NOT FOUND' : portStyle;
          const status = statusForComparison(property, String(prototypeValue), String(portValue));
          rows.push(`| ${element.name} | ${property} | ${formatCell(String(prototypeValue))} | ${formatCell(String(portValue))} | ${status} |`);

          if (status === 'MISMATCH' || status === 'NOT FOUND') {
            const issue: DetailIssue = {
              element: element.name,
              property,
              prototype: String(prototypeValue),
              port: String(portValue),
              status,
              prototypeMatch,
              portMatch,
            };
            issues.push(issue);
            const bucket = brokenByElement.get(element.name) ?? [];
            bucket.push(issue);
            brokenByElement.set(element.name, bucket);
          }
        }
      }
    }

    const summary = summarizeMarkdownRows(rows);
    const elementSummary = `Elements: ${MANIFEST.length}, measured: ${summary.total}, not found: ${summary.notFound}`;
    const scenarioSummary = `Scenarios: ${SCENARIOS.length}, verified: ${scenarioResults.filter((result) => result.verified).length}`;
    const counts = `Counts: OK=${summary.ok} | MISMATCH=${summary.mismatches} | NOT FOUND=${summary.notFound} | TOTAL=${summary.total}`;
    const manifestCoverage = `Manifest elements: ${MANIFEST.length}, measured: ${summary.total}, not found: ${summary.notFound}`;

    const output: string[] = [
      scenarioSummary,
      elementSummary,
      counts,
      '',
      ...rows,
      '',
      '## SCENARIO FAILED',
      ...failedScenarios.flatMap((entry) => [`SCENARIO FAILED: ${entry.name}: ${entry.reason}`]),
      '',
      '## MISMATCH / NOT FOUND rows',
    ];

    for (const [element, entries] of brokenByElement.entries()) {
      const relevant = entries.filter((entry) => entry.status === 'MISMATCH' || entry.status === 'NOT FOUND');
      if (!relevant.length) continue;
      output.push(`### ${element}`);
      for (const entry of relevant) {
        output.push(`- ${entry.property}: ${entry.status}`);
        output.push(`  prototype text=${entry.prototypeMatch?.text ?? 'null'} outerHTML=${(entry.prototypeMatch?.outerHtml ?? '').replace(/\s+/g, ' ')}`);
        output.push(`  port text=${entry.portMatch?.text ?? 'null'} outerHTML=${(entry.portMatch?.outerHtml ?? '').replace(/\s+/g, ' ')}`);
      }
    }

    await writeFile(summaryPath, `${output.join('\n')}\n`);
    await writeFile(reportPath, JSON.stringify({ scenarioSummary, elementSummary, counts, manifestCoverage, issues }, null, 2));

    console.log(scenarioSummary);
    console.log(elementSummary);
    console.log(manifestCoverage);
    console.log(counts);
    for (const failed of failedScenarios) {
      console.log(`SCENARIO FAILED: ${failed.name}: ${failed.reason}`);
    }
    for (const [element, entries] of brokenByElement.entries()) {
      const relevant = entries.filter((entry) => entry.status === 'MISMATCH' || entry.status === 'NOT FOUND');
      if (!relevant.length) continue;
      console.log(`## ${element}`);
      for (const entry of relevant) {
        console.log(`- ${entry.property}: ${entry.status}`);
        console.log(`  prototype text=${entry.prototypeMatch?.text ?? 'null'} outerHTML=${(entry.prototypeMatch?.outerHtml ?? '').replace(/\s+/g, ' ')}`);
        console.log(`  port text=${entry.portMatch?.text ?? 'null'} outerHTML=${(entry.portMatch?.outerHtml ?? '').replace(/\s+/g, ' ')}`);
      }
    }
  } finally {
    await prototypeBrowser?.close().catch(() => undefined);
    await portBrowser?.close().catch(() => undefined);
    if (previewPid) stopProcessGroup(previewPid);
  }
}

void main();
