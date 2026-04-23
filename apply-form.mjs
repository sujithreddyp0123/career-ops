#!/usr/bin/env node
/**
 * apply-form.mjs — Auto-fill job application in a visible browser
 *
 * Opens a real browser window (not headless), reads your profile, fills in
 * all form fields, uploads your tailored resume PDF, then pauses so you can
 * review everything and click Submit yourself.
 *
 * Usage:
 *   node apply-form.mjs <job-url> [--pdf=output/cv-xxx.pdf]
 *
 * Examples:
 *   node apply-form.mjs https://job-boards.greenhouse.io/gleanwork/jobs/4669417005 \
 *     --pdf=output/cv-sujith-kumar-reddy-glean-ml-evals-observability-2026-04-22.pdf
 *
 *   node apply-form.mjs https://jobs.ashbyhq.com/langchain/f07c1416 \
 *     --pdf=output/cv-sujith-kumar-reddy-langchain-langsmith-2026-04-22.pdf
 */

import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import * as readline from 'readline';

// ── Config ─────────────────────────────────────────────────────────────────

const profile = yaml.load(readFileSync('config/profile.yml', 'utf8'));
const c = profile.candidate;
const comp = profile.compensation;

const args = process.argv.slice(2);
const jobUrl = args.find(a => a.startsWith('http'));
const pdfArg = args.find(a => a.startsWith('--pdf='));
const pdfPath = pdfArg ? resolve(pdfArg.replace('--pdf=', '')) : null;

if (!jobUrl) {
  console.error('Usage: node apply-form.mjs <job-url> [--pdf=output/cv-xxx.pdf]');
  process.exit(1);
}

// ── Candidate data ─────────────────────────────────────────────────────────

const nameParts = c.full_name.split(' ');
const CANDIDATE = {
  firstName:       nameParts[0],
  lastName:        nameParts.slice(1).join(' '),
  fullName:        c.full_name,
  email:           c.email,
  phone:           c.phone,
  phoneDigits:     c.phone.replace(/\D/g, ''),
  linkedin:        c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`,
  github:          c.github.startsWith('http') ? c.github : `https://${c.github}`,
  portfolio:       c.portfolio_url || '',
  city:            'Houston',
  state:           'Texas',
  stateCode:       'TX',
  country:         'United States',
  zip:             '77001',
  salaryMin:       '130000',
  salaryMax:       '160000',
  salaryMid:       '145000',
  salaryRange:     comp?.target_range || '$130,000 – $160,000',
  workAuthYes:     'Yes',
  sponsorYes:      'Yes',
  gender:          'Decline to self-identify',
  ethnicity:       'Decline to self-identify',
  veteran:         'I am not a veteran',
  disability:      'I do not wish to answer',
};

// ── ATS detection ──────────────────────────────────────────────────────────

function detectATS(url) {
  if (/greenhouse\.io/i.test(url))       return 'greenhouse';
  if (/lever\.co/i.test(url))            return 'lever';
  if (/ashbyhq\.com/i.test(url))         return 'ashby';
  if (/myworkdayjobs\.com/i.test(url))   return 'workday';
  if (/icims\.com/i.test(url))           return 'icims';
  if (/smartrecruiters\.com/i.test(url)) return 'smartrecruiters';
  if (/taleo\.net/i.test(url))           return 'taleo';
  return 'generic';
}

// ── Fill helpers ───────────────────────────────────────────────────────────

const TIMEOUT = 3000;

async function fillSelector(page, selector, value) {
  try {
    const el = page.locator(selector).first();
    if (await el.count() === 0) return false;
    await el.fill(value, { timeout: TIMEOUT });
    return true;
  } catch { return false; }
}

