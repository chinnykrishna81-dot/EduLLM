# EduLLM Implementation and Production Specification

**Status:** Active implementation specification  
**Last updated:** 13 September 2026  
**Current maturity:** Local product prototype; not approved for production or paid access

## 1. Purpose

This document records:

1. the approaches already implemented in EduLLM;
2. the work that should be performed next;
3. the capabilities still required to meet the production standard defined in [EduLLM Production Architecture and Codex Audit Prompt](EduLLM%20Production%20Architecture%20and%20Codex%20Audit%20Prompt.md).

It is the consolidated implementation baseline. Detailed teaching rules remain in [docs/LEARNING_AND_ASSESSMENT_MODEL.md](docs/LEARNING_AND_ASSESSMENT_MODEL.md), authoring and publication rules remain in [docs/CONTENT_TO_COURSE_PROCESS.md](docs/CONTENT_TO_COURSE_PROCESS.md), and completed prototype work remains recorded in [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).

The production architecture is a target, not a statement of the current implementation. Existing working components should be preserved and hardened incrementally. Framework replacement or destructive migration requires an approved architecture decision record (ADR).

## 2. Product objective

EduLLM teaches CBSE Class 10 Science through structured, reusable content and assessment:

```text
Course Offering
└── Subject
    └── Unit
        └── Chapter
            └── Topic
                └── Subtopic
                    ├── Learning Pages
                    ├── Concepts and Worked Examples
                    ├── Check Your Knowledge
                    └── Practice Questions
```

The intended production learning loop is:

```text
Diagnose → identify misconception → teach → targeted practice
→ explain error → equivalent retest → delayed review → update mastery
```

The product must ultimately provide personalised learning, server-authoritative assessment, and evidence-backed mastery. A static collection of questions is supporting infrastructure, not the differentiating product.

## 3. Current implementation baseline

### 3.1 Technology and workspace

| Area | Current approach | Status |
|---|---|---|
| Student application | React, TypeScript and Vite | Implemented for local use |
| Content Operations | Separate React, TypeScript and Vite application | Implemented for local use |
| Backend | NestJS modular monolith | Implemented |
| Shared contracts | Zod-based content package in a workspace package | Implemented |
| Database | PostgreSQL using parameterised `pg` queries | Implemented locally |
| API documentation | NestJS Swagger/OpenAPI | Partial |
| Media storage | Local API filesystem exposed through Express | Prototype only |
| Runtime model | Three local development processes | Implemented |

The current frameworks align with the target architecture and should be retained. Moving from `pg` to Prisma is optional and must be justified by an ADR; production correctness does not depend on replacing the existing data-access library.

### 3.2 Content authoring and publication

The current application includes:

- a reusable Chapter Library;
- Subject and ordered Unit construction;
- Course Offering composition;
- draft, review, approval and publication states;
- structured Topic, Subtopic and Learning Page content;
- stable content identifiers and validation;
- Chapter Package import and version incrementing;
- Smart Notes and Knowledge Graph resources;
- teacher review and correction interfaces;
- a published-course catalogue boundary;
- partial chapter-version archival through `chapter_version`;
- transactional operations for selected multi-record changes.

This is a useful content-operations foundation. It does not yet provide immutable publication snapshots. Several normal edit paths overwrite the active record, and published offerings continue to reference mutable Subject and Chapter records.

### 3.3 Question bank

The current question-bank implementation provides:

- file and direct JSON import;
- staging and approval queues;
- Type 1 and guided Type 2 questions;
- chapter, topic, subtopic, difficulty and pattern metadata;
- source-reference records;
- exact hash-based duplicate linking;
- AI-assisted classification suggestions;
- transactional enrichment and approval;
- bulk deletion safeguards for staged records;
- Cycle Test eligibility and form-building support.

The question bank should be preserved and extended. Production records must additionally require curriculum/competency mapping, cognitive level, skills, misconception tags, content version, source URL, rights status, reference-only status and generation lineage. Approved questions must be immutable or versioned.

### 3.4 Student learning experience

The student prototype provides:

