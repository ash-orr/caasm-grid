import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const prototypePath = path.resolve(rootDir, 'design', 'prototype', 'caasm-console.html');
const prototypeUrl = `file://${prototypePath}#/devices/default`;
const portUrl = 'http://127.0.0.1:4173/';
const reportPath = path.resolve(__dirname, 'typography-report.json');
const summaryPath = path.resolve(__dirname, 'typography-summary.md');

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

const elements = [
  { name: 'Devices / Accounts tab buttons', prototypeSelectors: ['button:has-text("Devices")'], portSelectors: ['button:has-text("Devices")'] },
  { name: 'toolbar search input', prototypeSelectors: ['input[type="search"][aria-label="Search"]'], portSelectors: ['input[aria-label="Search"]'] },
  { name: 'table header cell "Device name"', prototypeSelectors: ['th:has-text("Device name")'], portSelectors: ['th:has-text("Device name")', 'thead th:has-text("Device name")'] },
  { name: 'plain table body cell', prototypeSelectors: ['tbody tr td:nth-child(3)'], portSelectors: ['tbody tr td:nth-child(3)'] },
  { name: 'bold device-name cell', prototypeSelectors: ['tbody tr td b'], portSelectors: ['tbody tr td strong', 'tbody tr td b'] },
  { name: 'Blocked status pill', prototypeSelectors: ['span.pill.p-bad:has-text("Blocked")'], portSelectors: ['label:has-text("Blocked")', 'span:has-text("Blocked")', 'span[class*="pill"]:has-text("Blocked")'] },
  { name: 'risk-score pill', prototypeSelectors: ['span.score'], portSelectors: ['span:has-text("70")', '[class*="riskBadge"]', 'span.score'] },
  { name: 'Exposure gaps cell text', prototypeSelectors: ['tbody tr:first-child td:last-child'], portSelectors: ['tbody tr:first-child td:last-child', 'td:has-text("Coverage gaps")', 'td:has-text("Exposure gaps")'] },
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

  const rgbMatch = trimmed.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const numbers = rgbMatch[1].split(',').map((part) => Number.parseFloat(part.trim()));
    if (numbers.length >= 3) {
      const [r, g, b] = numbers;
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

function propertyMatches(property: string, left: string | null | undefined, right: string | null | undefined): boolean {
  if (left === 'NOT FOUND' || right === 'NOT FOUND') return left === right;
  if (left === 'ERROR:' || right === 'ERROR:') return left === right;
  if (property === 'fontFamily') return normalizeFontFamily(left) === normalizeFontFamily(right);
  if (property.includes('Color')) return normalizeColor(left) === normalizeColor(right);
  if (['fontSize', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderRadius', 'renderedHeight'].includes(property)) {
    const leftNumber = toNumber(left);
    const rightNumber = toNumber(right);
    if (leftNumber !== null && rightNumber !== null) return Math.abs(leftNumber - rightNumber) <= 0.5;
    return left === right;
  }
  if (property === 'fontWeight') {
    const leftWeight = left?.replace(/[^0-9]/g, '') || left;
    const rightWeight = right?.replace(/[^0-9]/g, '') || right;
    if (leftWeight && rightWeight) return Math.abs(Number(leftWeight) - Number(rightWeight)) <= 1;
    return left === right;
  }
  return left === right;
}

function statusForComparison(
  elementName: string,
  property: string,
  prototypeValue: string | null | undefined,
  portValue: string | null | undefined,
): 'OK' | 'MISMATCH' | 'PROTOTYPE NOT FOUND' | 'PORT NOT FOUND' | 'BOTH NOT FOUND' | 'PENDING (table port)' {
  const pendingElements = new Set(['Blocked status pill', 'risk-score pill']);

  if (pendingElements.has(elementName) && (portValue === 'NOT FOUND' || portValue === 'ERROR:' || prototypeValue === 'NOT FOUND' || prototypeValue === 'ERROR:')) {
    return 'PENDING (table port)';
  }

  if (prototypeValue === 'NOT FOUND' && portValue === 'NOT FOUND') return 'BOTH NOT FOUND';
  if (prototypeValue === 'NOT FOUND') return 'PROTOTYPE NOT FOUND';
  if (portValue === 'NOT FOUND') return 'PORT NOT FOUND';
  return propertyMatches(property, String(prototypeValue), String(portValue)) ? 'OK' : 'MISMATCH';
}

function formatCell(value: string | null | undefined): string {
  if (value === undefined || value === null) return 'NOT FOUND';
  return value;
}

async function findNearestContainerHTML(page: Page, selectors: readonly string[]): Promise<string | null> {
  try {
    const html = await page.locator('body').evaluate((body, candidateSelectors) => {
      for (const selector of candidateSelectors) {
        const element = body.querySelector(selector);
        if (element) return element.outerHTML.slice(0, 400);
      }

      const fallbackRoots = Array.from(body.querySelectorAll('button, div, summary, label, th, td, span, input, select, h2'));
      const textHints = candidateSelectors.flatMap((selector) => selector.replace(/[^a-z0-9]/gi, ' ').split(/\s+/).filter(Boolean));
      const match = fallbackRoots.find((node) => {
        const text = (node.textContent ?? '').toLowerCase();
        return textHints.some((hint) => hint.length > 2 && text.includes(hint));
      });

      return match?.outerHTML.slice(0, 400) ?? body.innerHTML.slice(0, 400);
    }, selectors);

    return html || null;
  } catch {
    return null;
  }
}

async function getElementCSS(page: Page, selectors: readonly string[]): Promise<Record<string, string> | 'NOT FOUND' | `ERROR: ${string}`> {
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      if (!(await element.count())) continue;
      await element.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {
        throw new Error('element not found');
      });
      return await element.evaluate((node) => {
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

async function launchFreshBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}

async function preparePrototypePage(page: Page): Promise<void> {
  await page.goto(prototypeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
}

async function preparePortPage(page: Page): Promise<void> {
  await page.goto(portUrl, { waitUntil: 'networkidle', timeout: 30000 });
}

async function openManageFiltersInPrototype(page: Page): Promise<void> {
  const trigger = page.locator('#mgf').first();
  if (await trigger.count()) {
    await trigger.click({ timeout: 2000 }).catch(() => undefined);
  }
}

async function openManageFiltersInPort(page: Page): Promise<void> {
  const trigger = page.getByRole('button', { name: 'Manage filters' }).first();
  if (await trigger.count()) {
    await trigger.click({ timeout: 2000 }).catch(() => undefined);
  }
}

function summarizeMarkdownRows(rows: readonly string[]) {
  const counts = {
    total: 0,
    ok: 0,
    mismatches: 0,
    prototypeNotFound: 0,
    portNotFound: 0,
    bothNotFound: 0,
    remainingNotFound: 0,
  };

  const notFoundElements = new Set<string>();

  for (const row of rows) {
    if (!row.startsWith('| ') || row.startsWith('| element |')) continue;
    const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 5) continue;

    const [element, , , , status] = cells;
    if (!element || !status) continue;

    counts.total += 1;

    if (status === 'OK') counts.ok += 1;
    else if (status === 'MISMATCH') counts.mismatches += 1;
    else if (status === 'PROTOTYPE NOT FOUND') counts.prototypeNotFound += 1;
    else if (status === 'PORT NOT FOUND') counts.portNotFound += 1;
    else if (status === 'BOTH NOT FOUND') counts.bothNotFound += 1;
    else if (status === 'PENDING (table port)') counts.portNotFound += 1;

    if (status === 'PORT NOT FOUND' || status === 'PROTOTYPE NOT FOUND' || status === 'BOTH NOT FOUND') {
      notFoundElements.add(element);
    }
  }

  counts.remainingNotFound = notFoundElements.size;

  return {
    counts,
    notFoundElements: [...notFoundElements].sort(),
  };
}

async function main() {
  const rows: string[] = ['| element | property | prototype | port | status |', '| --- | --- | --- | --- | --- |'];
  let prototypeBrowser: Browser | null = null;
  let portBrowser: Browser | null = null;

  try {
    prototypeBrowser = await launchFreshBrowser();
    portBrowser = await launchFreshBrowser();

    const prototypePage = await prototypeBrowser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const portPage = await portBrowser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

    await preparePrototypePage(prototypePage);
    await preparePortPage(portPage);
    await openManageFiltersInPrototype(prototypePage);
    await openManageFiltersInPort(portPage);

    for (const element of elements) {
      let prototypeStyle: Record<string, string> | 'NOT FOUND' | `ERROR: ${string}` = 'NOT FOUND';
      let portStyle: Record<string, string> | 'NOT FOUND' | `ERROR: ${string}` = 'NOT FOUND';

      try {
        prototypeStyle = await getElementCSS(prototypePage, element.prototypeSelectors);
      } catch (error) {
        prototypeStyle = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
      }

      try {
        portStyle = await getElementCSS(portPage, element.portSelectors);
      } catch (error) {
        portStyle = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
      }

      const prototypeValues = typeof prototypeStyle === 'string' ? null : prototypeStyle;
      const portValues = typeof portStyle === 'string' ? null : portStyle;

      for (const property of properties) {
        const prototypeValue = prototypeValues ? prototypeValues[property] ?? 'NOT FOUND' : prototypeStyle;
        const portValue = portValues ? portValues[property] ?? 'NOT FOUND' : portStyle;
        const status = statusForComparison(element.name, property, prototypeValue, portValue);

        if (status === 'PROTOTYPE NOT FOUND' || status === 'PORT NOT FOUND' || status === 'BOTH NOT FOUND') {
          const prototypeContext = await findNearestContainerHTML(prototypePage, element.prototypeSelectors);
          const portContext = await findNearestContainerHTML(portPage, element.portSelectors);
          if (prototypeValue === 'NOT FOUND' && prototypeContext) {
            console.warn(`[prototype-missing] ${element.name} :: ${property}\n${prototypeContext}`);
          }
          if (portValue === 'NOT FOUND' && portContext) {
            console.warn(`[port-missing] ${element.name} :: ${property}\n${portContext}`);
          }
        }

        rows.push(`| ${element.name} | ${property} | ${formatCell(String(prototypeValue))} | ${formatCell(String(portValue))} | ${status} |`);
      }
    }

    const summary = summarizeMarkdownRows(rows);
    await writeFile(summaryPath, `${rows.join('\n')}\n`);
    await writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await prototypeBrowser?.close().catch(() => undefined);
    await portBrowser?.close().catch(() => undefined);
  }
}

void main();
