import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const template = readFileSync('templates/cv-template.html', 'utf8');
const TODAY = '2026-04-22';

const SKILLS = `<ul class="skills-list">
  <li><strong>Languages:</strong> Python, Java, TypeScript, Go, Kotlin, C++</li>
  <li><strong>Backend &amp; APIs:</strong> FastAPI, Spring Boot, REST, GraphQL, Microservices, gRPC, Node.js; SaaS platform architecture and continuous deployment</li>
  <li><strong>Distributed Systems &amp; ML:</strong> Kafka, Spark, Flink, Airflow, XGBoost, LightGBM, PyTorch, Ray; real-time and low-latency APIs at scale</li>
  <li><strong>Frontend:</strong> React (17+), Angular, React Native, Next.js, Tailwind, HTML, CSS, JavaScript</li>
  <li><strong>Databases &amp; Data:</strong> PostgreSQL, MongoDB, DynamoDB, Redis, Aurora, MySQL, Oracle, Parquet</li>
  <li><strong>Cloud &amp; Infrastructure:</strong> AWS (Lambda, S3, RDS, ECS, EKS, DynamoDB, API Gateway, CloudWatch), Azure (AKS), Kubernetes</li>
  <li><strong>CI/CD &amp; DevOps:</strong> GitHub Actions, GitLab CI, Jenkins, Docker, Terraform, Maven, Gradle; feature flagging, TDD</li>
  <li><strong>Observability:</strong> Prometheus, Grafana, ELK, Splunk, New Relic, Datadog, Dynatrace</li>
  <li><strong>Testing:</strong> Redux, RTK Query, Jest, React Testing Library, Cypress, Selenium, JUnit, PyTest</li>
  <li><strong>Other:</strong> Technical leadership and mentorship, Agile/Scrum, Domain-driven design</li>
</ul>`;

const EXP = `
<div class="job">
  <div class="job-top-row"><span class="job-company">Sona AI</span><span class="job-location">Austin, USA</span></div>
  <div class="job-role-row"><span class="job-role">Lead Software Engineer</span><span class="job-date">June 2025 - Present</span></div>
  <ul>
    <li>Led backend and full-stack architecture for AI-powered SaaS platform, owning strategic technical initiatives end-to-end from system design through production rollout.</li>
    <li>Designed and scaled distributed event-driven services with Python/FastAPI, PostgreSQL, Redis, and Kafka, achieving 99.9% uptime and supporting 3x traffic growth with zero downtime deployments.</li>
    <li>Integrated GPT-4/Claude APIs into core SaaS workflows, reducing manual processing time by 35% and improving operational efficiency across the platform.</li>
    <li>Built GraphQL and REST APIs supporting 10K+ daily requests with sub-100ms p95 latency, serving React web and React Native mobile applications.</li>
    <li>Implemented CI/CD automation using GitHub Actions and Terraform, cutting deployment cycle time by 40%.</li>
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
    <li>Spearheaded migration of legacy monoliths into Spring Boot microservices, reducing deployment lead time by 40%.</li>
    <li>Designed high-throughput event-driven pipelines using Kafka, Spark Streaming, and AWS Kinesis.</li>
    <li>Productionized PyTorch-based fraud detection APIs, enhancing anomaly detection accuracy by 18%.</li>
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
    <li>Built full-stack SaaS analytics platform: React/Vite frontend, Python/FastAPI backend, PostgreSQL and Redis deployed on Vercel and Render.</li>
    <li>Engineered an XGBoost/LightGBM ML ensemble with live DraftKings prop line integration via The Odds API.</li>
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

const ROLES = [
  {
    slug: 'anthropic-staff-backend',
    summary: 'Staff-level Software Engineer with 7+ years building high-scale distributed backends and AI-integrated SaaS platforms. Expert in Python, Go, Java, and TypeScript — currently leading backend architecture at Sona AI delivering a Claude/GPT-4-powered platform at 10K+ daily requests, sub-100ms p95 latency, and 99.9% uptime. Deep experience with Kafka, Kubernetes, AWS EKS, PostgreSQL, and event-driven microservices at enterprise scale. Proven technical leader: system design ownership, cross-functional mentorship, and CI/CD automation driving 40% faster deployments. Built StatRush, a live ML analytics platform. Masters in Information Systems, University of Houston-Clear Lake. Open to sponsorship.',
  },
  {
    slug: 'cohere-applied-ai-agentic',
    summary: 'Applied AI Engineer with 7+ years building and deploying LLM-powered agentic systems at scale. Expert in Python and TypeScript, designing agent architectures, tool-use workflows, and multi-step reasoning pipelines — currently building Claude/GPT-4 integrations at Sona AI (10K+ daily requests, sub-100ms latency, 99.9% uptime). Built production agentic workflows, function-calling pipelines, and evaluation frameworks for LLM quality. Deep distributed systems background: Kafka, Kubernetes, AWS, FastAPI. Masters in Information Systems, University of Houston-Clear Lake. Open to sponsorship.',
  },
  {
    slug: 'cohere-senior-staff-backend',
    summary: 'Senior/Staff Backend Engineer with 7+ years designing distributed SaaS systems and high-throughput APIs at scale. Expert in Python, Go, Java, and TypeScript — currently leading backend and distributed systems work at Sona AI (10K+ daily requests, 3x traffic growth, 99.9% uptime with Kafka/FastAPI/PostgreSQL/Redis). Deep AWS and Kubernetes expertise; fintech-grade reliability engineering across $2B+ daily transaction volumes at Moodys. Proven technical leader with CI/CD automation, observability dashboards, and cross-team mentorship. Masters in Information Systems, University of Houston-Clear Lake. Open to sponsorship.',
  },
];

function build(role) {
  return template
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
}

for (const role of ROLES) {
  const html = build(role);
  const htmlPath = `output/cv-sujith-kumar-reddy-${role.slug}-${TODAY}.html`;
  const pdfPath  = `output/cv-sujith-kumar-reddy-${role.slug}-${TODAY}.pdf`;
  writeFileSync(htmlPath, html, 'utf8');
  execSync(`node generate-pdf.mjs "${htmlPath}" "${pdfPath}" --format=letter`, { stdio: 'pipe' });
  console.log(`✅ ${role.slug}`);
}
console.log('Done.');
