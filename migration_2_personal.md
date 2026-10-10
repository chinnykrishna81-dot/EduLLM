# EduLLM — Migration to Personal Laptop

This guide sets up the full EduLLM monorepo + Content Pipeline on a fresh macOS machine.

---

## Prerequisites

Install these first if not already present:

```bash
# Node.js 20+ (check: node --version)
brew install node

# Python 3.11+ (check: python3 --version)
brew install python@3.12

# PostgreSQL via Postgres.app
# Download from: https://postgresapp.com/
# Install and start it — keep it running in menu bar

# Poppler (required for PDF-to-image conversion)
brew install poppler
```

---

## Step 1 — Get the Code

**Option A: From git**
```bash
cd ~/Documents
git clone <repo-url> EduLlm
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
DATABASE_URL=postgresql://$(whoami):edullm_dev@localhost:5432/edullm
EOF
```

Or manually create `apps/api/.env` with:
```
DATABASE_URL=postgresql://YOUR_MACOS_USERNAME:edullm_dev@localhost:5432/edullm
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

## Step 5 — Set Up Content Pipeline (Python)

```bash
cd ~/Documents/EduLlm/apps/content-pipeline

# Create virtual environment
python3 -m venv .venv

# Install all dependencies
.venv/bin/pip install -r requirements.txt
```

Create `.env` file (never commit this):
```bash
cat > .env << 'EOF'
ANTHROPIC_API_KEY=PASTE_YOUR_KEY_HERE
OPENAI_API_KEY=PASTE_YOUR_KEY_HERE_WHEN_READY
OPENAI_IMAGE_MODEL=dall-e-3
EDULLM_API_URL=http://localhost:3001/api
UPLOAD_DIR=./uploads
DB_PATH=./data/pipeline.json
EOF
```

Get your **Anthropic API key** from: https://platform.claude.com → API Keys → Create Key

---

## Step 6 — Verify Scanned PDF Support

The purchased CBSE PDFs are image-based (scanned). The pipeline uses Claude Vision
to read them. Verify poppler is installed (required for pdf2image):

```bash
which pdftoppm  # should return a path
```

If not found:
```bash
brew install poppler
```

---

## Step 7 — Start All Services

Open **4 terminal tabs** and run one command in each:

**Tab 1 — API (port 3001)**
```bash
cd ~/Documents/EduLlm
npm run dev -w @edullm/api
```
Wait for: `EduLLM API running at http://localhost:3001/api`

**Tab 2 — Content Studio (port 5176)**
```bash
cd ~/Documents/EduLlm
npm run dev -w @edullm/content-studio
```
Wait for: `Local: http://localhost:5176/`

**Tab 3 — Content Pipeline / Python (port 8000)**
```bash
cd ~/Documents/EduLlm/apps/content-pipeline
set -a && source .env && set +a
.venv/bin/python main.py
```
Wait for: `Uvicorn running on http://0.0.0.0:8000`

**Tab 4 — Student App (port 5175) — optional**
```bash
cd ~/Documents/EduLlm
npm run dev -w @edullm/student-learning
```

---

## Step 8 — Verify Everything Works

```bash
# API health check
curl http://localhost:3001/api/health

# Pipeline check
curl http://localhost:8000/chapters

# Content Studio — open in browser
open http://localhost:5176
```

All three should respond without errors.

---

## Step 9 — Process First Chapter

1. Open http://localhost:5176 in browser
2. Click **"New Chapter"**
3. Fill in: Subject = Science, Chapter Number = 1, Name = Chemical Reactions and Equations
4. Upload your **3 PDFs**:
   - Notes PDF (Full Concept notes)
   - Q&A PDF (Questions and Answers)
   - MCQ PDF (Top 100 MCQs)
5. Click **"Start AI Processing"**
6. Pipeline runs 6 steps — takes 3–8 minutes
7. When complete, click **"Review Content"**
8. Review concept pages, questions, image specs
9. Click **"Publish"** to push to EduLLM

---

## Ports Reference

| Service | Port | URL |
|---|---|---|
| EduLLM API | 3001 | http://localhost:3001/api |
| Content Studio | 5176 | http://localhost:5176 |
| CMS (optional) | 5174 | http://localhost:5174 |
| Student App (optional) | 5175 | http://localhost:5175 |
| Content Pipeline | 8000 | http://localhost:8000 |

---

## Notes

- Content Pipeline stores data in `apps/content-pipeline/data/pipeline.json` (local JSON DB)
- Uploaded PDFs are stored in `apps/content-pipeline/uploads/<chapter-id>/`
- Never commit `.env` files — they are in `.gitignore`
- API keys: Anthropic ($10 credit = enough for all 27 chapters), OpenAI (for image generation, add later)
- Scanned PDFs: pipeline uses Claude Vision API — no OCR software needed
