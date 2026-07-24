# Proposed Product and Technical Architecture

Last updated: 21 July 2026

## 1. Recommendation

Build two responsive React applications over one modular NestJS backend and one PostgreSQL database:

```text
Content Management App ─┐
                        ├── NestJS Modular API ── PostgreSQL
Student Learning App ───┘          │
                                   └── Local files now / Amazon S3 later
```

Use a modular monolith initially. The domains are separated in code and data ownership, but deployment remains simple and memory-light. Do not introduce microservices, queues, Redis, or a separate analytics platform until measured load requires them.

## 2. Applications

### Content Management application

Primary workspaces:

1. **Syllabus and Content Library** — boards, grades, subjects, reusable chapters, topics, and version impact.
2. **Learning Content Studio** — Learning Cards, media, references, patterns, examples, Type 1 and Type 2 practice.
3. **Assessment Studio** — question banks, blueprints, Cycle Tests, Unit/Semester Tests, Previous Papers, and Simulations.
4. **Subject Builder** — ordered units and reusable chapter placement, final exam, expandable index preview.
5. **Exam Kit Builder** — configurable previous/model/simulation paper collections.
6. **Review and Approval** — content completeness, topic mappings, marking, timing, licences, and publish readiness.
7. **Course Builder** — approved subjects/exam kits, catalogue information, price, discounts, subscription, validity, and publish controls.
8. **Configuration** — mastery thresholds, retention policies, result embargo, retake rules, and organisational defaults.

### Student Learning application

Primary experiences:

1. Public course catalogue and details.
2. Registration, login, subscription/enrolment, and My Courses.
3. Subject index/progressive scorecard.
4. Concise Learning Card player with flip, swipe, autoplay, images, videos, and references.
5. Practice player with immediate feedback and explanations.
6. Chapter-completion declaration and eligibility status.
7. Distraction-free timed assessment player with autosave.
8. Pending-result countdown and released answer sheets.
9. Go Green dashboard, retention warnings, and next eligible retakes.
10. Separate Previous Paper and Simulation exam areas.

## 3. Backend domain modules

| Module | Owns |
|---|---|
| Identity & Organisation | organisations, users, roles, teacher assignments, student profiles, sessions |
| Curriculum Library | boards, grades, syllabus versions, subjects, chapters, topics and mappings |
| Content Authoring | Learning Cards, bundles, explanations, references, media and content versions |
| Pattern & Question Bank | patterns/templates, Type 1 questions, Type 2 questions/steps and topic tags |
| Assessment Authoring | blueprints, pools, assessment definitions, papers, timing and marking rules |
| Review & Publishing | submissions, approval decisions, immutable published versions and impact checks |
| Course Catalogue | courses, subject/exam-kit composition, price, discount, validity and publication |
| Enrolment & Entitlement | subscriptions, enrolments, access periods and course permissions |
| Learning Progress | card/practice completion, chapter declarations and prerequisite eligibility |
| Assessment Runtime | paper generation, attempts, timers, autosave, submission, scoring and embargo |
| Mastery & Retention | evidence, actual scores, current decayed mastery, colours and retake schedules |
| Reporting & Audit | answer sheets, marks sheets, audit events and operational exports |

Each module exposes services to other modules; UI code must not implement authoritative timing, marking, locking, eligibility, or decay rules.

## 4. Key data aggregates

### Reusable curriculum

- `organisation`
- `user`, `role_assignment`, `teacher_assignment`, `student_profile`
- `board`, `grade_level`, `syllabus`, `syllabus_version`
- `subject`, `subject_version`
- `unit`, `unit_chapter` (ordered reusable reference)
- `chapter`, `chapter_version`
- `topic`, `chapter_topic`

### Learning and questions

- `learning_card_bundle`, `learning_card`
- `media_asset`, `content_media_link`
- `external_reference`
- `problem_pattern`, `pattern_variant`
- `question`, `question_option`, `question_topic`
- `type2_definition`, `type2_step`, `type2_step_dependency`
- `question_explanation`

### Assessment authoring

- `assessment_definition`
- `question_bank`, `question_bank_item`
- `cycle_test_template`, `cycle_test_section`, `cycle_test_section_rule`
- `attempt_form`, `attempt_form_section`, `attempt_form_question`, `attempt_form_approval`
- `assessment_fixed_question` (exact previous papers)
- `exam_kit`, `exam_kit_item`
- `retention_policy`, `mastery_threshold_policy`