async function fillByLabel(page, patterns, value) {
  for (const pattern of patterns) {
    for (const strategy of ['label', 'placeholder']) {
      try {
        const regex = new RegExp(pattern, 'i');
        const loc = strategy === 'label'
          ? page.getByLabel(regex)
          : page.getByPlaceholder(regex);
        if (await loc.count() > 0) {
          await loc.first().fill(value, { timeout: TIMEOUT });
          return true;
        }
      } catch {}
    }
    // Fallback: name/id attribute matching
    for (const attr of ['name', 'id']) {
      try {
        const term = pattern.toLowerCase().replace(/\s+/g, '');
        const loc = page.locator(`input[${attr}*="${term}"], textarea[${attr}*="${term}"]`).first();
        if (await loc.count() > 0) {
          await loc.fill(value, { timeout: TIMEOUT });
          return true;
        }
      } catch {}
    }
  }
  return false;
}

async function selectByLabel(page, patterns, value) {
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, 'i');
      const sel = page.getByLabel(regex).first();
      if (await sel.count() === 0) continue;
      // Try by label text first, then by value
      await sel.selectOption({ label: value }, { timeout: TIMEOUT })
        .catch(() => sel.selectOption({ value }, { timeout: TIMEOUT }))
        .catch(() => sel.selectOption({ label: new RegExp(value, 'i') }, { timeout: TIMEOUT }));
      return true;
    } catch {}
  }
  return false;
}

async function uploadResume(page, pdfPath) {
  if (!pdfPath || !existsSync(pdfPath)) {
    console.log('  ⚠️  No PDF path provided or file not found — attach resume manually');
    return;
  }
  const selectors = [
    '#resume',
    'input[type="file"][name*="resume"]',
    'input[type="file"][accept*="pdf"]',
    'input[type="file"][data-automation-id*="file"]',
    'input[type="file"]',
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.count() === 0) continue;
      await el.setInputFiles(pdfPath, { timeout: 5000 });
      console.log('  ✅ Resume uploaded');
      return;
    } catch {}
  }
  // Try clicking a "Upload Resume" button and then setting files
  try {
    const btn = page.getByText(/upload resume|attach resume|add resume/i).first();
    if (await btn.count() > 0) {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 3000 }),
        btn.click(),
      ]);
      await fileChooser.setFiles(pdfPath);
      console.log('  ✅ Resume uploaded via file chooser');
      return;
    }
  } catch {}
  console.log('  ⚠️  Could not auto-upload resume — please attach manually in the browser');
}

// ── Greenhouse filler ──────────────────────────────────────────────────────

async function fillGreenhouse(page, candidate, pdfPath) {
  console.log('  Filling Greenhouse form...');

  // If the form fields aren't on page yet, look for a visible Apply button
  const hasForm = await page.locator('#first_name, #last_name, #email').count() > 0;
  if (!hasForm) {
    // Try visible apply buttons only (avoids invisible "Apply with Seek" etc.)
    const applyBtns = [
      'a.apply-button:visible',
      'a[href*="apply"]:visible',
      'button:has-text("Apply"):visible',
      'a:has-text("Apply for this Job"):visible',
      'a:has-text("Apply Now"):visible',
    ];
    for (const sel of applyBtns) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.count() > 0 && await btn.isVisible()) {
          await btn.click({ timeout: 5000 });
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          break;
        }
      } catch {}
    }
  }

  // Wait for form to appear
  await page.waitForSelector('#first_name, input[name="first_name"]', { timeout: 10000 }).catch(() => {});

  // Basic fields (Greenhouse IDs are stable)
  await fillSelector(page, '#first_name', candidate.firstName);
  await fillSelector(page, '#last_name', candidate.lastName);
  await fillSelector(page, '#email', candidate.email);
  await fillSelector(page, '#phone', candidate.phone);

  // Fallback for non-standard Greenhouse embeds
  await fillByLabel(page, ['first name'], candidate.firstName);
  await fillByLabel(page, ['last name'], candidate.lastName);
  await fillByLabel(page, ['email'], candidate.email);
  await fillByLabel(page, ['phone'], candidate.phone);

  // Social / portfolio
  await fillByLabel(page, ['linkedin'], candidate.linkedin);
  await fillByLabel(page, ['github'], candidate.github);
  await fillByLabel(page, ['portfolio', 'personal.*site', 'website'], candidate.portfolio);

  // Location
  await fillByLabel(page, ['city'], candidate.city);
  await fillByLabel(page, ['state'], candidate.state);
  await fillByLabel(page, ['zip', 'postal'], candidate.zip);

  // Work auth / sponsorship
  await fillByLabel(page, ['authorized.*work', 'work authorization', 'legally authorized'], candidate.workAuthYes);
  await fillByLabel(page, ['require.*sponsor', 'need.*sponsor', 'visa sponsor'], candidate.sponsorYes);

  // Resume upload
  await uploadResume(page, pdfPath);

  // EEO fields (dropdowns — best effort)
  await selectByLabel(page, ['gender', 'gender identity'], candidate.gender);
  await selectByLabel(page, ['race', 'ethnicity'], candidate.ethnicity);
  await selectByLabel(page, ['veteran', 'military'], candidate.veteran);
  await selectByLabel(page, ['disability'], candidate.disability);
}

