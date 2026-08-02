# Implementation Status and Fix Record

Updated: 23 July 2026

## Topic-level Check Your Knowledge

- CYK is now owned by the Topic and rendered after its final Subtopic; older Subtopic CYK remains readable for migration compatibility.
- Teacher/admin CRUD covers Type 1, guided Type 2 and individual Type 2 steps, including ordering and confirmed deletion.
- Bulk preview accepts DOCX, XLSX, TXT and JSON and remains editable Draft content until the Chapter is saved.
- Student delivery provides one question per page, one submit-all action, explanations, unlimited retakes and session-only green/yellow/grey status.
- CYK does not create attempt records, use timers, apply decay or affect Cycle Test mastery.

## Question Bank staging enrichment

- The Review Queue now has named columns, manual View/Edit for answers and rich explanations, and separate Staging and Approved tabs.
- Manual CRUD supports Type 1 choices and Type 2 subquestions, per-step marks, negative marks, critical flags, explanations and image IDs.
- Teachers can download a two-sheet Excel template or the current staging queue. Enriched `.xlsx` or JSON can be uploaded using immutable Question IDs.
- Question wording can be overwritten during enrichment without changing identity or source references. Unknown or repeated IDs reject the upload.
- Enrichment updates are transactional. Approved records leave Staging and appear under Approved.
- Completed AI-generated two-sheet workbooks or JSON can be imported directly without enrichment or AI analysis. Supplied question status is preserved; minimum ID/text and collision checks protect storage integrity.
- Staging questions can be deleted selectively or all at once. Bulk deletion never includes approved records and clears duplicate references transactionally.

This is the current handover record for the local EduLLM prototype. Product rules in the main documents supersede earlier chat discussions.

## Structured learning-content model

- Added Chapter Package schema `2.1` with Topic → Subtopic → ordered Learning Page. Existing flat `2.0` Chapter 1 packages remain valid and are normalized into the same page stream.
- A Learning Page stores its own stable ID, title, sequence, page type, Continue rule, media and Concepts/content sections. Topic Introduction Pages are supported without creating false Subtopics.
- Every Topic may end with `Check Your Knowledge`, shown after its final Subtopic, with no marks or Cycle Test mastery impact.
- Full Practice moved to one optional, flat Chapter Practice sequence. Questions retain internal Topic/Subtopic mappings and explicit usage flags but students do not see Practice folders.
- Cycle Test bank eligibility is explicit through question usage rather than being inferred from where a question is displayed.
- Student rendering now groups page progress into Subtopic and Topic status while preserving the existing continuous-page UX and Continue scroll gates.
- Topic headers now retain their native expand/collapse behaviour while opening the first available Topic page, so all bundled Subtopics remain visibly nested at the same hierarchy level.
- Parent Topic completion is now derived exclusively from completion of every child Learning Page/Subtopic. Stale Topic flags, Chapter verification and mastery data cannot display a completed Topic while any child remains incomplete.
- Schema validation checks stable Page/Question ID uniqueness, Chapter Practice mappings, Knowledge Check presence, referenced media and Cycle Test question references.

## Latest chapter-content correction

- Removed the cloned Type 2 Practice items that repeated the same guided question under different IDs.
- Retained generic reaction-pattern cards and added original textbook-style worked examples with colour-coded chemical-equation diagrams.
- Worked Examples now appear inside the Concept slideshow instead of remaining hidden in the content package.
- The chapter-level Chapter Summary is outside Topic/Subtopic folders, after all topics and immediately before Cycle Test; Topic folders collapse while the revision is open.
- The Chapter Summary is followed by multi-page Important Notes & Reactions. Each entry consolidates its balanced equation, condition, observation, reaction type and exam marking point.
- The irreversible confidence declaration is displayed directly above Cycle Test in the Chapter Index. Selecting it unlocks the test; the checked declaration then remains disabled.
- Reaction Essentials and Summary are separate Chapter Index entries (1.3 and 1.4 for Chemical Reactions and Equations). The confidence control is contained inside the Cycle Test card.
- The retake rule is specified as server-controlled: after submission, no new declaration is required and the card must show the exact next-unlock date/time. Persistent attempt submission and retake scheduling remain part of the assessment-delivery implementation, not the current teacher-preview simulation.
- Chapter Index titles use fixed, uniform typography for 1.1, 1.2 and 1.3 regardless of title length.
- A deep-paper audit register now covers all 150 supplied previous-paper documents: 131 standard and 19 accessibility documents; 102 question papers and 48 marking schemes; 139 year/code-family pairings and 11 unmatched archive items.
- Standard-English question extraction is kept separate from accessibility and Hindi analysis. Same-year exact set variants are collapsed before trend counting.
- Practice questions support evidence badges. Original/adapted content displays “Pattern asked in CBSE <year>”; only an actual previous-paper reproduction may display “Asked in”.
- Removed generator-based Type 1 padding that repeated three base questions under new IDs. Every learning section now contains eight distinct Type 1 Practice questions; an automated wording audit reports zero duplicates across all five sections.
- Removed four remaining close semantic overlaps from Chapter 1 Type 1 Practice and replaced them with distinct syllabus coverage. Student-facing Type 1 choices are now deterministically jumbled per question, distributing the correct answer across positions while keeping the same order during that question so feedback remains reliable.

