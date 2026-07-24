# Check Your Knowledge (CYK)

CYK is an unscored Topic-level self-check. It appears after the Topic's final Subtopic and as the final child under that Topic in student navigation. It is not a Subtopic activity and does not affect Cycle Test mastery or mark decay.

## Teacher and administrator workflow

In **Chapter Library → Build content**, select a Topic and open **Check Your Knowledge**. Authorized users can create, read, edit, reorder and delete Type 1 questions, guided Type 2 questions and Type 2 steps. The complete CYK can also be deleted after confirmation.

Bulk preview accepts DOCX, XLSX, TXT and JSON. An uploaded JSON file uses either a question array or a `questions` array; the separate paste option also accepts a complete CYK object. Loading replaces the selected Topic's current CYK in the unsaved editor; it does not publish content. The teacher reviews and corrects the preview before **Save Draft**.

For Excel, use headings such as `Question`, `Type`, `Format`, `Options`, `Correct Answer`, `Explanation`, `Marks`, `Difficulty` and `Pattern ID`. Separate choices with `|`. Structured Type 2 questions are most reliably loaded through JSON or created in the visual editor.

For Word and TXT, use numbered questions (`1.`, `2.`, etc.). These formats reliably extract question text, but the teacher must review and complete choices, correct answers, formats and explanations.

There is no question limit. A typical CYK has two to six questions, but every loaded question is displayed.

## Student behaviour

- One question is shown per page, with Previous, Next and numbered navigation.
- Students can use the left panel to visit learning content and return to CYK.
- CYK scrolling is contained so it cannot accidentally flow into the next Topic.
- **Submit all answers** is enabled only after every question is answered.
- A Type 2 question is correct only when all its steps are correct.
- Score is `(correct questions ÷ total questions) × 100`, shown to two decimals. Four out of six is `66.67%`.
- Above 80% is green with congratulations; above 60% through 80% is yellow; 60% or below is grey.
- Retakes are unlimited and have no timer.
- Only the latest result colour is retained in the current open learning session. No CYK attempt or score is stored as an assessment record.

CYK colour remains separate from formal Cycle Test mastery.