- published catalogue browsing;
- Topic/Subtopic navigation;
- progressive Learning Pages;
- learning cards and worked examples;
- Check Your Knowledge interactions;
- chapter practice and explanations;
- Smart Notes and Knowledge Graph viewing;
- a confidence declaration and Cycle Test configuration preview.

Progress, completion and practice state are currently stored in browser `localStorage`. Cycle Test start, server timers, persistent attempts, delayed results, retake scheduling and mastery decay are not implemented.

### 3.5 Identity and permissions

The CMS currently has:

- local email/password authentication;
- scrypt password hashing;
- hashed bearer-session tokens stored in PostgreSQL;
- session expiry and logout;
- administrator and teacher roles;
- teacher disable/reset operations;
- a global NestJS authentication guard.

This is acceptable only for local prototyping. Browser tokens are stored in `localStorage`, default credentials are present in setup/UI code, permissions are inferred from URL strings, and there is no MFA, OAuth/OIDC, tenant scoping, guardian model or service-layer policy enforcement.

### 3.6 Validation and tests

At the audit baseline:

- `npm test` passes;
- `npm run build` passes;
- TypeScript strict mode is enabled;
- the CMS build reports a bundle-size warning;
- only seven automated tests exist;
- the student application has no tests;
- the API test checks composition rather than behaviour.

Passing builds must not be interpreted as production-readiness evidence.

## 4. Confirmed production gaps

### 4.1 P0 — student-safe content delivery

**Current risk:** Public catalogue endpoints return full chapter content, Cycle Test configuration and answer-bearing question objects. The browser performs marking using correct answers included in the response.

**Required standard:**

- Anonymous catalogue responses contain marketing metadata only.
- Protected learning content requires an authenticated learner and an active entitlement.
- Delivery DTOs exclude correct answers, explanations that reveal answers, scoring rubrics, reviewer notes, draft metadata and unused questions.
- An attempt endpoint returns only the exact question version assigned to that attempt.
- Marking is performed by the server.
- Explanations and solutions are released only according to the assessment policy.

This is the first implementation priority.

### 4.2 P0 — entitlement-based access

There is currently no learner identity, enrolment or entitlement service. Production access must be controlled by a single tested decision:

```text
authenticated learner
+ active learner profile
+ active entitlement within its time window
+ available published course version
= access allowed
```

Browser state, catalogue visibility, payment callbacks and provider status strings must never grant access.

### 4.3 P0 — commercial correctness before accepting payments

The current Course Offering record combines content selection, price and subscription presentation. Prices use decimal database values and JavaScript floating-point calculations. No checkout or payment system exists.

Before accepting money, implement:

- `Course` and immutable `CourseVersion`;
- `Product` and versioned `Price` separated from content;
- integer minor-unit amounts;
- server-calculated totals;
- immutable Order and OrderLine price snapshots;
- PaymentAttempt, Payment and Refund;
- backend-created Razorpay Orders;
- server-side checkout-signature validation;
- trusted captured/paid confirmation;
- signed raw-body webhook ingestion;
- idempotency records and unique provider identifiers;
- transactional entitlement grants;
- provider-neutral subscriptions;
- append-only ledger and scheduled reconciliation.

No payment UI should be connected to live credentials until these controls and their tests are complete.

### 4.4 P1 — immutable publication and attempt preservation

Version numbers already exist, but immutability is incomplete. Production publication must create snapshots for Chapter, Subject and Course composition. Edits must create new drafts without changing the content seen by existing attempts or, where policy requires, existing purchasers.

Every attempt must preserve:

- course, subject, chapter and question version identifiers;
- the exact prompt/options presented;
- ordering and randomisation seed;
- marking rule and marks available;
- start, expiry, submission and result-release timestamps.

### 4.5 P1 — server-side learning and mastery runtime

Implement persistent models and services for:

- learner profiles;
- learning sessions;
- page and resource progress;
- Type 1 attempts and retry/hint history;
- Type 2 locked-step attempts;
- Cycle Test form assignment;
- server-authoritative timers and reconnect/resume;
- delayed result release and retake eligibility;
- topic/pattern mastery;
- misconception evidence;
- spaced review and mastery decay.

Client progress may be used as a cache but cannot be authoritative.

