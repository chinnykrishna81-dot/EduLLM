# CBSE Class 10 Science Content Preparation Plan

Last updated: 21 July 2026

## 1. Purpose and authority

Produce original, condensed and academically reviewed CBSE Class 10 Science content for EduLLM, starting with **Chemical Reactions and Equations**. The target is documented 100% coverage of the current prescribed syllabus and its important examinable problem/question patterns—not a guarantee that every learner will score 100%.

The authority is the [CBSE Class X Science syllabus for 2026–27](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf). It defines an 80-mark theory paper, 20 marks of internal assessment and the following theory allocation:

| Unit | Marks |
|---|---:|
| Chemical Substances — Nature and Behaviour | 25 |
| World of Living | 25 |
| Natural Phenomena | 12 |
| Effects of Current | 13 |
| Natural Resources | 5 |
| **Total** | **80** |

Current question design is 50% knowledge/understanding, 30% application and 20% analysis/evaluation/creation, using objective, assertion-reason, short-answer, long-answer, source/case/passage-based and integrated questions, with approximately 33% internal choice. Current requirements override formats inferred from old papers.

## 2. Assessment scale

- **Chapter Cycle Test:** 25 marks; topic-level mastery evidence.
- **Unit/Semester Test:** 50 marks; multiple Chapters and chapter-level mastery evidence.
- **Final Simulation:** 80 marks; current CBSE theory design.

The Chemical Reactions pilot starts with:

| Section | Content | Count | Marks each | Total |
|---|---|---:|---:|---:|
| A | Type 1: 5 MCQs, 3 fill blanks, 1 assertion-reason, 1 other objective | 10 | 1 | 10 |
| B | Type 2 constructed answers/problems | 5 | 3 | 15 |
| **Total** |  | **15** |  | **25** |

The total remains 25, but a Chapter may use an evidence-based distribution containing two-, four-, five-mark or case-based items when approved by a teacher.

Five forms are prepared per Chapter. Attempts 1–5 use Forms 1–5; Attempt 6 returns to Form 1. The pilot pattern requires 75 placements across five forms: 50 one-mark and 25 three-mark placements. The approved bank contains only purposeful questions: every bank item must occur in at least one configured form, while important questions or patterns may deliberately recur. Essential knowledge must first appear in Concepts and Practice so no learner depends on receiving a particular test form to encounter a unique concept or pattern.

## 3. Private inputs and generated outputs

### Available previous-paper coverage

The currently supplied CBSE Class 10 Science board-paper collection covers 2020 onwards. It is sufficient for the first pilot and for studying the recent competency-based examination pattern, but it must not be represented as a 15- or 20-year archive. Older official papers may be added later. Every trend and coverage report must state the actual verified year range used.

Source documents do not belong in `docs` or Git. Store them under:

```text
private-content-sources/
└── cbse-10-science/
    ├── 01-current-syllabus/
    ├── 02-ncert-textbook/
    ├── 03-ncert-exemplar/
    ├── 04-sample-papers/
    ├── 05-marking-schemes/
    ├── 06-previous-board-papers/YEAR/
    ├── 07-reference-books-private/
    └── 08-content-instructions/
```

Original reviewed outputs belong under:

```text
content-packages/cbse-10-science/CHAPTER-SLUG/
├── chapter.json
├── media/
├── coverage-report.md
├── question-pattern-report.md
└── reviewer-checklist.md
```

`private-content-sources/` must be ignored before Git is introduced. Only reviewed original output may enter `content-packages/`.

## 4. Source hierarchy and originality

1. Current CBSE syllabus and question-paper design.
2. Current prescribed NCERT textbook.
3. NCERT Exemplar, laboratory manual and CBSE practical material.
4. Current official CBSE sample paper and marking scheme.
5. Official previous board/sample papers and marking schemes.
6. Open educational sources with verified licences, used to improve explanations and examples.
7. Legally obtained commercial references used privately for abstract pattern and coverage comparison only.

Commercial books must not be copied, lightly paraphrased, traced or republished. A reviewer may abstract the underlying skill/problem family; EduLLM creates new wording, data, context, reasoning and original visuals. Publication requires originality and appropriate legal review.

