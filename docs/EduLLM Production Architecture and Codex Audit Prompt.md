# EduLLM Production Architecture and Codex Audit Prompt

## Purpose

This document defines the proposed production architecture and an audit-first implementation prompt for an existing education-platform repository. It prioritises security, horizontal scalability, payment and subscription correctness, immutable content publication, entitlement-based course access, operational readiness, and protection of minor learners.

The current repository must be audited before adoption. Existing components that meet or exceed these requirements should be preserved; framework replacement or destructive migration requires an approved architecture decision record.

## Architecture principles

1. Entitlements—not browser callbacks or gateway states—control access.
2. The server is authoritative for prices, discounts, taxes, payment status, subscriptions and access.
3. Published content is immutable and versioned.
4. Every payment-side operation is idempotent and auditable.
5. Student clients never receive drafts, premature answers or reviewer metadata.
6. Privacy-by-default applies because many learners may be minors.
7. Scale first through stateless instances and managed services.
8. Payment confirmation must rely on trusted server-side verification.

## Recommended platform

| Layer | Recommendation |
|---|---|
| Student application | React, TypeScript and Vite PWA |
| CMS | React, TypeScript and Vite |
| Backend | NestJS modular monolith |
| API | Versioned REST with OpenAPI |
| Database | PostgreSQL through Prisma |
| Object storage | Private S3; MinIO locally |
| Authentication | Cognito with OAuth 2.0/OIDC Authorization Code and PKCE |
| Payments | Razorpay Orders, Checkout, Webhooks and Subscriptions |
| API hosting | ECS Fargate behind ALB |
| Database hosting | RDS PostgreSQL Multi-AZ |
| Asynchronous work | SQS plus a separate ECS worker |
| Frontend delivery | Private S3 origins and CloudFront |
| Protection | AWS WAF, Secrets Manager and KMS |
| CI/CD | GitHub Actions with approvals |
| Infrastructure | Terraform |

RDS Blue/Green Deployments support testing database changes in a synchronised staging environment before switchover, reducing risk for supported PostgreSQL updates.[^1]

## System boundaries

```text
Student PWA ─────────────┐
CMS / Admin ─────────────┼─ CloudFront + WAF ─ ALB ─ NestJS API ─ PostgreSQL
                         │                         │
                         │                         ├─ S3
                         │                         ├─ Cognito
                         │                         ├─ Razorpay
                         │                         └─ SQS ─ Worker
```

The backend remains a modular monolith with modules for identity, guardian consent, curriculum, content authoring, publishing, courses, catalogue, pricing, promotions, checkout, payments, subscriptions, entitlements, enrolments, learning sessions, attempts, mastery, notifications, support, audit and reporting.

## Environment separation

Use separate local, CI, development, staging and production environments. Production should use isolated databases, Cognito resources, storage, encryption keys, Razorpay Live credentials, webhook secrets, domains, monitoring and privileged assignments.

No production secret may appear in a frontend bundle, repository, CI log or developer `.env` file. Production schema changes must use reviewed migrations; automatic schema synchronisation is prohibited.

## Learning content

```text
Subject
└── Unit
    └── Chapter
        └── Topic
            ├── Concept
            ├── QuestionPattern
            ├── PatternNote
            ├── WorkedExample
            └── Question
                ├── Type1Definition
                └── Type2StepDefinition
```

Every question requires a chapter, primary topic, pattern, type, difficulty, cognitive level, skills, misconception tags, content version and review status. Published content is immutable; edits create a new draft. Attempts preserve the exact content and question versions presented.

## Identity and permissions

Separate authenticated account, represented person, learner profile, guardian relationship, organisation membership, scoped role assignment and versioned consent record.

Recommended roles are learner, guardian, content author, academic reviewer, publisher, support agent, finance operator, organisation administrator and platform administrator. Use scoped RBAC plus ownership and tenant checks; frontend route guards are not security controls.

## Child privacy

The model should support verifiable parental consent and an auditable guardian relationship. The Digital Personal Data Protection Rules 2025 describe technical and organisational measures for obtaining verifiable parental consent and verifying that the claimed parent is an identifiable adult.[^2]

