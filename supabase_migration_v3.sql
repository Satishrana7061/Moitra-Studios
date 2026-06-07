-- =====================================================================
-- MIGRATION: Add video_url column to pm_interviews table
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =====================================================================

ALTER TABLE pm_interviews ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Disable RLS on pm_interviews to allow backend updates/seeding
ALTER TABLE pm_interviews DISABLE ROW LEVEL SECURITY;

-- Notify schema cache reload
NOTIFY pgrst, 'reload schema';
