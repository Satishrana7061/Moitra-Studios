-- =============================================
-- CRON SCHEDULES FOR CAMPAIGN AUTOMATION
-- Run this in Supabase SQL Editor → New Query → Paste → Run
-- Requires pg_cron and pg_net extensions (enabled by default on Supabase)
-- =============================================

-- Enable required extensions (safe to re-run)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================
-- SCHEDULE 1: Full Campaign Generation (Every 72 Hours)
-- Runs at 6:00 AM UTC on every 3rd day
-- =============================================
SELECT cron.schedule(
  'generate-campaign-72h',
  '0 6 */3 * *',
  $$
  SELECT net.http_post(
    url := 'https://xbgjkmahmyuoaspevipd.supabase.co/functions/v1/generate-current-campaigns',
    body := '{"mode": "generate"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
    )
  );
  $$
);

-- =============================================
-- SCHEDULE 2: Daily Lightweight Issue Scan (No campaign generation)
-- Runs at 5:00 AM UTC every day
-- Only scans and scores issues; does NOT publish any campaign
-- =============================================
SELECT cron.schedule(
  'daily-issue-scan',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xbgjkmahmyuoaspevipd.supabase.co/functions/v1/generate-current-campaigns',
    body := '{"mode": "scan_only"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
    )
  );
  $$
);

-- =============================================
-- SCHEDULE 3: Auto-close expired campaigns (Every 6 hours)
-- Moves any campaign past its end_time from 'live' to 'closed'
-- =============================================
SELECT cron.schedule(
  'auto-close-expired-campaigns',
  '0 */6 * * *',
  $$
  UPDATE campaigns
  SET status = 'closed', updated_at = NOW()
  WHERE status = 'live' AND end_time < NOW();
  $$
);

-- =============================================
-- TO REMOVE SCHEDULES (Rollback):
-- SELECT cron.unschedule('generate-campaign-72h');
-- SELECT cron.unschedule('daily-issue-scan');
-- SELECT cron.unschedule('auto-close-expired-campaigns');
-- =============================================
