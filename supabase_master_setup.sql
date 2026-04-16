-- =====================================================================
-- RAJNEETI WEBSITE — MASTER SUPABASE SETUP
-- =====================================================================
-- Project: xbgjkmahmyuoaspevipd (Website only — NOT the game project)
--
-- HOW TO RUN:
--   1. Go to supabase.com/dashboard → your website project
--   2. Click "SQL Editor" → "New Query"
--   3. Paste this ENTIRE file → Click "Run"
--   4. Safe to re-run — all statements use IF NOT EXISTS
--
-- STORAGE BUDGET (Free Tier = 500 MB):
--   campaigns:         ~500 bytes/row × 52/year = 26 KB/year
--   leader_approaches: ~200 bytes/row × 104/year = 21 KB/year
--   news_events:       ~200 bytes/row × 5/day (14-day rolling) = 14 KB max
--   votes:             temporary — deleted after campaign archival
--   After 10 years: ~500 KB total. Free tier is safe forever.
-- =====================================================================


-- ═══════════════════════════════════════════════════════════════
-- TABLE 1: news_events
-- Daily news fetched by GitHub Actions at 5:30 AM IST.
-- This is the "heartbeat" that keeps the free project alive.
-- The website reads from this for Breaking News Ticker + Rajneeti TV.
-- Auto-cleaned: rows older than 14 days are deleted by the bot.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS news_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  leader          TEXT        NOT NULL,
  state           TEXT        NOT NULL,
  sentiment_score TEXT,
  ticker_headline TEXT        NOT NULL,
  blog_title      TEXT,
  blog_content    TEXT,
  social_post     TEXT,
  original_url    TEXT,
  news_date       DATE        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Drop old leader constraint if it existed previously
DROP INDEX IF EXISTS idx_news_leader_date;

-- Implement intelligent duplicate detection by headline instead (Allows infinite news items per state/leader safely)
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_headline_date
  ON news_events (ticker_headline, news_date);

