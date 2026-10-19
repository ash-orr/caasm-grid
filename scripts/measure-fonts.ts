import { chromium } from '@playwright/test';

const TIMEOUT_MS = 3000;
const prototypeUrl = `file://${process.cwd()}/design/prototype/caasm-console.html#/devices/default`;
const appUrl = 'http://127.0.0.1:4173/';

async function safeMeasure(page: any, selector: string) {
  try {
    const loc = page.locator(selector).first();
    await loc.waitFor({ state: 'visible', timeout: TIMEOUT_MS });
    const styles = await loc.evaluate((node: Element) => {
      const cs = getComputedStyle(node);
      return {
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        color: cs.color,
      };
    });
    return styles;
  } catch {
    return { status: 'not found' };
  }
}

async function safeClick(page: any, selector: string) {
  try {
    const loc = page.locator(selector).first();
    await loc.waitFor({ state: 'visible', timeout: TIMEOUT_MS });
    await loc.click({ timeout: TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

async function measurePrototype() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(prototypeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

  await safeClick(page, '#mgf');

  const results: Record<string, any> = {
    body: await safeMeasure(page, 'body'),
    pageTitle: await safeMeasure(page, 'h1'),
    filterTitle: await safeMeasure(page, '.filters > div b'),
    filterSummary: await safeMeasure(page, '.filters details summary'),
    filterOption: await safeMeasure(page, '.filters .chk'),
    tableHeader: await safeMeasure(page, 'th'),
    tableBody: await safeMeasure(page, 'td'),
    button: await safeMeasure(page, '.toolbar .btn'),
    dialogTitle: await safeMeasure(page, '#mfh'),
    dialogOption: await safeMeasure(page, '#mf-g .chk'),
    pill: await safeMeasure(page, '.pill'),
    footer: await safeMeasure(page, '.foot'),
  };

  const firstRow = page.locator('tbody tr').first();
  await safeClick(page, 'tbody tr');
  results.banner = await safeMeasure(page, '.selbar');
  results.detailTitle = await safeMeasure(page, '.card h2');
  results.detailLabel = await safeMeasure(page, '.kv dt');
  results.detailValue = await safeMeasure(page, '.kv dd');

  await browser.close();
  return results;
}

async function measurePort() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 30000 });

  const openFilters = page.getByRole('button', { name: /Manage filters/i }).first();
  await openFilters.waitFor({ state: 'visible', timeout: TIMEOUT_MS }).catch(() => {});
  await openFilters.click({ timeout: TIMEOUT_MS }).catch(() => {});

  const results: Record<string, any> = {
    body: await safeMeasure(page, 'body'),
    pageTitle: await safeMeasure(page, 'h1'),
    filterTitle: await safeMeasure(page, 'text=Filters'),
    filterSummary: await safeMeasure(page, 'summary'),
    filterOption: await safeMeasure(page, 'label'),
    tableHeader: await safeMeasure(page, 'th'),
    tableBody: await safeMeasure(page, 'td'),
    button: await safeMeasure(page, 'button'),
    dialogTitle: await safeMeasure(page, '[role="dialog"] h2'),
    dialogOption: await safeMeasure(page, '[role="dialog"] label'),
    pill: await safeMeasure(page, '[class*="pill"], [class*="badge"]'),
    footer: await safeMeasure(page, '[class*="footerCount"], [class*="tableFooter"]'),
  };

  const firstRow = page.locator('tbody tr').first();
  await firstRow.waitFor({ state: 'visible', timeout: TIMEOUT_MS }).catch(() => {});
  await firstRow.click({ timeout: TIMEOUT_MS }).catch(() => {});
  results.banner = await safeMeasure(page, '[class*="selectionBar"], [class*="selected"]');
  results.detailTitle = await safeMeasure(page, '[class*="detailCardTitle"]');
  results.detailLabel = await safeMeasure(page, '[class*="detailRowLabel"]');
  results.detailValue = await safeMeasure(page, '[class*="detailRow"] span:last-child');

  await browser.close();
  return results;
}

async function printTable() {
  const prototype = await measurePrototype();
  const port = await measurePort();
  const keys = Array.from(new Set([...Object.keys(prototype), ...Object.keys(port)])).sort();

  console.log('\nSide-by-side typography comparison\n');
  console.log('| element | prototype | port |');
  console.log('| --- | --- | --- |');

  for (const key of keys) {
    const protoValue = prototype[key];
    const portValue = port[key];
    const protoText = protoValue && 'status' in protoValue ? protoValue.status : `${protoValue?.fontFamily ?? 'n/a'} | ${protoValue?.fontSize ?? 'n/a'}`;
    const portText = portValue && 'status' in portValue ? portValue.status : `${portValue?.fontFamily ?? 'n/a'} | ${portValue?.fontSize ?? 'n/a'}`;
    console.log(`| ${key} | ${protoText} | ${portText} |`);
  }
}

printTable().catch((error) => {
  console.error(error);
  process.exit(1);
});