// ── Lever filler ───────────────────────────────────────────────────────────

async function fillLever(page, candidate, pdfPath) {
  console.log('  Filling Lever form...');

  await page.waitForSelector('form', { timeout: 10000 });

  await fillByLabel(page, ['full name', 'name'], candidate.fullName);
  await fillByLabel(page, ['first name', 'given name'], candidate.firstName);
  await fillByLabel(page, ['last name', 'surname', 'family'], candidate.lastName);
  await fillByLabel(page, ['email', 'e-mail'], candidate.email);
  await fillByLabel(page, ['phone', 'mobile', 'telephone'], candidate.phone);
  await fillByLabel(page, ['linkedin', 'linkedin profile'], candidate.linkedin);
  await fillByLabel(page, ['github', 'portfolio', 'website', 'personal site'], candidate.github);
  await fillByLabel(page, ['current company', 'current employer'], 'Sona AI');
  await fillByLabel(page, ['current title', 'job title'], 'Lead Software Engineer');
  await fillByLabel(page, ['location', 'city'], candidate.city);
  await fillByLabel(page, ['authorized', 'work authorization'], candidate.workAuthYes);
  await fillByLabel(page, ['sponsor', 'visa'], candidate.sponsorYes);

  await uploadResume(page, pdfPath);
}

// ── Ashby filler ───────────────────────────────────────────────────────────