## Implemented foundation

- Separate Content Management and Student Learning applications sharing one API and PostgreSQL database.
- Chapter Library, Subject/Unit Builder, reusable Chapter placement, Cycle Test configuration, Semester Test configuration, Course composition, review states and publication groundwork.
- JSON Chapter Package validation/import, media upload and exact `mediaRefs` links for Concepts, questions, answers, explanations and the Chapter Summary.
- Organisation Admin and Teacher authentication with role restrictions, secure password hashing, sessions, forced first-login Teacher password change, Admin-created Teacher accounts and self-service password change.

## Content Management fixes

- Admin subject creation and Admin visibility of created Teacher users corrected.
- Admin and Teacher can change their own passwords; Admin can reset Teacher passwords.
- Subject Units can be deleted only after confirmation. Their Chapter assignments and Semester configuration are removed, later Units are resequenced, and the Subject returns to Draft.
- Chapters can be deleted only after a dependency warning. References from Subject Units are removed, affected Subjects return to Draft, and Chapter versions and owned media are deleted.
- Teachers and Admins can review content before approval, preview it as a student, and make small text/answer corrections that create a new Draft version.
- `New chapter` now creates a genuinely empty Draft instead of cloning the Science sample. The new **Build content** workspace lets Teachers/Admins add Topics, select a Topic to add Subtopics, and add/delete native Learning Pages at either level.
- Selected images can be uploaded as native Learning Pages. Native page titles, introductions and learning text remain editable before saving the Chapter Draft.
- A Topic or Subtopic can instead own one active read-only PDF. PDFs are limited to 5 MB, validated by extension, MIME type, PDF signature, page presence and password-protection checks. A confirmed replacement activates the new document only after successful validation; the prior document remains an inactive recoverable version. Append/merge is not supported.
- Each Chapter now has two additive revision resources. **Smart Notes** supports uniform rich-text editing (including pasted subscript/superscript equations) and an explicit select-then-upload DOCX/PDF workflow with append or overwrite behavior. The selected filename, size, progress, success and validation failure remain visible; Smart Notes files are capped at 10 MB. **Knowledge Graph** supports one active JPG, PNG, PDF or DOCX visual map and replacement uploads capped at 5 MB. Signatures are validated and DOCX content is converted for in-app viewing.
- Content Base DOCX extraction now closes the `Image` field after its single image identifier, preventing document-completion text from overflowing the staging column. Batch responses also return the actual staged item/image/duplicate counts. The supplied Chapter 01 DOCX was successfully extracted into 84 staged Learning Pages after this correction.
- Student navigation displays Smart Notes and Knowledge Graph after the Topic hierarchy and before Chapter Practice and Chapter Completion. Opening either resource persists a completed checkbox in the Chapter index. Converted Smart Notes DOCX content is divided at logical numbered-section boundaries and displayed one page at a time with quiet Previous/Next navigation. PDF resources render in-app. Knowledge Graph images use the available width and provide a vertically scrollable full-screen viewer with zoom, fit-width and exit controls.
- Manual Chapter authoring uses the shared visual rich-text editor for Topic descriptions, Subtopic descriptions, Learning Page descriptions, legacy learning content and text blocks. HTML remains the storage format while Teachers edit formatted paragraphs, lists, emphasis, subscript and superscript rather than raw markup.
- PDF pages participate in the same student flow as native Learning Pages. Continue and keyboard Up/Down navigation move page-by-page and then across the true Subtopic/Topic boundary.
- Native Learning Pages support ordered text and image blocks. Teachers upload images once to the Chapter Image Library, insert or replace a named image placeholder, drag blocks between responsive insertion points, and select image-left, image-right, centred or full-width layout plus small/medium/large sizing, captions and alternative text.
- Student and Teacher-preview rendering preserves these layouts on desktop, stacks floated layouts safely on mobile, preserves aspect ratio and displays an explicit pending-image placeholder when a referenced filename has not yet been uploaded.
- The Cycle Test visual question editor uses the same Chapter Image Library for question images, Type 2 subquestion images, answer images and explanation images. Rich authoring controls are available for questions and explanations, including bold, italic, underline, lists, subscript and superscript.
- Content Base now stages labelled DOCX, TXT and text-readable PDF sources independently of Chapters. Board, Class, Subject and Chapter identity allow multiple sources for the same Chapter to contribute to one reviewed hierarchy proposal.
- Deterministic parsing recognizes Topic, optional Subtopic, Page/Page ID, Title, Content, Remember and Image. All headings inside Content remain part of rich Content. Staged records are editable and excludable before confirmation; exact content duplicates retain source traceability and are omitted from the proposed Chapter.
- Confirming a Content Base proposal creates a normal editable Chapter Draft. It does not overwrite an existing Chapter or remove manual Topic, Subtopic, page, PDF or image editing. Deleting a staging batch never deletes a created Chapter; cross-batch duplicate references are cleared in the same transaction so they cannot block batch deletion.
- A canonical Chapter Question Bank workspace now accepts JSON, TXT, PDF, DOCX and XLSX. Legacy `.doc`, scanned-image OCR and complex document-layout reconstruction are deliberately excluded from the reliable import scope.
- A questions file may be paired with a separately numbered answers/solutions file. Every import retains source name, category, year and question-number evidence.
- Exact normalized duplicates are rejected as new bank records and their additional source is attached to the existing question. Slightly different wording remains staged for human review; it is never silently merged or deleted.
- The Question Bank dashboard reports type, format, marks, difficulty, Topic, Pattern, staged/approved, duplicate and unused coverage. Approval requires a Topic, Pattern ID, answer and explanation.
- **Cover unique Patterns in Practice** selects one approved representative per Pattern for flat Chapter Practice. Other approved questions remain available to Cycle Tests, so imported content is not discarded merely because it is not a Practice representative.
- Admin AI Settings stores an optional OpenAI key encrypted at rest, never returns it to the browser, and supports an Active switch, per-purpose permission and spending limits. Each AI-analysis request requires explicit confirmation; suggestions are staged and applied individually rather than mutating questions automatically.
- Cycle Test Builder can propose every configured Attempt Form from the approved canonical bank. It prioritises least-used eligible questions, permits controlled reuse across later forms, blocks the same exact/duplicate-group question within one form, and reports questions left unused because of capacity or section eligibility.

