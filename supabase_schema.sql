-- Social Campaigns Database Schema
-- Run this in your Supabase SQL Editor

-- 1. CAMPAIGNS TABLE
-- Stores the core metadata for each head-to-head campaign.
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT NOT NULL, -- 'Economy', 'Governance', 'Foreign Policy', etc.
  issue_summary TEXT NOT NULL,
  problem_bullets TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'live', -- 'live', 'closed', 'topic_voting'
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ NOT NULL,
  result_analysis TEXT, -- AI generated summary of why the winner won
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LEADER APPROACHES TABLE
-- Stores policy points for Modi and Rahul in each campaign.
CREATE TABLE leader_approaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  leader_name TEXT NOT NULL, -- 'Narendra Modi', 'Rahul Gandhi'
  style TEXT NOT NULL, -- 'modi', 'rahul'
  column_title TEXT NOT NULL,
  bullets TEXT[] NOT NULL,
  is_winner BOOLEAN DEFAULT false
);

-- 3. VOTES TABLE
-- Tracks individual votes.
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL, -- Can be a hash of IP + User Agent for anonymous rate limiting
  selected_style TEXT NOT NULL, -- 'modi', 'rahul', 'own'
  own_solution TEXT, -- Optional text for the 'None/Own Solution' choice
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TOPIC VOTING ROUNDS
-- Manages the buffer period where users vote on the NEXT issue.
CREATE TABLE topic_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT DEFAULT 'active', -- 'active', 'finished'
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ NOT NULL,
  winning_topic_id UUID
);

-- 5. TOPIC OPTIONS
-- The candidate issues for the next round.
CREATE TABLE topic_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES topic_rounds(id) ON DELETE CASCADE,
  issue_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL
);

-- 6. TOPIC VOTES
-- Tracks votes for topics during the buffer phase.
CREATE TABLE topic_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES topic_options(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for speed
CREATE INDEX idx_campaign_status ON campaigns(status);
CREATE INDEX idx_votes_campaign ON votes(campaign_id);
CREATE INDEX idx_topic_votes_topic ON topic_votes(topic_id);
