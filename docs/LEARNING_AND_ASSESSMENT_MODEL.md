# Learning and Assessment Model

Last updated: 22 July 2026

This document defines how EduLLM condenses prescribed curricula, teaches reusable problem patterns, controls assessment attempts, and maintains a time-sensitive mastery scorecard.

## 1. Learning objective

EduLLM must not reproduce a textbook as another long reading experience. It should condense a large syllabus into the smallest set of concepts, retrieval cues, answer structures, and unique problem patterns that enables a student to recall and apply the complete prescribed syllabus.

Examples:

- Condense approximately 300 textbook pages into approximately 50 pages/slides of high-value learning material.
- Reduce thousands of Mathematics or Physics problems into approximately 50–60 genuinely distinct patterns/templates where academically valid.
- Use up to 20 years of past papers to identify recurring patterns, important concepts, marking expectations, and likely variations.

The prescribed syllabus remains visible as issued. Condensation changes the learning presentation, not the required coverage.

## 2. Topic, Subtopic and Page experience

The syllabus index is the student's primary navigation and preserves the prescribed textbook-facing Topic and Subtopic hierarchy. A Subtopic contains one or more ordered Learning Pages. Previously opened pages remain above; `Continue` unlocks and scrolls to the next Page. Topic boundaries use an explicit `Next Topic` action.

```text
Chapter
└── Topic
    ├── optional Topic Introduction Page(s)
    └── Subtopic
        ├── Learning Page(s)
        │   ├── explanations and condensed content blocks
        │   ├── original media and precise diagrams
        │   └── worked examples
        └── Check Your Understanding
```

`Check Your Understanding` contains normally two or three short, Subtopic-specific formative questions. It provides immediate feedback, explanations and unrestricted retakes, but no marks and no mastery-colour impact. The student does not have to answer everything correctly to continue.

Full Practice is not repeated under Topics or Subtopics. After all learning content, Chapter Essentials and Summary, the student reaches one flat **Chapter Practice — Master Every Pattern** sequence. It combines every approved unique Type 1 and Type 2 practice pattern without learner-facing Topic folders. The system retains internal Topic/Subtopic mappings for coverage, explanation, analytics and later scorecard use. Chapter Practice shows one question at a time, provides immediate feedback and explanations, supports question-level retake and does not affect mastery colours.

## 3. Question types

### Type 1

- Multiple choice
- Fill in the blank
- True or false

Type 1 questions can stand alone or act as subquestions within Type 2.

### Type 2

Type 2 represents the reasoning and answer-writing sequence required for a board or competitive-exam problem. It is an ordered group of subquestions, usually implemented using Type 1 interactions, whose answers consolidate into the final solution or descriptive answer.

For descriptive answers, every subquestion provides two or three closely related choices. The student selects or drags one choice into that step's line in a shared answer box. The answer box always follows the configured step order and gradually consolidates the complete descriptive answer.

For numerical problems, steps may include:

1. identify given data;
2. identify the required result;
3. identify the underlying concept;
4. choose the formula;
5. convert units or formats;
6. substitute values;
7. calculate;
8. state the answer with correct units.

Each step stores its order, prompt, interaction type, choices, correct answer, explanation, positive marks, optional critical-step penalty, dependencies, and contribution to the consolidated answer.

The student submits only after all required answer lines are populated. Evaluation then marks each line correct or incorrect. The full explanation remains hidden until submission and opens through an Explanation action below the answer box. Question prompts, selected/correct answer points, and explanations may each carry their own media references, supporting equations, reaction diagrams, biological structures, graphs, or other small instructional images.

Critical steps may apply negative marks when configured. Later correct steps may still earn marks. Decimal marks are supported, and the total question/assessment score is floored at zero.

## 4. Learning gates and Cycle Test

A Chapter Cycle Test is initially locked. Learning Pages, Check Your Understanding and Chapter Practice have no completion declarations because the product complements classroom, textbook, tutoring and independent learning rather than forcing students to repeat material they already know.

