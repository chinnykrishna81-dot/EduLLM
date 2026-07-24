# Question Bank Staging and Enrichment

## Workflow

1. Upload the question PDF and optional answer PDF using **Extract and stage**.
2. Review extracted records in the **Staging** tab.
3. Use **View / Edit** to correct the question, choices, correct answer, explanation, mapping and usage manually.
4. Alternatively, select **Download staging Excel** and enrich it manually or with ChatGPT.
5. Upload the completed `.xlsx` workbook or a JSON question array.
6. The application validates immutable Question IDs and applies the complete upload in one database transaction.
7. Approve reviewed questions. Approved records move to the separate **Approved** tab.

## Excel workbook

The workbook has two sheets:

- **Questions** contains one row per Type 1 or Type 2 main question. It includes four Type 1 answer columns, correct answer, HTML explanation, Topic/Subtopic, marks, Pattern ID, difficulty, Practice/Cycle Test usage, image IDs and status.
- **Type2 Steps** contains one row per Type 2 subquestion. It includes three close answer choices, correct answer, marks, negative marks, critical-step flag, HTML explanation and question/answer image IDs.

Type 2 main marks are derived from the sum of all subquestion marks. They are not independently maintained.

Use **Download Excel template** for sample Type 1 and Type 2 records. In a staging download, never replace or invent `questionId`. It is the only key used to identify the existing record.

## Update safety

- Matching is based only on immutable Question ID—not question wording.
- Enrichment may overwrite question text, answers, explanations and classification fields while retaining identity and source references.
- Unknown, missing or repeated Question IDs reject the complete upload.
- The database update is transactional: either every supplied record is updated or none is.
- Teachers must review the result before approval.

## Pattern ID

`patternId` groups questions that use the same underlying recognition or solving method even when wording and values differ. Examples include `BALANCE_BY_COEFFICIENTS`, `REACTION_TYPE_IDENTIFICATION` and `OXIDATION_REDUCTION_AGENT`. Pattern IDs support representative Practice selection, coverage statistics and balanced test-form generation. They are part of Excel and JSON but can remain blank during initial extraction; they are required before approval.
