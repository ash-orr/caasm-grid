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
  { name: 'Devices / Accounts tab buttons', prototypeSelector: 'button:has-text("Devices")', portSelector: 'button:has-text("Devices")' },
  { name: 'toolbar search input', prototypeSelector: 'input[type="search"][aria-label="Search"]', portSelector: 'input[aria-label="Search"]' },
  { name: 'toolbar button Views', prototypeSelector: 'button:has-text("Views")', portSelector: 'button:has-text("Views")' },
  { name: 'toolbar button Export', prototypeSelector: 'button:has-text("Export")', portSelector: 'button:has-text("Export")' },
  { name: 'toolbar button Filters', prototypeSelector: 'button[aria-label*="filters"]', portSelector: 'button[aria-label*="filters"]' },
  { name: 'toolbar button Columns', prototypeSelector: 'button[aria-label*="columns"]', portSelector: 'button[aria-label*="columns"]' },
  { name: 'table header cell "Device name"', prototypeSelector: 'th:has-text("Device name")', portSelector: 'th:has-text("Device name")' },
  { name: 'plain table body cell', prototypeSelector: 'tbody tr td:nth-child(3)', portSelector: 'tbody tr td:nth-child(3)' },
  { name: 'bold device-name cell', prototypeSelector: 'tbody tr td b', portSelector: 'tbody tr td b' },
  { name: 'Blocked status pill', prototypeSelector: 'span.pill.p-bad:has-text("Blocked")', portSelector: 'span.pill:has-text("Blocked")' },
  { name: 'risk-score pill', prototypeSelector: 'span.score', portSelector: 'span.score' },
  { name: 'Exposure gaps cell text', prototypeSelector: 'td:has-text("Exposure gaps")', portSelector: 'td:has-text("Exposure gaps")' },
  { name: 'Filters panel heading "Filters"', prototypeSelector: 'div.filters b', portSelector: 'div.card.filters b' },
  { name: 'Clear link', prototypeSelector: 'a#clr', portSelector: 'text=Clear' },
  { name: 'filter section summary "Saved views"', prototypeSelector: 'summary:has-text("Saved views")', portSelector: 'summary:has-text("Saved views")' },
  { name: 'radio option label', prototypeSelector: 'label.chk', portSelector: 'label.chk' },
  { name: 'Manage filters button', prototypeSelector: 'button:has-text("Manage filters")', portSelector: 'button:has-text("Manage filters")' },
  { name: 'Manage filters dialog title', prototypeSelector: 'h2:has-text("Manage filters")', portSelector: 'h2:has-text("Manage filters")' },
  { name: 'Manage filters dialog group heading', prototypeSelector: '#mf-g .ag', portSelector: '.menuGroup' },
  { name: 'Manage filters dialog option label', prototypeSelector: 'label.chk:has-text("Status")', portSelector: 'label:has-text("Status")' },
  { name: 'Manage filters dialog footer buttons', prototypeSelector: 'button:has-text("Apply")', portSelector: 'button:has-text("Apply")' },
  { name: 'pagination footer "N devices" text', prototypeSelector: '.foot span:first-child', portSelector: '.tableFooter .footerCount' },
  { name: 'Rows per page label', prototypeSelector: 'label:has-text("Rows per page")', portSelector: 'label:has-text("Rows per page")' },
  { name: 'rows-per-page select', prototypeSelector: 'select.ps', portSelector: 'select[aria-label="Rows per page"]' },
  { name: 'Prev button', prototypeSelector: 'button:has-text("Prev")', portSelector: 'button:has-text("Prev")' },
  { name: 'Next button', prototypeSelector: 'button:has-text("Next")', portSelector: 'button:has-text("Next")' },
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
      const r = Number.parseInt(expanded.slice(0, 2), 16);
      const g = Number.parseInt(expanded.slice(2, 4), 16);
      const b = Number.parseInt(expanded.slice(4, 6), 16);
      return `rgb(${r}, ${g}, ${b})`;
    }
    if (hex.length >= 6) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      return `rgb(${r}, ${g}, ${b})`;
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
  return value
    .split(',')
    .map((part) => part.trim().replace(/^"|"$/g, '').trim())
    .filter(Boolean)[0]
    .toLowerCase();
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

function formatCell(value: string | null | undefined): string {
  if (value === undefined || value === null) return 'NOT FOUND';
  return value;
}

async function getElementCSS(page: Page, selector: string): Promise<Record<string, string> | 'NOT FOUND' | `ERROR: ${string}`> {
  try {
    const element = page.locator(selector).first();
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
  } catch (error) {
    if (error instanceof Error && error.message.includes('element not found')) {
      return 'NOT FOUND';
    }
    return `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }
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

async function main() {
  const rows: string[] = ['| element | property | prototype | port | OK/MISMATCH |', '| --- | --- | --- | --- | --- |'];
  let prototypeBrowser: Browser | null = null;
  let portBrowser: Browser | null = null;

  try {
    prototypeBrowser = await launchFreshBrowser();
    portBrowser = await launchFreshBrowser();

    const prototypePage = await prototypeBrowser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const portPage = await portBrowser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

    await preparePrototypePage(prototypePage);
    await preparePortPage(portPage);

    for (const element of elements) {
      let prototypeStyle: Record<string, string> | 'NOT FOUND' | `ERROR: ${string}` = 'NOT FOUND';
      let portStyle: Record<string, string> | 'NOT FOUND' | `ERROR: ${string}` = 'NOT FOUND';

      try {
        prototypeStyle = await getElementCSS(prototypePage, element.prototypeSelector);
      } catch (error) {
        prototypeStyle = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
      }

      try {
        portStyle = await getElementCSS(portPage, element.portSelector);
      } catch (error) {
        portStyle = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
      }

      const prototypeValues = typeof prototypeStyle === 'string' ? null : prototypeStyle;
      const portValues = typeof portStyle === 'string' ? null : portStyle;

      for (const property of properties) {
        const prototypeValue = prototypeValues ? prototypeValues[property] ?? 'NOT FOUND' : prototypeStyle;
        const portValue = portValues ? portValues[property] ?? 'NOT FOUND' : portStyle;
        const status = propertyMatches(property, String(prototypeValue), String(portValue)) ? 'OK' : 'MISMATCH';
        rows.push(`| ${element.name} | ${property} | ${formatCell(String(prototypeValue))} | ${formatCell(String(portValue))} | ${status} |`);
      }
    }

    await writeFile(summaryPath, `${rows.join('\n')}\n`);
    await writeFile(reportPath, `${JSON.stringify(rows, null, 2)}\n`);
  } finally {
    await prototypeBrowser?.close().catch(() => undefined);
    await portBrowser?.close().catch(() => undefined);
  }
}

void main();
