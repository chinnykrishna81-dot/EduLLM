BEGIN;

CREATE TABLE IF NOT EXISTS app_user (
  user_id UUID PRIMARY KEY,
  email VARCHAR(320) NOT NULL UNIQUE,
  login_id VARCHAR(80) UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','teacher','student')),
  password_hash TEXT NOT NULL,
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'email',
  google_subject VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  privacy_consent_version VARCHAR(30),
  privacy_consented_at TIMESTAMPTZ,
  privacy_consent_source VARCHAR(30),
  created_by UUID REFERENCES app_user(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_session (
  session_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_session_user ON user_session(user_id);
CREATE INDEX IF NOT EXISTS idx_user_session_expiry ON user_session(expires_at);

CREATE TABLE IF NOT EXISTS course (
  course_id UUID PRIMARY KEY,
  slug VARCHAR(240) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  board VARCHAR(100), grade VARCHAR(50), subject VARCHAR(150),
  language VARCHAR(80) NOT NULL DEFAULT 'English',
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  review_status VARCHAR(30) NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  content JSONB NOT NULL,
  validation JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chapter_library (
  chapter_id UUID PRIMARY KEY,
  stable_id VARCHAR(240) UNIQUE,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  board_tags TEXT[] NOT NULL DEFAULT '{}',
  grade_tags TEXT[] NOT NULL DEFAULT '{}',
  subject_tags TEXT[] NOT NULL DEFAULT '{}',
  language VARCHAR(80) NOT NULL DEFAULT 'English',
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  content JSONB NOT NULL,
  package JSONB,
  cycle_test JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chapter_version (
  chapter_version_id UUID PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapter_library(chapter_id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL,
  content JSONB NOT NULL,
  package JSONB,
  cycle_test JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chapter_id,version)
);

CREATE TABLE IF NOT EXISTS subject_definition (
  subject_id UUID PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  code VARCHAR(80) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  board VARCHAR(100) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  academic_year VARCHAR(30),
  language VARCHAR(80) NOT NULL DEFAULT 'English',
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  final_exam JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS subject_unit (
  unit_id UUID PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES subject_definition(subject_id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL,
  semester_test JSONB,
  UNIQUE(subject_id,position)
);

CREATE TABLE IF NOT EXISTS unit_chapter (
  unit_id UUID NOT NULL REFERENCES subject_unit(unit_id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapter_library(chapter_id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY(unit_id,chapter_id),
  UNIQUE(unit_id,position)
);

CREATE TABLE IF NOT EXISTS course_offering (
  offering_id UUID PRIMARY KEY,
  slug VARCHAR(240) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  list_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  validity_days INTEGER,
  validity_mode VARCHAR(20) NOT NULL DEFAULT 'duration',
  validity_value INTEGER,
  validity_unit VARCHAR(10),
  validity_start_date DATE,
  validity_end_date DATE,
  free_trial_days INTEGER NOT NULL DEFAULT 0,
  subscription_type VARCHAR(30) NOT NULL DEFAULT 'one_time',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS course_offering_subject (
  offering_id UUID NOT NULL REFERENCES course_offering(offering_id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subject_definition(subject_id) ON DELETE RESTRICT,
  position INTEGER NOT NULL,
  PRIMARY KEY(offering_id,subject_id),
  UNIQUE(offering_id,position)
);

CREATE TABLE IF NOT EXISTS course_enrolment (
  enrolment_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  offering_id UUID NOT NULL REFERENCES course_offering(offering_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled','expired')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id,offering_id)
);
CREATE INDEX IF NOT EXISTS idx_course_enrolment_user ON course_enrolment(user_id,status);

CREATE TABLE IF NOT EXISTS cycle_test_attempt (
  attempt_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapter_library(chapter_id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  form_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','submitted')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(), deadline_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ, result_available_at TIMESTAMPTZ,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_questions JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC(10,2), total_marks NUMERIC(10,2),
  topic_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  snapshot JSONB NOT NULL,
  UNIQUE(user_id,chapter_id,attempt_number)
);
CREATE INDEX IF NOT EXISTS idx_cycle_attempt_user_chapter ON cycle_test_attempt(user_id,chapter_id,attempt_number DESC);
ALTER TABLE cycle_test_attempt ADD COLUMN IF NOT EXISTS review_questions JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS media_asset (
  media_id UUID PRIMARY KEY,
  course_id UUID REFERENCES course(course_id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapter_library(chapter_id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  file_name TEXT GENERATED ALWAYS AS (original_name) STORED,
  stored_name TEXT NOT NULL,
  mime_type VARCHAR(150) NOT NULL,
  byte_size BIGINT NOT NULL,
  title TEXT NOT NULL DEFAULT '', caption TEXT NOT NULL DEFAULT '', alt_text TEXT NOT NULL DEFAULT '',
  folder_type VARCHAR(30), folder_ref_id TEXT, folder_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_course ON media_asset(course_id);
CREATE INDEX IF NOT EXISTS idx_media_chapter ON media_asset(chapter_id);
ALTER TABLE media_asset ADD COLUMN IF NOT EXISTS folder_type VARCHAR(30),ADD COLUMN IF NOT EXISTS folder_ref_id TEXT,ADD COLUMN IF NOT EXISTS folder_label TEXT;
ALTER TABLE media_asset ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) NOT NULL DEFAULT 'local',ADD COLUMN IF NOT EXISTS object_key TEXT,ADD COLUMN IF NOT EXISTS original_object_key TEXT,ADD COLUMN IF NOT EXISTS checksum VARCHAR(64),ADD COLUMN IF NOT EXISTS width INTEGER,ADD COLUMN IF NOT EXISTS height INTEGER,ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS chapter_document (
  document_id UUID PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapter_library(chapter_id) ON DELETE CASCADE,
  node_type VARCHAR(40) NOT NULL, node_id VARCHAR(240) NOT NULL,
  original_name TEXT NOT NULL, stored_name TEXT NOT NULL, mime_type VARCHAR(150) NOT NULL,
  byte_size BIGINT NOT NULL, page_count INTEGER, active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE chapter_document ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) NOT NULL DEFAULT 'local',ADD COLUMN IF NOT EXISTS object_key TEXT;

CREATE TABLE IF NOT EXISTS question_import_batch (
  batch_id UUID PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapter_library(chapter_id) ON DELETE CASCADE,
  source_name TEXT NOT NULL, source_type VARCHAR(50), total_extracted INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0, duplicate_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'loaded',
  created_by UUID REFERENCES app_user(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_bank (
  question_id VARCHAR(240) PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapter_library(chapter_id) ON DELETE CASCADE,
  question_text TEXT NOT NULL, normalized_hash VARCHAR(64) NOT NULL,
  question_type VARCHAR(20) NOT NULL DEFAULT 'type1', format VARCHAR(30) NOT NULL DEFAULT 'one_line',
  marks NUMERIC(8,2) NOT NULL DEFAULT 1, topic_id VARCHAR(240) NOT NULL DEFAULT '', subtopic_id VARCHAR(240) NOT NULL DEFAULT '',
  difficulty VARCHAR(20) NOT NULL DEFAULT 'medium', pattern_id VARCHAR(240) NOT NULL DEFAULT '',
  duplicate_status VARCHAR(30) NOT NULL DEFAULT 'not_checked', duplicate_of VARCHAR(240) REFERENCES question_bank(question_id) ON DELETE SET NULL,
  duplicate_group_id VARCHAR(240), duplicate_reason TEXT, duplicate_confidence NUMERIC(5,4),
  usage TEXT[] NOT NULL DEFAULT '{}', status VARCHAR(30) NOT NULL DEFAULT 'staged', data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES app_user(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_question_bank_chapter ON question_bank(chapter_id,status);
CREATE INDEX IF NOT EXISTS idx_question_bank_hash ON question_bank(chapter_id,normalized_hash);

CREATE TABLE IF NOT EXISTS question_source_reference (
  source_reference_id UUID PRIMARY KEY,
  question_id VARCHAR(240) NOT NULL REFERENCES question_bank(question_id) ON DELETE CASCADE,
  batch_id UUID REFERENCES question_import_batch(batch_id) ON DELETE SET NULL,
  source_name TEXT NOT NULL, source_category TEXT, source_year VARCHAR(20), question_number VARCHAR(80), page_number VARCHAR(80),
  UNIQUE(question_id,batch_id,question_number)
);

CREATE TABLE IF NOT EXISTS ai_integration_setting (
  setting_id INTEGER PRIMARY KEY CHECK(setting_id=1), provider VARCHAR(30) NOT NULL DEFAULT 'openai',
  encrypted_api_key TEXT, key_last4 VARCHAR(4), active BOOLEAN NOT NULL DEFAULT false,
  allowed_purposes JSONB NOT NULL DEFAULT '{}'::jsonb,
  max_request_usd NUMERIC(10,4) NOT NULL DEFAULT .25, daily_limit_usd NUMERIC(10,2) NOT NULL DEFAULT 2, monthly_limit_usd NUMERIC(10,2) NOT NULL DEFAULT 10,
  updated_by UUID REFERENCES app_user(user_id) ON DELETE SET NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO ai_integration_setting(setting_id) VALUES(1) ON CONFLICT(setting_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_usage_audit (
  audit_id UUID PRIMARY KEY, user_id UUID REFERENCES app_user(user_id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES chapter_library(chapter_id) ON DELETE SET NULL,
  purpose VARCHAR(80) NOT NULL, model VARCHAR(100) NOT NULL, item_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL, error_message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
