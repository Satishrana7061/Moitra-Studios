export interface StateData {
    // Cinematic Header
    strategicTitle: string;

    // Strategic Summary
    role: string;
    difficulty: 1 | 2 | 3 | 4 | 5;
    impact: string;

    // Power Meters (0-100)
    powerMeters: {
        neighborhoodMood: number;
        mediaInfluence: number;
        alliancePower: number;
    };

    // Narrative
    flavorText: string;

    // Moves
    strategicMoves: string[];

    // Visuals
    avatar?: string; // Keeping avatar for now as it adds flavor
}

export const STATE_INTEL: Record<string, StateData> = {
    "Rajasthan": {
        strategicTitle: "The Desert Fortress",
        role: "Heritage Stronghold",
        difficulty: 3,
        impact: "Regional Pillar",
        powerMeters: { neighborhoodMood: 65, mediaInfluence: 70, alliancePower: 85 },
        flavorText: "Tradition runs deep here. Win the clans, and you win the kingdom.",
        strategicMoves: ["Unite Heritage Factions", "deploy Desert Logistics", "Leverage Cultural Symbolism"],
        avatar: "Avaters/RAJNATH SINGH.png"
    },
    "Uttar Pradesh": {
        strategicTitle: "Kingmaker's Throne",
        role: "National Decider",
        difficulty: 5,
        impact: "Game-Ending",
        powerMeters: { neighborhoodMood: 40, mediaInfluence: 95, alliancePower: 90 },
        flavorText: "The path to Delhi lies through Lucknow. Total dominance.",
        strategicMoves: ["Consolidate Caste Blocs", "Launch Mega-Rallies", "Dominating Media Blitz"],
        avatar: "Avaters/YOGI ADITYANATH.png"
    },
    "Maharashtra": {
        strategicTitle: "Treasury of Power",
        role: "Financial Engine",
        difficulty: 4,
        impact: "Economic Hub",
        powerMeters: { neighborhoodMood: 55, mediaInfluence: 80, alliancePower: 60 },
        flavorText: "Money is power. Control the capital flow to starve your rivals.",
        strategicMoves: ["Secure Corp. Funding", "Urban Youth Appeal", "Broker Trade Union Deals"],
        avatar: "Avaters/UDDAV THACKREAY.png"
    },
    "West Bengal": {
        strategicTitle: "Redoubt of Rebels",
        role: "Ideological Core",
        difficulty: 5,
        impact: "Narrative Shifter",
        powerMeters: { neighborhoodMood: 80, mediaInfluence: 75, alliancePower: 40 },
        flavorText: "A fortress of fiery rhetoric. Only the boldest narratives survive the streets.",
        strategicMoves: ["Grassroots Mobilization", "Counter-Intel Ops", "Cultural Vanguard Push"],
        avatar: "Avaters/MAMTA BENRJEE.png"
    },
    "Gujarat": {
        strategicTitle: "Industrial Heart",
        role: "Commerce Hub",
        difficulty: 2,
        impact: "Logistics Key",
        powerMeters: { neighborhoodMood: 85, mediaInfluence: 60, alliancePower: 95 },
        flavorText: "Efficiency is the currency. Keep the factories running to secure the base.",
        strategicMoves: ["Infrastructure Pacts", "Trade Guild Alliance", "Stability Propaganda"],
        avatar: "Avaters/NARENDRA MODI (PM).png"
    },
    "Tamil Nadu": {
        strategicTitle: "Dravidian Bastion",
        role: "Cultural Fortress",
        difficulty: 4,
        impact: "Southern Anchor",
        powerMeters: { neighborhoodMood: 90, mediaInfluence: 65, alliancePower: 50 },
        flavorText: "Identity is power. Speak the language of the people or be silenced.",
        strategicMoves: ["Cinema Star Endorsement", "Language Pride Rally", "Federal Front Coalition"],
        avatar: "Avaters/M K STALIN.png"
    },
    "Tamilnadu": { // Alias
        strategicTitle: "Dravidian",
        role: "Cultural Fortress",
        difficulty: 4,
        impact: "Southern Anchor",
        powerMeters: { neighborhoodMood: 90, mediaInfluence: 65, alliancePower: 50 },
        flavorText: "Identity is power. Speak the language of the people or be silenced.",
        strategicMoves: ["Cinema Star Endorsement", "Language Pride Rally", "Federal Front Coalition"],
        avatar: "Avaters/M K STALIN.png"
    },
    "Karnataka": {
        strategicTitle: "The Silicon State",
        role: "Tech Nexus",
        difficulty: 3,
        impact: "Innovation Hub",
        powerMeters: { neighborhoodMood: 60, mediaInfluence: 85, alliancePower: 55 },
        flavorText: "Future-forward politics. Win the digital generation to secure the grid.",
        strategicMoves: ["Digital Campaign Surge", "Start-up Incubation", "Urban-Rural Bridge"],
        avatar: "Avaters/RAHUL GANDHI.png"
    },
    "Delhi": {
        strategicTitle: "The Seat of Command",
        role: "Media Center",
        difficulty: 4,
        impact: "High Visibility",
        powerMeters: { neighborhoodMood: 45, mediaInfluence: 100, alliancePower: 30 },
        flavorText: "The eyes of the world are watching. Every move here echoes historically.",
        strategicMoves: ["National Press Conf.", "Bureaucracy Override", "Protest Management"],
        avatar: "Avaters/ARVIND KEJRIWAL.png"
    },
    "Punjab": {
        strategicTitle: "The Granary Guard",
        role: "Agrarian Core",
        difficulty: 3,
        impact: "Resilience Test",
        powerMeters: { neighborhoodMood: 75, mediaInfluence: 50, alliancePower: 45 },
        flavorText: "Roots run deep in the soil. Respect the land to harvest the votes.",
        strategicMoves: ["Farmer Union Pact", "Border Security Narrative", "Resource Subsidy"],
        avatar: "Avaters/BHAGWANT MANN.png"
    },
    "Kerala": {
        strategicTitle: "Intellectual Coast",
        role: "Ideology Hub",
        difficulty: 4,
        impact: "Policy Lab",
        powerMeters: { neighborhoodMood: 85, mediaInfluence: 70, alliancePower: 40 },
        flavorText: "Minds are sharp here. Nuance and policy win over brute force.",
        strategicMoves: ["Think-Tank Summit", "Social Index Campaign", "Cross-Party Debate"],
        avatar: "Avaters/PINARAYI VIJAYAN.png"
    },
    "Bihar": {
        strategicTitle: "Political Crucible",
        role: "Caste Matrix",
        difficulty: 5,
        impact: "Swing State",
        powerMeters: { neighborhoodMood: 50, mediaInfluence: 60, alliancePower: 95 },
        flavorText: "Chaos is a ladder. Navigate the shifting alliances to survive.",
        strategicMoves: ["Grand Coalition", "Social Justice Rally", "Grassroots Network"],
        avatar: "Avaters/NITISH KUMAR.png"
    },
    // Generic Fallback for others to ensure smooth gameplay (mapped to specific avatars where possible)
    "Madhya Pradesh": {
        strategicTitle: "The Central Pillar", role: "Swing Heartland", difficulty: 3, impact: "Stabilizer",
        powerMeters: { neighborhoodMood: 60, mediaInfluence: 55, alliancePower: 70 },
        flavorText: "Balance is key. Hold the center to stabilize the flanks.", strategicMoves: ["Tribal Outreach", "Central Rally", "Scheme Rollout"], avatar: "Avaters/AMIT SHAH.png"
    },
    "Andhra Pradesh": {
        strategicTitle: "The Coastal Power", role: "Alliance Key", difficulty: 3, impact: "Coalition Maker",
        powerMeters: { neighborhoodMood: 70, mediaInfluence: 65, alliancePower: 80 },
        flavorText: "Maritime wealth meets political cunning. A vital piece of the puzzle.", strategicMoves: ["Infra-Dev Promise", "Welfare Surge", "Regional Pact"], avatar: "Avaters/N. CHANDRABABU NAIDU.png"
    },
    "Telangana": {
        strategicTitle: "The Rising Plateau", role: "Modern Hub", difficulty: 3, impact: "Tech-Agri Mix",
        powerMeters: { neighborhoodMood: 65, mediaInfluence: 75, alliancePower: 50 },
        flavorText: "Old traditions meets new money. A complex code to crack.", strategicMoves: ["Digital Welfare", "Pride Campaign", "City-Village Link"], avatar: "Avaters/TEJASWI YADAV.png"
    },
    "Odisha": {
        strategicTitle: "The Steel State", role: "Resource Giants", difficulty: 3, impact: "Silent Power",
        powerMeters: { neighborhoodMood: 80, mediaInfluence: 40, alliancePower: 75 },
        flavorText: "Quiet strength endures. Consistency builds an unbreakable base.", strategicMoves: ["Disaster Relief Op", "Women's Self-Help", "Heritage Pride"], avatar: "Avaters/PRASHANT KISHOR.png"
    },
    "Jammu and Kashmir": {
        strategicTitle: "The Northern Crown", role: "Conflict Zone", difficulty: 5, impact: "Prestige",
        powerMeters: { neighborhoodMood: 30, mediaInfluence: 90, alliancePower: 40 },
        flavorText: "High risks, legendary rewards. Proving ground for true leaders.", strategicMoves: ["Peace Initiative", "Development Package", "Youth Engagement"], avatar: "Avaters/PRIYANKA GANDHI.png"
    },
    // Northeast States
    "Assam": {
        strategicTitle: "A Gateway to the East", role: "NE Sentinel", difficulty: 4, impact: "Regional Anchor",
        powerMeters: { neighborhoodMood: 70, mediaInfluence: 55, alliancePower: 65 },
        flavorText: "Control Assam to control the Seven Sisters. Win is difficult but not impossible.", strategicMoves: ["Tea Garden Outreach", "Border Security", "Flood Relief"], avatar: "Avaters/AMIT SHAH.png"
    },
    "Arunachal Pradesh": {
        strategicTitle: "The Rising Sun", role: "Border Guard", difficulty: 3, impact: "Strategic Frontier",
        powerMeters: { neighborhoodMood: 85, mediaInfluence: 35, alliancePower: 70 },
        flavorText: "First to greet the dawn. A peaceful yet strategic frontier.", strategicMoves: ["Tribal Welfare", "Infrastructure Push", "Cultural Preservation"], avatar: "Avaters/NIRMALA SITHARAMAN.png"
    },
    "Nagaland": {
        strategicTitle: "Land of the Nagas", role: "Peace Zone", difficulty: 4, impact: "Harmony Key",
        powerMeters: { neighborhoodMood: 60, mediaInfluence: 40, alliancePower: 55 },
        flavorText: "A delicate balance between tradition and integration lies here.", strategicMoves: ["Peace Accord", "Youth Employment", "Heritage Tourism"], avatar: "Avaters/RAJNATH SINGH.png"
    },
    "Manipur": {
        strategicTitle: "The Jewel of India", role: "Cultural Hub", difficulty: 5, impact: "Volatile Ground",
        powerMeters: { neighborhoodMood: 35, mediaInfluence: 80, alliancePower: 30 },
        flavorText: "Ethnic diversity demands masterful diplomacy. Play safely.", strategicMoves: ["Community Dialogue", "Sports Development", "Cultural Festival"], avatar: "Avaters/SMRITI IRANI.png"
    },
    "Mizoram": {
        strategicTitle: "The Peaceful Valley", role: "Model State", difficulty: 2, impact: "Low Priority",
        powerMeters: { neighborhoodMood: 90, mediaInfluence: 30, alliancePower: 60 },
        flavorText: "High literacy, high expectations. Policy over promises.", strategicMoves: ["Education Focus", "Environmental Push", "Border Trade"], avatar: "Avaters/AKHILESH YADAV.png"
    },
    "Tripura": {
        strategicTitle: "The Tripod State", role: "Swing Territory", difficulty: 3, impact: "Local Influence",
        powerMeters: { neighborhoodMood: 65, mediaInfluence: 45, alliancePower: 75 },
        flavorText: "Once red, now shifting. A test of ideological battles here is difficult.", strategicMoves: ["Welfare Schemes", "Youth Startup", "Cross-Border Trade"], avatar: "Avaters/MAYAWATI.png"
    },
    "Meghalaya": {
        strategicTitle: "The Abode of Clouds", role: "Tribal Heartland", difficulty: 3, impact: "Regional Voice",
        powerMeters: { neighborhoodMood: 75, mediaInfluence: 50, alliancePower: 55 },
        flavorText: "Matrilineal wisdom guides these hills. Tradition is the law.", strategicMoves: ["Mining Policy", "Eco-Tourism", "Matrilineal Heritage"], avatar: "Avaters/LALU PRASAD YADAV.png"
    },
    // Other Missing States
    "Haryana": {
        strategicTitle: "Wrestler's Arena", role: "Delhi's Backyard", difficulty: 4, impact: "NCR Control",
        powerMeters: { neighborhoodMood: 55, mediaInfluence: 70, alliancePower: 60 },
        flavorText: "Farm meets factory. The khap panchayats and 36 Biradaris hold the keys.", strategicMoves: ["Farmer Appeasement", "Industry Pact", "Sports Push"], avatar: "Avaters/YOGI ADITYANATH.png"
    },
    "Uttarakhand": {
        strategicTitle: "Devbhoomi", role: "Pilgrimage Hub", difficulty: 2, impact: "Spiritual Influence",
        powerMeters: { neighborhoodMood: 80, mediaInfluence: 45, alliancePower: 85 },
        flavorText: "The gods of heaven themselves vote here. Faith is politics.", strategicMoves: ["Temple Restoration", "Char Dham Infra", "Disaster Management"], avatar: "Avaters/NARENDRA MODI (PM).png"
    },
    "Himachal Pradesh": {
        strategicTitle: "Hill Fortress", role: "Mountain Bastion", difficulty: 3, impact: "Steady Ground",
        powerMeters: { neighborhoodMood: 75, mediaInfluence: 40, alliancePower: 65 },
        flavorText: "Apple orchards and army barracks. Silent but substantial.", strategicMoves: ["Horticulture Boost", "Tourism Drive", "Veterans Care"], avatar: "Avaters/RAHUL GANDHI.png"
    },
    "Goa": {
        strategicTitle: "The Coastal Gem", role: "Tourism Capital", difficulty: 2, impact: "Low Stakes",
        powerMeters: { neighborhoodMood: 85, mediaInfluence: 60, alliancePower: 40 },
        flavorText: "This state is small but strategic. Where defection is an art form.", strategicMoves: ["Casino Politics", "Beach Clean-up", "Heritage Preservation"], avatar: "Avaters/ARVIND KEJRIWAL.png"
    },
    "Chhattisgarh": {
        strategicTitle: "Red Corridor", role: "Resource Frontier", difficulty: 4, impact: "Security Zone",
        powerMeters: { neighborhoodMood: 45, mediaInfluence: 50, alliancePower: 70 },
        flavorText: "Minerals and Maoists. Development vs. disruption.", strategicMoves: ["Tribal Outreach", "Security Ops", "Forest Rights"], avatar: "Avaters/BHAGWANT MANN.png"
    },
    "Jharkhand": {
        strategicTitle: "The Steel Land", role: "Industrial Core", difficulty: 4, impact: "Resource Key",
        powerMeters: { neighborhoodMood: 50, mediaInfluence: 55, alliancePower: 80 },
        flavorText: "Iron is forged in coal fires in this state. Tribal vs. corporate.", strategicMoves: ["Mining Reform", "Tribal Welfare", "Industrial Pact"], avatar: "Avaters/TEJASWI YADAV.png"
    },
    "Sikkim": {
        strategicTitle: "The Hidden Kingdom", role: "Organic Paradise", difficulty: 1, impact: "Minimal",
        powerMeters: { neighborhoodMood: 95, mediaInfluence: 25, alliancePower: 50 },
        flavorText: "Organic success story. This state is small in size, big in happiness.", strategicMoves: ["Eco-Tourism", "Border Relations", "Youth Skill Development"], avatar: "Avaters/PINARAYI VIJAYAN.png"
    },
    "Ladakh": {
        strategicTitle: "The Cold Frontier", role: "Strategic Border", difficulty: 3, impact: "Defense Priority",
        powerMeters: { neighborhoodMood: 70, mediaInfluence: 65, alliancePower: 45 },
        flavorText: "Where glaciers meet geopolitics. High altitude, high stakes.", strategicMoves: ["Road Construction", "Border Village Dev", "Tourism Boom"], avatar: "Avaters/NITISH KUMAR.png"
    },
    "Andaman and Nicobar Islands": {
        strategicTitle: "The Maritime Sentinel", role: "Naval Outpost", difficulty: 2, impact: "Strategic Sea",
        powerMeters: { neighborhoodMood: 80, mediaInfluence: 30, alliancePower: 55 },
        flavorText: "Islands of strategic importance. Gateway to the East.", strategicMoves: ["Naval Expansion", "Eco-Tourism", "Tribal Protection"], avatar: "Avaters/PRASHANT KISHOR.png"
    }
};

export const DEFAULT_STATE_DATA: StateData = {
    strategicTitle: "Strategic Territory",
    role: "Frontier Zone",
    difficulty: 2,
    impact: "Tactical Asset",
    powerMeters: { neighborhoodMood: 50, mediaInfluence: 50, alliancePower: 50 },
    flavorText: "A region in flux. Seize the opportunity before your rivals do.",
    strategicMoves: ["Establish Presence", "Survey Opinion", "Local Recruitment"],
    avatar: "Avaters/MALLIKARJUN KHARGE.png"
};
