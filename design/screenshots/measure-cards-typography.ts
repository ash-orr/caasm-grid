// @ts-nocheck
// Card / detail-page typography audit: text-keyed diff between the prototype and the port.
// Run from the repo root:
//   NODE_OPTIONS=--dns-result-order=ipv4first npx --yes tsx design/screenshots/measure-cards-typography.ts < /dev/null
// Method: for each page state, open the same record in both apps, verify the page, collect every visible
// text element with its computed style, key it by its own text (+ occurrence index) and compare.
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const FRONTEND = path.join(ROOT, 'frontend');
const PROTO_URL = process.env.PROTO_URL || pathToFileURL(path.join(ROOT, 'design', 'prototype', 'caasm-console.html')).href;
const PORT_OVERRIDE = process.env.PORT_URL || '';
const BASE = 'http://127.0.0.1:4173/';
const require = createRequire(path.join(FRONTEND, 'package.json'));
const { chromium } = require('@playwright/test');

// Records (taken from the prototype data; the mocks are generated from it).
const REC = {
  device: 'IOT-1049', // has source conflicts, mixed statuses
  uncovered: 'SRV-1028', // not covered by Portnox AgentP
  allReporting: 'MB-1042', // every applicable source reporting
  ldap: 'blake@acme.com', // LDAP account with a conflict
  mac: 'mab-finley', // MAC-based account
};
// kind: device | account. tab: Overview | Exposure coverage. raw: expand all "View raw values". q: coverage search.
const STATES = [
  { id: 'P1', kind: 'device', rec: REC.device, tab: 'Overview' },
  { id: 'P2', kind: 'device', rec: REC.device, tab: 'Exposure coverage' },
  { id: 'P3', kind: 'device', rec: REC.device, tab: 'Overview', raw: true },
  { id: 'P4', kind: 'device', rec: REC.uncovered, tab: 'Overview' },
  { id: 'P5', kind: 'device', rec: REC.allReporting, tab: 'Overview' },
  { id: 'P6', kind: 'account', rec: REC.ldap, tab: 'Overview' },
  { id: 'P6b', kind: 'account', rec: REC.ldap, tab: 'Overview', raw: true },
  { id: 'P7', kind: 'account', rec: REC.ldap, tab: 'Exposure coverage' },
  { id: 'P8', kind: 'account', rec: REC.mac, tab: 'Overview' },
  { id: 'P9', kind: 'device', rec: REC.device, tab: 'Exposure coverage', q: 'zzz' },
];
const PROPS = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'color', 'fontVariantNumeric'];
const BOX = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderRadius', 'height'];
const CAP = 40;

