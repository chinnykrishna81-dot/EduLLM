# EduLLM Project Handoff

Last updated: 21 July 2026

## 1. Product objective

Build a market-ready course platform without implementing the approximately 90% of enterprise specification features that are unlikely to be used initially.

The immediate business outcome is:

> Teachers build reusable chapters and subjects; an administrator combines approved subjects and exam kits into a commercial course; a student subscribes and learns with personalized progress.

The large specification set is a reference for content quality, entity design, and future extensibility. It is not the MVP backlog.

## 2. Two applications, one platform

### Content Management application

Used by company admins and teachers to:

- create reusable chapters, topics, concepts, and assessments;
- assemble chapters into units and subjects;
- create exam kits;
- paste/import content prepared externally in ChatGPT;
- upload and match images;
- edit explanations, cards, examples, and questions;
- review and approve academic content;
- configure subjects and exam kits into commercial courses;
- configure subscription, price, discount, and validity;
- preview, publish, or unpublish a course;
- manage teacher access and basic enrolment information.

### Student Learning application

Used by students to:

- discover courses;
- subscribe or receive access;
- navigate chapters, topics, and concepts;
- read explanations and view images;
- use Flash Cards and Learning Cards;
- answer Type 1 questions;
- solve guided Type 2 questions;
- save progress and resume learning.

Both applications use one backend. The Student application can read only published content, never authoring drafts.

## 3. Roles

Four permission roles are required initially; one person may hold more than one:

- `ORGANISATION_ADMIN` — manages the organisation, users, policies, course composition, commercial configuration, publishing, and access.
- `TEACHER` — creates reusable content, questions, assessments, subjects, and exam kits within assigned scope.
- `ACADEMIC_REVIEWER` — validates academic correctness, coverage, mappings, solutions, marking, and references; a senior teacher or admin may also hold this role.
- `STUDENT` — consumes entitled published content and writes only their own learning and assessment activity.

Do not initially implement the specification's wider catalogue of Curriculum Manager, Blueprint Designer, AI Reviewer, SME, QA Reviewer, Publisher, or complex workflow roles. Use scoped assignments and combined roles instead.

## 4. Content, subject, and course hierarchy

```text
Course (configured and published last)
├── Subject references
│   └── Units
│       ├── Ordered reusable Chapter references
│       │   ├── Topics
│       │   │   ├── Concepts and Flash Cards
│       │   │   ├── Type 1 and Type 2 practice
│       │   │   ├── Problem patterns/templates
│       │   │   └── Descriptive-answer guidance
│       │   └── Cycle Test
│       └── Unit/Semester Test
│   └── Final Exam
├── Exam Kit references
└── Subscription, pricing, discount, and validity
```

Chapters and subjects are reusable references, not copies. Chapter ordering belongs to a subject configuration. The same approved subject may be included in multiple courses. See [the authoritative process](docs/CONTENT_TO_COURSE_PROCESS.md).

## 5. Content strategy

Content generation happens outside EduLLM, initially in ChatGPT.

Preferred flow:

```text
Reference material in ChatGPT
→ structured course JSON
→ copy/paste into Content Management
→ upload image files
→ automatic format validation
→ preview and correction
→ publish
```

The user should not manually author JSON. ChatGPT produces the agreed format; the Content Management application extracts and validates the pasted JSON.

Images are separate PNG/JPG/SVG/WebP files. JSON contains image filename, title, caption, alt text, and association to content. The importer matches uploaded files by filename.

Source references may be recorded once at course or chapter level. Per-card and per-question source provenance is not an MVP requirement, although external generation should remain source-grounded.

## 6. Learning content requirements

Expected course content includes:

- quick summary;
- layered explanation;
- detailed explanation;
- real-world examples;
- misconceptions and common mistakes;
- memory aids;
- Flash Cards for retrieval;
- Learning Cards for focused teaching;
- worked examples;
- images and diagrams;
- question-pattern metadata;
- Type 1 atomic questions with answers and explanations;
- Type 2 guided questions with ordered steps, answers, feedback, and marks;
- difficulty and practice metadata.

Learning must be condensed into visual card bundles and reusable problem patterns rather than long textbook-like pages. Practice is unscored and immediately explained. Scored tests use completion gates, timing, locking, delayed results, retake schedules, and time-decaying mastery. The authoritative detail is in [Learning and Assessment Model](docs/LEARNING_AND_ASSESSMENT_MODEL.md).