Apply privacy-by-default: no targeted learner advertising, no sale of learner data, minimal trackers, data minimisation, documented retention, guardian-managed consent, correction/export/deletion workflows and human review of consequential automated decisions. Legal counsel must confirm commencement dates, exemptions and exact launch obligations.

## Authentication

Use OAuth/OIDC Authorization Code with PKCE. Public browser applications must not contain client secrets. Require MFA for staff and administrators.

Prefer a backend-for-frontend session using a `Secure`, `HttpOnly`, `SameSite=Lax`, `__Host-` cookie, CSRF protection and rotation after login or privilege changes. Verify token signature, issuer, audience, expiry and token use server-side.

## Commercial separation

```text
Course ─ CourseVersion
Product ─ Price
Order ─ OrderLine ─ PaymentAttempt ─ Payment ─ Refund
Subscription ─ SubscriptionPeriod
Entitlement ─ beneficiary/resource/source/time window
LedgerEntry ─ immutable money movement
```

Products may represent one-time courses, fixed-term access, recurring plans or bundles. Content must not be duplicated simply because it has several prices or sales models.

## Monetary accuracy

Store monetary amounts as integer minor units: ₹499.00 becomes 49900 paise. Never use floating point for prices, discounts, taxes, fees or refunds.

The backend calculates totals from active product, price and promotion records. An order stores an immutable snapshot of currency, subtotal, discount, tax, total, price version and promotion terms. Never trust totals sent by the browser.

## One-time payment flow

1. Client submits product ID, optional coupon and idempotency key.
2. Server authenticates the purchaser and loads the active price.
3. Server validates the coupon and calculates the total.
4. Server creates an internal order and immutable price snapshot.
5. Server creates a Razorpay Order and stores its ID.
6. Client receives public checkout metadata only.
7. Checkout collects payment.
8. Client returns payment ID, order ID and signature.
9. Server verifies the signature using the server-stored order ID and secret.
10. Server confirms trusted captured/paid status.
11. Signed webhook processing reconciles final state.
12. Entitlement is created transactionally and idempotently.

Razorpay webhook signatures use HMAC-SHA256 over the exact raw body with the dedicated webhook secret; verification should occur before trusting parsed fields. A browser success callback alone must never grant access.[^3][^4]

## Subscription state

Maintain a provider-neutral internal state machine:

```text
PENDING → AUTHENTICATED → ACTIVE → PAST_DUE/HALTED
ACTIVE → CANCELLATION_SCHEDULED → CANCELLED
ACTIVE → COMPLETED/EXPIRED
```

Store purchaser, beneficiary, product and price versions, gateway IDs, current-period boundaries, cancellation intent, grace-period end, status reason and lifecycle timestamps. Course access depends on an entitlement, not directly on a Razorpay status string.

## Entitlements

An entitlement identifies beneficiary, resource, source, start, end, status, revocation and reason. Its source can be a paid order, subscription period, school licence, promotion, administrator grant or migration.

Allow access only if the entitlement is active, its time window includes the current time, the learner is active and the course publication is available. Put this decision in one tested domain service.

## Webhook inbox

```text
Receive raw body
→ verify signature
→ insert unique provider event
→ commit inbox record
→ return 2xx quickly
→ worker processes event
→ perform domain transition
→ write transactional outbox
→ reconcile/notify
```

Require unique provider event IDs, duplicate no-ops, out-of-order safety, retry counts, dead-letter handling, replay tooling and alerting. Test and Live secrets must be separate. Never log secrets or unnecessarily sensitive payloads.

## Idempotency

Require idempotency for checkout creation, payment confirmation, entitlement grants, subscription transitions, cancellations, refunds, manual finance actions and webhook processing. Store key, request fingerprint and response; return conflict if a key is reused with a different request.

Recommended unique constraints include provider order, payment, subscription, refund and event IDs, plus uniqueness on entitlement source-beneficiary-resource combinations.

## Refunds

