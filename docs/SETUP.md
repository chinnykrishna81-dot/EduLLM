# Local Setup

## Prerequisites

- Node.js 20.19 or newer
- npm
- PostgreSQL running locally (Postgres.app is suitable on macOS)

No Ollama or other local LLM is used.

## First-time setup

From the repository root:

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Before running `db:setup`, replace `YOUR_LOCAL_POSTGRES_PASSWORD` in `.env` with the password for your local PostgreSQL user. Keep `.env` private; it is ignored by Git.

Open Content Operations at <http://localhost:5174> and Unified Student Learning at <http://localhost:5176>. The API runs at <http://localhost:3001>, with interactive documentation at <http://localhost:3001/api/docs>.

If `psql` is not on your shell path when using Postgres.app, add its command-line tools to `PATH`, or run the database setup from a terminal configured by Postgres.app.

## Load the reusable end-to-end sample

With `npm run dev` running, open another Terminal in the repository and run:

```bash
npm run db:seed
```

The seed is idempotent and creates an approved reusable Chapter, an approved Subject/Unit, and a published Course visible in the student catalogue.

## Import ChatGPT chapter content

1. Open <http://localhost:5174>.
2. Select **Chapter Library**.
3. Select **Import Chapter Package**.
4. Paste JSON or select one `.json` file generated using the [master protocol](docs/CHATGPT_CHAPTER_GENERATION_PROTOCOL.md).
5. Select **Validate only** and review counts, errors and warnings.
6. Select **Import valid package**. It is saved as Draft and cannot affect published content.

Use **Load Class 10 Science sample** to test without creating external content. **Download sample JSON** provides a working file to give ChatGPT alongside the master instructions.

The original comprehensive ChatGPT JSON sample and illustrations remain in the repository for the upcoming Chapter Content Studio migration.

## Verification

```bash
npm test
npm run build
```

Application data is stored in PostgreSQL. Uploaded images are stored in `apps/api/storage/uploads`, which is appropriate for local testing and can later be replaced with Amazon S3.
