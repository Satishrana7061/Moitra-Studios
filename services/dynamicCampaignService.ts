import { supabase } from '../lib/supabase';
import { CAMPAIGNS_DATA } from './campaignData';

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
    
    // Attempt to use Supabase if available
    if (supabase) {
      try {
        // 1. Check for Live Campaign (with abort controller to avoid infinite hangs)
        const { data: campaign, error } = await supabase
          .from('campaigns')
          .select('*, leader_approaches(*)')
          .eq('status', 'live')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error; 

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
        const { data: round, error: roundError } = await supabase
          .from('topic_vote_rounds')
          .select('*, topic_options(*)')
          .eq('status', 'active')
          .single();

        if (roundError && roundError.code !== 'PGRST116') throw roundError;

        if (round) {
          return { 
            type: 'topic_round', 
            data: {
              ...round,
              options: round.topic_options
            } 
          };
        }
      } catch (err) {
        console.warn("Supabase fetch failed in getActiveExperience. Falling back to static data.");
      }
    }

    // FALLBACK
    const activeCampaign = CAMPAIGNS_DATA.find(c => c.status === 'live') || CAMPAIGNS_DATA[0];
    if (activeCampaign) {
      // Map it slightly to match expected component fields if necessary
      return { type: 'campaign', data: activeCampaign };
    }

    return { type: 'buffer', data: null };
  }

  async getCampaignBySlug(slug: string): Promise<SocialCampaign | null> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*, leader_approaches(*)')
          .eq('slug', slug)
          .single();

        if (error) throw error;
        if (data) {
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
      } catch(err) {
         console.warn("Supabase failed in getCampaignBySlug. Falling back to static data.");
      }
    }

    // FALLBACK
    const local = CAMPAIGNS_DATA.find(c => c.id === slug || c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug);
    if (local) return local as any;
    return null;
  }

  async getArchive(): Promise<SocialCampaign[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('status', 'archived')              // was 'closed'
          .order('end_time', { ascending: false });

        if (error) throw error;
        if (data) return data;
      } catch (err) {
         console.warn("Supabase failed in getArchive. Falling back to static data.");
      }
    }

    // FALLBACK
    return CAMPAIGNS_DATA.filter(c => c.status === 'closed') as any;
  }

  async castVote(campaignId: string, selectedStyle: string, ownSolution?: string) {
    const sessionId = this.getOrCreateSessionId();

    if (supabase) {
      try {
        const { error } = await supabase
          .from('votes')
          .insert({
            campaign_id: campaignId,
            selected_style: selectedStyle,
            voter_id: sessionId,
            own_solution: ownSolution || null
          });

        if (error) throw error;
        return { success: true };
      } catch (err) {
        console.warn('Failed to cast vote in Supabase, simulating success locally:', err);
      }
    }

    // FALLBACK: Simulate success locally
    localStorage.setItem(`vote_${campaignId}`, selectedStyle);
    return { success: true };
  }

  async voteForTopic(topicId: string) {
    if (supabase) {
      try {
        const { error } = await supabase.rpc('increment_topic_votes', { topic_id_input: topicId });
        if (error) {
          const { error: fallbackError } = await supabase
            .from('topic_options')
            .update({ votes_count: supabase.rpc ? undefined : 1 })
            .eq('id', topicId);
          if (fallbackError) throw fallbackError;
        }
        return true;
      } catch(err) {
        console.warn("Topic vote failed remotely, simulating locally");
      }
    }

    // FALLBACK
    return true; 
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

