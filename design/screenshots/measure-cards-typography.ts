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

type ManifestEntry = {
  name: string;
  prototypeSelectors: readonly string[];
  portSelectors: readonly string[];
  mode?: 'device' | 'account';
};

type MatchInfo = {
  tagName: string | null;
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

const manifest: ManifestEntry[] = [
  { name: 'Device details heading', mode: 'device', prototypeSelectors: ['h2:has-text("Device details")'], portSelectors: ['[class*="detailCardTitle"]:text-is("Device details")', '[class*="detailCard"] h3:text-is("Device details")'] },
  { name: 'Type dt', mode: 'device', prototypeSelectors: ['dl.kv dt:has-text("Type")'], portSelectors: ['dl dt:text-is("Type")'] },
  { name: 'Type dd value', mode: 'device', prototypeSelectors: ['dl.kv dd:has-text("Laptop")', 'dl.kv dd:has-text("IoT/Printer")'], portSelectors: ['dl dd:text-is("Laptop")', 'dl dd:text-is("IoT/Printer")'] },
  { name: 'Current risk score heading', mode: 'device', prototypeSelectors: ['h2:has-text("Current risk score")'], portSelectors: ['[class*="detailCardTitle"]:text-is("Current risk score")'] },
  { name: 'Current risk score pill', mode: 'device', prototypeSelectors: ['span.score.p-bad', 'span.score.p-warn', 'span.score.p-ok'], portSelectors: ['[data-testid="risk-pill"]', '[class*="pill"] span[aria-label$="Blocked"]', '[class*="pill"] span[aria-label$="Alert"]', '[class*="pill"] span[aria-label$="Access"]'] },
  { name: 'Exposure gaps heading', mode: 'device', prototypeSelectors: ['h2:has-text("Exposure gaps")'], portSelectors: ['[data-testid="source-coverage-card"] h3:visible:text-is("Exposure gaps")', '[class*="detailCard"] h3:visible:text-is("Exposure gaps")'] },
  { name: 'Source name', mode: 'device', prototypeSelectors: ['dt:has-text("CrowdStrike")', 'dt:has-text("Portnox AgentP")'], portSelectors: ['[data-testid="source-coverage-source"]:text-is("CrowdStrike")', '[data-testid="source-coverage-source"]:text-is("Portnox AgentP")'] },
  { name: 'Source status pill', mode: 'device', prototypeSelectors: ['dd .pill:has-text("Reporting")', 'dd .pill:has-text("Not present")'], portSelectors: ['[data-testid="source-coverage-pill"]'] },
  { name: 'Muted time next to the pill', mode: 'device', prototypeSelectors: ['dd span[style*="color:var(--mute)"]'], portSelectors: ['[data-testid="source-coverage-time"]'] },
  { name: '+N Reporting link', mode: 'device', prototypeSelectors: ['button.lk:has-text("+")', 'button.lk:has-text("+1")'], portSelectors: ['[data-testid="source-coverage-toggle"]:text-is("See details")', '[data-testid="source-coverage-toggle"]:text-is("Show details")'] },
  { name: 'Account assignment heading', mode: 'device', prototypeSelectors: ['h2:has-text("Account assignment")'], portSelectors: ['[class*="detailCardTitle"]:text-is("Account assignment")'] },
  { name: 'Account assignment dt', mode: 'device', prototypeSelectors: ['dl.kv dt:has-text("Account")'], portSelectors: ['dl dt:text-is("Account")'] },
  { name: 'Account assignment dd', mode: 'device', prototypeSelectors: ['dl.kv dd:has-text("@acme.com")'], portSelectors: ['[class*="detailKv"] dd:has-text("@acme.com")'] },
  { name: 'Account link', mode: 'device', prototypeSelectors: ['button.lk[data-open*="account"]', 'button.lk:has-text("@acme.com")'], portSelectors: ['button[class*="detailLink"]:visible'] },
  { name: 'Not available text', mode: 'device', prototypeSelectors: ['p.sub:has-text("Not available. This device is not covered by Portnox AgentP")'], portSelectors: ['p:visible:text-is("Not available. This device is not covered by Portnox AgentP")'] },
  { name: 'Uncovered em dash value', mode: 'device', prototypeSelectors: ['dd:has-text("—")'], portSelectors: ['dd:visible:text-is("—")'] },
  { name: 'All sources reporting text', mode: 'account', prototypeSelectors: ['div:has-text("All sources reporting")'], portSelectors: ['[class*="detailOverviewSummary"] span:visible:text-is("All sources agree")'] },
  { name: 'See details link', mode: 'account', prototypeSelectors: ['button.lk:has-text("See details")'], portSelectors: ['button:visible:text-is("See details")'] },
  { name: 'Active tab', mode: 'account', prototypeSelectors: ['button.tabs button.on'], portSelectors: ['[class*="detailTabActive"]'] },
  { name: 'Inactive tab', mode: 'account', prototypeSelectors: ['button.tabs button:not(.on)'], portSelectors: ['button[class*="detailTab"]:not([class*="detailTabActive"])'] },
  { name: 'Overview warning icon', mode: 'account', prototypeSelectors: ['svg[aria-label="Sources disagree"]'], portSelectors: ['[aria-hidden="true"][class*="detailWarnIcon"]'] },
  { name: 'Last seen by sources line', mode: 'device', prototypeSelectors: ['div:has-text("Last seen by sources")'], portSelectors: ['[class*="detailOverviewLead"]:has-text("Last seen by sources")'] },
  { name: 'Overview status pill', mode: 'account', prototypeSelectors: ['span.pill.p-ok', 'span.pill.p-warn'], portSelectors: ['[class*="detailOverviewSummary"] span:visible', '[class*="detailPillOk"]', '[class*="detailPillWarn"]'] },
  { name: 'Field header', mode: 'account', prototypeSelectors: ['div.kr.kh > span:has-text("Field")'], portSelectors: ['[class*="detailAgreementHeader"] span:text-is("Field")'] },
  { name: 'Value header', mode: 'account', prototypeSelectors: ['div.kr.kh > span:has-text("Value")'], portSelectors: ['[class*="detailAgreementHeader"] span:text-is("Value")'] },
  { name: 'Sources header', mode: 'account', prototypeSelectors: ['div.kr.kh > span:has-text("Sources")'], portSelectors: ['[class*="detailAgreementHeader"] span:text-is("Sources")'] },
  { name: 'Overview row label', mode: 'account', prototypeSelectors: ['div.kr.s3 > span:has-text("Account name")', 'div.kr.s3 > span:has-text("Group")'], portSelectors: ['[class*="detailAgreementField"]:text-is("Account name")', '[class*="detailAgreementField"]:text-is("Group")'] },
  { name: 'Overview row value', mode: 'account', prototypeSelectors: ['div.kr.s3 > div:has-text("avery")', 'div.kr.s3 > div:has-text("Legal")'], portSelectors: ['[class*="detailAgreementValue"]:visible'] },
  { name: 'Agree pill', mode: 'account', prototypeSelectors: ['span.pill.p-ok:has-text("Agree")'], portSelectors: ['[class*="detailOverviewSummary"] span:visible:text-is("All sources agree")'] },
  { name: 'N sources text', mode: 'account', prototypeSelectors: ['span:has-text("source")'], portSelectors: ['[class*="detailAgreementSources"]:has-text("source")'] },
  { name: 'Conflict pill', mode: 'account', prototypeSelectors: ['span.pill.p-warn:has-text("Conflict")'], portSelectors: ['[class*="detailPillWarn"]:text-is("Conflict")'] },
  { name: 'Group text', mode: 'account', prototypeSelectors: ['div:has-text("Google Workspace")', 'div:has-text("EntraID")'], portSelectors: ['[class*="detailAgreementSources"]:has-text("Google Workspace")', '[class*="detailAgreementSources"]:has-text("EntraID")'] },
  { name: 'View raw values', mode: 'account', prototypeSelectors: ['button.lk:has-text("View raw values")'], portSelectors: ['button:visible:text-is("View raw values")'] },
  { name: 'Expanded raw line', mode: 'account', prototypeSelectors: ['div.rrin .dif', '.rrin .dif'], portSelectors: ['[class*="detailRawValueDiff"]'] },
  { name: 'Highlighted raw line', mode: 'account', prototypeSelectors: ['div.rrin.raw .dif'], portSelectors: ['[class*="detailRawValueDiff"]'] },
  { name: 'Find a source input', mode: 'account', prototypeSelectors: ['input[placeholder="Find a source"]', 'input[aria-label="Find a source"]'], portSelectors: ['input[aria-label="Find a source"]', 'input[placeholder="Find a source"]'] },
  { name: 'Exposure coverage Source header', mode: 'device', prototypeSelectors: ['div.kr.s3.kh > span:has-text("Source")'], portSelectors: ['[class*="detailAgreementHeader"] span:text-is("Source")', '[class*="sourceCoverage"] th:text-is("Source")'] },
  { name: 'Exposure coverage Status header', mode: 'device', prototypeSelectors: ['div.kr.s3.kh > span:has-text("Status")'], portSelectors: ['[class*="sourceCoverage"] th:text-is("Status")', '[class*="detailAgreementHeader"] span:text-is("Status")'] },
  { name: 'Exposure coverage Last seen header', mode: 'device', prototypeSelectors: ['div.kr.s3.kh > span:has-text("Last seen")'], portSelectors: ['[class*="sourceCoverage"] th:text-is("Last seen")'] },
  { name: 'Source coverage source name', mode: 'device', prototypeSelectors: ['div.kr.s3 > span:has-text("Portnox AgentP")', 'div.kr.s3 > span:has-text("CrowdStrike")'], portSelectors: ['[data-testid="source-coverage-source"]'] },
  { name: 'Source coverage status pill', mode: 'device', prototypeSelectors: ['div.kr.s3 .pill'], portSelectors: ['[data-testid="source-coverage-pill"]'] },
  { name: 'Source coverage last seen value', mode: 'device', prototypeSelectors: ['div.kr.s3 > div.sc'], portSelectors: ['[data-testid="source-coverage-time"]'] },
  { name: 'No sources match message', mode: 'account', prototypeSelectors: ['p.sub:has-text("No sources match")'], portSelectors: ['p:visible:text-is("No sources match")'] },
  { name: 'Account details heading', mode: 'account', prototypeSelectors: ['h2:has-text("Account details")'], portSelectors: ['[class*="detailCardTitle"]:text-is("Account details")'] },
  { name: 'Account details dt', mode: 'account', prototypeSelectors: ['dl.kv dt:has-text("Type")'], portSelectors: ['dl dt:text-is("Type")'] },
  { name: 'Account details dd', mode: 'account', prototypeSelectors: ['dl.kv dd:has-text("LDAP")', 'dl.kv dd:has-text("MAC")'], portSelectors: ['dl dd:text-is("LDAP")', 'dl dd:text-is("MAC")'] },
  { name: 'Associated devices item name', mode: 'account', prototypeSelectors: ['div:has-text("IOT-1049")', 'div:has-text("SRV-1028")'], portSelectors: ['button[class*="detailLink"]:visible'] },
  { name: 'Associated device link', mode: 'account', prototypeSelectors: ['button.lk:has-text("IOT-1049")', 'button.lk:has-text("SRV-1028")'], portSelectors: ['button[class*="detailLink"]:visible'] },
  { name: 'Associated device risk pill', mode: 'account', prototypeSelectors: ['span.score.p-bad', 'span.score.p-warn', 'span.score.p-ok'], portSelectors: ['[data-testid="risk-pill"]'] },
  { name: 'Last login by sources line', mode: 'account', prototypeSelectors: ['div:has-text("Last login by sources")'], portSelectors: ['[class*="detailOverviewLead"]:has-text("Last login by sources")'] },
  { name: 'Account overview row label', mode: 'account', prototypeSelectors: ['div.kr.s3 > span:has-text("Account name")'], portSelectors: ['[class*="detailAgreementField"]:text-is("Account name")'] },
  { name: 'Account overview row value', mode: 'account', prototypeSelectors: ['div.kr.s3 > div:has-text("@acme.com")'], portSelectors: ['[class*="detailAgreementValue"]:visible'] },
  { name: 'Total MAC addresses', mode: 'account', prototypeSelectors: ['div.kr.s3 > span:has-text("Total MAC addresses")'], portSelectors: ['[class*="detailAgreementField"]:text-is("Total MAC addresses")'] },
] as const;

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

function toNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function formatCell(value: string | null | undefined): string {
  if (value === undefined || value === null) return 'NOT FOUND';
  return value;
}

async function resolveMatch(page: Page, selectors: readonly string[]): Promise<MatchInfo | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (!(await locator.count())) continue;
    const tagName = await locator.evaluate((node) => node.tagName).catch(() => null);
    const outerHtml = await locator.evaluate((node) => node.outerHTML.slice(0, 160)).catch(() => '');
    return { tagName, outerHtml };
  }
  return null;
}

