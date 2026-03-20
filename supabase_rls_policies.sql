-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Run this in the Supabase SQL Editor AFTER the schema
-- =============================================

-- ============ CAMPAIGNS ============
-- Everyone can read campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on campaigns"
  ON campaigns FOR SELECT
  USING (true);

-- Only service_role (your Python script) can insert/update/delete
CREATE POLICY "Allow service_role full access on campaigns"
  ON campaigns FOR ALL
  USING (auth.role() = 'service_role');

-- ============ LEADER APPROACHES ============
ALTER TABLE leader_approaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on leader_approaches"
  ON leader_approaches FOR SELECT
  USING (true);

CREATE POLICY "Allow service_role full access on leader_approaches"
  ON leader_approaches FOR ALL
  USING (auth.role() = 'service_role');

-- ============ VOTES ============
-- Anyone can read votes (for counting)
-- Anyone can insert a vote (anonymous voting)
-- Nobody can update or delete votes
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on votes"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous insert on votes"
  ON votes FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE policy = nobody can modify votes

-- ============ TOPIC ROUNDS ============
ALTER TABLE topic_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on topic_rounds"
  ON topic_rounds FOR SELECT
  USING (true);

CREATE POLICY "Allow service_role full access on topic_rounds"
  ON topic_rounds FOR ALL
  USING (auth.role() = 'service_role');

-- ============ TOPIC OPTIONS ============
ALTER TABLE topic_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on topic_options"
  ON topic_options FOR SELECT
  USING (true);

CREATE POLICY "Allow service_role full access on topic_options"
  ON topic_options FOR ALL
  USING (auth.role() = 'service_role');

-- ============ TOPIC VOTES ============
ALTER TABLE topic_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on topic_votes"
  ON topic_votes FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous insert on topic_votes"
  ON topic_votes FOR INSERT
  WITH CHECK (true);
