-- =============================================
-- MIGRATION: New tracking tables for campaign automation
-- Run this in Supabase SQL Editor → New Query → Paste → Run
-- All statements are safe to re-run (IF NOT EXISTS)
-- =============================================

-- 1. ISSUE INGESTION RUNS
-- Tracks every scan/generation attempt for auditing
CREATE TABLE IF NOT EXISTS issue_ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL DEFAULT 'scan',
  status TEXT NOT NULL DEFAULT 'started',
  issues_found INTEGER DEFAULT 0,
  campaign_generated BOOLEAN DEFAULT false,
  campaign_id UUID REFERENCES campaigns(id),
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 2. ISSUE CANDIDATES
-- Scored news issues waiting for promotion to a campaign
CREATE TABLE IF NOT EXISTS issue_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES issue_ingestion_runs(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  source_name TEXT,
  category TEXT NOT NULL,
  region TEXT DEFAULT 'national',
  recency_score REAL DEFAULT 0,
  reach_score REAL DEFAULT 0,
  civic_relevance_score REAL DEFAULT 0,
  composite_score REAL DEFAULT 0,
  already_covered BOOLEAN DEFAULT false,
  promoted_to_campaign BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SOURCE ARTICLES
-- Raw news articles linked to a generated campaign
CREATE TABLE IF NOT EXISTS source_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source_name TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CAMPAIGN GENERATION LOGS
-- Detailed AI generation audit trail
CREATE TABLE IF NOT EXISTS campaign_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES issue_ingestion_runs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id),
  prompt_hash TEXT,
  model_used TEXT DEFAULT 'gpt-5.4',
  confidence_score REAL,
  moderation_passed BOOLEAN DEFAULT true,
  moderation_flags TEXT[],
  raw_response_preview TEXT,
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ALTER EXISTING CAMPAIGNS TABLE (safe re-run)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS framing_type TEXT DEFAULT 'neutral';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS confidence_score REAL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'national';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS source_metadata JSONB;

-- 6. INDEXES for new tables
CREATE INDEX IF NOT EXISTS idx_ingestion_status ON issue_ingestion_runs(status);
CREATE INDEX IF NOT EXISTS idx_candidates_composite ON issue_candidates(composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_covered ON issue_candidates(already_covered);
CREATE INDEX IF NOT EXISTS idx_source_campaign ON source_articles(campaign_id);
CREATE INDEX IF NOT EXISTS idx_genlog_run ON campaign_generation_logs(run_id);
