# EduLLM Decisions

This log captures decisions made during product discovery. Update it when a decision changes.

## Confirmed

- Check Your Knowledge belongs to a Topic, appears after its last Subtopic, and is an unscored unlimited-retake self-check. Its latest colour is session-only; formal mastery comes from Cycle Tests.
- Question Bank enrichment matches existing records exclusively by immutable Question ID. Question text is editable and may be replaced without changing identity; source references are preserved. Offline exchange uses a two-sheet Excel workbook, while re-upload also accepts JSON.
- A separate direct AI Question Bank import accepts completed two-sheet workbooks or JSON without enrichment or AI quality analysis and preserves supplied statuses. It still rejects missing/repeated IDs, missing question text and existing-ID collisions because those are storage-integrity constraints. Staging provides confirmed selective and all-record deletion that cannot delete approved questions.

1. EduLLM has two applications: Content Management and Student Learning.
2. Both applications share one backend and canonical data store.
3. Students see only published content, never drafts.
4. The product is content-first and course-last: reusable Chapters are assembled into Subjects, and approved Subjects plus Exam Kits are configured into Courses.
5. Initial roles are Admin, Teacher, and Student.
6. Admins or permitted teachers can publish courses.
7. Content is initially generated externally in ChatGPT.
8. Content is loaded through a structured copy/paste import rather than generated locally.
9. Image files are uploaded separately and referenced/matched by filename.
10. The MVP optimizes time to market; the enterprise specification is guidance, not the backlog.
11. Node.js/TypeScript/NestJS is the recommended backend direction.
12. React/TypeScript is used for both web applications.
13. PostgreSQL is the system of record.
14. Prisma is the initial ORM recommendation, subject to schema/query review.
15. MinIO is used locally and Amazon S3 in production.
16. Nearly all features must be testable locally before AWS deployment.
17. Local Ollama is not part of the target architecture.
18. A Chapter owns its Topics and Cycle Test and can be reused in multiple Subject configurations.
19. Chapter ordering belongs to the Subject; a shared Chapter may appear at different positions in different curricula.
20. A Subject contains ordered Units, reusable Chapter references, Unit/Semester Tests, and a Final Exam.
21. An Exam Kit has a configurable number of previous, model, and most-likely papers; three is not hard-coded.
22. Only a published Course is saleable and visible in the portal.
23. A Course can contain one or more approved Subjects and zero or more Exam Kits, with subscription, pricing, discount, and validity configuration.
24. Student mastery/progress is individual data and is not stored in shared curriculum content.
25. The student index doubles as a progressive scorecard using green, yellow, red, and grey indicators.
26. Shared published content is versioned and is not silently changed in active courses.
27. Learning is delivered as condensed visual Learning Card bundles rather than textbook-like pages.
28. Practice gives immediate feedback and explanations but carries no marks and does not affect mastery colours.
29. A Cycle Test does not require completion declarations for Concepts or Practice. After the Chapter Summary, the student makes one irreversible confidence declaration to unlock the test; this supports students who learned from other materials.
30. Scored assessments are server-timed, autosaved, locked after submission, and normally release marks/diagnostics after a configurable 24-hour embargo.
31. Type 2 is an ordered group of subquestions that consolidates into a descriptive answer or problem solution; critical steps may carry configured penalties, with the total floored at zero.
32. Cycle Tests update topic mastery; Unit/Semester Tests update chapter mastery; Previous Papers do not affect mastery; Simulations have a separate chapter-level marks sheet.
33. Actual marks are immutable historical records; only calculated current mastery decays over time.
34. Retakes use blueprint-compatible papers that normally differ from earlier attempts, while important questions may repeat.
35. The initial backend remains a modular monolith with a PostgreSQL-backed scheduled worker; no queue or microservice is required.
36. Initial roles are Organisation Admin, Teacher/Instructor, Academic Reviewer, and Student; Support Operator and Parent views are later additions.
37. Teacher, Academic Reviewer, and Organisation Admin may make small inline corrections from chapter review. Every save increments the chapter version and returns it to Draft for re-review; approval is never retained after an edit.
38. Practice and Cycle Tests are independent. Cycle Tests draw from an approved Chapter Question Bank using teacher-defined ordered sections.
39. Cycle Test questions may shuffle only within their configured section and never cross section boundaries.
40. Teachers define and approve a finite cycle of frozen Attempt Forms. Distinct forms can use different questions from the approved bank, while important questions may repeat. Each delivered paper may shuffle question order only within its sections.
41. A Type 2 bank question may contain any academically appropriate number of ordered subquestions, subject to mark and dependency validation.
42. Unit/Semester Tests use the same section-template and attempt-form engine as Cycle Tests, but draw from the approved Question Banks of multiple Chapter Versions in the configured Subject Unit.
43. Teachers control the exact question selection for every Semester form in the configured cycle. System-generated forms are drafts only and require teacher review/approval before student release.
44. All students mapped to the same approved Semester form share its question set, with order shuffled only within sections. Once issued, that form is immutable.
45. Cycle and Semester Tests use a configurable finite Attempt Form cycle. With five forms, attempts 1/6/11 use Form 1, 2/7/12 use Form 2, and so on, calculated by modulo mapping. Reused forms retain their question set but may reshuffle order within sections for each delivered paper.
46. Teachers load and maintain independent Chapter Question Banks containing Type 1 and Type 2 questions. Cycle Test forms select from their Chapter bank; Semester forms select from the combined banks of the Unit's assigned Chapters.
47. Each form is explicitly assembled section by section and cannot be approved until question count, type, format and marks match the Section Template. Question IDs remain stable and issued student papers remain immutable.
48. Teachers use a visual editor for individual Question Bank maintenance; JSON remains the bulk-import mechanism. Type 2 totals are derived from subquestion marks. Any edit that invalidates an existing form assignment removes that assignment and returns the affected form to Draft.
49. Re-importing a Chapter Package with an existing stable ID creates the next Draft version after archiving an immutable snapshot of the current version. It never silently overwrites history and requires review/approval again.
50. The Chapter Summary is a Chapter-level Step 3 opened only when selected after Concepts and Practice and before the Cycle Test. It acts as reinforcement, memorisation and revision rather than initial instruction. Images are linked to their nearest owning asset using exact `mediaRefs` filenames declared in the Chapter media manifest.
51. The first Content Operations user catalogue contains Organisation Admin and Teacher. Admin creates and controls Teacher accounts and has complete access. Teacher is restricted to academic authoring, assessment preparation, preview and review submission; User Management, final approval, commercial Course Builder and publishing are Admin-only.
52. Local passwords are scrypt-hashed. Opaque sessions are hashed in storage, revocable and expire after 12 hours. New and reset Teacher passwords must be changed on the next sign-in.
53. Every authenticated Admin or Teacher can change their own password. Admin retains reset control for Teacher accounts only.
54. Teachers and Admins can delete a Subject Unit after explicit confirmation. Deletion removes that Unit's Chapter assignments and Semester Test configuration, resequences later Units, increments the Subject version and returns the Subject to Draft.
55. Teachers and Admins can permanently delete a Chapter after an explicit dependency warning. The operation removes the Chapter from every Subject Unit, returns affected Subjects to Draft, and deletes the Chapter's version history and chapter-owned media through database cascades.
56. Practice provides immediate encouragement for correct work. A correct Type 1 response displays “Well done”, while a fully correct Type 2 constructed answer displays the same positive reinforcement. Practice remains unscored and continues to provide explanations.
57. Concepts and Practice each end with a dedicated encouraging transition slide. The Concepts completion slide takes the student into Practice. The final Practice completion slide takes the student into the Chapter Summary; where additional Topics remain, it takes the student to the next Topic first.
58. Cycle Test access is based on student confidence rather than forced completion of every learning asset. After the Chapter Summary, the student declares “I am confident and ready to take the Cycle Test” to unlock it. Completion slides cannot be opened until the corresponding final real Concept or Practice slide has first been opened.
59. Concepts and Practice do not require completion declarations. The single confidence declaration after the Chapter Summary is irreversible for that unlocked attempt. Before starting, students see the paper structure, duration, timeout, result availability, connectivity and recovery rules, followed by explicit confirmation that the server timer continues through disconnection or closure.
60. Chapter end matter is separated into **Reaction Essentials** and **Summary**. For the current chapter these appear as 1.3 and 1.4 respectively. Reaction Essentials may span several pages and carries equations, observations and exam points; Summary remains the compact mental map.
61. The confidence checkbox belongs inside the Cycle Test card. It is required only to unlock the first attempt and becomes permanently disabled once selected. After a submitted attempt, no further declaration is requested; the server-derived retake deadline controls access and the card displays “Unlocks on <date and time>” until that deadline.
60. Confidence-based Cycle Test unlocking survives closing and reopening the Chapter and remains unlocked until the first attempt is submitted. Submission then applies the configured retake lock; the next attempt unlocks only when `retake_available_at` is reached. The instruction screen labels the delay as “Results Available in n Hours”.
61. An active test survives internet loss, browser closure and device restart. The server deadline never pauses; answers save locally and synchronize when connected; reopening restores the same attempt and remaining time. At timeout the server submits its latest synchronized answers, and unverifiable answers kept offline beyond the deadline may be rejected.
62. The assessment scale is 25 marks for a Chapter Cycle Test, 50 marks for a Unit/Semester Test and 80 marks for a Final Simulation. Chapter distributions are evidence-based; the Chemical Reactions pilot starts with ten one-mark Type 1 and five three-mark Type 2 questions.
63. CBSE Class 10 Science preparation starts with a current-syllabus matrix and up-to-20-year paper analysis. Multiple sets are normalized by year, outdated questions are filtered against the current syllabus, and commercial references inform abstract patterns only. AI drafts; a qualified human subject expert gives final academic approval.
64. Teachers and Admins may author a Chapter manually as Chapter → Topic → Subtopic → Learning Page. A Learning Page may belong directly to a Topic introduction or to a Subtopic.
65. A Topic or Subtopic may have one active PDF document. PDF content is read-only, cannot be appended or edited in the application, and a corrected upload replaces the active document only after confirmation and successful validation. PDFs must be valid, unencrypted and no larger than 5 MB; prior versions remain inactive for recovery.
66. Uploaded images become native editable Learning Pages. PDF pages remain document-backed and use the same Continue and keyboard Up/Down learning navigation.
67. Chapter-level revision resources are named **Smart Notes** and **Knowledge Graph**. Smart Notes contain exam-ready teacher guidance and support rich-text authoring or explicit DOCX/PDF upload; each upload is appended or overwritten only after the Teacher selects a file and confirms **Upload Smart Notes**. Smart Notes files are limited to 10 MB. Knowledge Graph is a single active mind-map resource supporting JPG, PNG, PDF or DOCX and replacement upload, with a 5 MB file limit.
68. Smart Notes and Knowledge Graph appear after Topic learning and before Chapter Practice/Chapter Completion. Smart Notes DOCX content is divided into logical numbered section-pages with Previous/Next navigation. Tall Knowledge Graph images use the available page width and a vertically scrollable full-screen viewer with zoom and fit-width controls. Opening either resource persists its completed state in the Chapter index. These resources remain optional and do not prevent an experienced learner from verifying Chapter completion and unlocking the Cycle Test.
69. Content Base supports incremental chapter loading: staging batches sharing Board, Class, Subject and Chapter Title are combined into one hierarchy proposal. Board uses CBSE/ICSE/State/Others, Subject is selected from Subject Builder, and Chapter Code is an optional internal reference. Staging batches can be deleted with confirmation without deleting an already generated Chapter; cross-batch duplicate references are cleared transactionally before deletion.
67. The canonical Question Bank accepts JSON, TXT, PDF, DOCX and XLSX imports. Legacy `.doc`, scanned-image OCR and complex layout reconstruction are excluded; these sources must first be converted to a supported text-readable format.
68. Exact normalized duplicates do not create another canonical question. The new source reference is attached to the existing record. Similar wording remains a separate staged record until a human accepts or rejects an optional AI duplicate suggestion.
69. AI is optional and Admin-controlled. Its API key is encrypted server-side, is never returned after save, and can be activated per approved purpose. AI requests require confirmation and produce reviewable suggestions only; deterministic import and exact-duplicate checks remain available without AI.
70. Chapter Practice contains one approved representative of every unique Pattern ID. All other approved questions remain available for assessment selection and source/frequency analysis.
71. An Attempt Form may not contain the same question, normalized exact duplicate or accepted duplicate group twice. Reuse in a later form is allowed. Proposed forms prioritise least-used eligible questions and require Teacher review before approval.
72. Images are placed through stable Chapter Image Library filenames and responsive ordered blocks, not absolute pixel coordinates. Supported layouts are image-left, image-right, centred and full-width; left/right layouts stack on narrow screens.
73. Learning, Practice and assessment authoring may associate images independently with the prompt, Type 2 step, answer and explanation. Missing named media remains visibly unresolved and must not be silently omitted during review.
74. Content Base is a reusable staging layer keyed by Board, Class, Subject and Chapter. DOCX, TXT and text-readable PDF use deterministic labelled parsing; multiple sources may contribute to the same proposed hierarchy, but no source update silently changes an existing Chapter Draft.
75. Within imported learning content, only structural labels control parsing. Examples, exam tricks and similar headings remain inside rich Content. Remember is an end-of-page emphasis within the same page, and Image becomes an optional right-side reference by default.
76. Internal Learning Pages are hidden from the left syllabus hierarchy. All pages of one Subtopic scroll continuously; quiet page controls and Left/Right keys navigate them, while Continue exists only at the Subtopic boundary.

