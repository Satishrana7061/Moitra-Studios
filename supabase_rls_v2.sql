-- =============================================
-- RLS POLICIES FOR NEW TRACKING TABLES ONLY
-- Run this AFTER supabase_migration_v2.sql
-- Your existing 5 table policies are UNTOUCHED
-- =============================================

-- ============ ISSUE INGESTION RUNS ============
ALTER TABLE issue_ingestion_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read ingestion runs" ON issue_ingestion_runs;
CREATE POLICY "Public can read ingestion runs"
  ON issue_ingestion_runs FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============ ISSUE CANDIDATES ============
ALTER TABLE issue_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read issue candidates" ON issue_candidates;
CREATE POLICY "Public can read issue candidates"
  ON issue_candidates FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============ SOURCE ARTICLES ============
ALTER TABLE source_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read source articles" ON source_articles;
CREATE POLICY "Public can read source articles"
  ON source_articles FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============ CAMPAIGN GENERATION LOGS ============
ALTER TABLE campaign_generation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read generation logs" ON campaign_generation_logs;
CREATE POLICY "Public can read generation logs"
  ON campaign_generation_logs FOR SELECT
  TO anon, authenticated
  USING (true);
