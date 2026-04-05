-- =============================================
-- MASTER SQL SCRIPT — Run this ONCE in Supabase SQL Editor
-- This is the ONLY script you need to run.
-- It clears the messy old tables and creates exactly what the website needs.
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- =============================================

-- ─── STEP 1: CLEAN UP OLD/UNUSED TABLES ─────────────────────────
-- These old tables are NOT connected to the website at all — safe to drop
DROP TABLE IF EXISTS news_sentiment CASCADE;
DROP TABLE IF EXISTS news_impacts CASCADE;
DROP TABLE IF EXISTS leader_state_affiliations CASCADE;
DROP TABLE IF EXISTS topic_votes CASCADE;
DROP TABLE IF EXISTS processing_log CASCADE;
DROP TABLE IF EXISTS campaign_generation_logs CASCADE;
DROP TABLE IF EXISTS source_articles CASCADE;
DROP TABLE IF EXISTS issue_candidates CASCADE;
DROP TABLE IF EXISTS issue_ingestion_runs CASCADE;

-- ─── STEP 2: CREATE news_events TABLE ────────────────────────────
-- This is what the GitHub Actions bot writes to every day.
-- Each daily write = project stays alive (prevents free-tier pause)
-- The website reads from this for the Breaking News Ticker + Rajneeti TV
CREATE TABLE IF NOT EXISTS news_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  leader          TEXT        NOT NULL,
  state           TEXT        NOT NULL,
  sentiment_score TEXT,                        -- e.g. "+3.2" or "-1.5"
  ticker_headline TEXT        NOT NULL,
  blog_title      TEXT,
  blog_content    TEXT,
  social_post     TEXT,
  original_url    TEXT,
  news_date       DATE        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- One news row per leader per day (prevent duplicates on re-run)
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_leader_date
  ON news_events (leader, news_date);

-- Fast lookup: "give me today's news"
CREATE INDEX IF NOT EXISTS idx_news_date
  ON news_events (news_date DESC);

-- RLS: Anyone can read, only server (service_role) can write
ALTER TABLE news_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read news_events"
  ON news_events FOR SELECT USING (true);

-- ─── STEP 3: CAMPAIGNS TABLE ─────────────────────────────────────
-- Social Campaigns section — the debates users vote on
CREATE TABLE IF NOT EXISTS campaigns (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 TEXT        UNIQUE NOT NULL,
  title                TEXT        NOT NULL,
  subtitle             TEXT,
  issue_category       TEXT        NOT NULL,
  issue_summary        TEXT        NOT NULL,
  issue_bullets        TEXT[]      NOT NULL DEFAULT '{}',
  status               TEXT        NOT NULL DEFAULT 'live',
                                   -- 'draft' | 'live' | 'archived'
  start_time           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time             TIMESTAMPTZ NOT NULL,
  result_analysis      TEXT,       -- AI-generated result text
  winner_leader        TEXT,
  winner_vote_percentage NUMERIC(5,2),
  total_votes          INTEGER     DEFAULT 0,
  vote_percentages     JSONB       DEFAULT '{}'::jsonb,
  confidence_score     REAL,
  region               TEXT        DEFAULT 'national',
  source_metadata      JSONB,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_status ON campaigns(status);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read campaigns"
  ON campaigns FOR SELECT USING (true);

-- ─── STEP 4: LEADER APPROACHES TABLE ─────────────────────────────
-- The two policy approaches shown in each campaign (Modi vs Rahul)
CREATE TABLE IF NOT EXISTS leader_approaches (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID    REFERENCES campaigns(id) ON DELETE CASCADE,
  leader_name      TEXT    NOT NULL,
  style            TEXT    NOT NULL,     -- 'modi' | 'rahul'
  display_position INTEGER DEFAULT 1,
  policy_bullets   TEXT[]  NOT NULL DEFAULT '{}',
  framing_type     TEXT    DEFAULT 'default',
  is_winner        BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approaches_campaign ON leader_approaches(campaign_id);

ALTER TABLE leader_approaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read leader_approaches"
  ON leader_approaches FOR SELECT USING (true);

-- ─── STEP 5: VOTES TABLE ─────────────────────────────────────────
-- Records each public vote on a campaign
CREATE TABLE IF NOT EXISTS votes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID        REFERENCES campaigns(id) ON DELETE CASCADE,
  voter_id       TEXT        NOT NULL,   -- anonymous session ID from browser
  selected_style TEXT        NOT NULL,   -- 'modi' | 'rahul' | 'own'
  own_solution   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, voter_id)          -- one vote per person per campaign
);

CREATE INDEX IF NOT EXISTS idx_votes_campaign ON votes(campaign_id);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read votes"
  ON votes FOR SELECT USING (true);
CREATE POLICY "Public insert votes"
  ON votes FOR INSERT WITH CHECK (true);

-- ─── DONE ─────────────────────────────────────────────────────────
-- Your Supabase now has exactly 3 tables:
--   1. news_events   → daily news from GitHub Actions (keeps project alive)
--   2. campaigns     → social campaign debates
--   3. leader_approaches + votes → voting system
-- =============================================
