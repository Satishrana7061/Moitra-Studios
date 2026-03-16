-- =============================================
-- RLS POLICIES FOR NEW TRACKING TABLES
-- Run this in Supabase SQL Editor AFTER supabase_migration_v2.sql
-- =============================================

-- ============ ISSUE INGESTION RUNS ============
ALTER TABLE issue_ingestion_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on issue_ingestion_runs"
  ON issue_ingestion_runs FOR SELECT
  USING (true);

CREATE POLICY "Allow service_role full access on issue_ingestion_runs"
  ON issue_ingestion_runs FOR ALL
  USING (auth.role() = 'service_role');

-- ============ ISSUE CANDIDATES ============
ALTER TABLE issue_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on issue_candidates"
  ON issue_candidates FOR SELECT
  USING (true);

CREATE POLICY "Allow service_role full access on issue_candidates"
  ON issue_candidates FOR ALL
  USING (auth.role() = 'service_role');

-- ============ SOURCE ARTICLES ============
ALTER TABLE source_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on source_articles"
  ON source_articles FOR SELECT
  USING (true);

CREATE POLICY "Allow service_role full access on source_articles"
  ON source_articles FOR ALL
  USING (auth.role() = 'service_role');

-- ============ CAMPAIGN GENERATION LOGS ============
ALTER TABLE campaign_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on campaign_generation_logs"
  ON campaign_generation_logs FOR SELECT
  USING (true);

CREATE POLICY "Allow service_role full access on campaign_generation_logs"
  ON campaign_generation_logs FOR ALL
  USING (auth.role() = 'service_role');
