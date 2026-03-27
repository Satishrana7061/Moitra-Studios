-- RUN THIS IN THE SUPABASE SQL EDITOR

-- 1. Archive the old "Delhi Air Pollution" campaign and set fake results
UPDATE campaigns
SET 
    status = 'archived',
    winner_leader = 'modi',
    winner_vote_percentage = 54,
    total_votes = 2847,
    result_published_at = NOW(),
    vote_percentages = '{"modi": 54, "rahul": 38, "own": 8}'::jsonb,
    result_analysis = 'The Modi-style approach won decisively with 54% of votes. Voters preferred the pragmatic infrastructure and enforcement angle over the rights-based welfare approach. The 8% who submitted their own solutions largely proposed hybrid approaches combining industrial regulation with direct healthcare support for affected communities.'
WHERE status = 'live';

-- 2. Insert the new 5-State Elections 2026 campaign
WITH new_campaign AS (
    INSERT INTO campaigns (
        slug, title, subtitle, issue_category, issue_summary, issue_bullets, 
        status, start_time, end_time, region, confidence_score
    ) VALUES (
        '5-state-elections-2026',
        '5-State Elections 2026: Battle for India''s Political Heartland',
        'As India votes across 5 states, how should the Election Commission ensure free and fair elections in the age of deepfakes and digital manipulation?',
        'Elections & Democracy',
        'India is in the midst of crucial assembly elections across 5 states, with the Election Commission of India (ECI) facing unprecedented challenges. From allegations of EVM tampering to the rapid spread of AI-generated deepfakes targeting candidates, the integrity of the democratic process is under intense scrutiny. Both ruling and opposition parties have raised concerns about the level playing field.

The stakes are enormous — these state elections are widely seen as a referendum on governance, unemployment, and inflation. With voter turnout patterns shifting and social media becoming the primary battleground, the question is: how should India''s election machinery evolve to protect democracy while keeping elections accessible to 900 million eligible voters?',
        ARRAY[
            '5 state assemblies going to polls simultaneously, testing the ECI''s logistical capacity with over 200 million voters.',
            'AI-generated deepfake videos of candidates have gone viral, with the ECI struggling to issue takedown orders fast enough.',
            'Opposition parties allege unequal enforcement of the Model Code of Conduct, while the ruling party accuses rivals of spreading misinformation.',
            'Voter turnout among urban youth (18-25) has dropped by 8% compared to previous elections, raising concerns about democratic disengagement.'
        ],
        'live',
        NOW(),
        NOW() + INTERVAL '3 days',
        'national',
        92
    ) RETURNING id
)
-- 3. Insert the Leader Approaches for the new campaign
INSERT INTO leader_approaches (
    campaign_id, leader_name, style, display_position, framing_type, is_winner, policy_bullets
)
SELECT 
    id, 'Narendra Modi', 'modi', 1, 'governance', false, 
    ARRAY[
        'Backs the ECI''s current framework, emphasizing India''s track record of conducting the world''s largest democratic exercise successfully.',
        'Proposes a ''Digital Shield'' initiative — a real-time AI monitoring system to detect and flag deepfakes within 30 minutes of upload on social platforms.',
        'Pushes for simultaneous elections (One Nation, One Election) to reduce poll fatigue, save costs, and minimize governance disruption across states.',
        'Advocates for stricter social media regulations during election periods, requiring platforms to pre-certify political advertisements.'
    ]
FROM new_campaign
UNION ALL
SELECT 
    id, 'Rahul Gandhi', 'rahul', 2, 'rights', false, 
    ARRAY[
        'Demands complete autonomy for the Election Commission with a transparent appointment process — no government influence on commissioner selection.',
        'Proposes returning to paper ballot verification (VVPAT) for 100% of votes, not just a sample, to restore public confidence in EVMs.',
        'Calls for a ''Fair Media Act'' that mandates equal airtime for all registered parties on news channels during election season.',
        'Advocates for lowering the voting age to 16 and making Election Day a national holiday to boost youth participation and turnout.'
    ]
FROM new_campaign;
