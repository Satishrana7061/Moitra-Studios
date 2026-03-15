export interface LeaderApproach {
    id: string;
    leaderName: string;
    columnTitle: string;
    bullets: string[];
    style: 'nehru' | 'modi' | 'rahul';
}

export interface SocialCampaign {
    id: string;
    title: string;
    metaDescription: string;
    problemBullets: string[];
    approaches: LeaderApproach[];
    startDate: string;
    endDate: string;
    status: 'live' | 'closed';
    results?: {
        winnerStyle: string;
        votePercentages: Record<string, number>;
        analysis: string;
    };
}

export const CAMPAIGNS_DATA: SocialCampaign[] = [
    {
        id: "oil-price-shock-2026",
        title: "Oil Price Shock: Nehru vs Modi vs Rahul on India’s Energy Future",
        metaDescription: "Global oil prices have spiked due to international conflicts. Compare how three distinct leaders would handle the energy crisis in India.",
        problemBullets: [
            "Global crude oil prices jumped significantly after escalating conflicts in oil-producing regions.",
            "India imports over 80% of its crude oil, making domestic petrol and LPG prices highly vulnerable to international swings.",
            "Rising fuel costs are increasing transportation expenses, which in turn drives up inflation on daily groceries and household budgets in both cities and villages."
        ],
        startDate: new Date().toISOString(), // Today
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        status: 'live',
        approaches: [
            {
                id: "approach-nehru",
                leaderName: "Jawaharlal Nehru",
                columnTitle: "If Jawaharlal Nehru were PM today",
                style: "nehru",
                bullets: [
                    "Would likely advocate for massive state-led investment in nationalized energy infrastructure to ensure self-reliance.",
                    "Might impose strict price controls and rationing to shield the poorest citizens from immediate market shocks.",
                    "Focus on long-term Five-Year Planning to shift toward industrial capacity building rather than quick market fixes.",
                    "Historically favored non-aligned diplomacy to negotiate state-to-state oil deals outside of major bloc conflicts."
                ]
            },
            {
                id: "approach-modi",
                leaderName: "Narendra Modi (Current PM)",
                columnTitle: "Narendra Modi (Current PM)",
                style: "modi",
                bullets: [
                    "Utilizes multi-aligned diplomacy to purchase discounted crude oil from alternative global suppliers despite international pressure.",
                    "Pushes the burden partially to consumers while cutting excise duties strategically ahead of key state elections.",
                    "Accelerates the push for ethanol blending and renewable energy (solar missions) to reduce long-term import dependence.",
                    "Direct benefit transfers (DBT) targeted at specific demographics, like Ujjwala beneficiaries, to offset LPG price hikes without universal subsidies."
                ]
            },
            {
                id: "approach-rahul",
                leaderName: "Rahul Gandhi",
                columnTitle: "If Rahul Gandhi were PM in the near future",
                style: "rahul",
                bullets: [
                    "Would likely propose an immediate national cap on petrol and diesel prices to provide immediate relief to middle and lower-class consumers.",
                    "Focuses rhetoric on taxing large corporate refiners (accusing them of profiteering) to subsidize public fuel costs.",
                    "Might promise a universal basic income or direct cash transfers (NYAY) to help poor families absorb the cost of inflation.",
                    "Advocates for decentralizing energy policy, giving states more power to waive VAT on fuels."
                ]
            }
        ]
    },
    {
        id: "ai-job-automation-2026",
        title: "The AI Automation Crisis: How Should India Protect Jobs?",
        metaDescription: "As Artificial Intelligence threatens IT and BPO sectors, compare how different political ideologies address mass automation.",
        problemBullets: [
            "Generative AI is rapidly automating entry-level coding, customer support, and administrative roles, which form the backbone of India's IT service exports.",
            "Thousands of fresh graduates face delayed onboarding or rescinded offers as companies restructure toward AI-driven efficiency.",
            "India's demographic dividend requires creating millions of jobs annually, a goal fundamentally challenged by software automation."
        ],
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'closed',
        results: {
            winnerStyle: 'modi',
            votePercentages: {
                 nehru: 15,
                 modi: 52,
                 rahul: 28,
                 own: 5
            },
            analysis: "Users heavily preferred the Modi-style approach of embracing the technology and trying to upskill the workforce to become 'AI creators' rather than trying to ban or heavily regulate the technology. Rahul's social safety net approach gained traction among those worried about immediate job losses, while Nehru's state-planning approach was seen as less viable for modern tech."
        },
        approaches: [
            {
                id: "approach-nehru",
                leaderName: "Jawaharlal Nehru",
                columnTitle: "If Jawaharlal Nehru were PM today",
                style: "nehru",
                bullets: [
                    "Would establish top-tier public institutions (like early IITs) specifically dedicated to AI research and development.",
                    "Might heavily regulate AI adoption in critical sectors to protect manual labor and existing administrative jobs.",
                    "Focus on building a sovereign, state-owned AI infrastructure to prevent data colonialism."
                ]
            },
            {
                id: "approach-modi",
                leaderName: "Narendra Modi",
                columnTitle: "Narendra Modi (Current PM)",
                style: "modi",
                bullets: [
                    "Promotes initiatives like 'Digital India Bhashini' and 'AI for All' to position India as a global AI use-case laboratory.",
                    "Encourages private sector innovation with minimal regulation, opting for 'soft-touch' guidelines to attract foreign AI investment.",
                    "Focuses on rapid, mass upskilling programs (Skill India) to transition workers into AI-assisted roles rather than protecting old jobs."
                ]
            },
            {
                id: "approach-rahul",
                leaderName: "Rahul Gandhi",
                columnTitle: "If Rahul Gandhi were PM",
                style: "rahul",
                bullets: [
                    "Would likely focus on the immediate human cost, demanding 'Automation Taxes' on tech giants displacing workers.",
                    "Promises strong labor union protections for IT workers and gig workers affected by algorithmic management.",
                    "Advocates for comprehensive social security nets and guaranteed employment schemes for urban youth facing AI displacement."
                ]
            }
        ]
    }
];