Refunds require finance permission, step-up authentication, policy validation, reason, idempotency, refundable-balance validation, audit evidence and asynchronous reconciliation. Prevent cumulative refunds from exceeding captured value.

Define entitlement impact explicitly for full, partial, duplicate-payment, subscription and dispute cases. Legal, GST, invoice and policy treatment requires Indian legal and accounting review.

## Ledger and reconciliation

Use an append-only ledger for receivable, capture, discount, tax, gateway fee, refund, dispute and adjustment entries. Corrections use compensating entries; financial records are never deleted.

Run a rerunnable daily reconciliation with a lookback window. Compare internal and gateway orders, payments, subscriptions and refunds; detect amount, currency, state and entitlement mismatches; create auditable exceptions and repair paid-without-entitlement failures.

## API requirements

Use `/api/v1` REST endpoints for catalogue, courses, checkout intents, orders, payment confirmation, subscriptions, entitlements, learning sessions, attempts, progress, refunds and Razorpay webhooks.

Require OpenAPI, boundary validation, a standard error envelope, correlation IDs, pagination limits, optimistic locking for concurrent editing, UTC ISO 8601 timestamps, body-size limits and no stack traces in responses.

## Security baseline

- ECS and RDS in private subnets; RDS not publicly reachable.
- Least-privilege security groups, IAM roles and KMS keys.
- Secrets Manager for secrets and rotation.
- Strict CSP, security headers, output encoding and rich-text sanitisation.
- CSRF protection for cookie-authenticated mutations.
- Upload type/size checks, malware workflow and private storage.
- Signed short-lived media URLs.
- Rate limiting by operation, account and IP.
- Secret, dependency and static-analysis scanning plus SBOM.
- Structured, redacted logs and tamper-resistant audit events.
- Negative object-level and function-level authorisation tests.

CERT-In materials reiterate incident reporting within six hours for specified incidents and log retention of at least 180 days for investigations. Exact applicability and operational procedures require counsel and incident-response validation.[^5]

## Scalability

Start with a stateless API and separate worker. Scale API tasks horizontally behind the load balancer; use SQS to absorb asynchronous spikes, CloudFront for static and published content, and database pooling to protect PostgreSQL.

Add RDS Proxy, Redis, replicas, analytics stores or managed search only after metrics establish need. Do not introduce microservices, Kubernetes, Kafka or vector databases without a measured requirement and an approved ADR.

## Reliability targets

| Measure | Proposed objective |
|---|---:|
| Monthly API availability | 99.9% |
| API p95 latency | Under 500 ms excluding third parties |
| Learning submission p95 | Under 800 ms |
| Webhook durable acknowledgement | Under 5 seconds |
| RPO | 5 minutes or better |
| RTO | 4 hours or better |

These are engineering objectives, not guarantees; load tests, alarms and staffing must support them.

## CI/CD gates

Every pull request should pass formatting, lint, strict TypeScript, unit and integration tests, migration checks, OpenAPI compatibility, vulnerability and secret scanning, static security analysis, licence checks, build and accessibility checks.

Production requires a reviewed pull request, immutable image digest, staging deployment, smoke tests, manual approval, automated health evaluation and tested rollback. RDS Blue/Green can be used for appropriate PostgreSQL changes after reviewing its constraints.[^1]

## Critical test matrix

### Payments

- Altered client amount
- Duplicate checkout
- Invalid payment signature
- Valid signature with uncaptured payment
- Browser callback before/after webhook
- Duplicate and out-of-order webhook
- Payment captured but entitlement creation initially fails
- Duplicate, partial and excessive refund
- Renewal failure and recovery
- Cancellation at period end
- Currency mismatch
- Reconciliation repair

### Security

- Cross-user and cross-tenant access
- Privilege escalation
- Hidden-answer exposure
- CSRF, XSS and injection
- Malicious upload
- Expired and revoked session
- Replayed webhook
- Rate-limit bypass
- Log injection

### Learning

- Type 1 retries and hints
- Type 2 step locking and marking
- Content-version preservation
- Entitlement expiry during a session
- Mastery update and delayed review