At Chapter Completion the student makes one explicit declaration: **“I am confident and ready to take the Cycle Test.”** Chapter Practice may be incomplete. This unlocks the test. The declaration is irreversible for that unlocked attempt: the control becomes completed and disabled and cannot be used to relock the test. Closing and reopening the Chapter does not change the unlocked state. It remains unlocked until the first attempt is submitted; submission then locks the assessment until the configured retake time.

Before starting, the student sees a dedicated instruction page containing the paper structure, marks, duration, automatic timeout submission, result availability, network recovery and navigation rules. The server deadline never pauses. Answers save locally after changes and synchronize regularly. Following disconnection, browser closure or device restart, the authenticated student can reopen only the same active attempt and recover synchronized answers with the authoritative remaining time. At timeout, the server submits its latest synchronized answers; answers remaining only offline beyond the deadline may not be accepted. After submission or timeout, the test locks until the configured retake date.

The declaration is a learning commitment, not a sufficient anti-sharing control. Authentication, active-session rules, device/session monitoring, and attempt auditing provide separate account-integrity controls.

## 5. Assessment levels

| Assessment | Scope | Typical marks/time | Scorecard impact |
|---|---|---|---|
| Check Your Understanding | One Subtopic, normally 2–3 short questions | Untimed | None |
| Chapter Practice | One flat sequence of unique Chapter patterns | Untimed or lightly timed | None |
| Cycle Test | One chapter, current Topics through a blueprint | 25 marks; teacher-configured duration | Topic colours |
| Unit/Semester Test | Group of chapters | 50 marks; teacher-configured duration | Chapter colours |
| Previous Paper | Exact historic paper | Official pattern/time | None on main scorecard |
| Model Simulation | Full exam, internally authored | 80 marks, typically 180 minutes | Separate chapter-level marks sheet |

All values are configurable and not hard-coded.

## 6. Timed attempt lifecycle

```text
Locked
  → Eligible
  → Started (timer and autosave active)
  → Submitted or Auto-submitted
  → Evaluation pending
  → Result embargo (normally 24 hours)
  → Released with marks, diagnostics, and explanations
  → Retake locked
  → Eligible after retake duration
```

During a scored test, explanations and correct answers remain hidden. Answers autosave, and the server—not only the browser—enforces the deadline and auto-submission. The result release delay is configurable, with 24 hours as the intended default.

Every question is mapped to exactly one primary topic for Cycle Test diagnostics. Additional concept/pattern tags may be stored for analytics.

## 7. Question pools and retakes

Check Your Understanding, Chapter Practice and Cycle Tests are independent usages. Chapter Practice has one flat ordered question sequence and immediate teaching feedback. A Cycle Test draws scored questions from an approved Chapter Question Bank and never derives its paper automatically from Chapter Practice. A question may be intentionally eligible for more than one usage, but this requires explicit `usage` flags rather than implicit reuse.

The Chapter Question Bank contains Type 1 and Type 2 questions, answers, explanations, topic mapping, format, marks, difficulty, pattern, and media. A Type 2 question may have any academically appropriate number of ordered subquestions; its total marks and critical-step rules must reconcile with those subquestions.

A teacher configures a reusable Cycle Test Template made of ordered sections. Each section defines:

- section title and instructions;
- permitted question type and Type 1 format, such as MCQ or fill in the blank;
- marks per question;
- number of questions to present;
- number the student must answer;
- permitted Type 2 subquestion range when applicable;
- eligible topics, patterns, difficulty, and question-bank filters;
- whether question order is shuffled within that section.

Example 40-mark structure:

| Section | Configuration | Presented/answered | Marks |
|---|---|---:|---:|
| 1 | Type 1 — MCQ, 1 mark each | 5 / 5 | 5 |
| 2 | Type 1 — Fill in the blank, 1 mark each | 5 / 5 | 5 |
| 3 | Type 2, 3 marks each, normally about 3 subquestions | 5 / 5 | 15 |
| 4 | Type 2, 5 marks each, normally 5–7 subquestions | 4 / any 3 | 15 |
|  | **Total counted marks** |  | **40** |

