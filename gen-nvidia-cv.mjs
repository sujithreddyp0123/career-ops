import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const template = readFileSync('templates/cv-template.html', 'utf8');
const TODAY = '2026-04-23';

const SKILLS = `<ul class="skills-list">
  <li><strong>Languages:</strong> Python, Go, C++, Java, TypeScript, Kotlin</li>
  <li><strong>AI &amp; ML:</strong> PyTorch, XGBoost, LightGBM, Ray; LLM agent architectures (GPT-4, Claude), multi-step reasoning pipelines, function-calling, RAG, agentic workflow design</li>
  <li><strong>Backend &amp; APIs:</strong> FastAPI, Spring Boot, gRPC, REST, GraphQL, Microservices, Node.js; high-throughput real-time APIs at scale</li>
  <li><strong>Distributed Systems:</strong> Kafka, Spark, Flink, Airflow; event-driven architectures and low-latency data pipelines</li>
  <li><strong>Frontend:</strong> React (17+), Next.js, Angular, React Native, Tailwind, TypeScript</li>
  <li><strong>Databases &amp; Data:</strong> PostgreSQL, MongoDB, DynamoDB, Redis, Aurora, MySQL, Parquet</li>
  <li><strong>Cloud &amp; Infrastructure:</strong> AWS (Lambda, S3, ECS, EKS, DynamoDB, API Gateway, CloudWatch), Azure (AKS), Kubernetes, Docker, Terraform</li>
  <li><strong>CI/CD &amp; DevOps:</strong> GitHub Actions, GitLab CI, Jenkins, Maven, Gradle; feature flagging, TDD</li>
  <li><strong>Observability:</strong> Prometheus, Grafana, ELK, Splunk, Datadog, CloudWatch</li>
</ul>`;

const EXP = `
<div class="job">
  <div class="job-top-row"><span class="job-company">Sona AI</span><span class="job-location">Austin, USA</span></div>
  <div class="job-role-row"><span class="job-role">Lead Software Engineer</span><span class="job-date">June 2025 - Present</span></div>
  <ul>
    <li>Designed and shipped agentic AI workflow systems integrating Claude and GPT-4 APIs — multi-step reasoning pipelines, function-calling orchestration, and tool-use frameworks that reduced manual processing time by 35%.</li>
    <li>Architected distributed backend with Python/FastAPI, PostgreSQL, Redis, and Kafka — 99.9% uptime, 3x traffic growth absorbed with zero downtime deployments and sub-100ms p95 latency at 10K+ daily requests.</li>
    <li>Built GraphQL and REST APIs powering React web and React Native mobile clients; led full-stack ownership from system design through production rollout.</li>
    <li>Implemented CI/CD automation with GitHub Actions and Terraform, cutting deployment cycle time by 40%.</li>
    <li>Established engineering observability with Grafana and CloudWatch, reducing incident MTTR by 30%.</li>
    <li>Mentored engineers across US and Vietnam teams through code reviews and system design sessions.</li>
  </ul>
</div>
<div class="job">
  <div class="job-top-row"><span class="job-company">HP</span><span class="job-location">Bangalore, India</span></div>
  <div class="job-role-row"><span class="job-role">Senior Software Engineer</span><span class="job-date">Aug 2021 - Dec 2022</span></div>
  <ul>
    <li>Developed and scaled Java/Spring Boot and Python/FastAPI microservices for HP's global firmware SaaS platform serving millions of devices worldwide.</li>
    <li>Built high-throughput event-driven pipelines with Kafka, AWS SQS, and Redis, improving system reliability by 30%.</li>
    <li>Designed secure backend services on AWS EKS using Kubernetes, Helm, and Argo for automated rollouts.</li>
    <li>Enhanced observability using Prometheus, Grafana, and Datadog, reducing MTTR by 20%.</li>
  </ul>
</div>
<div class="job">
  <div class="job-top-row"><span class="job-company">Rime Soft Pvt Ltd</span><span class="job-location">Hyderabad, India</span></div>
  <div class="job-role-row"><span class="job-role">Software Engineer</span><span class="job-date">June 2019 - Aug 2021</span></div>
  <ul>
    <li>Built secure, low-latency Python and Java/Spring Boot microservices for Moody's financial payment platform handling $2B+ in daily transaction volume.</li>
    <li>Designed high-throughput event-driven pipelines using Kafka, Spark Streaming, and AWS Kinesis for real-time data processing.</li>
    <li>Productionized PyTorch-based fraud detection APIs, enhancing anomaly detection accuracy by 18%.</li>
    <li>Spearheaded migration of legacy monoliths into Spring Boot microservices, reducing deployment lead time by 40%.</li>
  </ul>
</div>
<div class="job">
  <div class="job-top-row"><span class="job-company">Grepthor Technologies</span><span class="job-location">Hyderabad, India</span></div>
  <div class="job-role-row"><span class="job-role">Software Engineer</span><span class="job-date">Jan 2018 - June 2019</span></div>
  <ul>
    <li>Built secure Python FastAPI services for HDFC banking platform serving 1M+ customers.</li>
    <li>Designed real-time ingestion pipelines using Kafka and Flink for scalable event processing.</li>
    <li>Implemented OAuth2 and JWT authentication for multi-tenant banking applications.</li>
  </ul>
</div>`;

