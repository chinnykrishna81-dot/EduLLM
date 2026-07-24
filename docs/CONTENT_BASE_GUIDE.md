# Content Base guide

Content Base is a reusable staging area. It does not replace the editable Chapter Library.

## Supported source files

- DOCX
- TXT
- PDF containing extractable text

Scanned PDFs must be converted with OCR before upload. The importer deliberately excludes Class Notes, Chapter Summary/360 views, Practice, Question Bank and assessments.

## Minimum labelled format

```text
Topic
1. Introduction to Chemical Reactions

Sub-topic
1.1 Chemistry Around Us

Page
Title
Chemistry Is All Around You

Content
Chemistry is not limited to laboratories.
Examples, exam tricks and other internal headings remain part of this Content field.

Remember
Chemistry explains the changes happening around us every day.

Image
IMG_CH01_T1_ST1_P001_Chemistry_Around_Us
```

`Sub-topic`, `Remember` and `Image` are optional. `Page ID` is accepted for source traceability but is not required; the application creates stable internal IDs. `Page` is the preferred explicit boundary. A new `Title` also starts a new internal page.

Only Chapter, Topic, Sub-topic, Page, Page ID, Title, Content, Remember and Image control parsing. Text such as Example, Examples, Exam Trick, Observation or Common Mistake inside Content is preserved in Content and does not create another data type.

## Review and loading

1. Open **Content Base**.
2. Enter Board, Class/Grade, Subject, Chapter code/title and language.
3. Upload the source.
4. Correct Topic, optional Subtopic, page title, rich content, Remember and image reference in staging.
5. Exclude unwanted or duplicate records.
6. Select **Review hierarchy**.
7. Confirm the proposed Topic → optional Subtopic → internal pages hierarchy.
8. Create an editable Chapter Draft.

Uploads from multiple sources with the same Board, Class, Subject and Chapter title are combined in the proposal. Exact duplicate pages remain traceable in staging but are omitted from the proposal. Source changes never silently alter an existing Chapter Draft.

## Images

The staged image name is retained without requiring an extension. When the Chapter opens, the media resolver matches PNG, JPG/JPEG, WebP or SVG by normalized filename. The default layout is content left and image right. If the image is absent, student content uses the full width; the authoring interface retains the reference for correction. Teachers can use the existing image controls to replace, reposition or add images after loading.

## Student navigation

- The left hierarchy displays Topic and Subtopic only; internal pages remain hidden.
- All internal pages in the current Subtopic open together and scroll continuously.
- Compact Previous/Next page controls and keyboard Left/Right arrows scroll one internal page at a time.
- Page controls do not unlock content and do not show selectable page dots.
- One prominent Continue button appears only after the final page of the Subtopic.
- Continue completes that Subtopic, opens every page in the next Subtopic and scrolls to its beginning.

If a Topic has pages without a Subtopic, those pages form the Topic introduction section and follow the same boundary rule.