The template validates both presented marks and counted marks. For an “any 3 of 4” section, all four questions appear, the student explicitly chooses/answers up to three, and only the configured required count contributes to the 15-mark total.

Each test-template version contains a finite set of numbered Attempt Forms: Form 1 through the configured form count. A student's attempt ordinal maps to one of these forms using the repeating cycle below. Question order is independently shuffled for each delivered attempt only within its original section, so a Section 1 question can move from position 1 to position 3 but can never cross into another section. The immutable paper snapshot records the student's final order.

The teacher configures a finite Attempt Form cycle, such as five approved forms. Student attempt ordinals map back through that cycle:

Teachers build the Chapter Question Bank before configuring Cycle Test forms. The bank can be loaded as JSON or maintained through the Content Management application. Every question has a stable ID, one primary Topic, type, format, difficulty, marks, answer and explanation. Type 2 questions additionally contain ordered subquestions; each subquestion has two or three close choices, one correct answer, marks, explanation and optional critical-step negative marking.

Routine corrections use a visual question editor; JSON is reserved for bulk loading and optional advanced editing. Teachers can directly edit Type 1 marks, choices, correct answer, explanation and image references. For Type 2, they edit each ordered subquestion, its choices, answer, marks, explanation, critical-step flag and negative marks. The Type 2 total is calculated from its subquestion marks. Stable question IDs cannot be changed after creation. If an edit makes a question incompatible with a form section, the system removes that assignment and returns the affected form to Draft for review.

Every Chapter provides Chapter Essentials and a chapter-level Summary before Chapter Practice and Cycle Test. Together they supply the complete mental map, topic connections, essential ideas, formulas/equations, exam focus, recall checklist and supporting diagrams. They are Chapter-level sections, not Topics.

The recommended flow is Learning Pages → Check Your Understanding after each Subtopic → Chapter Essentials → Summary → flat Chapter Practice → Chapter Completion → Cycle Test. A student already prepared elsewhere may declare confidence without completing every Chapter Practice question.

The form builder displays Form 1 through Form N. Within every section, the teacher selects the exact questions from the eligible bank. Eligibility is enforced by question type, format and marks. A form cannot be approved until every section contains exactly its configured presented-question count. Cycle Test banks belong to a Chapter. Semester Test builders combine the approved banks of all Chapters assigned to that Subject Unit.

```text
Form number = ((attempt number - 1) mod configured form count) + 1

Attempt 1  → Form 1
Attempt 2  → Form 2
Attempt 5  → Form 5
Attempt 6  → Form 1
Attempt 7  → Form 2
Attempt 10 → Form 5
Attempt 11 → Form 1
```

Therefore, students may take any number of retention retakes without requiring unlimited paper authoring. Reusing Form 1 means reusing its frozen selected question set, while its within-section display order can be reshuffled for the new student attempt. Every actual paper remains stored as an immutable snapshot. Changing the form cycle, selected questions, or template creates a new version and never alters attempts already issued.

Students cannot repeatedly open attempts. Only one active attempt is allowed for the relevant assessment, and after submission the next attempt is unavailable until `next_eligible_at`.

### Unit/Semester Test forms

Unit/Semester Tests use the same ordered Section Template → Attempt Form → Student Paper Snapshot engine as Cycle Tests. Their eligible bank is the union of approved question banks belonging to the explicit Chapter Versions configured in that Subject Unit. Every selected question retains its primary chapter and topic mappings, but Semester results update chapter-level mastery rather than replacing Cycle Test topic mastery.

Teachers control the exact selected question set for every Semester form in the configured cycle. They can build Form 1 through Form N manually, or ask the system to produce rule-compliant drafts and then replace questions before approval. After Form N, later student attempt ordinals repeat from Form 1 using the configured modulo cycle. The system never releases an automatically generated Semester form without teacher approval.

