import { supabase } from '../lib/supabase';

// ============================================================
// TYPES (aligned with Perplexity-created Supabase schema)
// ============================================================

export interface LeaderApproach {
  id: string;
  leader_name: string;
  display_position: number;
  policy_bullets: string[];    // JSONB in DB
  framing_type: string;
  is_winner: boolean;
}

export interface SocialCampaign {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  issue_category: string;       // was 'category'
  issue_summary: string;
  issue_bullets: string[];       // JSONB in DB (was 'problem_bullets')
  status: 'draft' | 'live' | 'archived' | 'topic_voting';
  start_time: string;
  end_time: string;
  result_published_at?: string;
  winner_leader?: string;
  winner_vote_percentage?: number;
  total_votes?: number;
  approaches?: LeaderApproach[];
  vote_percentages?: Record<string, number>;
  // New v2 columns
  confidence_score?: number;
  region?: string;
  source_metadata?: any;
}

export interface TopicOption {
  id: string;
  round_id: string;
  issue_name: string;
  one_line_summary: string;     // was 'summary'
  category: string;
  votes_count?: number;
}

export interface TopicRound {
  id: string;
  status: 'active' | 'closed';  // was 'finished'
  start_time: string;
  end_time: string;
  winning_topic?: string;
  options: TopicOption[];
}

// ============================================================
// SERVICE
// ============================================================

class CampaignService {
  /**
   * Fetches the current active experience (Live Campaign OR Topic Round)
   */
  async getActiveExperience(): Promise<{ 
    type: 'campaign' | 'topic_round' | 'buffer';
    data: any 
  }> {
    if (!supabase) return { type: 'buffer', data: null };

    // 1. Check for Live Campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*, leader_approaches(*)')
      .eq('status', 'live')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (campaign) {
      return { 
        type: 'campaign', 
        data: {
          ...campaign,
          approaches: campaign.leader_approaches
        } 
      };
    }

    // 2. Check for Active Topic Voting Round
    const { data: round } = await supabase
      .from('topic_vote_rounds')            // Perplexity table name
      .select('*, topic_options(*)')
      .eq('status', 'active')
      .single();

    if (round) {
      return { 
        type: 'topic_round', 
        data: {
          ...round,
          options: round.topic_options
        } 
      };
    }

    return { type: 'buffer', data: null };
  }

  async getCampaignBySlug(slug: string): Promise<SocialCampaign | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('campaigns')
      .select('*, leader_approaches(*)')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;

    // Fetch vote totals if archived (was 'closed')
    if (data.status === 'archived') {
        const { data: votes } = await supabase
            .from('votes')
            .select('selected_style')
            .eq('campaign_id', data.id);
        
        if (votes) {
            const counts = votes.reduce((acc: any, v: any) => {
                const opt = v.selected_style;
                acc[opt] = (acc[opt] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            const total = votes.length;
            data.total_votes = total;
            data.vote_percentages = {};
            for (const key of Object.keys(counts)) {
                data.vote_percentages[key] = total ? Math.round(counts[key] / total * 100) : 0;
            }
        }
    }

    return {
      ...data,
      approaches: data.leader_approaches
    };
  }

  async getArchive(): Promise<SocialCampaign[]> {
    if (!supabase) return [];

    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'archived')              // was 'closed'
      .order('end_time', { ascending: false });

    return data || [];
  }

  async castVote(campaignId: string, selectedStyle: string, ownSolution?: string) {
    if (!supabase) return { success: false, errorMsg: 'Supabase not connected' };

    // Generate a simple session ID for anonymous voting
    const sessionId = this.getOrCreateSessionId();

    const { error } = await supabase
      .from('votes')
      .insert({
        campaign_id: campaignId,
        selected_style: selectedStyle,
        voter_id: sessionId,
        own_solution: ownSolution || null
      });

    if (error) {
      console.error('Failed to cast vote in Supabase:', error);
      return { success: false, errorMsg: error.message || 'Unknown database error' };
    }

    return { success: true };
  }

  async voteForTopic(topicId: string) {
    if (!supabase) return false;

    // For topic votes, we increment the votes_count
    // Since topic_options has votes_count, we use RPC or direct update
    const { error } = await supabase.rpc('increment_topic_votes', { topic_id_input: topicId });
    
    // Fallback: if RPC doesn't exist, try direct
    if (error) {
      const { error: fallbackError } = await supabase
        .from('topic_options')
        .update({ votes_count: supabase.rpc ? undefined : 1 })
        .eq('id', topicId);
    }

    return !error;
  }

  /**
   * Get or create a persistent session ID for anonymous voting
   */
  private getOrCreateSessionId(): string {
    const key = 'rajneeti_session_id';
    let sessionId = localStorage.getItem(key);
    if (!sessionId) {
      sessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(key, sessionId);
    }
    return sessionId;
  }
}

export const dynamicCampaignService = new CampaignService();