async function selectorDebugInfo(page: Page, selector: string): Promise<{ count: number; firstVisible: boolean }> {
  const locator = page.locator(selector);
  const count = await locator.count();
  const firstVisible = count > 0 ? await locator.first().isVisible().catch(() => false) : false;
  return { count, firstVisible };
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

async function navigatePrototypeToDevice(page: Page, query: string): Promise<void> {
  await page.goto(prototypeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.locator('button:has-text("Assets")').first().click({ timeout: 2000 }).catch(() => undefined);
  await page.locator('button:has-text("Devices")').first().click({ timeout: 2000 }).catch(() => undefined);
  const row = page.locator('tbody tr').filter({ hasText: query }).first();
  if (!(await row.count())) return;
  await row.click({ timeout: 2000 }).catch(() => undefined);
  await page.waitForTimeout(300);
}

async function navigatePortToDevice(page: Page, query: string): Promise<void> {
  await page.goto(portUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const row = page.locator('tbody tr').filter({ hasText: query }).first();
  if (await row.count()) {
    await row.click({ timeout: 2000 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

async function navigatePrototypeToAccount(page: Page): Promise<void> {
  await page.goto(prototypeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.locator('button:has-text("Accounts")').first().click({ timeout: 2000 }).catch(() => undefined);
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    const text = (await row.textContent()) ?? '';
    if (text.includes('LDAP') || text.includes('MAC')) {
      await row.click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(300);
      return;
    }
  }
}

async function navigatePortToAccount(page: Page): Promise<void> {
  await page.goto(portUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByRole('button', { name: 'Accounts' }).first().click({ timeout: 2000 });
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    const text = (await row.textContent()) ?? '';
    if (text.includes('LDAP') || text.includes('MAC')) {
      await row.click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(300);
      return;
    }
  }
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

async function collectRows(page: Page, entry: ManifestEntry): Promise<{ style: Record<string, string> | 'NOT FOUND'; match: MatchInfo | null }> {
  const style = await getElementCSS(page, entry.portSelectors);
  const match = await resolveMatch(page, entry.portSelectors);
  return { style, match };
}

async function main() {
  const rows: string[] = ['| element | property | prototype | port | status |', '| --- | --- | --- | --- | --- |'];
  const issues: DetailIssue[] = [];
  const seen = new Set<string>();

  let previewPid: number | undefined;
  let prototypeBrowser: Browser | null = null;
  let portBrowser: Browser | null = null;

  try {
    previewPid = await ensureFreshPreview();
    prototypeBrowser = await launchFreshBrowser();
    portBrowser = await launchFreshBrowser();

    const prototypePage = await prototypeBrowser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const portPage = await portBrowser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

    for (const entry of manifest) {
      const isAccountEntry = entry.mode === 'account';
      const isDeviceEntry = entry.mode === 'device';

      if (isAccountEntry) {
        await navigatePrototypeToAccount(prototypePage);
        await navigatePortToAccount(portPage);
      } else if (isDeviceEntry) {
        await navigatePrototypeToDevice(prototypePage, 'IOT-1049');
        await navigatePortToDevice(portPage, 'IOT-1049');
      }

      const prototypeMatch = await resolveMatch(prototypePage, entry.prototypeSelectors);
      const portMatch = await resolveMatch(portPage, entry.portSelectors);
      if (!prototypeMatch && !portMatch) {
        if (!seen.has(entry.name)) seen.add(entry.name);
      }

      const prototypeStyle = prototypeMatch ? await getElementCSS(prototypePage, entry.prototypeSelectors) : 'NOT FOUND';
      const portStyle = portMatch ? await getElementCSS(portPage, entry.portSelectors) : 'NOT FOUND';
      const prototypeValues = typeof prototypeStyle === 'string' ? null : prototypeStyle;
      const portValues = typeof portStyle === 'string' ? null : portStyle;

      for (const property of properties) {
        const prototypeValue = prototypeValues ? prototypeValues[property] ?? 'NOT FOUND' : prototypeStyle;
        const portValue = portValues ? portValues[property] ?? 'NOT FOUND' : portStyle;
        const status = statusForComparison(property, String(prototypeValue), String(portValue));
        rows.push(`| ${entry.name} | ${property} | ${formatCell(String(prototypeValue))} | ${formatCell(String(portValue))} | ${status} |`);

        if (status === 'MISMATCH' || status === 'NOT FOUND') {
          issues.push({
            element: entry.name,
            property,
            prototype: String(prototypeValue),
            port: String(portValue),
            status,
            prototypeMatch,
            portMatch,
          });
        }
      }
    }

    const summary = summarizeMarkdownRows(rows);
    const header = `Counts: OK=${summary.ok} | MISMATCH=${summary.mismatches} | NOT FOUND=${summary.notFound} | TOTAL=${summary.total}`;
    const manifestCoverage = `Manifest elements: ${manifest.length}, measured: ${manifest.length}, not found: ${issues.filter((issue) => issue.status === 'NOT FOUND').length}`;

    const grouped = new Map<string, DetailIssue[]>();
    for (const issue of issues) {
      const bucket = grouped.get(issue.element) ?? [];
      bucket.push(issue);
      grouped.set(issue.element, bucket);
    }

    const reportBody = [
      manifestCoverage,
      header,
      '',
      ...rows,
      '',
      '## MISMATCH / NOT FOUND rows',
      ...[...grouped.entries()].flatMap(([element, entries]) => {
        const out: string[] = [`### ${element}`];
        for (const issue of entries) {
          out.push(`- ${issue.property}: ${issue.status}`);
          out.push(`  - prototype tag=${issue.prototypeMatch?.tagName ?? 'null'} outerHTML=${(issue.prototypeMatch?.outerHtml ?? '').replace(/\s+/g, ' ')}`);
          out.push(`  - port tag=${issue.portMatch?.tagName ?? 'null'} outerHTML=${(issue.portMatch?.outerHtml ?? '').replace(/\s+/g, ' ')}`);
        }
        return out;
      }),
    ];

    await writeFile(summaryPath, `${reportBody.join('\n')}\n`);
    await writeFile(reportPath, JSON.stringify({ manifestCoverage, summary, issues }, null, 2));

    console.log(manifestCoverage);
    console.log(header);
    for (const [element, entries] of grouped.entries()) {
      console.log(`## ${element}`);
      for (const issue of entries) {
        console.log(`- ${issue.property}: ${issue.status}`);
        console.log(`  prototype tag=${issue.prototypeMatch?.tagName ?? 'null'} outerHTML=${(issue.prototypeMatch?.outerHtml ?? '').replace(/\s+/g, ' ')}`);
        console.log(`  port tag=${issue.portMatch?.tagName ?? 'null'} outerHTML=${(issue.portMatch?.outerHtml ?? '').replace(/\s+/g, ' ')}`);
      }
    }
  } finally {
    await prototypeBrowser?.close().catch(() => undefined);
    await portBrowser?.close().catch(() => undefined);
    if (previewPid) {
      stopProcessGroup(previewPid);
    }
  }
}

void main();
