# EduLLM — Migration to Personal Laptop

This guide sets up the full EduLLM monorepo on a fresh macOS machine.

---

## Prerequisites

Install these first if not already present:

```bash
# Node.js 20+ (check: node --version)
brew install node

# Python 3.11+ (not needed for new simplified setup)
# PostgreSQL via Postgres.app
# Download from: https://postgresapp.com/
# Install and start it — keep it running in menu bar
```

---

## Step 1 — Get the Code

**Option A: From git**
```bash
cd ~/Documents
git clone https://github.com/chinnykrishna81-dot/EduLLM.git EduLlm
cd EduLlm
```

**Option B: From zip transfer (USB / Google Drive)**
```bash
cd ~/Documents
unzip EduLlm.zip
cd EduLlm
```

---

## Step 2 — PostgreSQL Setup

Open **Postgres.app**, click **Initialize** if first time. Then open psql:

```bash
psql -U $(whoami) postgres
```

Run these commands inside psql:

```sql
CREATE DATABASE edullm;
CREATE USER edullm_user WITH PASSWORD 'edullm_dev';
GRANT ALL PRIVILEGES ON DATABASE edullm TO edullm_user;
\q
```

Now edit pg_hba.conf to use md5 authentication (not trust):

```bash
# Find the file location
psql -U $(whoami) -c "SHOW hba_file;"

# Open it (path will look like below — version number may differ)
nano "/Users/$(whoami)/Library/Application Support/Postgres/var-18/pg_hba.conf"
```

Find the two lines starting with `host all all 127.0.0.1/32` and `host all all ::1/128` and change `trust` to `md5` on both. Save with Ctrl+O, exit with Ctrl+X.

Restart Postgres.app: click the elephant icon → Stop → Start.

Set password for your macOS user in Postgres:
```bash
psql -U $(whoami) postgres -c "ALTER USER \"$(whoami)\" WITH PASSWORD 'edullm_dev';"
```

---

## Step 3 — Install Node Dependencies

```bash
cd ~/Documents/EduLlm
npm install
```

---

## Step 4 — Configure the API

Create environment file for the API:

```bash
cat > apps/api/.env << 'EOF'
DATABASE_URL=postgresql://YOUR_MACOS_USERNAME:edullm_dev@localhost:5432/edullm
EOF
```

Replace `YOUR_MACOS_USERNAME` with the output of `whoami`.

Update the dev script in `apps/api/package.json` to include DATABASE_URL:
```json
"dev": "DATABASE_URL=postgresql://YOUR_MACOS_USERNAME:edullm_dev@localhost:5432/edullm tsx watch src/main.ts"
```

Run database setup:
```bash
npm run db:setup -w @edullm/api
```

---

## Step 5 — Place Content Files

Copy or link the `EDULLM_Content` folder to the project root:

```bash
# If you have the content folder separately, copy it:
cp -r /path/to/EDULLM_Content ~/Documents/EduLlm/EDULLM_Content

# The folder structure should look like:
# EduLlm/
#   EDULLM_Content/
#     manifest.json
#     EduLLM_Chemical_Reactions_Offline_Fixed/
#       chapter.json
#       images/
#     EduLLM_62_Illustrated_Final/
#       question_bank.json
#       images/
#     question_bank.json
```

---

## Step 6 — Start All Services

Open **2 terminal tabs** and run one command in each:

**Tab 1 — API (port 3001)**
```bash
cd ~/Documents/EduLlm
npm run dev -w @edullm/api
```
Wait for: `EduLLM API running at http://localhost:3001/api`

**Tab 2 — Teacher Portal (port 5174)**
```bash
cd ~/Documents/EduLlm
npm run dev -w @edullm/content-management
```
Wait for: `Local: http://localhost:5174/`

**Tab 3 — Student App (port 5175) — optional**
```bash
cd ~/Documents/EduLlm
npm run dev -w @edullm/student-learning
```

Or start everything at once:
```bash
npm run dev:cms
```

---

## Step 7 — Verify Everything Works

```bash
# API health check
curl http://localhost:3001/api/health

# Content packages check
curl http://localhost:3001/api/content/packages

# Teacher Portal — open in browser
open http://localhost:5174
```

---

## Step 8 — Using the Teacher Portal

1. Open http://localhost:5174 in browser
2. The sidebar lists all content packages from `EDULLM_Content/`
3. Click a chapter to load it
4. Browse sections (topics) in the sidebar
5. Each section shows:
   - Definition, Key Points, Equations, Worked Example
   - Subtopics detail
   - Images from the chapter
   - **Test Your Knowledge** — 10 MCQs at the bottom
6. Click **Question Bank** tab to view:
   - Type 1 MCQs (100 questions, filterable by topic)
   - Type 2 Illustrated questions (62 questions with SVG images)

---

## Adding More Chapters

When new chapter content is generated, add it to `EDULLM_Content/` and register it in `EDULLM_Content/manifest.json`:

```json
{
  "packages": [
    {
      "id": "cbse10-sci-chem-01",
      "subject": "Science",
      "grade": 10,
      "board": "CBSE",
      "chapterFile": "EduLLM_Chemical_Reactions_Offline_Fixed/chapter.json",
      "chapterImagesDir": "EduLLM_Chemical_Reactions_Offline_Fixed/images",
      "mcqFile": "question_bank.json",
      "type2File": "EduLLM_62_Illustrated_Final/question_bank.json",
      "type2ImagesDir": "EduLLM_62_Illustrated_Final/images"
    },
    {
      "id": "cbse10-sci-acids-02",
      "subject": "Science",
      "grade": 10,
      "board": "CBSE",
      "chapterFile": "EduLLM_Acids_Bases/chapter.json",
      "chapterImagesDir": "EduLLM_Acids_Bases/images",
      "mcqFile": "EduLLM_Acids_Bases/question_bank_mcq.json",
      "type2File": "EduLLM_Acids_Bases/question_bank_type2.json",
      "type2ImagesDir": "EduLLM_Acids_Bases/images"
    }
  ]
}
```

---

## Ports Reference

| Service | Port | URL |
|---|---|---|
| EduLLM API | 3001 | http://localhost:3001/api |
| Teacher Portal (CMS) | 5174 | http://localhost:5174 |
| Student App | 5175 | http://localhost:5175 |

---

## Notes

- Content is generated by an external AI tool and placed in `EDULLM_Content/`
- No Python / AI pipeline needed — content is pre-generated JSON
- Never commit `.env` files — they are in `.gitignore`
- The API serves content files from `EDULLM_Content/` at `/api/content/packages`