## Student-preview and slide fixes

- Concepts and Practice appear as separate links under each Topic; the selected block opens in the main area.
- Concepts use a conventional slideshow: heading, explanation, key points and media appear together without a flip interaction. Autoplay displays each slide for 10 seconds and slowly scrolls overflowing content.
- Slides size dynamically up to a viewport-safe maximum and become internally scrollable when content is larger.
- Slide dots are selectable and identify the active slide.
- Concept and Practice navigation stays in the control row below the slide so it does not obscure learning content. Laptop Left Arrow and Right Arrow keys navigate the active slideshow without removing selectable dots or lower previous/next controls.
- Copy, cut and context-menu actions are suppressed in learning/preview content as a basic deterrent. This is not protection from developer tools or network extraction.
- Type 1 and Type 2 Practice share one ordered slideshow. Correct Type 1 answers display “Well done”; a fully correct Type 2 answer receives equivalent encouragement. Practice remains unscored and explanations remain available.
- Concepts and Practice end with dedicated encouragement/transition slides. The completion dot remains locked until the final real slide in that block has been opened.
- The Chapter Summary is Chapter-level Step 3, after Practice and before the Cycle Test, and opens only when selected.

## Continuous student-learning UX

- The Student Learning application now uses an SAP-style blue-and-white progressive syllabus with collapsible Unit, Chapter and Topic folders, consistent sans-serif typography, thin separators and square status indicators.
- Status boxes keep Topic text neutral: grey means not started, a blue ring means in progress, blue check means learning completed, and green/yellow/red checks are reserved for assessment mastery.
- Opening a Chapter renders its content as continuous web pages. Previously opened pages remain above, and navigation scrolls smoothly to newly opened content.
- `Continue` advances to the next Subtopic/page within the same parent Topic. `Next Topic — <title>` appears only at a true Topic boundary and marks the completed Topic blue.
- Navigation is now bounded by Subtopic rather than internal page: every page of the active Subtopic opens as one continuous scroll region. Compact Previous/Next controls and keyboard Left/Right arrows scroll between internal pages; the prominent Continue action appears only after the final page and unlocks the next Subtopic.
- Topic navigation now expands to show numbered Subtopics. Subtopic circles fill as pages are completed, while the parent Topic circle displays partial completion until every Subtopic/page in that Topic is complete.
- Chapter 1 source content was restructured from a combined equation section into `1.1.1 Writing a Chemical Equation`, `1.1.2 Balanced Chemical Equations` and `1.1.3 Steps to Balance a Chemical Equation`. All cards, questions, examples and media remain allocated and the complete Chapter package passes validation without warnings.
- Concepts, condensed cards, worked examples and media render directly in ordered Learning Pages. A short `Check Your Understanding` belongs to the end of each Subtopic, with jumbled choices, Submit, immediate feedback, explanation and Retake.
- Full Practice is one flat Chapter Practice sequence after the Chapter Summary. It contains all approved unique patterns without learner-facing Topic folders; its hidden mappings remain available for validation and analytics.
- Check and Chapter Practice answers do not affect the progressive scorecard. Fill-in-the-blank and one-line Type 1 interactions use editable text fields, while Type 2 retains its ordered drag/select constructed-answer model.
- An unopened Topic/Subtopic is not rendered below the current boundary and cannot be opened from the index. Continue is the only action that unlocks the next page, then smooth-scrolls it to the top; previously opened pages remain available above and through the index.
- Reading position and Topic/Subtopic completion are latched in browser storage in the current prototype, and reopening resumes at the latest opened page. Production persistence must move this state to the database keyed by authenticated student, enrolment and Chapter Version.
- After the final Learning Page, the flow continues through Chapter Practice when supplied and then `Chapter Completion — Congratulations`. Its irreversible confidence action records Chapter completion locally in the current prototype and unlocks the Cycle Test readiness state without requiring every Practice question.
- Cycle Test is now a distinct indexed section immediately below Chapter Completion. It remains disabled until Chapter Completion is verified, then exposes the configured marks, duration, sections, result delay and pre-test instructions. The actual server-authoritative timed attempt remains pending.
- The Student Learning entry screen is the Subject Content/Progressive Card. CBSE Class 10 Science is configured with Chemistry, Biology and Physics Unit folders; the validated Chemical Reactions pilot is assigned to Chemistry. The other 12 Chapters will populate these Units when their reviewed content is created rather than appearing as empty placeholders.
- The public catalogue Subject response now includes approved Chapter content and Cycle Test configuration, with a public read-only Chapter-media endpoint for the Student Learning application.

