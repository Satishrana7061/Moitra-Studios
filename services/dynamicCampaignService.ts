import { supabase } from '../lib/supabase';

export interface LeaderApproach {
  id: string;
  leader_name: string;
  style: 'modi' | 'rahul';
  column_title: string;
  bullets: string[];
  is_winner: boolean;
}

export interface SocialCampaign {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  issue_summary: string;
  problem_bullets: string[];
  status: 'live' | 'closed' | 'topic_voting';
  start_time: string;
  end_time: string;
  result_analysis: string;
  approaches?: LeaderApproach[];
  total_votes?: number;
  winner_style?: string;
  vote_percentages?: Record<string, number>;
}

export interface TopicOption {
  id: string;
  round_id: string;
  issue_name: string;
  summary: string;
  category: string;
  votes_count?: number;
}

export interface TopicRound {
  id: string;
  status: 'active' | 'finished';
  start_time: string;
  end_time: string;
  options: TopicOption[];
}

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
    const { data: campaign, error: cError } = await supabase
      .from('campaigns')
      .select('*, leader_approaches(*)')
      .eq('status', 'live')
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

    // 2. Check for Topic Voting Round
    const { data: round, error: tError } = await supabase
      .from('topic_rounds')
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

    // Fetch vote totals if closed
    if (data.status === 'closed') {
        const { data: votes } = await supabase
            .from('votes')
            .select('selected_style')
            .eq('campaign_id', data.id);
        
        if (votes) {
            const counts = votes.reduce((acc: any, v: any) => {
                acc[v.selected_style] = (acc[v.selected_style] || 0) + 1;
                return acc;
            }, {});
            
            const total = votes.length;
            data.total_votes = total;
            data.vote_percentages = {
                modi: total ? Math.round((counts.modi || 0) / total * 100) : 0,
                rahul: total ? Math.round((counts.rahul || 0) / total * 100) : 0,
                own: total ? Math.round((counts.own || 0) / total * 100) : 0,
            };
        }
    }

    return {
      ...data,
      approaches: data.leader_approaches
    };
  }

  async getArchive(): Promise<SocialCampaign[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'closed')
      .order('end_time', { ascending: false });

    return data || [];
  }

  async castVote(campaignId: string, style: string, ownSolution?: string) {
    if (!supabase) return false;

    const { error } = await supabase
      .from('votes')
      .insert({
        campaign_id: campaignId,
        selected_style: style,
        own_solution: ownSolution,
        voter_id: 'anonymous' // In real use, generate a session ID or fingerprint
      });

    return !error;
  }

  async voteForTopic(topicId: string) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('topic_votes')
        .insert({
            topic_id: topicId,
            voter_id: 'anonymous'
        });
    
    return !error;
  }
}

export const dynamicCampaignService = new CampaignService();