const PROJ = `<div class="project">
  <div class="project-title">StatRush — AI-Powered NBA Analytics Platform | <a href="https://statrush.vercel.app">statrush.vercel.app</a> | <a href="https://github.com/sujithreddyp0123">github.com/sujithreddyp0123</a></div>
  <ul>
    <li>Built full-stack agentic analytics platform: React/Vite frontend, Python/FastAPI backend, PostgreSQL and Redis deployed on Vercel and Render.</li>
    <li>Engineered XGBoost/LightGBM ML ensemble with live DraftKings prop line integration via The Odds API; LLM-assisted reasoning layer for confidence scoring.</li>
    <li>Implemented Kelly Criterion bet sizing to surface high-value prop opportunities with explainable confidence scoring.</li>
  </ul>
</div>`;

const EDU = `<ul class="edu-list">
  <li><strong>Master's in Information Systems</strong> — University of Houston-Clear Lake (Jan 2023 - Dec 2024)</li>
  <li><strong>Bachelor's in Computer Science</strong> — Panimalar Institute of Technology, Anna University</li>
</ul>`;

const CERTS = `<ul class="cert-list">
  <li>AWS Certified Developer - Associate (Issued Apr 2025, Expires Apr 2028)</li>
  <li>Certified ScrumMaster (CSM)</li>
</ul>`;

const SUMMARY = `Senior Software Engineer with 7+ years specializing in agentic AI systems, distributed backends, and real-time data platforms. Currently leading agentic workflow development at Sona AI — designing multi-step LLM orchestration pipelines (Claude, GPT-4), function-calling frameworks, and tool-use systems at 10K+ daily requests, sub-100ms p95 latency, 99.9% uptime. Expert in Python, Go, C++, PyTorch, Kafka, Kubernetes, and AWS at scale. Proven ability to ship production AI applications end-to-end: system design, API integration, observability, and cross-team mentorship. Built StatRush, a live agentic ML analytics platform. Masters in Information Systems, University of Houston-Clear Lake. Open to sponsorship.`;

const role = {
  slug: 'nvidia-agentic-ai',
  summary: SUMMARY,
};

const html = template
  .replace('{{LANG}}', 'en')
  .replace('{{PAGE_WIDTH}}', '8.5in')
  .replace(/{{NAME}}/g, 'Sujith Kumar Reddy')
  .replace('{{PHONE}}', '346-575-8665')
  .replace('{{EMAIL}}', 'sujithreddyp0123@gmail.com')
  .replace('{{LINKEDIN_URL}}', 'https://linkedin.com/in/sujithponnaluru')
  .replace('{{LINKEDIN_DISPLAY}}', 'linkedin.com/in/sujithponnaluru')
  .replace('{{GITHUB_URL}}', 'https://github.com/sujithreddyp0123')
  .replace('{{GITHUB_DISPLAY}}', 'github.com/sujithreddyp0123')
  .replace('{{LOCATION}}', 'United States (open to relocation)')
  .replace('{{SECTION_SUMMARY}}', 'Professional Summary')
  .replace('{{SUMMARY_TEXT}}', role.summary)
  .replace('{{SECTION_SKILLS}}', 'Technical Skills')
  .replace('{{SKILLS}}', SKILLS)
  .replace('{{SECTION_EXPERIENCE}}', 'Professional Experience')
  .replace('{{EXPERIENCE}}', EXP)
  .replace('{{SECTION_PROJECTS}}', 'Projects')
  .replace('{{PROJECTS}}', PROJ)
  .replace('{{SECTION_EDUCATION}}', 'Education')
  .replace('{{EDUCATION}}', EDU)
  .replace('{{SECTION_CERTIFICATIONS}}', 'Certifications')
  .replace('{{CERTIFICATIONS}}', CERTS);

const htmlPath = `output/cv-sujith-kumar-reddy-${role.slug}-${TODAY}.html`;
const pdfPath  = `output/cv-sujith-kumar-reddy-${role.slug}-${TODAY}.pdf`;
writeFileSync(htmlPath, html, 'utf8');
execSync(`node generate-pdf.mjs "${htmlPath}" "${pdfPath}" --format=letter`, { stdio: 'pipe' });
console.log(`✅ ${pdfPath}`);