## Proposed, awaiting confirmation

1. Razorpay is the first payment provider.
2. Course access initially uses either one-time purchase or a simple subscription—not all models simultaneously.
3. Publishing uses Draft → Preview → Published, with optional teacher submission to Admin.
4. The first product is a responsive web/PWA rather than native mobile apps.
5. Published versions are immutable; edits occur in a new draft version.

## Open decisions

1. Exact import JSON structure
2. Exact non-school hierarchy and how it maps to the school-oriented Subject/Unit model
3. Explanation layers shown to students
4. Flash Card and Learning Card interactions
5. Image placement and types
6. Type 1 question formats and scoring
7. Type 2 step dependencies, retry, hints, feedback, and partial credit
8. Completion/mastery rules
9. Initial pricing and subscription model
10. Teacher publishing authority
11. Initial target course, board/grade/subject, and market
12. Managed versus self-hosted authentication
13. AWS region, account, domain, and budget
14. Mastery colour thresholds and assessment weighting
15. Whether “Unit Test” or “Semester Test” is the preferred product label
16. Approval authority for Chapters, Subjects, Exam Kits, and Courses

## Rejected for MVP

- Full role catalogue from Appendix B
- Multi-stage academic governance workflow
- Local Ollama/Qwen generation
- Microservice decomposition
- Kafka/RabbitMQ, Elasticsearch, and Kubernetes
- Building every feature in the specification before market validation