### Commercial course

- `course`, `course_version`
- `course_subject`
- `course_exam_kit`
- `course_price`, `discount_rule`, `subscription_plan`
- `course_publication`
- `enrolment`, `entitlement`, `payment_record`

### Student runtime

- `learning_activity`
- `practice_attempt`, `practice_response`
- `chapter_completion_declaration`
- `assessment_eligibility`
- `assessment_attempt`
- `attempt_paper_snapshot`
- `attempt_question`, `attempt_response`, `attempt_step_response`
- `evaluation_result`, `evaluation_item`
- `mastery_evidence`, `mastery_snapshot`
- `retake_schedule`

Use normalized relational tables for identity, composition, attempts, money, locking, and mastery. JSONB is appropriate for immutable rendered card bodies, question interaction configuration, and paper snapshots—not as the only store for the entire platform.

## 5. Versioning and publication

Draft and published content are distinct versions. A published Chapter Version is immutable. Subject Versions point to explicit Chapter Versions, and Course Versions point to explicit Subject and Exam Kit Versions.

```text
Chapter v1 approved
  → Subject v1 references Chapter v1
  → Course v1 references Subject v1

Chapter v2 drafted/approved later
  → impact shown to teacher/admin
  → Subject v2 explicitly adopts Chapter v2
  → Course v2 published when ready
```

An enrolled student's in-progress assessment always retains its immutable paper and content snapshot.

## 6. Runtime correctness

- PostgreSQL transactions protect attempt start, submission, marking, and entitlement changes.
- A uniqueness constraint permits only one active attempt per student/assessment eligibility window.
- The server records `started_at`, `deadline_at`, `submitted_at`, `release_at`, and `next_eligible_at`.
- Browser timers are informational; the server deadline is authoritative.
- Responses autosave with optimistic version numbers to prevent accidental overwrite.
- Submitted paper snapshots and scoring rules are immutable.
- Each Cycle Test or Semester template version owns a finite ordered cycle of approved Attempt Forms. Once issued, a form is frozen. Attempt ordinals map to these forms using the configured cycle; students mapped to the same form share its selected questions, while each paper snapshot may shuffle order within each section only.
- Unit/Semester Attempt Forms draw only from the approved Question Banks of Chapter Versions assigned to that Subject Unit. Teachers curate or approve the exact question selection for every form in the configured cycle; the system may propose a draft but cannot publish it automatically.
- Assessment templates configure a finite `form_cycle_count`. Runtime maps an attempt to `((attempt_ordinal - 1) % form_cycle_count) + 1`; for a five-form cycle, attempts 1, 6, and 11 use Form 1. The selected form is frozen, while each delivered paper remains a separate immutable snapshot.
- A scheduled worker releases results and recalculates decay. Initially this can be a small process in the same repository using PostgreSQL row locking; no queue is required.
- Mastery is recalculated on new evidence and periodically for decay, while actual marks remain unchanged.

## 7. API groups

### Authoring/admin

- `/api/library/chapters`, `/topics`, `/content-versions`
- `/api/questions`, `/patterns`, `/type2`
- `/api/assessments`, `/blueprints`, `/question-pools`
- `/api/subjects`, `/units`, `/chapter-placements`
- `/api/exam-kits`
- `/api/reviews`, `/approvals`, `/publications`
- `/api/courses`, `/prices`, `/discounts`, `/subscription-plans`
- `/api/policies/mastery`, `/retention`, `/retakes`

### Student

- `/api/catalogue`, `/my-courses`, `/entitlements`
- `/api/learn/subjects/:id/index`
- `/api/learn/cards`, `/practice`, `/progress`
- `/api/learn/chapters/:id/declaration`
- `/api/assessments/:id/eligibility`
- `/api/attempts/start`, `/:id/responses`, `/:id/submit`
- `/api/results/pending`, `/:id/answer-sheet`
- `/api/mastery/scorecard`, `/retakes/upcoming`

Commands that affect publication, attempts, marking, payment, or entitlement must be idempotent and audited.

## 8. Roles and permissions

Keep a small role catalogue and use scoped assignments rather than inventing many workflow roles.