-- Fast Indexing for Instantaneous Frontend News Access
CREATE INDEX IF NOT EXISTS idx_news_events_date ON news_events(news_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_events_state ON news_events(state);
CREATE INDEX IF NOT EXISTS idx_news_events_created ON news_events(created_at);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 2: campaigns
-- Each weekly Social Campaign debate.
-- Lifecycle: draft → live (Mon) → archived (Thu) → kept forever.
-- After archiving, vote_percentages JSONB stores the compact result.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS campaigns (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                    TEXT        UNIQUE NOT NULL,
  title                   TEXT        NOT NULL,
  subtitle                TEXT,
  issue_category          TEXT        NOT NULL DEFAULT 'Governance',
  issue_summary           TEXT        NOT NULL DEFAULT '',
  issue_bullets           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  status                  TEXT        NOT NULL DEFAULT 'draft'
                                      CHECK (status IN ('draft', 'live', 'archived', 'topic_voting')),
  start_time              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time                TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  result_published_at     TIMESTAMPTZ,
  result_analysis         TEXT,
  winner_leader           TEXT,
  winner_vote_percentage  NUMERIC(5,2),
  total_votes             INTEGER     DEFAULT 0,
  vote_percentages        JSONB       DEFAULT '{}'::jsonb,
  confidence_score        REAL,
  region                  TEXT        DEFAULT 'national',
  source_metadata         JSONB,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug   ON campaigns(slug);


-- ═══════════════════════════════════════════════════════════════
-- TABLE 3: leader_approaches
-- Modi vs Rahul policy bullet points for each campaign.
-- The "style" column is critical — the frontend uses it to
-- determine which leader card to show (orange vs blue).
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS leader_approaches (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID        REFERENCES campaigns(id) ON DELETE CASCADE,
  leader_name      TEXT        NOT NULL,
  style            TEXT        NOT NULL,           -- 'modi' | 'rahul'
  display_position INTEGER     NOT NULL DEFAULT 1,
  policy_bullets   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  framing_type     TEXT        DEFAULT 'default',
  is_winner        BOOLEAN     DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leader_approaches_campaign_id
  ON leader_approaches(campaign_id);


-- ═══════════════════════════════════════════════════════════════
-- TABLE 4: votes
-- Anonymous public votes — one per browser session per campaign.
-- IMPORTANT: These are TEMPORARY. After a campaign is archived,
-- the bot compacts votes into campaigns.vote_percentages JSONB
-- and then DELETES all raw vote rows to save storage.
--
-- Column names MUST match what the frontend code sends:
--   voter_id      (not anonymous_session_id)
--   selected_style (not selected_option)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS votes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID        REFERENCES campaigns(id) ON DELETE CASCADE,
  voter_id       TEXT        NOT NULL,
  selected_style TEXT        NOT NULL,   -- 'modi' | 'rahul' | 'own'
  own_solution   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_campaign_id
  ON votes(campaign_id);


-- ═══════════════════════════════════════════════════════════════
-- TABLE 5: topic_vote_rounds  (kept for future use)
-- If the website ever lets users pick the NEXT campaign topic.
-- Currently not actively used — campaigns are auto-generated by AI.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS topic_vote_rounds (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  status        TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'closed')),
  start_time    TIMESTAMPTZ DEFAULT NOW(),
  end_time      TIMESTAMPTZ,
  winning_topic TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════
-- TABLE 6: topic_options  (kept for future use)
-- Each option in a topic voting round.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS topic_options (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id        UUID        REFERENCES topic_vote_rounds(id) ON DELETE CASCADE,
  issue_name      TEXT        NOT NULL,
  one_line_summary TEXT,
  category        TEXT,
  votes_count     INTEGER     DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topic_options_round_id
  ON topic_options(round_id);


-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: Auto-update "updated_at" on campaigns table
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — Public read, controlled write
-- ═══════════════════════════════════════════════════════════════

-- news_events: anyone reads, only service_role writes
ALTER TABLE news_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read news_events" ON news_events;
CREATE POLICY "Public read news_events"
  ON news_events FOR SELECT TO anon, authenticated USING (true);

-- campaigns: anyone reads, only service_role writes
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read campaigns" ON campaigns;
CREATE POLICY "Public read campaigns"
  ON campaigns FOR SELECT TO anon, authenticated USING (true);

-- leader_approaches: anyone reads
ALTER TABLE leader_approaches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read leader_approaches" ON leader_approaches;
CREATE POLICY "Public read leader_approaches"
  ON leader_approaches FOR SELECT TO anon, authenticated USING (true);

-- votes: anyone reads + inserts (anonymous voting)
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read votes" ON votes;
DROP POLICY IF EXISTS "Public insert votes" ON votes;
CREATE POLICY "Public read votes"
  ON votes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert votes"
  ON votes FOR INSERT TO anon, authenticated WITH CHECK (true);

-- topic_vote_rounds: anyone reads
ALTER TABLE topic_vote_rounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read topic_vote_rounds" ON topic_vote_rounds;
CREATE POLICY "Public read topic_vote_rounds"
  ON topic_vote_rounds FOR SELECT TO anon, authenticated USING (true);

-- topic_options: anyone reads
ALTER TABLE topic_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read topic_options" ON topic_options;
CREATE POLICY "Public read topic_options"
  ON topic_options FOR SELECT TO anon, authenticated USING (true);


-- ═══════════════════════════════════════════════════════════════
-- REMOVE OLD CRON JOBS (if they exist from previous setup)
-- These don't work on free tier — GitHub Actions replaces them.
-- ═══════════════════════════════════════════════════════════════
DO $$
BEGIN
  PERFORM cron.unschedule('generate-campaign-72h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-issue-scan');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('auto-close-expired-campaigns');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- DROP OLD TRACKING TABLES (only used by the dead Edge Function)
-- These are NOT read by the website frontend.
-- ═══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS campaign_generation_logs CASCADE;
DROP TABLE IF EXISTS source_articles CASCADE;
DROP TABLE IF EXISTS issue_candidates CASCADE;
DROP TABLE IF EXISTS issue_ingestion_runs CASCADE;


-- ═══════════════════════════════════════════════════════════════
-- DONE! Your database now has exactly 6 tables:
--   1. news_events          (daily news — auto-cleaned after 14 days)
--   2. campaigns            (weekly debates — kept forever, compact)
--   3. leader_approaches    (Modi vs Rahul points — kept forever)
--   4. votes                (temporary — deleted after archival)
--   5. topic_vote_rounds    (future use)
--   6. topic_options         (future use)
--
-- NEXT: Add these GitHub Secrets (Settings → Secrets → Actions):
--   SUPABASE_URL             = https://xbgjkmahmyuoaspevipd.supabase.co
--   SUPABASE_SERVICE_ROLE_KEY = (from Supabase → Settings → API → service_role)
--   OPENAI_API_KEY            = (your OpenAI key)
--   or GEMINI_API_KEY         = (your Google AI key)
-- ═══════════════════════════════════════════════════════════════