Maintain an internal evidence register, separate from student JSON, with source, edition/year, page or paper/set/question, licence class, historical syllabus, current relevance, concept/pattern and reviewer notes. Publishable packages contain only original explanations, cards, questions, solutions and media.

## 5. Coverage matrix

Before authoring, atomise the current Chapter syllabus. Map every atom to its official wording/depth, NCERT section/activity/practical, prerequisite, misconception, historical/current patterns, planned assets and one status: covered, formative-only, excluded/deleted, enrichment-only or awaiting review.

A Chapter cannot be approved while a current summative atom is unaccounted for. Formative-only content must be labelled and must not silently enter summative forms.

## 6. Twenty-year paper analysis

Analyse up to 20 years of available official main, compartment and sample papers plus marking schemes. For every relevant question record:

- year, category and set;
- original marks/format and required marking points;
- historical Chapter/syllabus version;
- current Chapter, primary Topic and Concept;
- competency level;
- current status: examinable, formative-only, partially relevant, deleted or uncertain;
- pattern ID, difficulty and common traps.

Do not count the same pattern in several sets as several independent annual appearances. Report years appeared, percentage of available years, average marks per paper, recent-five-year frequency, older frequency and distinct pattern count. Give current syllabus and current sample-paper design greater authority than old format frequency.

Historical questions are evidence. Convert relevant questions into abstract patterns and then original EduLLM questions with new expression, data/context and diagrams. Similarity and academic review are mandatory.

## 7. Blueprint and mastery evidence

Every bank item has one primary leaf Topic, Concept, pattern ID, format, difficulty, marks, answer, explanation, syllabus status and usage eligibility. Every form satisfies an approved Topic-marks blueprint. Historical weightage informs emphasis, but every current Topic needs enough evidence for a meaningful topic colour. Questions shuffle only within their section.

Type 1 includes MCQ, fill blank, true/false, assertion-reason, matching and observation forms with plausible distractors and explanations.

Type 2 converts descriptive, case and numerical answers into ordered marking steps: concept, given data, principle/formula, conversion/substitution, calculation/reasoning, final unit/conclusion and required marking points as applicable. Every step has 2–3 close choices, one answer, marks, explanation, answer contribution, dependencies, media and optional critical-step penalty. Step marks reconcile with the parent marks and scores are floored at zero.

## 8. Controlled AI production stages

Produce one Chapter through separate stages:

1. source inventory and missing-input report;
2. syllabus matrix and formative/deleted warnings;
3. historical question extraction, deduplication and current mapping;
4. frequency/weightage report and pattern families;
5. accurate research explanations and misconceptions;
6. condensed Concept/Learning/Flash Cards and retrieval prompts;
7. Practice, independent bank, blueprint and five forms;
8. original diagrams with scientific labels and alt text;
9. scientific, syllabus, equation, unit, distractor and marking review;
10. originality/licence review;
11. schema-valid JSON/media compilation after approval.

## 9. Required Chapter deliverables

- source inventory and missing-input report;
- current-syllabus coverage matrix;
- historical relevance and weightage report;
- pattern catalogue;
- ordered Topics and condensed Concept slides;
- Type 1 and Type 2 Practice with explanations;
- original media and alt text;
- Chapter-level Chapter Summary;
- independent Question Bank;
- 25-mark blueprint and five Cycle Test forms;
- validated JSON/media;
- academic and originality reviewer checklist.

## 10. Quality gates and pilot

AI produces a draft, not final approval. Each Chapter passes syllabus completeness, NCERT fidelity, scientific/numerical correctness, current CBSE assessment alignment, originality/licensing, student usability and schema/media validation. At least one experienced CBSE Science teacher approves it; relevant Physics, Chemistry and Biology specialists should review domain-sensitive material. Author and final approver should ideally differ.

For Chemical Reactions and Equations: inventory sources → approve matrix → approve 20-year report → approve 25-mark blueprint → author Concepts/Practice/media → create the Chapter Summary → create bank/forms → import as Draft → preview/correct → human approval. The accepted pilot becomes the template for the remaining subject.
