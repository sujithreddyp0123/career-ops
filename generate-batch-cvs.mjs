#!/usr/bin/env node
/**
 * generate-batch-cvs.mjs
 * Generates 10 tailored HTML CVs + PDFs for the top scan results.
 * Run: node generate-batch-cvs.mjs
 */

import { writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Shared candidate data ─────────────────────────────────────────────────────

const CONTACT = {
  name: 'Sujith Kumar Reddy',
  phone: '346-575-8665',
  email: 'sujithreddyp0123@gmail.com',
  linkedin_url: 'https://linkedin.com/in/sujithponnaluru',
  linkedin_display: 'linkedin.com/in/sujithponnaluru',
  github_url: 'https://github.com/sujithreddyp0123',
  github_display: 'github.com/sujithreddyp0123',
};

// ── Role definitions ──────────────────────────────────────────────────────────

const ROLES = [
  {
    slug: 'anthropic-beneficial-deployments',
    company: 'Anthropic',
    title: 'Applied AI Engineer, Beneficial Deployments',
    format: 'letter',
    location_display: 'United States (open to SF or NYC)',
    summary: `Applied AI Engineer with 6+ years building and deploying LLM-powered applications at scale. Expert in prompting strategies, context engineering, agent architectures, and evaluation frameworks — built production Claude and GPT-4 integrations at Sona AI serving 10K+ daily requests at sub-100ms p95 latency with 99.9% uptime. Proven technical mentor and cross-functional collaborator: led engineering teams across the US and Vietnam, authored system design documentation, and delivered AI-powered automation that reduced manual processing by 35%. Built StatRush, a live ML analytics platform using an XGBoost/LightGBM ensemble. Master's in Information Systems, University of Houston-Clear Lake. On OPT, open to sponsorship.`,
    skillsOrder: ['languages_py_first', 'backend', 'ml_dl', 'frontend', 'databases', 'cloud', 'cicd', 'observability', 'testing', 'other'],
    sonaAIBullets: [
      'Built and deployed production LLM applications integrating Claude and GPT-4 APIs, including prompt engineering, context engineering, and agent design — reducing manual processing by 35% across core workflows.',
      'Designed and scaled distributed event-driven backend services with Python/FastAPI, PostgreSQL, Redis, and Kafka, achieving 99.9% uptime and supporting 3x traffic growth with zero downtime deployments.',
      'Built evaluation and observability infrastructure using Grafana and CloudWatch, reducing incident MTTR by 30% through proactive quality tracking and regression detection.',
      'Mentored engineers and led code reviews and system design sessions across US and Vietnam teams, elevating technical standards and accelerating delivery.',
      'Built GraphQL and REST APIs supporting 10K+ daily requests with sub-100ms p95 latency, serving both React web and React Native mobile applications.',
      'Implemented CI/CD automation using GitHub Actions and Terraform, cutting deployment cycle time by 40% and enabling same-day production releases.',
      'Refactored and optimized API layer and backend services, improving client and server performance by 25% through dependency modernization and query tuning.',
    ],
  },
  {
    slug: 'glean-ml-evals-observability',
    company: 'Glean',
    title: 'Machine Learning Engineer, LLM Evals & Observability',
    format: 'letter',
    location_display: 'United States',
    summary: `Machine Learning Engineer with 6+ years building AI systems, evaluation pipelines, and observability infrastructure at scale. Expert in Python and Go, designing distributed ML data pipelines and LLM quality measurement systems — built production observability dashboards at Sona AI (Grafana, CloudWatch, Prometheus; 30% MTTR reduction), productionized a PyTorch fraud detection API (+18% accuracy) at Rime Soft, and built an XGBoost/LightGBM ML ensemble with real-time data pipelines at StatRush. Deep experience with Kafka, Spark Streaming, and distributed event-driven systems processing billions of events. Master's in Information Systems, University of Houston-Clear Lake. On OPT, open to sponsorship.`,
    skillsOrder: ['ml_dl_first', 'languages_go_py', 'observability', 'databases', 'cloud', 'cicd', 'backend', 'frontend', 'testing', 'other'],
    sonaAIBullets: [
      'Built LLM evaluation and observability infrastructure using Grafana and CloudWatch, reducing incident MTTR by 30% through proactive latency tracking, quality regression detection, and engineering dashboards.',
      'Integrated GPT-4 and Claude APIs into production AI workflows, designing evaluation checkpoints to measure output quality and gate model changes against quality metrics.',
      'Designed and scaled distributed event-driven pipelines with Python/FastAPI, PostgreSQL, Redis, and Kafka, achieving 99.9% uptime and supporting 3x traffic growth.',
      'Built GraphQL and REST APIs supporting 10K+ daily requests with sub-100ms p95 latency, serving both web and mobile applications.',
      'Implemented CI/CD automation using GitHub Actions and Terraform, cutting deployment cycle time by 40%.',
      'Led code reviews, system design sessions, and cross-functional collaboration across engineering teams in the US and Vietnam.',
      'Refactored and optimized API layer and backend services, improving performance by 25% through dependency modernization and query tuning.',
    ],
  },
  {
    slug: 'glean-lead-product-backend',
    company: 'Glean',
    title: 'Lead Software Engineer, Product Backend',
    format: 'letter',
    location_display: 'United States',
    summary: `Lead Software Engineer with 6+ years building AI-integrated product backends at scale. Expert in Go, Java, TypeScript, and Python, designing REST APIs with OpenAPI contracts and distributed data systems (SQL and NoSQL) — currently leading backend and product feature delivery at Sona AI, owning initiatives end-to-end from system design through rollout. Deep experience integrating AI capabilities into product experiences (GPT-4/Claude automation, 35% efficiency gain). Proven technical lead: 2+ years mentoring engineers, driving code reviews, and setting engineering standards across distributed teams. Built StatRush, a full-stack AI analytics platform. Master's in Information Systems, University of Houston-Clear Lake. On OPT, open to sponsorship.`,
    skillsOrder: ['backend_first', 'languages_go_java', 'frontend', 'databases', 'cloud', 'cicd', 'ml_dl', 'observability', 'testing', 'other'],
    sonaAIBullets: [
      'Led product backend architecture end-to-end for AI-powered platform, owning greenfield features from inception through production rollout, integrating GPT-4 and Claude AI capabilities into core product workflows.',
      'Mentored engineers and set technical standards across US and Vietnam teams through code reviews, system design sessions, and cross-functional collaboration.',
      'Designed REST and GraphQL APIs with OpenAPI contracts serving 10K+ daily requests at sub-100ms p95 latency, supporting both React web and React Native mobile product surfaces.',
      'Built and scaled distributed backend services with Python/FastAPI, PostgreSQL (SQL), Redis, and Kafka (NoSQL/distributed) achieving 99.9% uptime and 3x traffic growth.',
      'Implemented CI/CD automation using GitHub Actions and Terraform, cutting deployment cycle time by 40% and enabling same-day production releases.',
      'Established observability dashboards with Grafana and CloudWatch, reducing incident MTTR by 30% through proactive latency and regression tracking.',
      'Refactored and optimized API and backend services, improving performance by 25% through dependency modernization and query tuning.',
    ],
  },
  {
    slug: 'langchain-langsmith',
    company: 'LangChain',
    title: 'Senior Backend Software Engineer, AI Observability (LangSmith)',
    format: 'letter',
    location_display: 'United States',
    summary: `Senior Backend Software Engineer with 6+ years building high-throughput observability, tracing, and AI infrastructure systems. Expert in Python and Go, designing backend services for monitoring, evaluation, and quality tracking of AI applications at scale — built production observability systems at Sona AI (Grafana, CloudWatch, Prometheus; 30% MTTR reduction) and high-throughput Kafka event pipelines handling $2B+ daily transactions at Rime Soft. Production experience with LLM API backends (Claude, GPT-4) serving 10K+ daily requests at sub-100ms p95 latency. Deep experience optimizing storage, query performance, and backend reliability for mission-critical, high-volume systems. Master's in Information Systems, University of Houston-Clear Lake. On OPT, open to sponsorship.`,
    skillsOrder: ['languages_py_go', 'backend', 'observability', 'databases', 'ml_dl', 'cloud', 'cicd', 'frontend', 'testing', 'other'],
    sonaAIBullets: [
      'Built production observability and monitoring backend for AI platform using Grafana and CloudWatch — designed tracing dashboards, alerting pipelines, and quality-regression detection systems that reduced incident MTTR by 30%.',
      'Designed and scaled high-throughput Python/FastAPI backend services and Kafka event pipelines, achieving 99.9% uptime and supporting 3x traffic growth with zero downtime.',
      'Built LLM backend integrations (Claude and GPT-4 APIs) serving 10K+ daily requests at sub-100ms p95 latency — including context engineering, output validation, and evaluation checkpoints.',
      'Designed REST and GraphQL APIs with optimized storage and query performance, improving client and server throughput by 25% through dependency modernization and query tuning.',
      'Implemented CI/CD automation using GitHub Actions and Terraform, cutting deployment cycle time by 40% and enabling same-day releases.',
      'Led code reviews, system design sessions, and cross-functional collaboration across engineering teams in the US and Vietnam.',
      'Ensured backend reliability through strong testing, monitoring, and alerting practices across all production services.',
    ],
  },
  {
    slug: 'perplexity-agents',
    company: 'Perplexity',
    title: 'Member of Technical Staff, AI Software Engineer (Agents)',
    format: 'letter',
    location_display: 'United States',
    summary: `Software Engineer with 6+ years building AI agent systems, backend infrastructure, and real-time data platforms at scale. Expert in Python, TypeScript, and Go, designing agentic LLM workflows and high-throughput distributed backends — built production Claude and GPT-4 agent integrations at Sona AI serving 10K+ daily requests at sub-100ms p95 latency. Deep experience with distributed systems (Kafka, Kubernetes, AWS EKS), real-time ML pipelines (XGBoost/LightGBM, PyTorch), and full-stack delivery from system design through production rollout. Built StatRush, a live AI analytics platform with agentic ML workflows. Master's in Information Systems, University of Houston-Clear Lake. On OPT, open to sponsorship.`,
    skillsOrder: ['languages_py_ts', 'ml_dl', 'backend', 'databases', 'cloud', 'cicd', 'observability', 'frontend', 'testing', 'other'],
    sonaAIBullets: [
      'Designed and deployed production AI agent workflows integrating Claude and GPT-4 APIs, including context engineering, tool use, and multi-step agent pipelines — reducing manual processing by 35%.',
      'Built high-throughput backend infrastructure for AI platform: Python/FastAPI services, Kafka event pipelines, PostgreSQL and Redis data stores, achieving 99.9% uptime and sub-100ms p95 latency at 10K+ daily requests.',
      'Designed and scaled distributed systems supporting 3x traffic growth with zero downtime deployments on Kubernetes and AWS EKS.',
      'Built GraphQL and REST APIs serving both React web and React Native mobile applications at scale.',
      'Implemented CI/CD automation using GitHub Actions and Terraform, cutting deployment cycle time by 40% and enabling same-day releases.',
      'Established observability dashboards with Grafana and CloudWatch, reducing incident MTTR by 30%.',
      'Led code reviews and system design sessions across US and Vietnam engineering teams.',
    ],
  },
  {
    slug: 'hightouch-streaming',
    company: 'Hightouch',
    title: 'Principal Engineer, Streaming Systems',
    format: 'letter',
    location_display: 'United States (Remote)',
    summary: `Principal-level Software Engineer with 6+ years architecting high-throughput streaming systems and distributed event pipelines at scale. Expert in Kafka, Spark, Flink, and real-time computation — designed event-driven pipelines processing $2B+ in daily financial transaction volume at Rime Soft (Kafka, Spark Streaming, AWS Kinesis), built zero-downtime Kafka services supporting 3x traffic growth and 99.9% uptime at Sona AI, and engineered real-time banking ingestion pipelines serving 1M+ customers at Grepthor. Deep experience with deduplication, subsecond-latency systems, high-throughput message processing, and distributed system design at scale. Built StatRush, a real-time ML analytics platform. Master's in Information Systems, University of Houston-Clear Lake. On OPT, open to sponsorship.`,
    skillsOrder: ['streaming_first', 'languages', 'cloud', 'databases', 'backend', 'cicd', 'observability', 'ml_dl', 'frontend', 'other'],
    sonaAIBullets: [
      'Designed and scaled high-throughput Kafka event-driven pipelines achieving 99.9% uptime and supporting 3x traffic growth — implemented zero-downtime deployment patterns and subsecond-latency streaming services.',
      'Built distributed backend infrastructure with Python/FastAPI, PostgreSQL, and Redis supporting 10K+ daily requests at sub-100ms p95 latency.',
      'Implemented CI/CD automation with GitHub Actions and Terraform, cutting deployment cycle time by 40% and enabling real-time production releases.',
      'Established observability dashboards with Grafana and CloudWatch, reducing incident MTTR by 30% through proactive latency and regression tracking.',
      'Led greenfield feature development end-to-end from system design through rollout, mentoring engineers and elevating technical standards.',
      'Built GraphQL and REST APIs serving both React web and React Native mobile applications.',
      'Refactored and optimized streaming and API layers, improving throughput by 25% through pipeline modernization and query tuning.',
    ],
  },
  {
    slug: 'databricks-backend',
    company: 'Databricks',
    title: 'Senior Software Engineer, Backend (AI Platform)',
    format: 'letter',
    location_display: 'United States',
    summary: `Senior Software Engineer with 6+ years building distributed backend systems and AI/ML platform infrastructure at scale. Expert in Java, Python, Kubernetes, and AWS/Azure, designing SaaS platform services across fintech, enterprise, and AI domains — built microservices processing $2B+ daily transaction volume at Rime Soft, scaled distributed firmware platforms at HP serving millions of devices on AWS EKS, and shipped AI-powered SaaS backends at Sona AI (99.9% uptime, 3x traffic growth). Deep experience with ML workloads (PyTorch, XGBoost/LightGBM), multi-cloud infrastructure, resource management, and production observability. Master's in Information Systems, University of Houston-Clear Lake. On OPT, open to sponsorship.`,
    skillsOrder: ['languages_java_first', 'cloud', 'ml_dl', 'backend', 'databases', 'cicd', 'observability', 'frontend', 'testing', 'other'],
    sonaAIBullets: [
      'Built and scaled distributed backend services and AI-powered SaaS platform, integrating GPT-4 and Claude ML workloads into production workflows — achieving 99.9% uptime and 3x traffic growth on Kubernetes/AWS EKS.',
      'Designed event-driven pipelines with Kafka, PostgreSQL, and Redis supporting 10K+ daily requests at sub-100ms p95 latency across multi-cloud infrastructure.',
      'Implemented CI/CD automation using GitHub Actions and Terraform on Kubernetes clusters, cutting deployment cycle time by 40% and enabling zero-downtime releases.',
      'Built GraphQL and REST APIs with operational tooling for multi-cloud environments, improving client and server performance by 25%.',
      'Established engineering observability with Grafana and CloudWatch, reducing incident MTTR by 30% through proactive monitoring and alerting.',
      'Led code reviews, system design, and cross-functional collaboration across US and Vietnam teams.',
      'Refactored and optimized API and backend services through dependency modernization and query tuning.',
    ],
  },
  {
    slug: 'booking-ml-engineer',
    company: 'Booking.com',
    title: 'Senior Machine Learning Engineer',
    format: 'a4',
    location_display: 'Netherlands (EU Blue Card sponsorship welcome)',
    summary: `Machine Learning Engineer with 6+ years building production ML systems and distributed data pipelines at scale. Expert in Python, Kafka, and distributed ML infrastructure — productionized a PyTorch fraud detection API (+18% accuracy) at Rime Soft, built an XGBoost/LightGBM ML ensemble with real-time data pipelines and live marketplace odds integration at StatRush, and shipped AI/LLM integrations at Sona AI (35% efficiency gain). Deep experience with real-time event processing (Kafka, Spark Streaming, Flink), ML model serving, feature pipelines, and data platform engineering. Targeting Netherlands (EU Blue Card / highly skilled migrant visa sponsorship welcome). Master's in Information Systems, University of Houston-Clear Lake. On OPT, open to sponsorship.`,
    skillsOrder: ['ml_dl_first', 'languages_py_first', 'databases', 'streaming_first', 'cloud', 'backend', 'cicd', 'observability', 'frontend', 'other'],
    sonaAIBullets: [
      'Integrated GPT-4 and Claude AI/ML models into production platform workflows, reducing manual processing by 35% — designed evaluation checkpoints and monitoring pipelines to track model quality in production.',
      'Built real-time feature pipelines and distributed event-driven services with Python/FastAPI, Kafka, PostgreSQL, and Redis, achieving 99.9% uptime and supporting 3x traffic growth.',
      'Built observability and ML monitoring infrastructure using Grafana and CloudWatch, reducing incident MTTR by 30% through proactive quality tracking.',
      'Designed GraphQL and REST APIs serving 10K+ daily ML-powered requests at sub-100ms p95 latency.',
      'Implemented CI/CD automation using GitHub Actions and Terraform, cutting deployment cycle time by 40%.',
      'Led cross-functional collaboration and system design sessions across engineering teams in the US and Vietnam.',
      'Optimized backend services, improving throughput by 25% through query tuning and dependency modernization.',
    ],
  },
  {
    slug: 'atlassian-senior-swe',
    company: 'Atlassian',
    title: 'Senior Software Engineer',
    format: 'a4',
    location_display: 'Australia (open to remote-first)',
    summary: `Senior Software Engineer with 6+ years building distributed cloud-native systems at scale, with a distributed-first, remote collaboration mindset. Expert in Python, Java, TypeScript, and Go, deploying Kubernetes and AWS-based services across fintech, enterprise SaaS, and AI platforms — currently leading backend architecture at Sona AI (99.9% uptime, sub-100ms p95 latency, 3x traffic growth), built firmware platforms serving millions of devices at HP, and designed fintech microservices handling $2B+ daily transactions at Rime Soft. Strong in REST API design, CI/CD automation, observability, and cross-functional delivery across globally distributed teams. Targeting Australia (work visa sponsorship welcome). Master's in Information Systems, University of Houston-Clear Lake. On OPT, open to sponsorship.`,
    skillsOrder: ['languages', 'cloud', 'backend', 'cicd', 'observability', 'databases', 'ml_dl', 'frontend', 'testing', 'other'],
    sonaAIBullets: [
      'Led backend architecture for distributed SaaS platform with globally distributed team (US and Vietnam) — owned cross-functional delivery from system design through production, achieving 99.9% uptime and 3x traffic growth.',
      'Designed and scaled cloud-native services on Kubernetes and AWS EKS with Python/FastAPI, Kafka, PostgreSQL, and Redis, supporting 10K+ daily requests at sub-100ms p95 latency.',
      'Implemented CI/CD automation with GitHub Actions and Terraform, cutting deployment cycle time by 40% and enabling same-day production releases.',
      'Established engineering observability with Grafana and CloudWatch, reducing incident MTTR by 30% through proactive monitoring across distributed systems.',
      'Built GraphQL and REST APIs serving both React web and React Native mobile applications at scale.',
      'Mentored engineers through code reviews and system design sessions, elevating technical standards across the distributed team.',
      'Refactored and optimized API layer and backend services, improving performance by 25% through dependency modernization and query tuning.',
    ],
  },
  {
    slug: 'pinecone-database-team',
    company: 'Pinecone',
    title: 'Senior/Staff Software Engineer, Database Team',
    format: 'letter',
    location_display: 'United States',
    summary: `Senior Software Engineer with 6+ years building high-performance distributed data systems and low-latency backend infrastructure at scale. Expert in Python, Java, Go, and Kubernetes, designing high-availability, autoscaling backend systems across multi-cloud environments — tuned PostgreSQL and DynamoDB at Rime Soft for $2B+ daily transaction throughput, built Redis caching and distributed event pipelines at Sona AI (sub-100ms p95 latency, 99.9% uptime), and designed real-time data ingestion systems at multiple companies. Deep experience with distributed CRUD, SQL schema optimization, sharding patterns, and cloud-native storage infrastructure on AWS (RDS, Aurora, DynamoDB) and Azure. Master's in Information Systems, University of Houston-Clear Lake. On OPT, open to sponsorship.`,
    skillsOrder: ['databases_first', 'languages', 'cloud', 'backend', 'streaming_first', 'cicd', 'observability', 'ml_dl', 'frontend', 'other'],
    sonaAIBullets: [
      'Designed distributed data infrastructure with PostgreSQL, Redis, and Kafka achieving sub-100ms p95 latency at 10K+ daily requests and 99.9% uptime — implemented high-availability patterns and zero-downtime deployment strategies.',
      'Optimized SQL schemas, indexing strategies, and query performance for production data services, improving throughput by 25% through dependency modernization and schema tuning.',
      'Built autoscaling distributed backend services on Kubernetes and AWS EKS supporting 3x traffic growth with zero downtime.',
      'Established observability infrastructure with Grafana and CloudWatch for proactive database and service health monitoring, reducing MTTR by 30%.',
      'Designed REST and GraphQL APIs with stable, scalable storage backends supporting 10K+ daily requests.',
      'Implemented CI/CD automation using GitHub Actions and Terraform, enabling zero-downtime production deployments.',
      'Led code reviews and system design sessions, mentoring engineers on distributed data system best practices.',
    ],
  },
];

// ── Skills sections by ordering variant ──────────────────────────────────────

function getSkills(orderKey) {
  const sections = {
    languages: `<li><strong>Languages:</strong> Python, Java, TypeScript, Go, Kotlin, C++</li>`,
    languages_py_first: `<li><strong>Languages:</strong> Python, Java, TypeScript, Go, Kotlin, C++</li>`,
    languages_go_py: `<li><strong>Languages:</strong> Go, Python, Java, TypeScript, Kotlin, C++</li>`,
    languages_go_java: `<li><strong>Languages:</strong> Go, Java, TypeScript, Python, Kotlin, C++</li>`,
    languages_py_go: `<li><strong>Languages:</strong> Python, Go, Java, TypeScript, Kotlin, C++</li>`,
    languages_py_ts: `<li><strong>Languages:</strong> Python, TypeScript, Go, Java, Kotlin, C++</li>`,
    languages_java_first: `<li><strong>Languages:</strong> Java, Python, Go, TypeScript, Kotlin, C++; Scala (data platform)</li>`,
    backend: `<li><strong>Backend &amp; APIs:</strong> FastAPI, Spring Boot, REST, GraphQL, Microservices, OpenAPI, gRPC, Node.js</li>`,
    backend_first: `<li><strong>Backend &amp; APIs:</strong> FastAPI, Spring Boot, REST, GraphQL, Microservices, OpenAPI, gRPC, Node.js; SaaS platform architecture</li>`,
    ml_dl: `<li><strong>Distributed Systems &amp; ML:</strong> Kafka, Spark, Flink, Airflow, XGBoost, LightGBM, PyTorch, Ray; LLM APIs (Claude, GPT-4), agent architectures, evaluations</li>`,
    ml_dl_first: `<li><strong>ML &amp; AI Systems:</strong> XGBoost, LightGBM, PyTorch, Ray; LLM APIs (Claude, GPT-4), agent architectures, evaluation pipelines, RLHF; Kafka, Spark, Flink, Airflow</li>`,
    streaming_first: `<li><strong>Streaming &amp; Distributed Systems:</strong> Kafka, Spark Streaming, Flink, Airflow, AWS Kinesis; high-throughput real-time computation, deduplication, subsecond-latency pipelines</li>`,
    observability: `<li><strong>Observability:</strong> Prometheus, Grafana, ELK, Splunk, New Relic, Datadog, Dynatrace; LLM tracing, evaluation dashboards, performance monitoring</li>`,
    databases: `<li><strong>Databases &amp; Data:</strong> PostgreSQL, MongoDB, DynamoDB, Redis, Aurora, MySQL, Oracle, Parquet; SQL schema design and query optimization</li>`,
    databases_first: `<li><strong>Databases &amp; Data:</strong> PostgreSQL, Aurora, DynamoDB, Redis, MongoDB, MySQL, Oracle, Parquet; SQL schema design, indexing, sharding, high-availability patterns</li>`,
    cloud: `<li><strong>Cloud &amp; Infrastructure:</strong> AWS (Lambda, S3, RDS, ECS, EKS, DynamoDB, API Gateway, CloudWatch), Azure (AKS, Blob Storage), Kubernetes; multi-cloud deployments</li>`,
    frontend: `<li><strong>Frontend:</strong> React (17+), Angular, React Native, Next.js, Tailwind, HTML, CSS, JavaScript</li>`,
    cicd: `<li><strong>CI/CD &amp; DevOps:</strong> GitHub Actions, GitLab CI, Jenkins, Docker, Terraform, Maven, Gradle; zero-downtime deployments, TDD, automation frameworks</li>`,
    testing: `<li><strong>State Management &amp; Testing:</strong> Redux, Context, RTK Query, Jest, React Testing Library, Cypress, Selenium, JUnit, PyTest</li>`,
    other: `<li><strong>Other:</strong> Technical leadership and mentorship, Agile/Scrum, Domain-driven design, cross-functional collaboration, cross-cloud integrations</li>`,
  };

  // Build skills list from order key — first item gets prominent placement
  const orderedKeys = [
    'languages', 'backend', 'ml_dl', 'streaming_first', 'observability',
    'databases', 'cloud', 'frontend', 'cicd', 'testing', 'other',
  ];

  // Use role-specific ordering with fallbacks
  const roleMap = {
    'languages_py_first': ['languages_py_first', 'backend', 'ml_dl', 'databases', 'cloud', 'cicd', 'observability', 'frontend', 'testing', 'other'],
    'ml_dl_first': ['ml_dl_first', 'languages_go_py', 'observability', 'databases', 'cloud', 'backend', 'cicd', 'frontend', 'testing', 'other'],
    'backend_first': ['backend_first', 'languages_go_java', 'ml_dl', 'databases', 'cloud', 'cicd', 'observability', 'frontend', 'testing', 'other'],
    'languages_py_go': ['languages_py_go', 'backend', 'observability', 'ml_dl', 'databases', 'cloud', 'cicd', 'frontend', 'testing', 'other'],
    'languages_py_ts': ['languages_py_ts', 'ml_dl', 'backend', 'databases', 'cloud', 'cicd', 'observability', 'frontend', 'testing', 'other'],
    'streaming_first': ['streaming_first', 'languages', 'cloud', 'databases', 'backend', 'cicd', 'observability', 'ml_dl', 'frontend', 'other'],
    'languages_java_first': ['languages_java_first', 'cloud', 'ml_dl', 'backend', 'databases', 'cicd', 'observability', 'frontend', 'testing', 'other'],
    'languages': ['languages', 'cloud', 'backend', 'cicd', 'observability', 'databases', 'ml_dl', 'frontend', 'testing', 'other'],
    'databases_first': ['databases_first', 'languages', 'cloud', 'backend', 'streaming_first', 'cicd', 'observability', 'ml_dl', 'frontend', 'other'],
  };

  const keys = roleMap[orderKey] || orderedKeys;
  return `<ul class="skills-list">\n      ${keys.map(k => sections[k] || '').filter(Boolean).join('\n      ')}\n    </ul>`;
}

// ── Experience blocks ─────────────────────────────────────────────────────────

function getExperience(role) {
  const bullets = role.sonaAIBullets.map(b => `<li>${b}</li>`).join('\n        ');

  return `
    <div class="job">
      <div class="job-top-row">
        <span class="job-company">Sona AI</span>
        <span class="job-location">Austin, USA</span>
      </div>
      <div class="job-role-row">
        <span class="job-role">Lead Software Engineer</span>
        <span class="job-date">June 2025 - Present</span>
      </div>
      <ul>
        ${bullets}
      </ul>
    </div>

    <div class="job">
      <div class="job-top-row">
        <span class="job-company">HP</span>
        <span class="job-location">Bangalore, India</span>
      </div>
      <div class="job-role-row">
        <span class="job-role">Senior Software Engineer</span>
        <span class="job-date">Aug 2021 - Dec 2022</span>
      </div>
      <ul>
        <li>Developed and scaled Java/Spring Boot and Python/FastAPI microservices for HP's global firmware and workflow automation platform used by millions of devices worldwide.</li>
        <li>Built high-throughput, event-driven pipelines with Kafka, AWS SQS, and Redis, improving system reliability by 30% and supporting distributed transactional workloads at enterprise scale.</li>
        <li>Designed secure, resilient backend services deployed on AWS EKS/ECR using Kubernetes, Helm, and Argo for orchestration and automated rollouts.</li>
        <li>Optimized SQL schemas, complex queries, and data models to support real-time analytics, reporting, and large-volume data processing.</li>
        <li>Enhanced observability using Prometheus, Grafana, Datadog, and Elasticsearch, reducing MTTR by 20% and improving production debugging workflows.</li>
        <li>Participated in on-call rotations, performing root-cause analysis and resolving production incidents to ensure high availability of mission-critical systems.</li>
      </ul>
    </div>

    <div class="job">
      <div class="job-top-row">
        <span class="job-company">Rime Soft Pvt Ltd</span>
        <span class="job-location">Hyderabad, India</span>
      </div>
      <div class="job-role-row">
        <span class="job-role">Software Engineer</span>
        <span class="job-date">June 2019 - Aug 2021</span>
      </div>
      <ul>
        <li>Built secure, low-latency Python and Java/Spring Boot microservices for Moody's financial payment and reconciliation platform handling $2B+ in daily transaction volume.</li>
        <li>Migrated legacy monoliths into Spring Boot microservices with OpenAPI contracts, reducing deployment lead time by 40% and enabling continuous delivery.</li>
        <li>Designed high-throughput event-driven pipelines using Kafka, Spark Streaming, and AWS Kinesis for real-time financial data processing at scale.</li>
        <li>Productionized PyTorch-based fraud detection APIs, enhancing anomaly detection accuracy by 18% across payment flows.</li>
        <li>Tuned PostgreSQL and DynamoDB performance using indexing, SQL optimization, and Redis caching, boosting throughput by 25%.</li>
        <li>Automated CI/CD pipelines with GitLab CI, Docker, and Helm on Kubernetes clusters, achieving zero-downtime deployments.</li>
      </ul>
    </div>

    <div class="job">
      <div class="job-top-row">
        <span class="job-company">Grepthor Technologies</span>
        <span class="job-location">Hyderabad, India</span>
      </div>
      <div class="job-role-row">
        <span class="job-role">Software Engineer</span>
        <span class="job-date">Jan 2018 - June 2019</span>
      </div>
      <ul>
        <li>Built secure, high-performance Python FastAPI services with C++ modules for HDFC banking website and mobile application, serving 1M+ customers.</li>
        <li>Designed real-time ingestion pipelines using Kafka and Flink, ensuring scalable event processing and consistent data quality across banking transaction flows.</li>
        <li>Implemented OAuth2 and JWT authentication workflows to secure multi-tenant banking applications across internal and external platform integrations.</li>
        <li>Automated deployments using Jenkins pipelines, Kubernetes manifests, and Terraform scripts, reducing release effort by 30%.</li>
      </ul>
    </div>`;
}

// ── HTML builder ──────────────────────────────────────────────────────────────

function buildHTML(role) {
  const pageWidth = role.format === 'letter' ? '8.5in' : '210mm';
  const skills = getSkills(role.skillsOrder[0]);
  const experience = getExperience(role);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${CONTACT.name} — ${role.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Calibri, 'Trebuchet MS', Arial, sans-serif; font-size: 11px; line-height: 1.45; color: #000; background: #fff; }
  .page { width: 100%; max-width: ${pageWidth}; margin: 0 auto; }
  a { color: #000; text-decoration: none; white-space: nowrap; }
  .header { margin-bottom: 10px; }
  .header-name { font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.01em; margin-bottom: 3px; line-height: 1.2; }
  .contact-row { font-size: 10px; line-height: 1.5; }
  .section { margin-bottom: 10px; }
  .section-title { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 6px; line-height: 1.2; }
  .summary-text { font-size: 10.5px; line-height: 1.55; text-align: justify; }
  .skills-list { list-style: disc; padding-left: 18px; margin: 0; }
  .skills-list li { font-size: 10.5px; line-height: 1.55; margin-bottom: 2px; }
  .job { margin-bottom: 10px; }
  .job-top-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .job-company { font-size: 11px; font-weight: 700; }
  .job-location { font-size: 10.5px; font-style: italic; white-space: nowrap; }
  .job-role-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-top: 1px; }
  .job-role { font-size: 10.5px; font-weight: 700; }
  .job-date { font-size: 10.5px; white-space: nowrap; }
  .job ul { list-style: disc; padding-left: 18px; margin-top: 4px; }
  .job li { font-size: 10.5px; line-height: 1.55; margin-bottom: 2px; }
  .project { margin-bottom: 9px; }
  .project-title { font-size: 10.5px; font-weight: 700; line-height: 1.4; }
  .project-title a { font-weight: 400; }
  .project ul { list-style: disc; padding-left: 18px; margin-top: 3px; }
  .project li { font-size: 10.5px; line-height: 1.55; margin-bottom: 2px; }
  .edu-list { list-style: disc; padding-left: 18px; margin: 0; }
  .edu-list li { font-size: 10.5px; line-height: 1.55; margin-bottom: 3px; }
  .cert-list { list-style: disc; padding-left: 18px; margin: 0; }
  .cert-list li { font-size: 10.5px; line-height: 1.55; margin-bottom: 3px; }
  .avoid-break, .job, .project, .edu-list, .cert-list { break-inside: avoid; page-break-inside: avoid; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">

  <div class="header avoid-break">
    <div class="header-name">${CONTACT.name}</div>
    <div class="contact-row">
      ${CONTACT.phone} | ${CONTACT.email} | <a href="${CONTACT.linkedin_url}">${CONTACT.linkedin_display}</a> | <a href="${CONTACT.github_url}">${CONTACT.github_display}</a> | ${role.location_display}
    </div>
  </div>

  <div class="section avoid-break">
    <div class="section-title">Professional Summary</div>
    <div class="summary-text">${role.summary}</div>
  </div>

  <div class="section">
    <div class="section-title">Technical Skills</div>
    ${skills}
  </div>

  <div class="section">
    <div class="section-title">Professional Experience</div>
    ${experience}
  </div>

  <div class="section avoid-break">
    <div class="section-title">Projects</div>
    <div class="project">
      <div class="project-title">StatRush -- AI-Powered NBA Prop Betting Analytics Platform | <a href="https://statrush.vercel.app">statrush.vercel.app</a> | <a href="https://github.com/sujithreddyp0123">github.com/sujithreddyp0123</a></div>
      <ul>
        <li>Built full-stack AI analytics platform end-to-end: React/Vite frontend, Python/FastAPI backend, PostgreSQL, and Redis caching, deployed on Vercel and Render.</li>
        <li>Engineered an XGBoost/LightGBM ML ensemble trained on real NBA player data (NBA Stats API), with live DraftKings prop line integration via The Odds API.</li>
        <li>Implemented edge calculation and Kelly Criterion bet sizing to surface high-value prop opportunities with explainable confidence scoring.</li>
        <li>Designed a real-time dashboard with player trend charts, live odds feeds, and model prediction breakdowns.</li>
      </ul>
    </div>
    <div class="project">
      <div class="project-title">Enterprise Inventory Management System</div>
      <ul>
        <li>Designed a cloud-based inventory monitoring system using Python/FastAPI, Spring Boot, React, and PostgreSQL deployed on AWS with microservices aligned to OpenAPI standards.</li>
        <li>Delivered real-time dashboards and reporting tools that improved data accuracy by 40% and streamlined operational oversight across distributed teams.</li>
      </ul>
    </div>
  </div>

  <div class="section avoid-break">
    <div class="section-title">Education</div>
    <ul class="edu-list">
      <li><strong>Master's in Information Systems</strong> -- University of Houston-Clear Lake (Jan 2023 - Dec 2024)</li>
      <li><strong>Bachelor's in Computer Science</strong> -- Panimalar Institute of Technology, Anna University</li>
    </ul>
  </div>

  <div class="section avoid-break">
    <div class="section-title">Certifications</div>
    <ul class="cert-list">
      <li>AWS Certified Developer - Associate (Issued Apr 2025, Expires Apr 2028)</li>
      <li>Certified ScrumMaster (CSM)</li>
    </ul>
  </div>

</div>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Generating ${ROLES.length} tailored CVs...\n`);

  const results = [];

  for (const role of ROLES) {
    const htmlFile = resolve(__dirname, `output/cv-sujith-kumar-reddy-${role.slug}-2026-04-22.html`);
    const pdfFile  = resolve(__dirname, `output/cv-sujith-kumar-reddy-${role.slug}-2026-04-22.pdf`);

    // Write HTML
    await writeFile(htmlFile, buildHTML(role), 'utf-8');

    // Generate PDF
    process.stdout.write(`  → ${role.company}: ${role.title} ... `);
    try {
      execSync(
        `node generate-pdf.mjs "${htmlFile}" "${pdfFile}" --format=${role.format}`,
        { cwd: __dirname, stdio: 'pipe' }
      );
      console.log('✅');
      results.push({ role, pdfFile, ok: true });
    } catch (err) {
      console.log('❌', err.message.split('\n')[0]);
      results.push({ role, pdfFile, ok: false, err: err.message });
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Generated ${results.filter(r => r.ok).length}/${ROLES.length} PDFs\n`);
  results.forEach((r, i) => {
    const icon = r.ok ? '✅' : '❌';
    console.log(`  ${icon} #${i+1} ${r.role.company} — ${r.role.title}`);
    console.log(`       ${r.pdfFile.replace(__dirname + '\\', '').replace(__dirname + '/', '')}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
