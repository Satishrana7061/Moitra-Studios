export interface LeaderApproach {
    id: string;
    leaderName: string;
    columnTitle: string;
    bullets: string[];
    style: 'modi' | 'rahul';
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
        title: "Oil Price Shock: Modi vs Rahul on India's Energy Future",
        metaDescription: "Global oil prices have spiked due to international conflicts. Compare how the two leaders would handle the energy crisis in India.",
        problemBullets: [
            "Global crude oil prices jumped significantly after escalating conflicts in oil-producing regions.",
            "India imports over 80% of its crude oil, making domestic petrol and LPG prices highly vulnerable to international swings.",
            "Rising fuel costs are increasing transportation expenses, which in turn drives up inflation on daily groceries and household budgets in both cities and villages."
        ],
        startDate: "2026-04-01T00:00:00.000Z",
        endDate: "2026-04-10T23:59:59.000Z",
        status: 'closed',
        results: {
            winnerStyle: 'modi',
            votePercentages: { modi: 62, rahul: 32, own: 6 },
            analysis: "Users strongly favoured the Modi-style diplomatic and strategic approach. Leveraging multi-aligned energy partnerships to secure discounted crude—while gradually shifting toward renewable self-sufficiency—resonated more than Rahul's proposed price caps, which users felt risked fiscal imbalance."
        },
        approaches: [
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
        startDate: "2026-03-15T00:00:00.000Z",
        endDate: "2026-03-25T23:59:59.000Z",
        status: 'closed',
        results: {
            winnerStyle: 'modi',
            votePercentages: { modi: 58, rahul: 36, own: 6 },
            analysis: "Users heavily preferred the Modi-style approach of embracing the technology and trying to upskill the workforce to become 'AI creators' rather than trying to ban or heavily regulate the technology. Rahul's social safety net approach gained traction among those worried about immediate job losses and corporate exploitation."
        },
        approaches: [
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
    },
    {
        id: "water-crisis-india-2026",
        title: "India's Water Crisis: Who Has the Better Plan?",
        metaDescription: "With groundwater depletion accelerating across major states, compare how the two leaders would tackle India's looming water emergency.",
        problemBullets: [
            "Over 600 million Indians face extreme water stress. Groundwater tables in Punjab, Rajasthan, and Tamil Nadu are dropping at alarming rates.",
            "Agriculture consumes 80% of India's freshwater, and unsustainable irrigation practices are draining aquifers faster than nature can replenish them.",
            "Urban water wars are escalating — Bengaluru, Chennai, and Delhi regularly face supply shortages, hitting the urban poor hardest."
        ],
        startDate: "2026-03-01T00:00:00.000Z",
        endDate: "2026-03-12T23:59:59.000Z",
        status: 'closed',
        results: {
            winnerStyle: 'modi',
            votePercentages: { modi: 54, rahul: 40, own: 6 },
            analysis: "The large-infrastructure approach — river-linking and Jal Jeevan Mission expansion — edged ahead, with voters favouring tangible, visible projects. However, Rahul's community-driven decentralization model earned strong support from Southern and North-Eastern state users who felt centralized mega-projects often bypass local needs."
        },
        approaches: [
            {
                id: "approach-modi",
                leaderName: "Narendra Modi",
                columnTitle: "Narendra Modi (Current PM)",
                style: "modi",
                bullets: [
                    "Expands Jal Jeevan Mission to guarantee piped water to every rural household by 2028, backed by massive central allocation.",
                    "Pushes the ambitious inter-linking of rivers project to redistribute surplus water from flood-prone regions to drought-prone ones.",
                    "Deploys satellite-based monitoring (ISRO-powered dashboards) to track groundwater levels and enforce extraction limits."
                ]
            },
            {
                id: "approach-rahul",
                leaderName: "Rahul Gandhi",
                columnTitle: "If Rahul Gandhi were PM",
                style: "rahul",
                bullets: [
                    "Proposes a 'Right to Water' constitutional amendment, making safe drinking water a legally enforceable fundamental right.",
                    "Advocates decentralized community-managed watershed programs over mega-infrastructure, empowering gram panchayats to manage local water bodies.",
                    "Demands a ban on corporate groundwater extraction in over-exploited zones, targeting bottled water and beverage companies."
                ]
            }
        ]
    },
    {
        id: "delimitation-reservation-2026",
        title: "Delimitation vs Women's Reservation: What Should Come First?",
        metaDescription: "With the Delimitation Commission and Women's Reservation Bill both pending, compare how India's leaders prioritize democratic reforms.",
        problemBullets: [
            "The Delimitation Commission is set to redraw Lok Sabha constituencies based on updated census data, which could shift political power from southern to northern states.",
            "The Women's Reservation Bill, passed in 2023, reserves 33% of Lok Sabha and state assembly seats for women — but implementation hinges on delimitation completing first.",
            "Southern states fear losing parliamentary seats despite higher development metrics, while northern states argue representation should match population."
        ],
        startDate: "2026-03-20T00:00:00.000Z",
        endDate: "2026-04-02T23:59:59.000Z",
        status: 'closed',
        results: {
            winnerStyle: 'rahul',
            votePercentages: { modi: 44, rahul: 48, own: 8 },
            analysis: "In a rare close contest, the Rahul-style approach narrowly won. Users — particularly from Southern states — resonated with the argument that Women's Reservation should not be held hostage to a politically contentious delimitation process. The 'own solution' vote was unusually high at 8%, reflecting strong demand for a middle-ground approach that decouples the two issues."
        },
        approaches: [
            {
                id: "approach-modi",
                leaderName: "Narendra Modi",
                columnTitle: "Narendra Modi (Current PM)",
                style: "modi",
                bullets: [
                    "Links Women's Reservation implementation to completion of delimitation, arguing both reforms should happen together for constitutional consistency.",
                    "Pushes for a fast-tracked census and delimitation process to settle the seat redistribution question before 2029 elections.",
                    "Proposes a development-weighted formula where states with better governance metrics retain proportional representation."
                ]
            },
            {
                id: "approach-rahul",
                leaderName: "Rahul Gandhi",
                columnTitle: "If Rahul Gandhi were PM",
                style: "rahul",
                bullets: [
                    "Demands immediate implementation of Women's Reservation without waiting for delimitation, arguing women have waited long enough.",
                    "Opposes any delimitation formula that punishes southern states for successful population control and higher development.",
                    "Proposes a federal negotiation model where all state chief ministers agree on a fair delimitation formula before it proceeds."
                ]
            }
        ]
    }
];