## Current Cycle Test access behavior

- Concepts and Practice no longer have completion declarations.
- The student may use the recommended flow or go directly to the Chapter Summary when already prepared from another source.
- The only declaration is **“I am confident and ready to take the Cycle Test.”** Once selected it stays checked, becomes disabled and unlocks the configured test. The preview persists this state per Chapter in browser storage, so closing and reopening does not relock it.
- Starting opens a pre-test instruction page showing marks, duration, sections, questions required, “Results Available in 24 Hours”, automatic timeout behavior, connectivity recovery and navigation rules.
- Instructions explain that disconnection, browser closure or device restart does not pause the server timer. The same active attempt can be reopened before the deadline, synchronized answers are restored, and timeout submits the latest server copy.

## Still to implement for production

- The teacher preview demonstrates unlocking and the instruction/confirmation flow, but does not launch or record a real timed attempt.
- Student login, enrolment/subscription, entitlement enforcement and database-backed confidence declarations keyed by student, enrolment, Chapter Version and attempt ordinal. Production submission must replace the unlocked state with the configured retake lock until `retake_available_at`.
- Server-authoritative attempt creation, immutable paper snapshot, timer, periodic autosave, reconnection recovery, timeout submission, single-active-attempt enforcement and abandon/forfeit policy.
- Delayed results and answer sheets, topic/chapter mastery colours, retention decay and retake scheduling.
- Full Unit/Semester, Previous Paper and Simulation Exam runtimes.

## Verification

The API, Student Learning and Content Management production builds pass after the latest changes. API, Content Management and content-schema tests pass; Student Learning currently has no automated test files. The additive `chapter_document`, Question Bank, source-reference, AI-setting and AI-audit database schema has been applied locally without deleting existing data. Automated browser coverage for manual authoring, PDF replacement and Question Bank imports should be added before deployment.
