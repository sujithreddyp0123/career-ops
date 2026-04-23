#!/usr/bin/env node
/**
 * scan-fresh.mjs — Find recently posted jobs, score by fit, pick top N, generate CVs
 *
 * Usage:
 *   node scan-fresh.mjs              # top 10, last 48h
 *   node scan-fresh.mjs --today      # today only (since midnight)
 *   node scan-fresh.mjs --limit 20  # top 20
 *   node scan-fresh.mjs --dry-run   # show without generating CVs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import yaml from 'js-yaml';

const args      = process.argv.slice(2);
const dryRun    = args.includes('--dry-run');
const todayOnly = args.includes('--today');
const limitIdx  = args.indexOf('--limit');
const LIMIT     = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : 10;

const config      = yaml.load(readFileSync('portals.yml', 'utf8'));
const profile     = yaml.load(readFileSync('config/profile.yml', 'utf8'));
const companies   = config.tracked_companies || [];

const NOW    = new Date();
const TODAY  = NOW.toISOString().slice(0, 10);
// --today: since midnight local; default: last 48h
const CUTOFF = todayOnly
  ? new Date(TODAY + 'T00:00:00.000Z')
  : new Date(NOW.getTime() - 48 * 60 * 60 * 1000);

const FETCH_TIMEOUT = 10_000;
const CONCURRENCY   = 8;

// ── Title filter ────────────────────────────────────────────────────────────

function buildTitleFilter(tf) {
  const pos = (tf?.positive || []).map(k => k.toLowerCase());
  const neg = (tf?.negative || []).map(k => k.toLowerCase());
  return title => {
    const t = title.toLowerCase();
    return (pos.length === 0 || pos.some(k => t.includes(k))) && !neg.some(k => t.includes(k));
  };
}
const titleFilter = buildTitleFilter(config.title_filter);

// ── API detection ────────────────────────────────────────────────────────────

function detectApi(c) {
  if (c.api?.includes('greenhouse')) return { type: 'greenhouse', url: c.api };
  const url = c.careers_url || '';
  const ashby  = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  if (ashby)  return { type: 'ashby',  url: `https://api.ashbyhq.com/posting-api/job-board/${ashby[1]}?includeCompensation=true` };
  const lever  = url.match(/jobs\.lever\.co\/([^/?#]+)/);
  if (lever)  return { type: 'lever',  url: `https://api.lever.co/v0/postings/${lever[1]}` };
  const ghEU   = url.match(/job-boards(?:\.eu)?\.greenhouse\.io\/([^/?#]+)/);
  if (ghEU && !c.api) return { type: 'greenhouse', url: `https://boards-api.greenhouse.io/v1/boards/${ghEU[1]}/jobs` };
  return null;
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchJson(url) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timer); }
}

// ── Date extraction per ATS ──────────────────────────────────────────────────

function extractDate(job, type) {
  if (type === 'greenhouse') return job.updated_at ? new Date(job.updated_at) : null;
  if (type === 'ashby')      return job.publishedDate ? new Date(job.publishedDate) : null;
  if (type === 'lever')      return job.createdAt ? new Date(job.createdAt) : null;
  return null;
}

// ── Parsers ──────────────────────────────────────────────────────────────────

function parseJobs(json, type, company) {
  const raw = type === 'greenhouse' ? (json.jobs || [])
            : type === 'ashby'      ? (json.jobs || [])
            : Array.isArray(json)   ? json : [];

  return raw.map(j => {
    const title    = j.title || j.text || '';
    const url      = j.absolute_url || j.jobUrl || j.hostedUrl || '';
    const location = j.location?.name || j.location || j.categories?.location || '';
    const posted   = extractDate(j, type);
    return { title, url, location, company: company.name, type, posted };
  });
}

// ── Fit scoring ──────────────────────────────────────────────────────────────

function scoreJob(job) {
  const t = (job.title + ' ' + job.company).toLowerCase();
  let score = 0;
  // Role level
  if (/staff|principal/.test(t))          score += 3;
  if (/lead|senior/.test(t))              score += 2;
  // Domain alignment
  if (/ai engineer|applied ai|llm/.test(t))        score += 4;
  if (/ml engineer|machine learning/.test(t))       score += 4;
  if (/agentic|agent|rag|inference/.test(t))        score += 3;
  if (/backend|platform|distributed|infra/.test(t)) score += 3;
  if (/full.?stack|fullstack/.test(t))              score += 2;
  if (/data engineer|data platform/.test(t))        score += 2;
  // Company quality signals
  if (/anthropic|openai|cohere|mistral|deepmind/.test(t)) score += 3;
  if (/glean|databricks|pinecone|langchain|perplexity/.test(t)) score += 2;
  if (/nvidia|spotify|netflix|adobe/.test(t))       score += 1;
  // Date freshness bonus
  if (job.posted) {
    const hoursAgo = (Date.now() - job.posted.getTime()) / 3_600_000;
    if (hoursAgo < 6)  score += 4;
    else if (hoursAgo < 12) score += 3;
    else if (hoursAgo < 24) score += 2;
    else score += 1;
  }
  return score;
}

// ── US location filter ────────────────────────────────────────────────────────

const US_SIGNALS = ['remote', 'united states', ', us', ', usa', 'new york', 'san francisco',
  'seattle', 'austin', 'boston', 'chicago', 'denver', 'los angeles', 'atlanta', 'sf', 'nyc', 'ny'];

function isUSOrRemote(location) {
  if (!location) return true; // no location = assume remote/US
  const l = location.toLowerCase();
  return US_SIGNALS.some(s => l.includes(s));
}

// ── Parallel fetch ────────────────────────────────────────────────────────────

async function parallelFetch(tasks, limit) {
  const results = [];
  let i = 0;
  async function next() {
    while (i < tasks.length) {
      const t = tasks[i++];
      results.push(await t().catch(e => ({ error: e.message })));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, next));
  return results;
}

// ── CV generator for fresh job ────────────────────────────────────────────────

function buildCV(job, template) {
  const c = profile.candidate;
  const slug = `${job.company.toLowerCase().replace(/\W+/g, '-')}-${job.title.toLowerCase().replace(/\W+/g, '-').slice(0, 30)}`;

  // Generic tailored summary
  const summary = `Principal-level Software Engineer with 7+ years building distributed SaaS systems at scale. ` +
    `Expert in Python, Java, TypeScript, and Go — currently leading backend architecture at Sona AI, ` +
    `delivering a GPT-4/Claude-powered platform at 10K+ daily requests with sub-100ms p95 latency and 99.9% uptime. ` +
    `Deep experience with Kafka, Kubernetes, AWS, and event-driven microservices across fintech and enterprise SaaS. ` +
    `Built StatRush, a live AI analytics platform using XGBoost/LightGBM ensemble. ` +
    `Master's in Information Systems, University of Houston-Clear Lake. Open to sponsorship.`;

  let html = template
    .replace('{{LANG}}', 'en')
    .replace('{{PAGE_WIDTH}}', '8.5in')
    .replace(/{{NAME}}/g, c.full_name)
    .replace('{{PHONE}}', c.phone)
    .replace('{{EMAIL}}', c.email)
    .replace('{{LINKEDIN_URL}}', `https://${c.linkedin}`)
    .replace('{{LINKEDIN_DISPLAY}}', c.linkedin)
    .replace('{{GITHUB_URL}}', `https://${c.github}`)
    .replace('{{GITHUB_DISPLAY}}', c.github)
    .replace('{{LOCATION}}', 'United States (open to relocation)')
    .replace('{{SECTION_SUMMARY}}', 'Professional Summary')
    .replace('{{SUMMARY_TEXT}}', summary)
    .replace('{{SECTION_SKILLS}}', 'Technical Skills')
    .replace('{{SKILLS}}', `<ul class="skills-list">
      <li><strong>Languages:</strong> Python, Java, TypeScript, Go, Kotlin, C++</li>
      <li><strong>Backend &amp; APIs:</strong> FastAPI, Spring Boot, REST, GraphQL, Microservices, gRPC, Node.js; SaaS platform architecture</li>
      <li><strong>Distributed Systems &amp; ML:</strong> Kafka, Spark, Flink, Airflow, XGBoost, LightGBM, PyTorch, Ray; real-time APIs at scale</li>
      <li><strong>Frontend:</strong> React (17+), Angular, React Native, Next.js, Tailwind, HTML, CSS, JavaScript</li>
      <li><strong>Databases &amp; Data:</strong> PostgreSQL, MongoDB, DynamoDB, Redis, Aurora, MySQL, Oracle, Parquet</li>
      <li><strong>Cloud &amp; Infrastructure:</strong> AWS (Lambda, S3, RDS, ECS, EKS, DynamoDB, API Gateway, CloudWatch), Azure (AKS), Kubernetes</li>
      <li><strong>CI/CD &amp; DevOps:</strong> GitHub Actions, GitLab CI, Jenkins, Docker, Terraform, Maven, Gradle; feature flagging, TDD</li>
      <li><strong>Observability:</strong> Prometheus, Grafana, ELK, Splunk, New Relic, Datadog, Dynatrace</li>
      <li><strong>Testing:</strong> Redux, RTK Query, Jest, React Testing Library, Cypress, Selenium, JUnit, PyTest</li>
      <li><strong>Other:</strong> Technical leadership, Agile/Scrum, Domain-driven design, cross-functional collaboration</li>
    </ul>`)
    .replace('{{SECTION_EXPERIENCE}}', 'Professional Experience')
    .replace('{{EXPERIENCE}}', `
    <div class="job">
      <div class="job-top-row"><span class="job-company">Sona AI</span><span class="job-location">Austin, USA</span></div>
      <div class="job-role-row"><span class="job-role">Lead Software Engineer</span><span class="job-date">June 2025 - Present</span></div>
      <ul>
        <li>Led backend and full-stack architecture for AI-powered SaaS platform, owning strategic technical initiatives end-to-end from system design through production rollout.</li>
        <li>Designed and scaled distributed event-driven services with Python/FastAPI, PostgreSQL, Redis, and Kafka, achieving 99.9% uptime and supporting 3x traffic growth with zero downtime deployments.</li>
        <li>Integrated GPT-4/Claude APIs into core SaaS workflows, reducing manual processing time by 35% and improving operational efficiency across the platform.</li>
        <li>Built GraphQL and REST APIs supporting 10K+ daily requests with sub-100ms p95 latency, serving React web and React Native mobile applications.</li>
        <li>Implemented CI/CD automation using GitHub Actions and Terraform, cutting deployment cycle time by 40%.</li>
        <li>Established engineering observability dashboards with Grafana and CloudWatch, reducing incident MTTR by 30%.</li>
        <li>Mentored engineers across US and Vietnam teams through code reviews and system design sessions.</li>
      </ul>
    </div>
    <div class="job">
      <div class="job-top-row"><span class="job-company">HP</span><span class="job-location">Bangalore, India</span></div>
      <div class="job-role-row"><span class="job-role">Senior Software Engineer</span><span class="job-date">Aug 2021 - Dec 2022</span></div>
      <ul>
        <li>Developed and scaled Java/Spring Boot and Python/FastAPI microservices for HP's global firmware SaaS platform used by millions of devices worldwide.</li>
        <li>Built high-throughput event-driven pipelines with Kafka, AWS SQS, and Redis, improving system reliability by 30%.</li>
        <li>Designed secure backend services on AWS EKS using Kubernetes, Helm, and Argo for automated rollouts.</li>
        <li>Enhanced observability using Prometheus, Grafana, and Datadog, reducing MTTR by 20%.</li>
        <li>Participated in on-call rotations, performing root-cause analysis for production incidents.</li>
      </ul>
    </div>
    <div class="job">
      <div class="job-top-row"><span class="job-company">Rime Soft Pvt Ltd</span><span class="job-location">Hyderabad, India</span></div>
      <div class="job-role-row"><span class="job-role">Software Engineer</span><span class="job-date">June 2019 - Aug 2021</span></div>
      <ul>
        <li>Built secure, low-latency Python and Java/Spring Boot microservices for Moody's financial payment platform handling $2B+ in daily transaction volume.</li>
        <li>Spearheaded migration of legacy monoliths into Spring Boot microservices, reducing deployment lead time by 40%.</li>
        <li>Designed high-throughput event-driven pipelines using Kafka, Spark Streaming, and AWS Kinesis.</li>
        <li>Productionized PyTorch-based fraud detection APIs, enhancing anomaly detection accuracy by 18%.</li>
        <li>Automated CI/CD pipelines with GitLab CI, Docker, and Helm on Kubernetes clusters.</li>
      </ul>
    </div>
    <div class="job">
      <div class="job-top-row"><span class="job-company">Grepthor Technologies</span><span class="job-location">Hyderabad, India</span></div>
      <div class="job-role-row"><span class="job-role">Software Engineer</span><span class="job-date">Jan 2018 - June 2019</span></div>
      <ul>
        <li>Built secure, high-performance Python FastAPI services for HDFC banking platform serving 1M+ customers.</li>
        <li>Designed real-time ingestion pipelines using Kafka and Flink for scalable event processing.</li>
        <li>Implemented OAuth2 and JWT authentication workflows for multi-tenant banking applications.</li>
      </ul>
    </div>`)
    .replace('{{SECTION_PROJECTS}}', 'Projects')
    .replace('{{PROJECTS}}', `
    <div class="project">
      <div class="project-title">StatRush — AI-Powered NBA Prop Betting Analytics Platform | <a href="https://statrush.vercel.app">statrush.vercel.app</a></div>
      <ul>
        <li>Built full-stack SaaS analytics platform: React/Vite frontend, Python/FastAPI backend, PostgreSQL, and Redis, deployed on Vercel and Render.</li>
        <li>Engineered an XGBoost/LightGBM ML ensemble trained on real NBA player data with live DraftKings prop line integration via The Odds API.</li>
        <li>Implemented Kelly Criterion bet sizing to surface high-value prop opportunities with explainable confidence scoring.</li>
      </ul>
    </div>`)
    .replace('{{SECTION_EDUCATION}}', 'Education')
    .replace('{{EDUCATION}}', `<ul class="edu-list">
      <li><strong>Master's in Information Systems</strong> — University of Houston-Clear Lake (Jan 2023 - Dec 2024)</li>
      <li><strong>Bachelor's in Computer Science</strong> — Panimalar Institute of Technology, Anna University</li>
    </ul>`)
    .replace('{{SECTION_CERTIFICATIONS}}', 'Certifications')
    .replace('{{CERTIFICATIONS}}', `<ul class="cert-list">
      <li>AWS Certified Developer - Associate (Issued Apr 2025, Expires Apr 2028)</li>
      <li>Certified ScrumMaster (CSM)</li>
    </ul>`);

  return { html, slug };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nFresh Job Scanner — last 48 hours (US/Remote)`);
  console.log(`Cutoff: ${CUTOFF.toISOString().slice(0, 16)} UTC\n`);

  // Build scan targets
  const targets = companies
    .filter(c => c.enabled !== false && !c.workday_api && !c.playwright_url && !c.scan_method)
    .map(c => ({ ...c, _api: detectApi(c) }))
    .filter(c => c._api !== null);

  console.log(`Scanning ${targets.length} portals...`);

  const allFresh = [];
  const errors   = [];

  const tasks = targets.map(company => async () => {
    const { type, url } = company._api;
    try {
      const json = await fetchJson(url);
      const jobs = parseJobs(json, type, company);
      for (const job of jobs) {
        if (!titleFilter(job.title)) continue;
        if (!isUSOrRemote(job.location))  continue;
        if (job.posted && job.posted < CUTOFF) continue; // too old
        allFresh.push(job);
      }
    } catch (e) {
      errors.push(`${company.name}: ${e.message}`);
    }
  });

  await parallelFetch(tasks, CONCURRENCY);

  // Score and sort by fit (high score first, then by freshness)
  allFresh.forEach(j => { j.score = scoreJob(j); });
  allFresh.sort((a, b) => b.score - a.score || (b.posted || 0) - (a.posted || 0));

  // Deduplicate by URL
  const seen = new Set();
  const deduped = allFresh.filter(j => {
    if (seen.has(j.url)) return false;
    seen.add(j.url);
    return true;
  });

  const top = deduped.slice(0, LIMIT);

  console.log(`\nFound ${deduped.length} fresh US/remote jobs → picking top ${top.length}\n`);
  console.log('━'.repeat(60));

  top.forEach((job, i) => {
    const dateStr = job.posted ? job.posted.toISOString().slice(0, 16).replace('T',' ') : 'date unknown';
    console.log(`${String(i+1).padStart(2)}. [score:${job.score}] [${dateStr}] ${job.company} — ${job.title}`);
    console.log(`    📍 ${job.location || 'Remote/US'}`);
    console.log(`    🔗 ${job.url}`);
  });

  console.log('━'.repeat(60));

  if (dryRun || top.length === 0) {
    if (errors.length) console.log(`\nErrors: ${errors.join(', ')}`);
    return;
  }

  // Generate CVs
  const template = readFileSync('templates/cv-template.html', 'utf8');
  console.log('\nGenerating tailored CVs...\n');

  const results = [];
  for (const job of top) {
    const { html, slug } = buildCV(job, template);
    const htmlPath = `output/cv-sujith-kumar-reddy-${slug}-${TODAY}.html`;
    const pdfPath  = `output/cv-sujith-kumar-reddy-${slug}-${TODAY}.pdf`;
    writeFileSync(htmlPath, html, 'utf8');
    try {
      execSync(`node generate-pdf.mjs "${htmlPath}" "${pdfPath}" --format=letter`, { stdio: 'pipe' });
      console.log(`  ✅ ${job.company} — ${job.title.slice(0, 45)}`);
      console.log(`     ${pdfPath}`);
      results.push({ job, pdfPath });
    } catch (e) {
      console.log(`  ❌ ${job.company} — PDF failed: ${e.message.slice(0, 60)}`);
      results.push({ job, pdfPath: null });
    }
  }

  // Print apply commands
  console.log('\n' + '━'.repeat(60));
  console.log('Ready to apply — run each command:');
  console.log('━'.repeat(60) + '\n');
  results.forEach((r, i) => {
    const pdf = r.pdfPath ? ` --pdf="${r.pdfPath}"` : '';
    console.log(`# ${i+1}. ${r.job.company} — ${r.job.title}`);
    console.log(`node apply-form.mjs "${r.job.url}"${pdf}\n`);
  });

  // Write apply script
  const applyScript = results.map((r, i) =>
    `# ${i+1}. ${r.job.company} — ${r.job.title}\nnode apply-form.mjs "${r.job.url}"${r.pdfPath ? ` --pdf="${r.pdfPath}"` : ''}`
  ).join('\n\n');
  writeFileSync('output/apply-batch.sh', applyScript, 'utf8');
  console.log('Commands also saved to output/apply-batch.sh');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
