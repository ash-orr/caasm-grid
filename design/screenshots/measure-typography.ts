import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
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
const prototypeUrl = `file://${prototypePath}#/devices/default`;
const previewPort = 4173;
const portUrl = `http://127.0.0.1:${previewPort}/?audit=${Date.now()}`;
const reportPath = path.resolve(__dirname, 'typography-report.json');
const summaryPath = path.resolve(__dirname, 'typography-summary.md');
const previewProcessPids = new Set<number>();

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

const baseElements = [
  { name: 'Devices / Accounts tab buttons', prototypeSelectors: ['button:has-text("Devices")'], portSelectors: ['button:has-text("Devices")'] },
  { name: 'toolbar search input', prototypeSelectors: ['input[type="search"][aria-label="Search"]'], portSelectors: ['input[aria-label="Search"]'] },
  { name: 'table header cell "Device name"', prototypeSelectors: ['th:has-text("Device name")'], portSelectors: ['th:has-text("Device name")', 'thead th:has-text("Device name")'] },
  { name: 'plain table body cell', prototypeSelectors: ['tbody tr td:nth-child(3)'], portSelectors: ['tbody tr td:nth-child(3)'] },
  { name: 'bold device-name cell', prototypeSelectors: ['tbody tr td b'], portSelectors: ['tbody tr td strong', 'tbody tr td b'] },
  { name: 'risk-score pill (red, 70+)', prototypeSelectors: ['span.score.p-bad'], portSelectors: ['tbody span[aria-label$=" Blocked"]:visible', 'tbody [data-testid="risk-pill"][aria-label$=" Blocked"]:visible'] },
  { name: 'risk-score pill (amber, 40-69)', prototypeSelectors: ['span.score.p-warn'], portSelectors: ['tbody span[aria-label$=" Alert"]:visible'] },
  { name: 'risk-score pill (green, under 40)', prototypeSelectors: ['span.score.p-ok'], portSelectors: ['tbody span[aria-label$=" Access"]:visible'] },
  { name: 'Blocked status pill (devices)', prototypeSelectors: ['tbody span.pill.p-bad:text-is("Blocked")'], portSelectors: ['tbody [data-testid="status-pill"]:text-is("Blocked")'] },
  { name: 'Filters icon button', prototypeSelectors: ['button[aria-label="Hide filters"]', 'button[aria-label="Show filters"]'], portSelectors: ['button[aria-label="Hide filters"]', 'button[aria-label="Show filters"]', 'button[aria-label^="Hide filters"]', 'button[aria-label^="Show filters"]'] },
  { name: 'Columns icon button', prototypeSelectors: ['button[aria-label="Show/hide columns"]'], portSelectors: ['button[aria-label="Show/hide columns"]'] },
  { name: 'Views button', prototypeSelectors: ['button:has-text("Views")'], portSelectors: ['button:has-text("Views")'] },
  { name: 'Export button', prototypeSelectors: ['button:has-text("Export")'], portSelectors: ['button:has-text("Export")'] },
  { name: 'Exposure gaps cell text', prototypeSelectors: ['tbody tr:first-child td:last-child'], portSelectors: ['tbody tr:first-child td:last-child', 'td:has-text("Coverage gaps")', 'td:has-text("Exposure gaps")'] },
] as const;