Semester Attempt Form workflow:

```text
Select Unit and Semester Test Template
  → Create/maintain one Form within the configured Form 1…N cycle
  → Select questions from the Unit's Chapter Question Banks
  → Validate sections, marks, chapter coverage, formats, and choices
  → Teacher previews complete paper and answer key
  → Academic review/approval
  → Form becomes available for every attempt ordinal mapped to it by the cycle
  → First issued paper freezes the selected question set
```

The teacher selects which bank questions belong to each section; questions cannot cross section boundaries. All students mapped to the same Semester Form receive its approved question set, while the student-facing order may be independently shuffled within each section. For example, with five forms, attempts 1, 6, and 11 all use Form 1. Different forms may repeat important questions deliberately, but otherwise use teacher-curated selections across the unit's chapters.

## 8. Delayed evaluation and answer sheet

Marks and diagnostic feedback are released after the configured embargo. The released answer sheet includes:

- student response;
- correct response;
- marks awarded and penalties;
- explanation/full solution;
- topic and pattern;
- Type 2 step-by-step evaluation;
- consolidated model answer;
- time used where relevant.

Practice explanations remain immediate; test explanations never appear before result release.

## 9. Progressive scorecard

The prescribed syllabus index is also the student's scorecard:

```text
Course → Subject tile → Unit → Chapter → Topic → Subtopic → Learning Pages / Check Your Understanding
```

- Cycle Test results update topic mastery.
- Unit/Semester Test results update chapter mastery without replacing topic history.
- Simulation exams use a separate chapter-level marks sheet.
- Previous papers do not change either mastery scorecard.
- Learning content is stored in ordered Pages under a Subtopic; optional Topic Introduction Pages introduce a Topic without creating a false Subtopic.
- Chapter Practice is a single learner-facing sequence with hidden Topic/Subtopic mappings; it is not divided into practice folders.
- Independent colour calculation exists only for Chapters and Topics. A Subtopic displays its parent Topic colour and never has a separate mastery calculation.

Initial states:

- Green: strong/mastered
- Yellow: developing or needs practice
- Red: weak/requires attention
- Grey: not started or insufficient evidence

Thresholds are configuration-driven; for example, Green may begin at 90%.

## 10. Retention decay

EduLLM stores both the actual awarded score and a calculated current mastery score. Historical marks never change.

After a configured grace/reduction time, current mastery decays according to the subject, assessment, topic complexity, or default retention policy. As mastery decays, Green may become Yellow and later Red. A completed eligible retake replaces the active mastery basis with the latest attempt, while all attempt history remains available.

A retention policy contains at least:

- grace period before decay;
- decay method/frequency;
- reduction percentage or curve;
- retake waiting duration;
- colour thresholds;
- default fallback values.

The product goal is **Go Green**: achieve and retain Green across required topics and chapters until the real final examination.

## 11. Learner content-copy controls

All learner-facing Concepts, Practice, questions, answers, explanations, and images disable browser text selection, copy/cut events, context-menu copying, touch callouts, and image dragging. The same controls apply while a teacher uses learner-preview mode. Type 2 answer-choice dragging remains enabled. These browser controls deter ordinary copying but cannot prevent screenshots, photographs, accessibility capture, or determined extraction of content already delivered to a browser.

## 12. Content authoring requirements

Teachers must be able to author/import:

- exact prescribed syllabus structure;
- Learning Card bundles and autoplay metadata;
- open-resource references with attribution/licence information;
- patterns/templates and variations;
- Type 1 questions;
- Type 2 parent questions, ordered steps, dependencies, critical penalties, and consolidated answers;
- practice eligibility;
- question-to-topic mappings;
- Cycle, Unit/Semester, Previous Paper, and Simulation definitions;
- question pools and blueprints;
- explanations hidden during assessment and released afterward;
- timing, result embargo, retake, decay, and mastery policies.

Past-paper analysis may inform authoring, but copyright/licensing and exact-paper usage must be reviewed before commercial publication.