### 4.6 P1 — production identity, privacy and authorisation

Implement or integrate:

- Cognito-compatible OAuth 2.0/OIDC Authorization Code with PKCE;
- backend-for-frontend sessions using `Secure`, `HttpOnly`, `SameSite=Lax`, `__Host-` cookies;
- CSRF protection and session rotation/revocation;
- staff and administrator MFA;
- login, recovery and sensitive-operation rate limits;
- separate account, represented person and learner profile;
- guardian relationships and versioned consent;
- organisation membership and scoped role assignments;
- ownership and tenant checks inside domain services;
- privacy retention, correction, export and deletion workflows;
- audit evidence for privileged actions.

The current administrator/teacher URL-matching guard must be replaced with explicit permission metadata and service-layer checks.

### 4.7 P1 — media and upload protection

Replace public local storage for production with private object storage. Require:

- private S3 objects and MinIO-compatible local development where useful;
- short-lived signed delivery URLs;
- draft/published access separation;
- entitlement checks for protected media;
- allowlisted content types plus magic-byte inspection;
- SVG sanitisation or removal from the upload allowlist;
- malware quarantine/scanning workflow;
- orphan cleanup and lifecycle policies;
- rich-text sanitisation on ingestion and delivery.

### 4.8 P1/P2 — API and operational baseline

Pending platform standards include:

- `/api/v1` versioning;
- typed DTOs instead of broad `any` request bodies;
- standard error envelopes;
- correlation/request IDs;
- pagination and maximum limits;
- optimistic locking for content editing;
- UTC ISO 8601 contracts;
- security headers and a strict CSP;
- operation/account/IP rate limiting;
- structured, redacted logs;
- tamper-resistant audit events;
- health, readiness and dependency probes;
- metrics, tracing, dashboards and alerts.

## 5. Work to perform now

The next implementation should be delivered in small, reviewable stages.

### Stage 1 — close premature-answer exposure

1. Define separate public catalogue, learner content, attempt and result DTOs.
2. Remove chapter content and Cycle Test banks from anonymous subject-index responses.
3. Add a server-side question delivery and submission boundary.
4. Ensure correct answers cannot be recovered from pre-submission network responses.
5. Add regression tests for anonymous, learner and staff projections.

**Acceptance criteria:** An anonymous or pre-submission learner response contains no correct answer, final answer, scoring rubric, solution-only media or reviewer metadata.

### Stage 2 — create the learner and entitlement foundation

1. Add account/person/learner separation compatible with future OIDC identities.
2. Add CourseVersion and Entitlement models.
3. Add one authoritative course-access service.
4. Protect learning and media endpoints through that service.
5. Seed explicit development entitlements instead of bypassing access.
6. Add expiry, revocation and cross-user access tests.

**Acceptance criteria:** No protected resource is delivered without a valid beneficiary/resource entitlement decision.

### Stage 3 — implement persistent attempts

1. Add LearningSession, Attempt, AttemptQuestion and AttemptAnswer models.
2. Snapshot question and content versions.
3. Move marking and result-release rules to the backend.
4. Implement timer, timeout, reconnect and idempotent submission.
5. Persist topic/pattern outcomes and misconception evidence.

**Acceptance criteria:** Refreshing or changing devices cannot reset, extend or alter an attempt, and historical attempts remain reproducible after content changes.

### Stage 4 — complete immutable publication

1. Introduce explicit draft and published version records.
2. Snapshot Subject composition and Course composition.
3. Make publication an atomic transition.
4. Ensure edits after publication create a new draft.
5. Define course-upgrade policy for existing entitlements.

**Acceptance criteria:** Editing a draft cannot alter any published response or historical attempt.

### Stage 5 — harden question-bank provenance

1. Add source URL, source owner, rights status and reference-only metadata.
2. Add curriculum year, competency, cognitive level, skill and misconception tags.
3. Version approved questions and record generation lineage.
4. Store similarity evidence against source and generated questions.
5. Require human academic and rights review before publication.

**Acceptance criteria:** Every publishable question has complete curriculum, provenance, rights, review and originality evidence.

## 6. Pending production programme

The following work remains after the immediate product-safety stages.