async function fillAshby(page, candidate, pdfPath) {
  console.log('  Filling Ashby form...');

  // Ashby renders dynamically — wait for React hydration
  await page.waitForSelector('input', { timeout: 15000 });
  await page.waitForTimeout(1000); // let React finish

  // Click "Apply" if on listing page
  const applyBtn = page.getByRole('link', { name: /apply/i }).first();
  if (await applyBtn.count() > 0) {
    await applyBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  await fillByLabel(page, ['first name', 'given'], candidate.firstName);
  await fillByLabel(page, ['last name', 'family', 'surname'], candidate.lastName);
  await fillByLabel(page, ['email'], candidate.email);
  await fillByLabel(page, ['phone', 'mobile'], candidate.phone);
  await fillByLabel(page, ['linkedin'], candidate.linkedin);
  await fillByLabel(page, ['github', 'portfolio', 'website'], candidate.github);
  await fillByLabel(page, ['current company', 'employer'], 'Sona AI');
  await fillByLabel(page, ['current title', 'role'], 'Lead Software Engineer');
  await fillByLabel(page, ['location', 'city'], candidate.city);
  await fillByLabel(page, ['authorized', 'work authorization'], candidate.workAuthYes);
  await fillByLabel(page, ['sponsor'], candidate.sponsorYes);
  await fillByLabel(page, ['salary', 'compensation', 'expected'], candidate.salaryRange);

  await uploadResume(page, pdfPath);
}

// ── Workday filler (multi-step) ────────────────────────────────────────────

async function fillWorkday(page, candidate, pdfPath) {
  console.log('  Filling Workday form (multi-step — following you through each step)...');

  // Wait for Workday SPA to load
  await page.waitForSelector('[data-automation-id]', { timeout: 20000 });
  await page.waitForTimeout(2000);

  const wd = async (automationId, value) => {
    await fillSelector(page, `[data-automation-id="${automationId}"]`, value);
  };

  // Personal info
  await wd('legalNameSection_firstName', candidate.firstName);
  await wd('legalNameSection_lastName', candidate.lastName);
  await wd('email', candidate.email);
  await wd('phone-number', candidate.phoneDigits);

  // Address
  await wd('addressSection_city', candidate.city);
  await wd('addressSection_postalCode', candidate.zip);

  // LinkedIn
  await wd('linkedIn', candidate.linkedin);
  await fillByLabel(page, ['linkedin'], candidate.linkedin);

  // Resume upload
  await uploadResume(page, pdfPath);

  console.log('  ℹ️  Workday forms have multiple steps — fill remaining pages manually.');
  console.log('     The browser is open. Continue through each step, then submit.');
}

// ── Generic heuristic filler ───────────────────────────────────────────────

async function fillGeneric(page, candidate, pdfPath) {
  console.log('  Filling form (generic heuristics)...');

  await page.waitForSelector('input', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);

  await fillByLabel(page, ['first name', 'given name', 'firstname'], candidate.firstName);
  await fillByLabel(page, ['last name', 'surname', 'family name', 'lastname'], candidate.lastName);
  await fillByLabel(page, ['full name', 'your name'], candidate.fullName);
  await fillByLabel(page, ['email', 'e-mail', 'email address'], candidate.email);
  await fillByLabel(page, ['phone', 'mobile', 'telephone', 'phone number'], candidate.phone);
  await fillByLabel(page, ['linkedin', 'linkedin profile', 'linkedin url'], candidate.linkedin);
  await fillByLabel(page, ['github', 'github profile'], candidate.github);
  await fillByLabel(page, ['portfolio', 'personal site', 'website', 'personal website'], candidate.portfolio);
  await fillByLabel(page, ['current company', 'current employer', 'employer'], 'Sona AI');
  await fillByLabel(page, ['current title', 'job title', 'current role'], 'Lead Software Engineer');
  await fillByLabel(page, ['city', 'current city'], candidate.city);
  await fillByLabel(page, ['state', 'province', 'region'], candidate.state);
  await fillByLabel(page, ['zip', 'postal code', 'zip code'], candidate.zip);
  await fillByLabel(page, ['country'], candidate.country);
  await fillByLabel(page, ['salary', 'compensation', 'expected salary', 'desired salary'], candidate.salaryRange);
  await fillByLabel(page, ['authorized.*work', 'work.*authorized', 'legally authorized', 'work authorization'], candidate.workAuthYes);
  await fillByLabel(page, ['sponsor', 'visa sponsor', 'require.*sponsor', 'need.*sponsor'], candidate.sponsorYes);

  await uploadResume(page, pdfPath);
}

// ── Wait for user ──────────────────────────────────────────────────────────

function waitForInput(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans.trim()); }));
}

// ── Main ───────────────────────────────────────────────────────────────────

const FILLERS = {
  greenhouse: fillGreenhouse,
  lever:      fillLever,
  ashby:      fillAshby,
  workday:    fillWorkday,
  generic:    fillGeneric,
};

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Apply Form Filler');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  URL: ${jobUrl}`);
  if (pdfPath) console.log(`  PDF: ${pdfPath}`);

  const ats = detectATS(jobUrl);
  console.log(`  ATS: ${ats}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 60,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    console.log('Opening browser and navigating...');
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const filler = FILLERS[ats] || fillGeneric;
    await filler(page, CANDIDATE, pdfPath);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Fields filled! Browser window is open.');
    console.log('');
    console.log('👀 Review all fields in the browser window.');
    console.log('   Fix anything that looks wrong or incomplete.');
    console.log('   Upload resume manually if auto-upload failed.');
    console.log('   Then click SUBMIT in the browser.');
    console.log('');
    const answer = await waitForInput('Type "done" after submitting (or "skip" to close): ');

    if (answer.toLowerCase() === 'done') {
      console.log('\n🎉 Marked as submitted!');
      console.log('   → Update tracker: /career-ops tracker');
      console.log('   → LinkedIn outreach: /career-ops contacto');
    }
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    console.log('Browser is still open — fill manually.');
    await waitForInput('Press Enter to close browser → ');
  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