function get(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => { res.resume(); resolve(res.statusCode); }).on('error', () => resolve(0));
  });
}
async function startPreview() {
  console.log('Building the port...');
  execSync('npm run build', { cwd: FRONTEND, stdio: 'ignore' });
  try { execSync('lsof -ti tcp:4173 | xargs kill -9', { stdio: 'ignore', shell: '/bin/bash' }); } catch {}
  const child = spawn('npx', ['--no-install', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
    { cwd: FRONTEND, detached: true, stdio: 'ignore' });
  child.unref();
  for (let i = 0; i < 60; i++) { if ((await get(BASE)) === 200) return child; await new Promise((r) => setTimeout(r, 500)); }
  throw new Error('preview did not start on 127.0.0.1:4173');
}

// ---- in-page helpers (serialised into the page) ----
const collectFn = () => {
  const norm = (c) => {
    const m = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(c);
    if (!m) return c;
    const f = (v) => Math.round(parseFloat(v) * 255);
    return m[4] !== undefined && parseFloat(m[4]) < 1 ? `rgba(${f(m[1])}, ${f(m[2])}, ${f(m[3])}, ${m[4]})` : `rgb(${f(m[1])}, ${f(m[2])}, ${f(m[3])})`;
  };
  const out = [];
  const seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const el = w.currentNode.parentElement;
    if (!el || seen.has(el)) continue;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION'].includes(el.tagName)) continue;
    if (el.closest('nav, header, [role="navigation"], .topnav, #toast, .toast')) continue;
    const own = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' ').replace(/\s+/g, ' ').trim();
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
    seen.add(el);
    const lab = (n) => { const t = (n.textContent || '').replace(/\s+/g, ' ').trim(); return t.length > 28 ? t.slice(0, 28) + '…' : t; };
    const chain = []; let a = el.parentElement;
    for (let i = 0; a && a !== document.body && i < 5; i++, a = a.parentElement) {
      let s1 = a.tagName.toLowerCase(); if (a.getAttribute('role')) s1 += '[' + a.getAttribute('role') + ']';
      const h = a.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > header'); if (h) s1 += '{' + lab(h) + '}';
      chain.push(s1);
    }
    let dtl = ''; const dd = el.closest('dd'); if (dd && dd.previousElementSibling && dd.previousElementSibling.tagName === 'DT') dtl = lab(dd.previousElementSibling);
    let region = ''; { let r = el.parentElement; for (let i = 0; r && r !== document.body && i < 10 && !region; i++, r = r.parentElement) { const h = r.querySelector(':scope > h2, :scope > h3, :scope > h4, :scope > header'); if (h) region = lab(h); } }
    const o = { region, dtl, ctx: (dtl ? 'dt=' + dtl + ' ' : '') + chain.join(' < '), text: own, tag: el.tagName.toLowerCase(), inTable: !!el.closest('table, [role="grid"], [role="table"] [role="row"]') };
    for (const p of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'fontVariantNumeric']) o[p] = cs[p];
    o.color = norm(cs.color);
    o.fontFamily = o.fontFamily.replace(/["']/g, '');
    const bg = cs.backgroundColor;
    const hasBox = (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') || cs.borderRadius !== '0px';
    if (hasBox) {
      o.box = true;
      for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderRadius']) o[p] = cs[p];
      o.height = Math.round(r.height * 10) / 10 + 'px';
    }
    out.push(o);
  }
  return out;
};

async function openState(page, url, st) {
  try {
    return await openState0(page, url, st);
  } catch (e) {
    return 'could not open the record: ' + String(e && e.message ? e.message : e).split('\n')[0].slice(0, 160);
  }
}

async function openState0(page, url, st) {
  page.setDefaultTimeout(8000);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  if (st.kind === 'account') {
    const tabBtn = page.locator('button, [role="tab"], a').filter({ hasText: /^Accounts$/ }).first();
    await tabBtn.click();
    await page.waitForTimeout(300);
  }
  // the table search box (NOT the "Search filters" box in the filter panel)
  const search = page.locator(st.kind === 'device' ? 'input[placeholder^="Search devices"]' : 'input[placeholder^="Search accounts"]').first();
  if (!(await search.count())) return `table search box not found (expected placeholder starting "Search ${st.kind === 'device' ? 'devices' : 'accounts'}")`;
  await search.fill(st.rec);
  await page.waitForTimeout(400);
  let cell = page.getByText(st.rec, { exact: true }).first();
  if (!(await cell.count())) cell = page.locator('tr, [role="row"]').filter({ hasText: st.rec }).first().getByText(st.rec).first();
  if (!(await cell.count())) {
    const info = await page.evaluate((q) => {
      const rows = [...document.querySelectorAll('tbody tr, [role="row"]')];
      const inp = document.querySelector('input[placeholder^="Search"]');
      return { rows: rows.length, first: rows[0] ? rows[0].textContent.replace(/\s+/g, ' ').trim().slice(0, 140) : '', input: inp ? inp.value : '(no input)', q };
    }, st.rec);
    return `no row containing ${st.rec} after searching (rows on page: ${info.rows}; first row text: "${info.first}"; search box value: "${info.input}")`;
  }
  await cell.click();
  await page.waitForTimeout(500);
  // verify: the record name is shown outside any table (breadcrumb / title) and the detail panel heading is present
  const chk = await page.evaluate(([name, kind]) => {
    const vis = (e) => e.getBoundingClientRect().width > 0;
    const own = (e) => [...e.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' ').replace(/\s+/g, ' ').trim();
    const all = [...document.querySelectorAll('body *')].filter(vis);
    const nameShown = all.some((e) => own(e).includes(name) && !e.closest('table, tbody, [role="row"], [role="grid"]'));
    const want = kind === 'device' ? 'Device details' : 'Account details';
    const panel = all.some((e) => own(e) === want);
    const heads = all.filter((e) => /^H[1-6]$/.test(e.tagName)).map((e) => own(e)).filter(Boolean).slice(0, 8);
    return { nameShown, panel, heads };
  }, [st.rec, st.kind]);
  if (!chk.nameShown || !chk.panel) {
    return `record page for ${st.rec} did not open (record name outside the table: ${chk.nameShown ? 'yes' : 'NO'}; "${st.kind === 'device' ? 'Device' : 'Account'} details" text: ${chk.panel ? 'yes' : 'NO'}; headings on the page: ${JSON.stringify(chk.heads)})`;
  }
  if (st.tab !== 'Overview') {
    const clicked = await page.evaluate((tab) => {
      const c = [...document.querySelectorAll('button,[role="tab"]')].filter((b) => b.getBoundingClientRect().width > 0 && (b.textContent || '').trim().startsWith(tab));
      if (!c.length) return false;
      c[0].click(); return true;
    }, st.tab);
    if (!clicked) return `tab "${st.tab}" not found`;
    await page.waitForTimeout(400);
  }
  if (st.tab === 'Exposure coverage') {
    const ph = await page.locator('input[placeholder="Find a source"]').count();
    if (!ph) return 'Exposure coverage tab did not show the "Find a source" search';
    if (st.q) { await page.locator('input[placeholder="Find a source"]').fill(st.q); await page.waitForTimeout(300); }
  } else {
    const hasHdr = await page.evaluate(() => ['Field', 'Value', 'Sources'].every((h) => [...document.querySelectorAll('span,th,div')].some((e) => e.children.length === 0 && e.textContent.trim() === h && e.getBoundingClientRect().width > 0)));
    if (!hasHdr) return 'Overview tab did not show the Field / Value / Sources headers';
  }
  if (st.raw) {
    for (let i = 0; i < 40; i++) {
      const b = page.getByText('View raw values', { exact: true }).first();
      if (!(await b.count())) break;
      await b.click();
      await page.waitForTimeout(80);
    }
  }
  return null;
}

function keyed(list) {
  const idx = new Map(); const m = new Map();
  for (const o of list) { const base = `${o.text}|${o.region}|${o.dtl}|${o.box ? 'box' : 'plain'}`; const n = (idx.get(base) || 0) + 1; idx.set(base, n); m.set(`${base}#${n}`, o); }
  return m;
}

(async () => {
  const child = PORT_OVERRIDE ? null : await startPreview();
  const portUrl = PORT_OVERRIDE || BASE;
  const browser = await chromium.launch();
  const mk = async () => { const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' }); await c.addInitScript('window.__name = function (f) { return f; };'); return c.newPage(); };
  const pPage = await mk(); const qPage = await mk();
  let ok = 0, mismatch = 0, notFound = 0, verified = 0;
  const failed = []; const mism = []; const only = []; const rows = [];
  for (const st of STATES) {
    const e1 = await openState(pPage, PROTO_URL, st);
    const e2 = await openState(qPage, portUrl, st);
    if (e1 || e2) { failed.push(`STATE FAILED: ${st.id} (${st.kind} ${st.rec}, ${st.tab}${st.raw ? ', raw' : ''}${st.q ? ', search' : ''}): ${e1 ? 'prototype: ' + e1 : ''}${e1 && e2 ? ' | ' : ''}${e2 ? 'port: ' + e2 : ''}`); continue; }
    verified++;
    const A = keyed(await pPage.evaluate(collectFn));
    const B = keyed(await qPage.evaluate(collectFn));
    let cut = { prototype: 0, port: 0 }; let shown = { prototype: 0, port: 0 };
    for (const [k, a] of A) {
      const b = B.get(k);
      if (!b) { notFound++; if (shown.prototype < CAP) { only.push({ state: st.id, side: 'prototype', text: a.text, tag: a.tag }); shown.prototype++; } else cut.prototype++; continue; }
      const props = a.box || b.box ? [...PROPS, ...BOX] : PROPS;
      for (const p of props) {
        const same = a[p] === b[p];
        if (same) ok++; else { mismatch++; mism.push({ state: st.id, text: a.text, prop: p, prototype: a[p], port: b[p], tag: b.tag, pctx: a.ctx, qctx: b.ctx }); }
      }
    }
    for (const [k, b] of B) {
      if (A.has(k)) continue;
      notFound++;
      if (shown.port < CAP) { only.push({ state: st.id, side: 'port', text: b.text, tag: b.tag }); shown.port++; } else cut.port++;
    }
    rows.push(`${st.id}: ${A.size} prototype keys, ${B.size} port keys` + (cut.prototype || cut.port ? ` (cut: ${cut.prototype} prototype, ${cut.port} port)` : ''));
  }
  await browser.close();
  try { if (child) process.kill(-child.pid); } catch {}
  const lines = [];
  lines.push(`States: ${STATES.length}, verified: ${verified}`);
  lines.push(`Compared keys per state:`, ...rows.map((r) => '  ' + r));
  failed.forEach((f) => lines.push(f));
  const byProp = {};
  mism.forEach((m) => { (byProp[m.prop] = byProp[m.prop] || []).push(m); });
  lines.push('', 'MISMATCH rows (grouped by property):');
  for (const [p, arr] of Object.entries(byProp)) {
    lines.push(`## ${p} (${arr.length})`);
    arr.forEach((m) => lines.push(`- [${m.state}] "${m.text.slice(0, 60)}" <${m.tag}>: prototype ${m.prototype} | port ${m.port}` + (process.env.AUDIT_CTX ? `\n    proto ctx: ${m.pctx}\n    port  ctx: ${m.qctx}` : '')));
  }
  lines.push('', 'Only on one side (NOT FOUND):');
  only.forEach((o) => lines.push(`- [${o.state}] only in ${o.side}: "${o.text.slice(0, 70)}" <${o.tag}>`));
  lines.push('', `Counts: OK=${ok} | MISMATCH=${mismatch} | NOT FOUND=${notFound} | TOTAL=${ok + mismatch + notFound}`);
  const text = lines.join('\n');
  console.log(text);
  writeFileSync(path.join(HERE, 'typography-cards-summary.md'), '# Card typography audit (text-keyed)\n\n```\n' + text + '\n```\n');
  writeFileSync(path.join(HERE, 'typography-cards-report.json'), JSON.stringify({ failed, mism, only, counts: { ok, mismatch, notFound } }, null, 2));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
