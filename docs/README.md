# EduLLM Learning Platform

A local-first learning platform with separate Content Operations and Student Learning applications sharing one NestJS/PostgreSQL backend.

## Current implementation

- Reusable Chapter Library with draft, review and approval
- Subject Builder with ordered Units and approved reusable Chapters
- Course Builder with subject composition, price, discount, validity and publication
- Separate student catalogue, course details and expandable syllabus index
- Published-course boundary: drafts do not appear in the student catalogue
- Original comprehensive content schema and illustrated sample retained for migration
- Chapter Package 2.0 paste/file import with validate-only preview, counts, warnings and draft creation
- Visual rich-text authoring for Topic, Subtopic, Learning Page and text-block content
- Chapter Smart Notes with explicit DOCX/PDF upload, logical pagination and a 10 MB file limit
- Full-width, scrollable Knowledge Graph viewing with full-screen zoom controls
- Content Base staging with reviewed hierarchy creation and safe batch deletion
- PostgreSQL persistence and local filesystem image storage
- Swagger API documentation

Assessment runtime, learning-card playback, practice, timed attempts, delayed results and mastery decay are the next implementation slices described in the architecture documents.

## Technology

- React, TypeScript, and Vite
- Node.js, TypeScript, and NestJS
- PostgreSQL through the small native `pg` driver
- Zod as the shared content contract

No local LLM, Ollama, Docker, or cloud service is required for local development.

## Start locally

Follow [SETUP.md](SETUP.md). Once running:

- Content Studio: <http://localhost:5174>
- Student Learning: <http://localhost:5175>
- API documentation: <http://localhost:3001/api/docs>
- API health: <http://localhost:3001/api/health>

Run `npm run db:seed` once while the API is running to load the approved reusable demo Chapter, Subject and published Course.

To load ChatGPT content, open **Chapter Library → Import Chapter Package**. You can paste JSON, select a `.json` file, load/download the working sample, validate without saving, and import a valid package as Draft. Use the [ChatGPT Master Chapter Generation Protocol](docs/CHATGPT_CHAPTER_GENERATION_PROTOCOL.md) to generate one chapter at a time.

Product context remains in [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md), [MVP scope](MVP_SCOPE.md), and [decisions](DECISIONS.md).

The authoritative authoring and publishing workflow is [Content-to-Course Process](docs/CONTENT_TO_COURSE_PROCESS.md). The teaching and test rules are in [Learning and Assessment Model](docs/LEARNING_AND_ASSESSMENT_MODEL.md), and the proposed two-application design, modules, roles, and personas are in [Proposed Architecture](docs/PROPOSED_ARCHITECTURE.md). Legacy course-first tables remain temporarily to preserve the earlier sample while content is migrated.