## Go-live gates

### Commercial

- Razorpay KYC and Live credentials approved
- Test and Live environments isolated
- Prices, coupons, GST and invoicing approved
- Terms, privacy, guardian, refund and cancellation policies published
- Customer support and escalation active
- Low-value live transaction and refund tested

### Security and privacy

- Threat model approved
- Independent assessment completed; critical/high issues closed
- Admin MFA enforced
- IAM and secret review passed
- Backup restore and incident tabletop passed
- Guardian consent and withdrawal tested
- Data inventory and retention approved
- Targeted learner advertising disabled
- Legal/privacy approval obtained

### Reliability

- Production-like load test passed
- Migration, failover and rollback rehearsed
- Queue replay and dead-letter recovery tested
- Alarms routed to accountable responders
- RPO/RTO restoration drill completed

# Codex Audit and Adoption Prompt

Paste the following prompt into Codex at the repository root.

```text
You are the principal software architect and security-focused senior engineer
reviewing an existing education-platform repository.

The repository already contains a base implementation. Do not replace it,
re-scaffold it, or change frameworks merely to match a preferred stack.
Inspect the actual repository first and preserve all working implementation
that meets or exceeds the requirements in docs/PRODUCTION_ARCHITECTURE.md.

PROJECT PURPOSE

The platform teaches CBSE Class 10 Science through subjects, units, chapters,
topics, reusable question patterns, short notes, worked examples, Type 1
practice, guided Type 2 questions and topic/pattern mastery. It sells one-time,
fixed-term and optional subscription access to courses. Many learners may be
minors.

AUTHORITATIVE INPUTS

Read:
- docs/PRODUCTION_ARCHITECTURE.md
- docs/PROJECT_HANDOFF.md
- repository ADRs and documentation
- database schema and migrations
- API specifications and tests

When documents conflict, identify the conflict, preserve the safer behaviour,
propose a decision and do not silently choose or destructively migrate.

PHASE 1 — AUDIT ONLY

Inspect workspace layout, frontends, backend, versions, authentication,
sessions, authorisation, tenant isolation, schemas, migrations, content,
publication, questions, attempts, mastery, catalogue, pricing, orders,
payments, subscriptions, entitlements, Razorpay, webhooks, workers, audit,
cloud configuration, CI/CD, tests, logs, monitoring, dependencies and secrets.

Run documented setup, lint, type-check, test and build commands.

Create:
- docs/audits/PRODUCTION_GAP_ANALYSIS.md
- docs/audits/CURRENT_ARCHITECTURE.md
- docs/audits/THREAT_MODEL.md
- docs/audits/PAYMENT_FLOW_AUDIT.md
- docs/audits/GO_LIVE_READINESS.md

For each requirement record ID, COMPLETE/PARTIAL/MISSING/UNSAFE, exact evidence,
severity, recommended change, migration impact and required test.

Do not broadly modify production behaviour during Phase 1. If an active secret
or immediately exploitable flaw is found, stop, avoid printing the secret and
propose containment.

PHASE 2 — PLAN

Create docs/plans/PRODUCTION_HARDENING_PLAN.md. Divide work into small PRs with
objective, files, schema impact, migration/rollback, security and compatibility
impact, tests, acceptance criteria and rollout.

Prioritise P0: exposed credentials, client-controlled prices/entitlements,
browser-only payment confirmation, missing signature checks, non-idempotent
finance operations, broken resource authorisation, public production database,
and hidden-answer exposure.

Prioritise P1: missing entitlements, subscription-state errors, missing
transactions, webhook duplication, missing reconciliation, guardian/consent
gaps, audit gaps, unsafe sessions and untested restore.

Wait for approval before destructive schema or commercial changes.

PHASE 3 — DOMAIN CORRECTIONS

Verify or implement:
- versioned immutable published content;
- mandatory chapter, primary topic and pattern on questions;
- attempts preserving exact versions;
- student-safe API projections;
- Product/Price separate from Course/CourseVersion;
- integer minor-unit money;
- server-calculated totals and immutable order snapshots;
- explicit order, payment and subscription state machines;
- backend-created Razorpay Orders;
- server-side checkout signature verification;
- trusted capture/paid confirmation;
- raw-body webhook verification;
- separate Test/Live webhook secrets;
- webhook inbox uniqueness, retry, DLQ and replay;
- provider-neutral subscriptions with period boundaries;
- one authoritative entitlement service;
- idempotent entitlement creation;
- step-up and idempotent refunds;
- rerunnable scheduled reconciliation;
- append-only financial ledger.

PHASE 4 — SECURITY AND SCALE

Verify OAuth/OIDC Authorization Code with PKCE, no browser secrets, staff MFA,
BFF secure-cookie sessions, CSRF protection, rotation/revocation, login and
recovery limits, scoped service-layer authorisation, tenant checks, guardian
and versioned consent, data minimisation, retention, rich-text sanitisation,
secure uploads, signed media URLs, redacted logs, WAF/rates, SAST, secret and
dependency scanning and SBOM.

Keep API stateless; use horizontal tasks and SQS workers. Cache only safe
published data. Protect database connections. Do not add Kubernetes,
microservices, Kafka, Redis or search without measured evidence and an ADR.

PHASE 5 — TEST AND RELEASE

Add tests for modified client totals, duplicate requests, invalid/uncaptured
payments, all webhook orderings and duplicates, paid-without-entitlement,
refund limits, renewal failure, cancellation, reconciliation, cross-user and
cross-tenant access, privilege escalation, hidden answers, CSRF/XSS/uploads,
revoked sessions, webhook replay, Type 1 retries, Type 2 locking, content
versions and entitlement expiry.

Exercise production-like migrations, backup restore, rollback, health checks,
queue replay, Razorpay Test-mode E2E and production configuration validation
without revealing secrets.

DELIVERABLES

Provide changed-file list, ADRs, migrations, OpenAPI changes, environment
variable names without values, test output, residual risks, production,
rollback, payment incident and reconciliation runbooks, and a PASS/FAIL/NOT
TESTED go-live checklist with evidence.

NON-NEGOTIABLE RULES

- TypeScript strict mode; do not use any to bypass domain typing.
- No swallowed exceptions.
- No financial/access mutation without transactions or a documented
  consistency mechanism.
- No production schema auto-sync.
- No destructive migration without compatibility and rollback.
- No committed secrets.
- No client-authoritative prices.
- No access based only on checkout success.
- No controller-to-database business logic.
- No framework change without approved ADR.
- No security completion claim without test/config evidence.

FIRST RESPONSE FORMAT

Return repository understanding, detected stack, commands run, top ten risks,
documents created and blocking questions. Do not begin broad implementation.

Begin with Phase 1.
```

