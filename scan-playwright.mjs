#!/usr/bin/env node
/**
 * scan-playwright.mjs — Browser-based scanner for Workday + custom career pages
 *
 * Handles companies that block direct API calls (Workday, custom portals).
 * Uses headless Chromium to load pages and intercept/extract job data.
 * Same output format as scan.mjs — appends to pipeline.md + scan-history.tsv.
 *
 * Usage:
 *   node scan-playwright.mjs                   # scan all playwright-type companies
 *   node scan-playwright.mjs --dry-run         # preview without writing files
 *   node scan-playwright.mjs --company Netflix # scan one company
 *   node scan-playwright.mjs --visible         # show browser window (debug)
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';
import { chromium } from 'playwright';

mkdirSync('data', { recursive: true });

const PORTALS_PATH      = 'portals.yml';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PIPELINE_PATH     = 'data/pipeline.md';
const APPLICATIONS_PATH = 'data/applications.md';

const args          = process.argv.slice(2);
const dryRun        = args.includes('--dry-run');
const visible       = args.includes('--visible');
const companyIdx    = args.indexOf('--company');
const filterCompany = companyIdx !== -1 ? args[companyIdx + 1]?.toLowerCase() : null;

// ── Title filter (same as scan.mjs) ───────────────────────────────────────

function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map(k => k.toLowerCase());
  const negative = (titleFilter?.negative || []).map(k => k.toLowerCase());
  return (title) => {
    const lower = title.toLowerCase();
    const hasPositive = positive.length === 0 || positive.some(k => lower.includes(k));
    const hasNegative = negative.some(k => lower.includes(k));
    return hasPositive && !hasNegative;
  };
}

// ── Dedup (same as scan.mjs) ───────────────────────────────────────────────

function loadSeenUrls() {
  const seen = new Set();
  if (existsSync(SCAN_HISTORY_PATH)) {
    const lines = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n');
    for (const line of lines.slice(1)) {
      const url = line.split('\t')[0];
      if (url) seen.add(url);
    }
  }
  if (existsSync(PIPELINE_PATH)) {
    const text = readFileSync(PIPELINE_PATH, 'utf-8');
    for (const match of text.matchAll(/- \[[ x]\] (https?:\/\/\S+)/g)) {
      seen.add(match[1]);
    }
  }
  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(match[0]);
    }
  }
  return seen;
}

function loadSeenCompanyRoles() {
  const seen = new Set();
  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/\|[^|]+\|[^|]+\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g)) {
      const company = match[1].trim().toLowerCase();
      const role    = match[2].trim().toLowerCase();
      if (company && role && company !== 'company') seen.add(`${company}::${role}`);
    }
  }
  return seen;
}

// ── Pipeline writer (same as scan.mjs) ────────────────────────────────────

function appendToPipeline(offers) {
  if (offers.length === 0) return;
  let text = readFileSync(PIPELINE_PATH, 'utf-8');

  const dateHeader = `\n### Playwright Scan — ${new Date().toISOString().slice(0, 10)}\n`;
  const block = dateHeader + offers.map(o => `- [ ] ${o.url} | ${o.company} | ${o.title}`).join('\n') + '\n';

  const marker = '## Added';
  const idx = text.lastIndexOf(marker);
  const insertAt = idx === -1 ? text.length : text.indexOf('\n\n', idx) + 2;
  text = text.slice(0, insertAt) + block + text.slice(insertAt);

  writeFileSync(PIPELINE_PATH, text, 'utf-8');
}

function appendToScanHistory(offers, date) {
  if (!existsSync(SCAN_HISTORY_PATH)) {
    writeFileSync(SCAN_HISTORY_PATH, 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n', 'utf-8');
  }
  const lines = offers.map(o =>
    `${o.url}\t${date}\tplaywright\t${o.title}\t${o.company}\tadded`
  ).join('\n') + '\n';
  appendFileSync(SCAN_HISTORY_PATH, lines, 'utf-8');
}

// ── Workday scraper ────────────────────────────────────────────────────────

async function scrapeWorkday(page, company, titleFilter, seenUrls, seenCompanyRoles) {
  const careersUrl = company.careers_url;
  console.log(`  Navigating to ${careersUrl}...`);

  await page.goto(careersUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for job results to appear
  const jobSelectors = [
    '[data-automation-id="jobTitle"]',
    'a[data-automation-id*="job"]',
    'li[class*="css-"] a[href*="/job/"]',
    '.job-posting-title',
  ];

  let loaded = false;
  for (const sel of jobSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 10000 });
      loaded = true;
      break;
    } catch {}
  }

  if (!loaded) {
    // Try clicking "View All Jobs" or similar CTA
    const viewAll = page.getByText(/view all jobs|see all jobs|all openings/i).first();
    if (await viewAll.count() > 0) {
      await viewAll.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    }
  }

  const jobs = [];
  let pageNum = 1;

  while (true) {
    await page.waitForTimeout(1500);

    // Extract jobs from current page DOM
    const extracted = await page.evaluate(() => {
      const results = [];

      // Strategy 1: Workday standard automation IDs
      const titleEls = document.querySelectorAll('[data-automation-id="jobTitle"]');
      titleEls.forEach(el => {
        const anchor = el.closest('a') || el.querySelector('a') || el;
        results.push({
          title: el.textContent?.trim() || '',
          url: anchor.href || '',
          location: el.closest('li')?.querySelector('[data-automation-id="jobPostingLocation"], [data-automation-id="location"]')?.textContent?.trim() || '',
        });
      });

      if (results.length > 0) return results;

      // Strategy 2: Generic job link extraction
      const links = document.querySelectorAll('a[href*="/job/"]');
      links.forEach(a => {
        const title = a.querySelector('h2, h3, [class*="title"]')?.textContent?.trim()
          || a.textContent?.trim();
        if (title && title.length > 3 && title.length < 200) {
          const li = a.closest('li') || a.closest('[class*="posting"]') || a.closest('[class*="card"]');
          const location = li?.querySelector('[class*="location"]')?.textContent?.trim() || '';
          results.push({ title, url: a.href, location });
        }
      });

      return results;
    });

    for (const job of extracted) {
      if (!job.url || !job.title) continue;
      if (!titleFilter(job.title)) continue;
      if (seenUrls.has(job.url)) continue;
      const key = `${company.name.toLowerCase()}::${job.title.toLowerCase()}`;
      if (seenCompanyRoles.has(key)) continue;
      seenUrls.add(job.url);
      seenCompanyRoles.add(key);
      jobs.push({ title: job.title, url: job.url, location: job.location, company: company.name });
    }

    // Try to paginate
    const nextBtn = page.locator('[data-automation-id="next"], button[aria-label*="next" i], a[aria-label*="next" i]').first();
    const isDisabled = await nextBtn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true').catch(() => true);
    if (await nextBtn.count() === 0 || isDisabled || pageNum >= 10) break;

    await nextBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    pageNum++;
  }

  return jobs;
}

// ── Generic custom-page scraper ────────────────────────────────────────────

async function scrapeCustom(page, company, titleFilter, seenUrls, seenCompanyRoles) {
  const careersUrl = company.careers_url || company.playwright_url;
  const selectors  = company.playwright_selectors || {};

  console.log(`  Navigating to ${careersUrl}...`);
  await page.goto(careersUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const jobs = [];
  const titleSel    = selectors.title    || 'h2 a, h3 a, [class*="title"] a, [class*="job"] a';
  const locationSel = selectors.location || '[class*="location"], [class*="city"]';

  const extracted = await page.evaluate((ts, ls) => {
    const items = [];
    document.querySelectorAll(ts).forEach(el => {
      const title = el.textContent?.trim();
      const url   = el.href || el.closest('a')?.href || '';
      const parent = el.closest('li, article, [class*="card"], [class*="posting"], tr');
      const location = parent?.querySelector(ls)?.textContent?.trim() || '';
      if (title && url) items.push({ title, url, location });
    });
    return items;
  }, titleSel, locationSel);

  for (const job of extracted) {
    if (!titleFilter(job.title)) continue;
    if (seenUrls.has(job.url)) continue;
    const key = `${company.name.toLowerCase()}::${job.title.toLowerCase()}`;
    if (seenCompanyRoles.has(key)) continue;
    seenUrls.add(job.url);
    seenCompanyRoles.add(key);
    jobs.push({ title: job.title, url: job.url, location: job.location, company: company.name });
  }

  return jobs;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const config = yaml.load(readFileSync(PORTALS_PATH, 'utf-8'));
  const titleFilter = buildTitleFilter(config.title_filter);

  // Target companies that need Playwright (workday_api = blocked, playwright_url = custom)
  const targets = (config.tracked_companies || [])
    .filter(c => c.enabled !== false)
    .filter(c => c.workday_api || c.playwright_url || c.type === 'playwright')
    .filter(c => !filterCompany || c.name.toLowerCase().includes(filterCompany));

  if (targets.length === 0) {
    console.log('No Playwright-type companies found in portals.yml.');
    console.log('Add workday_api or playwright_url fields to enable browser scanning.');
    return;
  }

  console.log(`Browser scan — ${targets.length} companies`);
  if (dryRun) console.log('(dry run — no files will be written)\n');

  const seenUrls         = loadSeenUrls();
  const seenCompanyRoles = loadSeenCompanyRoles();
  const date             = new Date().toISOString().slice(0, 10);

  const browser = await chromium.launch({ headless: !visible, slowMo: visible ? 50 : 0 });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  let totalFound = 0;
  const newOffers = [];
  const errors    = [];

  for (const company of targets) {
    process.stdout.write(`  Scanning ${company.name}...`);
    try {
      const isWorkday = !!(company.workday_api || company.careers_url?.includes('myworkdayjobs.com'));
      const jobs = isWorkday
        ? await scrapeWorkday(page, company, titleFilter, seenUrls, seenCompanyRoles)
        : await scrapeCustom(page, company, titleFilter, seenUrls, seenCompanyRoles);

      totalFound += jobs.length;
      newOffers.push(...jobs);
      console.log(` ${jobs.length} new`);
    } catch (err) {
      console.log(` ✗ ${err.message}`);
      errors.push({ company: company.name, error: err.message });
    }
  }

  await browser.close();

  // Write results
  if (!dryRun && newOffers.length > 0) {
    appendToPipeline(newOffers);
    appendToScanHistory(newOffers, date);
  }

  // Summary
  console.log(`\n${'━'.repeat(45)}`);
  console.log(`Browser Scan — ${date}`);
  console.log(`${'━'.repeat(45)}`);
  console.log(`Companies scanned:  ${targets.length}`);
  console.log(`New offers found:   ${newOffers.length}`);
  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(e => console.log(`  ✗ ${e.company}: ${e.error}`));
  }
  if (newOffers.length > 0) {
    console.log('\nNew offers:');
    newOffers.forEach(o => console.log(`  + ${o.company} | ${o.title} | ${o.location || 'N/A'}`));
    if (dryRun) console.log('\n(dry run — run without --dry-run to save)');
    else        console.log(`\nSaved to ${PIPELINE_PATH}`);
  }
  console.log('\n→ Run /career-ops pipeline to evaluate new offers.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
