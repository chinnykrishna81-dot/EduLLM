# Content-to-Course Process

Last updated: 21 July 2026

This document is the authoritative process for creating reusable academic content, assembling subjects, configuring commercial courses, and presenting student progress. A course is the final published offering; it is not the primary authoring container.

## 1. Core model

```text
Reusable Content Library
  └── Chapter
      ├── Topics
      │   ├── Concepts and flip Flash Cards
      │   ├── Practice: Type 1 and Type 2 questions
      │   ├── Problem patterns/templates
      │   └── Descriptive-answer guidance
      └── Cycle Test

Curriculum Assembly
  └── Subject
      ├── Unit 1
      │   ├── Ordered reusable Chapters
      │   └── Unit/Semester Test
      ├── Additional Units
      └── Final Exam

Commercial Offering
  └── Course
      ├── One or more Subjects
      ├── Zero or more Exam Kits
      ├── Subscription and validity
      ├── Price and discount
      └── Publication settings
```

Content, curriculum composition, and commercial configuration are separate. This allows one approved chapter or subject to be used in multiple offerings without duplicating it.

## 2. Responsibilities

### Administrator

1. Decides which market offering should be published, such as CBSE Class 10 Science and Mathematics.
2. Requests the required subjects from teachers/instructors.
3. Selects approved subjects and exam kits.
4. Configures the course name, description, subscription model, price, discount, validity, and availability.
5. Reviews readiness and publishes or unpublishes the course.

### Teacher or instructor

1. Creates or selects reusable chapters.
2. Creates units within an assigned subject.
3. Adds chapters to each unit and controls their order.
4. Adds a Unit/Semester Test at the end of each unit.
5. Adds the subject Final Exam.
6. Creates reusable Exam Kits when required.
7. Reviews the subject index before submitting it for approval.

### Student

1. Subscribes to or receives access to a published course.
2. Opens the subjects and exam kits included in that course.
3. Studies concepts, practises questions, and completes assessments.
4. Uses the subject index as both navigation and a personal progressive scorecard.

## 3. Chapter authoring and reuse

A chapter is a reusable content package. It contains its complete topic structure and the Cycle Test associated with that chapter.

```text
Chapter
  ├── Topic
  │   ├── Concept explanations
  │   ├── Images and diagrams
  │   ├── Flip Flash Cards
  │   ├── Type 1 practice
  │   ├── Type 2 guided practice
  │   ├── Problem patterns/templates
  │   └── Descriptive-answer guidance
  └── Cycle Test
```

The same chapter may be referenced by CBSE, ICSE, State, or another compatible syllabus. Its position is defined by the subject, so a shared chapter can be Chapter 1 in one subject and Chapter 3 in another.

Reuse is appropriate only when the chapter's topics and teaching content are genuinely the same. If a board or syllabus requires materially different topics, the teacher creates a separate chapter rather than changing shared content and unintentionally affecting other subjects.

## 4. Subject assembly

A subject is a curriculum configuration, not a copy of its chapters. It records board, class/grade, academic version, language or medium, ordered units, and ordered chapter references.

Teacher flow:

```text
Create Subject
  → Add subject metadata
  → Create and order Units
  → Search/select or create Chapters
  → Order Chapters inside each Unit
  → Add Unit/Semester Test
  → Add Final Exam
  → Review expandable Subject Index
  → Submit for approval
```

During chapter review, assigned Teachers, Academic Reviewers, and Organisation Admins can switch between **Review content**, **Edit small corrections**, and **Preview as student** without leaving the chapter workspace. Inline correction mode edits existing titles, explanations, cards, questions, choices, answers, and Type 2 steps; structural syllabus changes remain a separate authoring operation. Saving any correction creates a new version, returns the chapter to Draft, and requires review submission and approval again. An approved or in-review version is never modified silently.

Adding a chapter pulls its topics, learning content, practice, and Cycle Test into the subject by reference. A subject may be included in multiple courses, such as Science alone or Science bundled with Mathematics.

## 5. Assessment levels

- **Topic practice:** Type 1, Type 2, patterns/templates, and descriptive answers.
- **Chapter Cycle Test:** measures learning across the chapter's topics.
- **Unit/Semester Test:** measures all chapters configured within the unit.
- **Subject Final Exam:** measures the complete subject.
- **Exam Kit papers:** additional previous, model, or most-likely papers used for exam preparation.

The number of papers in an Exam Kit is configurable. Previous and model papers are categories, not fixed groups of three.

## 6. Course configuration and publishing

The course is created last by an administrator and is the only saleable/subscribable entity displayed in the public portal.

```text
Admin plans offering
  → Teachers prepare reusable Chapters
  → Teachers assemble and submit Subjects
  → Teachers prepare Exam Kits
  → Content and Subjects are reviewed/approved
  → Admin selects Subjects and Exam Kits
  → Admin configures pricing, discount, validity, and subscription
  → Admin previews the complete Course
  → Admin publishes
  → Course appears in the student portal
```

Example reuse:

- Course A: CBSE Class 10 Science + Mathematics
- Course B: CBSE Class 10 Science
- Course C: CBSE Class 10 Mathematics

Courses A and B reference the same approved Science subject. Courses A and C reference the same approved Mathematics subject.

## 7. Student index and progressive scorecard

The student sees an expandable index:

```text
Subject
  └── Unit
      └── Chapter
          └── Topic
              └── Subtopic
                  ├── Concepts
                  └── Practice
```

The index is personalized per student. Content remains shared, but attempt, score, mastery, and completion records belong to the individual student.

Initial colour meaning:

- **Green:** strong/mastered
- **Yellow:** developing or needs more practice
- **Red:** weak and requires attention
- **Grey:** not started or insufficient evidence

Practice is unscored and does not affect mastery colours. Topic colours are updated from Chapter Cycle Test evidence. After a 50-mark Unit/Semester Test, chapter-level indicators are recalculated. Final 80-mark Simulations have a separate chapter-level marks sheet. Thresholds and weighting rules must be agreed before implementation; colours are computed from stored assessment evidence rather than embedded in content.

Concepts and Practice may belong directly to a Topic or to a Subtopic, depending on the syllabus. Only Chapter and Topic levels receive independently calculated colours. Every Subtopic inherits and displays the colour of its parent Topic.

## 8. Versioning rule

Reusable content must be versioned. Editing a published shared chapter must not silently change active student courses. Approved changes create a new version; an administrator or teacher explicitly upgrades subject/course configurations after reviewing the impact.

## 9. Current prototype impact

The current Content Studio proves JSON import, images, content review, and publishing, but its storage model is course-first. It must be refactored to make Chapters, Subjects, Exam Kits, and Courses independent entities before further production development.

## 10. Learning and assessment process

The detailed rules for condensed Learning Cards, Type 1 and Type 2 practice, chapter-completion declarations, locked timed tests, delayed result release, scorecard colours, retakes, and retention decay are defined in [Learning and Assessment Model](LEARNING_AND_ASSESSMENT_MODEL.md). Those rules are part of the product process and must be implemented server-side where they affect eligibility, marks, timing, or mastery.