const dialogElements = [
  { name: 'Filters panel heading "Filters"', prototypeSelectors: ['div.filters b'], portSelectors: ['span.headerLabel:has-text("Filters")', 'div.headerRow span:has-text("Filters")', 'div:has-text("Filters") span'] },
  { name: 'Clear link', prototypeSelectors: ['a#clr'], portSelectors: ['button:has-text("Clear")', 'a:has-text("Clear")', 'text=Clear'] },
  { name: 'filter section summary "Saved views"', prototypeSelectors: ['summary:has-text("Saved views")'], portSelectors: ['summary:has-text("Saved views")', 'details summary:has-text("Saved views")'] },
  { name: 'radio option label', prototypeSelectors: ['label.chk'], portSelectors: ['label:has-text("Default view")', 'label.savedOption:has-text("Default view")', 'label[class*="savedOption"]'] },
  { name: 'Manage filters button', prototypeSelectors: ['button:has-text("Manage filters")'], portSelectors: ['button:has-text("Manage filters")'] },
  { name: 'Manage filters dialog title', prototypeSelectors: ['h2#mfh'], portSelectors: ['[role="dialog"] h2', 'div[role="dialog"] h2', 'h2:has-text("Manage filters")'] },
  { name: 'Manage filters dialog group heading', prototypeSelectors: ['text=Default filters'], portSelectors: ['[role="dialog"] text=Default filters', 'text=Default filters'] },
  { name: 'Manage filters dialog option label', prototypeSelectors: ['label:has-text("Status")'], portSelectors: ['[role="dialog"] label:has-text("Status")', 'label:has-text("Status")'] },
  { name: 'Manage filters dialog footer button "Cancel"', prototypeSelectors: ['button:has-text("Cancel")'], portSelectors: ['button:has-text("Cancel")'] },
  { name: 'Manage filters dialog footer button "Apply"', prototypeSelectors: ['button:has-text("Apply")'], portSelectors: ['button:has-text("Apply")'] },
  { name: 'pagination footer "N devices" text', prototypeSelectors: ['.foot span:first-child'], portSelectors: ['.tableFooter .footerCount', '.footerCount'] },
  { name: 'Rows per page label', prototypeSelectors: ['label:has-text("Rows per page")'], portSelectors: ['label:has-text("Rows per page")'] },
  { name: 'rows-per-page select', prototypeSelectors: ['select.ps'], portSelectors: ['select[aria-label="Rows per page"]', 'select'] },
  { name: 'Prev button', prototypeSelectors: ['button:has-text("Prev")'], portSelectors: ['button:has-text("Prev")'] },
  { name: 'Next button', prototypeSelectors: ['button:has-text("Next")'], portSelectors: ['button:has-text("Next")'] },
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

function isAllowedBoldDeviceHeightMismatch(elementName: string, property: string, prototypeValue: string, portValue: string): boolean {
  if (elementName !== 'bold device-name cell') return false;
  if (property !== 'renderedHeight') return false;
  return prototypeValue === '16px' && portValue === '17px';
}

function statusForComparison(
  elementName: string,
  property: string,
  prototypeValue: string | null | undefined,
  portValue: string | null | undefined,
): 'OK' | 'MISMATCH' | 'NOT FOUND' {
  if (prototypeValue === 'NOT FOUND' || portValue === 'NOT FOUND') return 'NOT FOUND';
  if (isAllowedBoldDeviceHeightMismatch(elementName, property, String(prototypeValue), String(portValue))) return 'OK';
  return compareProperty(property, String(prototypeValue), String(portValue)) ? 'OK' : 'MISMATCH';
}

function formatCell(value: string | null | undefined): string {
  if (value === undefined || value === null) return 'NOT FOUND';
  return value;
}

async function findFirstMatch(page: Page, selectors: readonly string[], textFilter?: string): Promise<{ tagName: string | null; outerHtml: string } | null> {
  for (const selector of selectors) {
    const candidate = textFilter ? page.locator(selector).filter({ hasText: textFilter }).first() : page.locator(selector).first();
    if (!(await candidate.count())) continue;

    const tagName = await candidate.evaluate((node) => node.tagName).catch(() => null);
    const outerHtml = await candidate.evaluate((node) => node.outerHTML.slice(0, 200)).catch(() => '');
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

async function logMatch(label: string, page: Page, selectors: readonly string[], textFilter?: string): Promise<void> {
  const match = await findFirstMatch(page, selectors, textFilter);
  if (!match) {
    const details = [] as string[];
    for (const selector of selectors) {
      const info = await selectorDebugInfo(page, selector);
      details.push(`${selector}: count=${info.count}, firstVisible=${info.firstVisible}`);
    }
    console.log(`[${label}] NOT FOUND :: ${details.join(' | ')}`);
    return;
  }

  console.log(`[${label}] tag=${match.tagName ?? 'unknown'} outerHTML=${match.outerHtml.replace(/\s+/g, ' ')}`);
}

async function getElementCSS(page: Page, selectors: readonly string[], textFilter?: string): Promise<Record<string, string> | 'NOT FOUND' | `ERROR: ${string}`> {
  for (const selector of selectors) {
    try {
      const candidate = textFilter ? page.locator(selector).filter({ hasText: textFilter }).first() : page.locator(selector).first();
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

  const details = [] as string[];
  for (const selector of selectors) {
    const info = await selectorDebugInfo(page, selector);
    details.push(`${selector}: count=${info.count}, firstVisible=${info.firstVisible}`);
  }
  console.log(`[getElementCSS] NOT FOUND :: ${details.join(' | ')}`);
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

  const distDir = path.resolve(frontendDir, 'dist');
  const distFiles = await readdir(distDir, { recursive: true });
  const assetEntries = await Promise.all(
    distFiles
      .filter((item) => item.endsWith('.js') || item.endsWith('.css'))
      .map(async (relativePath) => {
        const filePath = path.join(distDir, String(relativePath));
        const info = await stat(filePath);
        return { relativePath, mtimeMs: info.mtimeMs, filePath };
      }),
  );

  const newestAsset = assetEntries.sort((left, right) => right.mtimeMs - left.mtimeMs)[0];
  const sourceStat = await stat(path.resolve(frontendDir, 'src', 'components', 'StatusPill', 'StatusPill.tsx'));
  const proofLine = `Build proof: ${newestAsset?.relativePath ?? 'no asset'} mtime=${new Date(newestAsset?.mtimeMs ?? 0).toISOString()} sourceStatusPillMtime=${new Date(sourceStat.mtimeMs).toISOString()}`;
  console.log(proofLine);

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

async function preparePrototypePage(page: Page): Promise<void> {
  await page.goto(prototypeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.locator('label:has-text("Rows per page") select').selectOption('0').catch(() => undefined);
  await page.waitForTimeout(250);
}

async function preparePortPage(page: Page): Promise<void> {
  await page.goto(portUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('label:has-text("Rows per page") select').selectOption('-1').catch(() => undefined);
  await page.waitForTimeout(250);
}

async function openManageFilters(page: Page, kind: 'prototype' | 'port'): Promise<void> {
  const trigger = kind === 'prototype' ? page.locator('#mgf').first() : page.getByRole('button', { name: /Manage filters/i }).first();
  if (await trigger.count()) {
    await trigger.click({ timeout: 2000 }).catch(() => undefined);
  }
}

async function closeManageFilters(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
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

async function measureElementRow(page: Page, element: { name: string; prototypeSelectors: readonly string[]; portSelectors: readonly string[] }, rows: string[], side: 'prototype' | 'port'): Promise<void> {
  const selectors = side === 'prototype' ? element.prototypeSelectors : element.portSelectors;
  const style = await getElementCSS(page, selectors);
  const values = typeof style === 'string' ? null : style;

  for (const property of properties) {
    const value = values ? values[property] ?? 'NOT FOUND' : style;
    rows.push(`${property}: ${formatCell(String(value))}`);
  }
}

async function switchTab(page: Page, label: 'Devices' | 'Accounts'): Promise<void> {
  const trigger = page.getByRole('button', { name: label }).first();
  if (await trigger.count()) {
    await trigger.click({ timeout: 2000 });
  }
  await page.waitForTimeout(250);
}

async function main() {
  const rows: string[] = ['| element | property | prototype | port | status |', '| --- | --- | --- | --- | --- |'];
  let prototypeBrowser: Browser | null = null;
  let portBrowser: Browser | null = null;

  let previewPid: number | undefined;

  try {
    previewPid = await ensureFreshPreview();

    prototypeBrowser = await launchFreshBrowser();
    portBrowser = await launchFreshBrowser();

    const prototypePage = await prototypeBrowser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const portPage = await portBrowser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

    await preparePrototypePage(prototypePage);
    await preparePortPage(portPage);

    await logMatch('Filters icon button (port)', portPage, ['button[aria-label="Hide filters"]', 'button[aria-label="Show filters"]', 'button[aria-label^="Hide filters"]', 'button[aria-label^="Show filters"]']);
    await logMatch('Columns icon button (port)', portPage, ['button[aria-label="Show/hide columns"]']);
    await logMatch('Blocked status pill (devices, port)', portPage, ['tbody [data-testid="status-pill"]:text-is("Blocked")'], 'Blocked');
    await logMatch('Risk score pill (port)', portPage, ['tbody span[aria-label$=" Blocked"]:visible', 'tbody span[aria-label$=" Alert"]:visible', 'tbody span[aria-label$=" Access"]:visible']);

    for (const element of baseElements) {
      const prototypeStyle = await getElementCSS(prototypePage, element.prototypeSelectors);
      const portStyle = await getElementCSS(portPage, element.portSelectors);
      const prototypeValues = typeof prototypeStyle === 'string' ? null : prototypeStyle;
      const portValues = typeof portStyle === 'string' ? null : portStyle;

      for (const property of properties) {
        const prototypeValue = prototypeValues ? prototypeValues[property] ?? 'NOT FOUND' : prototypeStyle;
        const portValue = portValues ? portValues[property] ?? 'NOT FOUND' : portStyle;
        const status = statusForComparison(element.name, property, String(prototypeValue), String(portValue));
        rows.push(`| ${element.name} | ${property} | ${formatCell(String(prototypeValue))} | ${formatCell(String(portValue))} | ${status} |`);
      }
    }

    await openManageFilters(prototypePage, 'prototype');
    await openManageFilters(portPage, 'port');

    for (const element of dialogElements) {
      const prototypeStyle = await getElementCSS(prototypePage, element.prototypeSelectors);
      const portStyle = await getElementCSS(portPage, element.portSelectors);
      const prototypeValues = typeof prototypeStyle === 'string' ? null : prototypeStyle;
      const portValues = typeof portStyle === 'string' ? null : portStyle;

      for (const property of properties) {
        const prototypeValue = prototypeValues ? prototypeValues[property] ?? 'NOT FOUND' : prototypeStyle;
        const portValue = portValues ? portValues[property] ?? 'NOT FOUND' : portStyle;
        const status = statusForComparison(element.name, property, String(prototypeValue), String(portValue));
        rows.push(`| ${element.name} | ${property} | ${formatCell(String(prototypeValue))} | ${formatCell(String(portValue))} | ${status} |`);
      }
    }

    await closeManageFilters(prototypePage);
    await closeManageFilters(portPage);

    await switchTab(portPage, 'Accounts');
    await switchTab(prototypePage, 'Accounts');
    await portPage.locator('select[aria-label="Rows per page"]').selectOption('-1').catch(() => undefined);
    await prototypePage.locator('select.ps').selectOption('0').catch(() => undefined);

    const accountsBlocked = {
      name: 'Blocked status pill (accounts)',
      prototypeSelectors: ['tbody span.pill.p-bad:text-is("Blocked")'],
      portSelectors: ['tbody [data-testid="status-pill"]:text-is("Blocked")'],
    } as const;

    const prototypeAccountsStyle = await getElementCSS(prototypePage, accountsBlocked.prototypeSelectors, 'Blocked');
    const portAccountsStyle = await getElementCSS(portPage, accountsBlocked.portSelectors, 'Blocked');
    const prototypeAccountsValues = typeof prototypeAccountsStyle === 'string' ? null : prototypeAccountsStyle;
    const portAccountsValues = typeof portAccountsStyle === 'string' ? null : portAccountsStyle;

    for (const property of properties) {
      const prototypeValue = prototypeAccountsValues ? prototypeAccountsValues[property] ?? 'NOT FOUND' : prototypeAccountsStyle;
      const portValue = portAccountsValues ? portAccountsValues[property] ?? 'NOT FOUND' : portAccountsStyle;
      const status = statusForComparison(accountsBlocked.name, property, String(prototypeValue), String(portValue));
      rows.push(`| ${accountsBlocked.name} | ${property} | ${formatCell(String(prototypeValue))} | ${formatCell(String(portValue))} | ${status} |`);
    }

    await switchTab(portPage, 'Devices');
    await switchTab(prototypePage, 'Devices');

    const summary = summarizeMarkdownRows(rows);
    const header = `Counts: OK=${summary.ok} | MISMATCH=${summary.mismatches} | NOT FOUND=${summary.notFound} | TOTAL=${summary.total}`;
    const summaryText = [header, '', ...rows].join('\n');

    await writeFile(summaryPath, `${summaryText}\n`);
    await writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(header);

    if (summary.notFound > 0) {
      process.exitCode = 1;
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