| Role | Primary permissions |
|---|---|
| Organisation Admin | users, teacher assignments, policies, course composition, commercial settings, final publication, enrolments |
| Teacher/Instructor | assigned subjects, chapters, learning content, questions, assessments, exam kits, submission for review |
| Student | consume entitled published content, practise, declare completion, take eligible assessments, view own results |

The first Content Operations release implements only Organisation Admin and Teacher accounts. Admin performs final academic approval. A separate Academic Reviewer assignment can be introduced later if organisational scale requires it.

Never allow a teacher to modify a student's submitted response or awarded mark directly. Corrections require a versioned marking-rule change and an audited re-evaluation operation.

## 9. Personas

### Ananya — Organisation Admin / Course Owner

Wants to launch a CBSE Class 10 package quickly. She requests Science and Mathematics from teachers, verifies approval, bundles subjects and exam kits, configures price/discount/validity, previews the offering, and publishes it. She cares about readiness, reuse, commercial control, and enrolment—not question-level authoring.

### Ravi — Teacher / Content Architect

Understands the syllabus and recurring exam patterns. He reuses suitable chapters, creates syllabus-specific variants when needed, condenses concepts into Learning Cards, builds patterns and assessments, maps every scored question, and assembles units and subjects. He needs efficient bulk import plus precise visual editing.

### Meera — Academic Reviewer

Checks coverage, correctness, explanations, critical-step penalties, mark totals, topic mappings, past-paper claims, references, and licensing. She approves immutable versions or requests specific changes. She needs side-by-side preview and a clear validation report.

### Arjun — Disciplined Student

Wants high exam performance without rereading textbooks. He studies short card bundles, practises with explanations, declares readiness, takes locked timed tests, waits for diagnostic results, and follows the Go Green scorecard and scheduled retakes. He needs focus, trust, transparency, and mobile-friendly continuity.

### Priya — Parent/Sponsor (future read-only persona)

Pays for access and wants a simple view of consistency and risk without seeing private question answers or controlling attempts. This persona is valuable later but does not justify a separate MVP role yet.

## 10. Security and account integrity

- Content Operations uses scrypt-hashed passwords and opaque 12-hour sessions whose token hashes are stored for revocation. OIDC can replace local passwords at deployment without changing role rules.
- Bootstrap creates the first Organisation Admin. Admin creates, disables, reactivates and resets Teacher accounts. New/reset Teacher passwords require replacement at the next sign-in.
- Admin has complete Content Operations access. Teacher can author Chapters, Question Banks, Cycle Tests, Subjects, Units and Semester Tests and submit them for review, but cannot manage users, grant final approval, configure commercial courses or publish offerings.
- One active scored-assessment session per student, with server-side attempt token.
- Log device/session changes and suspicious concurrent access.
- Optional organisation policy for active-device limits.
- Rate-limit attempt-start and answer APIs.
- Encrypt transport and protect student assessment data.
- Do not claim that test locks alone prevent subscription sharing; combine fair controls, audit signals, and support review.

## 11. Technology stack

- React + TypeScript + Vite for both applications
- NestJS + TypeScript modular monolith
- PostgreSQL using explicit SQL/query layer initially; consider an ORM only if it improves rather than obscures the assessment queries
- Zod for shared API/content validation
- Local filesystem for office-laptop development; Amazon S3/CloudFront for production media
- PostgreSQL-backed scheduled worker initially
- Vitest/Jest for units and integration, Playwright for critical browser flows
- Docker optional for team consistency, not required for current office-laptop testing

## 12. Implementation slices

1. Refactor reusable Chapter/Topic/Content Library and migrate the existing sample.
2. Add Type 1/Type 2 pattern and question authoring with validation.
3. Build Subject/Unit assembly with reusable chapter placement.
4. Build assessment definitions, pools, policies, and Exam Kits.
5. Add review, immutable versions, and explicit approval.
6. Build Course composition, catalogue data, access validity, and publication.
7. Build Student Learning Cards and unscored Practice.
8. Add confidence-based Cycle Test unlocking and the runtime with instructions, final start confirmation, server timer, autosave, timeout submission, navigation protection, and retake locking.
9. Add delayed results, answer sheets, mastery colours, and retention decay.
10. Add Unit/Semester, Previous Paper, and Simulation experiences.
11. Add subscriptions/payments only after entitlement flows work locally.