The precise import schema and student presentation are intentionally not finalized. The owner will next explain how data must be loaded and consumed.

## 7. Lean publishing model

Default workflow:

```text
Teacher Draft → Review/Approval → Admin Course Configuration → Preview → Published
```

Optional company control:

```text
Teacher Draft → Submit to Admin → Admin Preview → Published
```

Published version 1 remains visible while draft version 2 is edited. Students see version 2 only after it is published.

Do not initially build multi-stage review, configurable workflows, reviewer SLAs, escalations, or a validation-rules administration product.

## 8. Subscription and access

The data model should allow:

- free courses;
- one-time course access;
- monthly or annual subscriptions;
- administrator-granted enrolment;
- access start and expiry dates.

Only the first selected commercial model needs to be implemented. Razorpay is the initial payment recommendation; Stripe may be added for international sales.

## 9. Agreed technology direction

```text
Content Management: React + TypeScript + Vite
Student Learning:   React + TypeScript + Vite
Backend:            Node.js + TypeScript + NestJS
Database:           PostgreSQL
ORM:                Prisma initially
Files:              MinIO locally, Amazon S3 in production
Validation:         Zod and JSON Schema/AJV
Editor:             Tiptap; KaTeX for equations
Payments:           Razorpay initially
Testing:            Jest, Vitest, Testcontainers, Playwright
Deployment:         Docker; AWS ECS/RDS/S3/CloudFront
```

Python remains an option for a future specialized document, NLP, AI, or analytics service. Do not add it until a concrete requirement benefits from it.

## 10. Local-first requirement

Nearly every feature must run and be tested locally before AWS deployment.

```text
Docker Compose
├── PostgreSQL
├── MinIO
├── API
├── Content Management app
├── Student Learning app
└── optional Mailpit/payment simulator
```

Use Local → AWS Staging → AWS Production. Actual IAM, CloudFront, HTTPS, email deliverability, and provider webhooks require staging verification.

## 11. First market-oriented vertical slice

```text
Teacher imports or creates one reusable chapter
→ uploads images
→ adds it to a subject unit
→ adds Cycle and Unit/Semester Tests
→ admin adds approved subject to a course
→ configures access and publishes
→ student receives/subscribes to access
→ student reads an explanation
→ uses cards
→ answers Type 1 and Type 2 questions
→ personalized topic/chapter progress is saved and colour-coded
```

This replaces the earlier governance-oriented slice ending at approval.

## 12. Explicitly deferred

- Microservices and Kubernetes
- Kafka/RabbitMQ
- Redis and Elasticsearch
- GraphQL
- Local LLMs and in-app generation
- Vector database and RAG
- Complex curriculum approval
- Multi-stage academic review
- Configurable workflow/rules engines
- Package ZIP import/export standard
- Knowledge-graph visualization
- Advanced concept reuse
- Real-time collaboration
- Reviewer workload and escalation
- Report builder
- Advanced notifications
- LMS/SIS integration
- Native mobile applications
- Adaptive recommendation engine
- Advanced analytics

## 13. Archived material

The earlier Node/SQLite/Ollama prototype, its runtime data, and generated enterprise specifications were removed from this clean handoff after a separate backup was confirmed. They are historical references, not MVP requirements.

The enterprise documents described a much larger curriculum, review, validation, packaging, publishing, reporting, administration, and AI platform. The product owner explicitly chose not to build the approximately 90% of features unlikely to be used at launch.

## 14. Next discussion

Before designing the new schema or implementing anything, collect the owner's detailed requirements for:

1. how ChatGPT content will be structured and loaded;
2. how images are supplied and matched;
3. how each content type appears to students;
4. Type 1 interaction and scoring;
5. Type 2 step progression, feedback, marks, and retry behavior;
6. student navigation and completion rules;
7. subscription/pricing model;
8. teacher versus admin publishing permissions;
9. initial target course and market.

Do not infer the missing details from the enterprise specification.

## 15. Proposed implementation architecture

The current recommendation for the two applications, backend domain modules, data aggregates, APIs, runtime safeguards, roles, personas, and implementation slices is documented in [Proposed Product and Technical Architecture](docs/PROPOSED_ARCHITECTURE.md).