## Final caution

This is an engineering design, not legal, tax or compliance advice. Before go-live, obtain reviews from an Indian privacy lawyer, accountant/tax adviser, payment-domain specialist and independent application-security assessor.

---

## References

1. [Overview of Amazon RDS Blue/Green Deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-overview.html) - By using Amazon RDS Blue/Green Deployments, you can stay current on security patches, improve databa...

2. [[PDF] इलेक्ट्रॉजिकी और सूचिा प्रौद्योजगकी मंत्रालय अ](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf) - Short title and commencement. — (1) These rules may be called the Digital Personal Data Protection. ...

3. [Guide to Razorpay Webhooks: Features and Best Practices](https://hookdeck.com/webhooks/platforms/guide-to-razorpay-webhooks-features-and-best-practices) - Razorpay webhooks are verified with an X-Razorpay-Signature HMAC-SHA256 over the raw body, hex-encod...

4. [Razorpay Webhook Documentation Review | Svix Blog](https://www.svix.com/blog/reviewing-razorpay-webhook-docs/) - The best documentation we've seen generally has these five elements: (1) signature verification, (2)...

5. [[PDF] Digital Threat Report 2024](https://www.cert-in.org.in/PDF/Digital_Threat_Report_2024.pdf) - Redesign log retention policies to store logs for at least 180 days to ensure availability for incid...

