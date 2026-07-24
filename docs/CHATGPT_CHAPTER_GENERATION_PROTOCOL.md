# ChatGPT Master Chapter Generation Protocol

Last updated: 21 July 2026

Use this protocol to produce one EduLLM Chapter Package at a time. Do not request the complete subject in one response.

## Preparation

Follow `CONTENT_PREPARATION_PLAN.md` first. Provide the authoritative current syllabus, prescribed NCERT material, official current sample paper/marking scheme, approved historical-paper analysis, board, class, subject, academic year and Chapter Package template. Generation starts only after approval of the coverage matrix and Topic blueprint.

## Master instruction

```text
Act as the master academic content architect for EduLLM.

Create exactly one Chapter Package using schemaVersion 2.0 and packageType "chapter". Return valid JSON only—no Markdown fences, commentary, ellipses, or placeholder text.

Target:
- Board: [BOARD]
- Grade/Class: [GRADE]
- Subject: [SUBJECT]
- Chapter: [CHAPTER]
- Syllabus version/year: [VERSION]
- Language: [LANGUAGE]

Requirements:
1. Cover every prescribed topic without adding out-of-syllabus claims.
2. For every Topic, generate content for exactly two learner links: Concepts and Practice. Concepts is one ordered front/back flip deck containing the topic overview, Learning Cards, and Flash Cards. Put topic introduction text and media into the first Concept slide. Practice is one ordered deck combining Type 1 and Type 2 questions; do not create separate learner sections for the two question types.
3. Identify reusable problem/question patterns from the supplied reference and past-paper analysis.
4. Every concept must have learning cards or flash cards plus practice.
5. Type 1 may be MCQ, fill blank, or true/false and must include explanation and plausible distractors.
6. Type 2 must model the ordered reasoning/answer-writing sequence. Every step must have 2–3 closely related options and exactly one correct answer. Include interactionType "drag_point", options, marks, dependencies, critical-step flag, negativeMarks, and answerContribution. Use mediaRefs for the subquestion, answerMediaRefs for answer-line media, and explanationMediaRefs for media revealed with the explanation.
7. Generate a Chapter Question Bank independent from the Practice slideshow. Mark explicit usage eligibility (`practice`, `cycle_test`, or both), and map every bank question to exactly one primary leaf topic.
8. Configure a 25-mark Cycle Test as ordered sections. The Chemical Reactions pilot begins with ten one-mark Type 1 and five three-mark Type 2 questions unless its approved evidence report changes the distribution. Specify format, marks, presented/required counts, Type 2 step range, Topic/pattern filters and within-section shuffling. Produce five forms from a fully utilised bank: every bank item must occur in at least one form, while important questions may recur. Use “Results Available in 24 Hours” unless configured otherwise.

Semester Test forms are assembled later as 50-mark Subject Unit assessments from approved Chapter banks. Final Simulations are 80 marks and follow the current CBSE theory design. A teacher reviews the exact questions in every form before release.
9. Reference media by exact filenames and include every referenced filename in mediaManifest with meaningful alt text.
10. Use only verified open educational references for reusable third-party material and record URL/licence internally. Commercial references may inform abstract patterns only and must not be copied or closely paraphrased. Leave publishable references empty when permission is uncertain.
11. Use stable, readable IDs. chapter.stableId must exactly equal content.id.
12. Every chapter must include one `content.birdsEyeSummary`. It is a chapter-level Chapter Summary opened after Concepts and Practice and before the Cycle Test, never nested inside a Topic. After the quick mental map, include multi-page `importantNotes` consolidating every syllabus-relevant and source-supported equation/fact with condition, observation, classification and exam point.
13. Link images by exact filename through the nearest asset's `mediaRefs`. Declare every referenced filename once in `mediaManifest` with title, alt text, caption and placement hint.

## Chapter-level Chapter Summary

`content.birdsEyeSummary` contains `title`, `overview`, `bigPicture`, `keyIdeas`, `topicConnections`, `formulaSheet`, `examFocus`, `recallChecklist` and `mediaRefs`. It reinforces and consolidates the learner's mental map after learning and practice, immediately before assessment.

Image placement follows ownership: chapter map images belong to `birdsEyeSummary.mediaRefs`; topic images to the Topic; concept diagrams to the Concept or Explanation; learning-card images to that card; question images to the question; and Type 2 answer/explanation images to the relevant subquestion field. Do not embed image bytes or generated URLs in JSON—use stable filenames.
12. Ensure Type 2 step marks total the parent totalMarks. Penalties must never be negative values in JSON; negativeMarks stores the positive penalty magnitude.
13. Ensure yellowPercent is below greenPercent.
14. Perform an internal coverage and JSON-consistency review before returning the package.

Quality goal: a student should learn the minimum unique concepts and patterns needed to retrieve and apply the maximum prescribed syllabus content.
```

## Recommended generation sequence

1. Inventory sources and missing material.
2. Create and approve the current-syllabus coverage matrix.
3. Analyse up to 20 years of papers, normalize sets and filter syllabus changes.
4. Approve the Topic weightage, pattern report and 25-mark blueprint.
5. Generate Concepts, Practice, Chapter Summary, original media and the independent bank in stages.
6. Review scientific accuracy, examination alignment and originality.
7. Compile and validate the Chapter JSON plus media.
8. Import as Draft and preview as a student.
9. Incorporate corrections and obtain human academic approval.

## Important operating rules

- One chapter per JSON file.
- Prefer a file upload over clipboard paste for large chapters.
- Never allow ChatGPT to omit arrays using phrases such as “continue similarly”.
- Keep stable IDs unchanged when correcting the same chapter.
- A later correction must become a reviewed new version; never silently overwrite a published chapter.
- Past-paper claims and exact papers require licensing/copyright review before commercial publication.

The working sample is available inside Content Operations through **Load Class 10 Science sample** and can be downloaded as JSON from the same screen.