### Commercial domain

- Product/Price catalogue and promotion rules
- Orders and immutable price snapshots
- Razorpay Test-mode integration
- webhook inbox, worker, retry, dead-letter and replay
- subscriptions and period lifecycle
- refunds with finance permission and step-up authentication
- ledger, invoicing inputs and reconciliation
- GST/accounting and refund-policy review

### Security and privacy

- OIDC/PKCE and secure-cookie session migration
- MFA and privileged-operation controls
- guardian consent and withdrawal
- tenant and ownership enforcement
- threat model and independent security assessment
- CSP, WAF, CSRF and rate limiting
- secret, dependency and static-analysis scanning
- SBOM and licence checks
- data inventory, retention and deletion
- incident response and required log retention

### Cloud and scalability

- separate local, CI, development, staging and production environments
- containerised stateless API and separate worker
- ECS Fargate, ALB and private subnets
- RDS PostgreSQL Multi-AZ and connection protection
- private S3 origins and CloudFront
- SQS queues and dead-letter queues
- Secrets Manager and KMS
- Terraform and environment-specific configuration
- backup, restore, failover and rollback drills

Managed Redis, RDS Proxy, replicas, search, analytics stores, microservices, Kubernetes, Kafka and vector databases must not be introduced without measured need and an ADR.

### Quality and delivery

- formatting and lint gates
- strict DTO/domain typing and removal of unsafe `any`
- unit, integration, API contract and browser tests
- negative authorisation and hidden-answer tests
- migration checks and rollback tests
- OpenAPI compatibility checks
- accessibility testing
- production-like load testing
- immutable build artefacts and staged deployment approvals
- smoke tests and automated health evaluation

## 7. Required production test groups

### Content and learning

- published-version immutability
- student-safe projections
- Type 1 retry and hint policy
- Type 2 step locking and marking
- exact question-version preservation
- timer, timeout and reconnect
- delayed results and retake schedule
- mastery update and decay
- entitlement expiry during a session

### Identity and security

- cross-user, cross-tenant and cross-organisation access
- privilege escalation
- hidden-answer exposure
- expired and revoked sessions
- CSRF, XSS, injection and malicious uploads
- login/recovery throttling
- audit-log integrity and log injection

### Payments

- modified client totals
- duplicate checkout and confirmation
- invalid signature and uncaptured payment
- callback/webhook ordering
- duplicate and out-of-order webhook events
- paid-without-entitlement recovery
- refund limits and duplicate refunds
- renewal failure, recovery and cancellation
- reconciliation repair

## 8. Release gates

### Local prototype gate

- build and tests pass;
- no committed active secrets;
- prototype limitations are visibly identified;
- no live payments or claims of secure paid access.

### Private pilot gate

- student-safe projections complete;
- authentication and entitlement checks enforced;
- server-side attempts operational;
- protected media delivery;
- critical security tests pass;
- privacy terms and pilot support process approved.

### Paid production gate

All architecture go-live gates must pass, including payment verification, idempotency, reconciliation, immutable publication, staff MFA, guardian/privacy controls, independent security review, backup restoration, load testing, alert routing and rollback rehearsal.

## 9. Current decision summary

1. Preserve the React/Vite frontends, NestJS modular monolith, PostgreSQL and shared Zod schema.
2. Treat the existing application as a local prototype, not a secure commerce platform.
3. Fix student answer exposure before expanding public learning access.
4. Establish learner identity and entitlements before payment integration.
5. Make assessment state and marking server-authoritative.
6. Complete immutable content publication before relying on version numbers operationally.
7. Extend the existing question bank instead of rebuilding it.
8. Use official question sources as attributed reference/calibration material and require rights/originality review before publishing derived questions.
9. Introduce production infrastructure only through staged, tested changes and ADRs where architecture choices materially change.

## 10. Current evidence and limitations

The audit supporting this specification was based on repository source, schema, documentation and the successful local `npm test` and `npm run build` commands on 13 September 2026. It did not include penetration testing, production cloud inspection, load testing, database restore testing, payment-provider testing or legal/privacy approval.

No production-readiness claim may be made until those controls are implemented and independently verified.
