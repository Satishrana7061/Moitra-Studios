
export interface StateData {
    voters: string;
    rulingParty: string;
    gdp: string;
    monument: string;
    monumentName: string;
    flavorText: string;
    avatar?: string;
}

export const STATE_INTEL: Record<string, StateData> = {
    "Rajasthan": {
        voters: "53.0M",
        rulingParty: "BJP",
        gdp: "$180B",
        monument: "https://images.unsplash.com/photo-1590050877119-0df8fa2f59f6?q=80&w=400&auto=format&fit=crop",
        monumentName: "Hawa Mahal",
        flavorText: "The Gateway to the West. Control over the desert corridors is vital for logistics.",
        avatar: "Avaters/RAJNATH SINGH.png"
    },
    "Uttar Pradesh": {
        voters: "150.0M",
        rulingParty: "BJP",
        gdp: "$310B",
        monument: "https://images.unsplash.com/photo-1564507592333-c60657eaa0ae?q=80&w=400&auto=format&fit=crop",
        monumentName: "Taj Mahal",
        flavorText: "The ultimate prize. He who rules the Doab, rules the heart of the nation.",
        avatar: "Avaters/YOGI ADITYANATH.png"
    },
    "Maharashtra": {
        voters: "97.0M",
        rulingParty: "Mahayuti",
        gdp: "$430B",
        monument: "https://images.unsplash.com/photo-1566552881560-0be862a7c445?q=80&w=400&auto=format&fit=crop",
        monumentName: "Gateway of India",
        flavorText: "The economic engine. Financial dominance here fuels any nationwide campaign.",
        avatar: "Avaters/UDDAV THACKREAY.png"
    },
    "West Bengal": {
        voters: "75.0M",
        rulingParty: "AITC",
        gdp: "$210B",
        monument: "https://images.unsplash.com/photo-1623492701902-47dc207df5dc?q=80&w=400&auto=format&fit=crop",
        monumentName: "Victoria Memorial",
        flavorText: "The intellectual bastion. A hub of culture and political firebrand strategy.",
        avatar: "Avaters/MAMTA BENRJEE.png"
    },
    "Gujarat": {
        voters: "50.0M",
        rulingParty: "BJP",
        gdp: "$320B",
        monument: "https://images.unsplash.com/photo-1627376378417-640a43878772?q=80&w=400&auto=format&fit=crop",
        monumentName: "Statue of Unity",
        flavorText: "The manufacturing powerhouse. Industrial stability ensures long-term victory.",
        avatar: "Avaters/NARENDRA MODI (PM).png"
    },
    "Tamil Nadu": {
        voters: "63.0M",
        rulingParty: "DMK",
        gdp: "$310B",
        monument: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=400&auto=format&fit=crop",
        monumentName: "Shore Temple",
        flavorText: "The Southern stronghold. A distinct political identity that demands respect.",
        avatar: "Avaters/M K STALIN.png"
    },
    "Tamilnadu": {
        voters: "63.0M",
        rulingParty: "DMK",
        gdp: "$310B",
        monument: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=400&auto=format&fit=crop",
        monumentName: "Shore Temple",
        flavorText: "The Southern stronghold. A distinct political identity that demands respect.",
        avatar: "Avaters/M K STALIN.png"
    },
    "Karnataka": {
        voters: "54.0M",
        rulingParty: "INC",
        gdp: "$340B",
        monument: "https://images.unsplash.com/photo-1621251390466-9b519018e697?q=80&w=400&auto=format&fit=crop",
        monumentName: "Hampi Ruins",
        flavorText: "The technology hub. Control the Silicon Valley of Asia to lead the future.",
        avatar: "Avaters/RAHUL GANDHI.png"
    },
    "Delhi": {
        voters: "14.7M",
        rulingParty: "AAP",
        gdp: "$140B",
        monument: "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=400&auto=format&fit=crop",
        monumentName: "India Gate",
        flavorText: "The administrative nerve center. No strategy is complete without the Capital.",
        avatar: "Avaters/ARVIND KEJRIWAL.png"
    },
    "Punjab": {
        voters: "21.0M",
        rulingParty: "AAP",
        gdp: "$90B",
        monument: "https://images.unsplash.com/photo-1514222139-b576bb5ce073?q=80&w=400&auto=format&fit=crop",
        monumentName: "Golden Temple",
        flavorText: "The breadbasket. Agrarian stability is the bedrock of national security.",
        avatar: "Avaters/BHAGWANT MANN.png"
    },
    "Kerala": {
        voters: "27.0M",
        rulingParty: "LDF",
        gdp: "$150B",
        monument: "https://images.unsplash.com/photo-1626245199616-09a296564619?q=80&w=400&auto=format&fit=crop",
        monumentName: "Backwaters Resort",
        flavorText: "The literacy center. A highly aware electorate requires nuanced maneuvering.",
        avatar: "Avaters/PINARAYI VIJAYAN.png"
    },
    "Bihar": {
        voters: "77.0M",
        rulingParty: "NDA",
        gdp: "$110B",
        monument: "https://images.unsplash.com/photo-1594220516597-90c74900a653?q=80&w=400&auto=format&fit=crop",
        monumentName: "Mahabodhi Temple",
        flavorText: "The cradle of civilization. Historically, he who holds Pataliputra holds India.",
        avatar: "Avaters/NITISH KUMAR.png"
    },
    "Madhya Pradesh": {
        voters: "56.0M",
        rulingParty: "BJP",
        gdp: "$170B",
        monument: "https://images.unsplash.com/photo-1629815049071-7052a9f73562?q=80&w=400&auto=format&fit=crop",
        monumentName: "Khajuraho Spires",
        flavorText: "The heart of India. A central pivot that can tip the scales in any direction.",
        avatar: "Avaters/AMIT SHAH.png"
    },
    "Andhra Pradesh": {
        voters: "40.0M",
        rulingParty: "TDP+",
        gdp: "$190B",
        monument: "https://images.unsplash.com/photo-1600100397561-433ff484439b?q=80&w=400&auto=format&fit=crop",
        monumentName: "Tirumala Peak",
        flavorText: "The riverlands. Agricultural wealth and maritime access make this a vital zone.",
        avatar: "Avaters/N. CHANDRABABU NAIDU.png"
    },
    "Telangana": {
        voters: "31.0M",
        rulingParty: "INC",
        gdp: "$180B",
        monument: "https://images.unsplash.com/photo-1572431441273-0759f2a2a947?q=80&w=400&auto=format&fit=crop",
        monumentName: "Charminar Arch",
        flavorText: "The high-tech plateau. A modern hub that bridges the north-south divide.",
        avatar: "Avaters/TEJASWI YADAV.png"
    },
    "Odisha": {
        voters: "33.0M",
        rulingParty: "BJP",
        gdp: "$100B",
        monument: "https://images.unsplash.com/photo-1599427303058-f04cfaf0760f?q=80&w=400&auto=format&fit=crop",
        monumentName: "Konark Wheel",
        flavorText: "The resource belt. Mineral wealth and strategic ports are essential assets.",
        avatar: "Avaters/PRASHANT KISHOR.png"
    },
    "Assam": {
        voters: "24.0M",
        rulingParty: "BJP+",
        gdp: "$70B",
        monument: "https://images.unsplash.com/photo-1620579973212-0dae86a073f1?q=80&w=400&auto=format&fit=crop",
        monumentName: "One-Horned Rhino",
        flavorText: "The sentinel of the North East. Control the Seven Sisters from this point.",
        avatar: "Avaters/NIRMALA SITHARAMAN.png"
    },
    "Haryana": {
        voters: "20.0M",
        rulingParty: "BJP",
        gdp: "$135B",
        monument: "https://images.unsplash.com/photo-1593181629936-11c609b8db9b?q=80&w=400&auto=format&fit=crop",
        monumentName: "Kurukshetra Plains",
        flavorText: "The logistics hub. Proximity to the capital makes this a critical tactical zone.",
        avatar: "Avaters/SMRITI IRANI.png"
    },
    "Jammu and Kashmir": {
        voters: "9.0M",
        rulingParty: "JKNC+",
        gdp: "$25B",
        monument: "https://images.unsplash.com/photo-1566833925222-f54f71590dd4?q=80&w=400&auto=format&fit=crop",
        monumentName: "Dal Lake Shikara",
        flavorText: "The northern crown. Strategic and high-stakes maneuvering is required here.",
        avatar: "Avaters/PRIYANKA GANDHI.png"
    },
    "Uttarakhand": {
        voters: "8.3M",
        rulingParty: "BJP",
        gdp: "$40B",
        monument: "https://images.unsplash.com/photo-1616190411831-2965251648a1?q=80&w=400&auto=format&fit=crop",
        monumentName: "Kedarnath Peak",
        flavorText: "The abode of gods. Spiritual centers hold deep influence over the electorate.",
        avatar: "Avaters/AKHILESH YADAV.png"
    },
    "Himachal Pradesh": {
        voters: "5.5M",
        rulingParty: "INC",
        gdp: "$25B",
        monument: "https://images.unsplash.com/photo-1605142859862-978be7eba909?q=80&w=400&auto=format&fit=crop",
        monumentName: "Shimla Mall",
        flavorText: "The mountain fortress. High terrain advantage for defensive strategy.",
        avatar: "Avaters/MAYAWATI.png"
    },
    "Goa": {
        voters: "1.1M",
        rulingParty: "BJP",
        gdp: "$12B",
        monument: "https://images.unsplash.com/photo-1512341689857-198e7e2f3ca8?q=80&w=400&auto=format&fit=crop",
        monumentName: "Old Goa Church",
        flavorText: "The maritime leisure hub. Small in size, but high in cultural soft power.",
        avatar: "Avaters/PRASHANT KISHOR.png"
    },
    "Chhattisgarh": {
        voters: "20.0M",
        rulingParty: "BJP",
        gdp: "$60B",
        monument: "https://images.unsplash.com/photo-1629815049071-7052a9f73562?q=80&w=400&auto=format&fit=crop",
        monumentName: "Dantewada Shrine",
        flavorText: "The resource frontier. Mineral dominance is the key to industrial scaling.",
        avatar: "Avaters/SMRITI IRANI.png"
    },
    "Jharkhand": {
        voters: "25.0M",
        rulingParty: "JMM+",
        gdp: "$50B",
        monument: "https://images.unsplash.com/photo-1615822606543-91340a6b7201?q=80&w=400&auto=format&fit=crop",
        monumentName: "Jamshedpur Steel",
        flavorText: "The industrial bedrock. Iron and coal reserves fuel the national machine.",
        avatar: "Avaters/LALU PRASAD YADAV.png"
    },
    "Sikkim": {
        voters: "0.4M",
        rulingParty: "SKM",
        gdp: "$6B",
        monument: "https://images.unsplash.com/photo-1582236479702-f209368dcc34?q=80&w=400&auto=format&fit=crop",
        monumentName: "Kanchenjunga Range",
        flavorText: "The peak sentinel. Organic leadership and strategic altitude.",
        avatar: "Avaters/MALLIKARJUN KHARGE.png"
    },
    "Ladakh": {
        voters: "0.3M",
        rulingParty: "PRESIDENT",
        gdp: "$3B",
        monument: "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=400&auto=format&fit=crop",
        monumentName: "Pangong Lake",
        flavorText: "The high frontier. Strategic depth in the cold desert.",
        avatar: "Avaters/AMIT SHAH.png"
    },
    "Andaman & Nicobar": {
        voters: "0.4M",
        rulingParty: "PRESIDENT",
        gdp: "$4B",
        monument: "https://images.unsplash.com/photo-1626245199616-09a296564619?q=80&w=400&auto=format&fit=crop",
        monumentName: "Cellular Tower",
        flavorText: "The maritime sentinel. Crucial for dominance over the Bay of Bengal.",
        avatar: "Avaters/NARENDRA MODI (PM).png"
    },
    "Arunachal Pradesh": {
        voters: "1.0M",
        rulingParty: "BJP",
        gdp: "$4B",
        monument: "https://images.unsplash.com/photo-1626245199616-09a296564619?q=80&w=400&auto=format&fit=crop",
        monumentName: "Tawang Monastery",
        flavorText: "The land of the rising sun. A strategic frontier with deep spiritual roots.",
        avatar: "Avaters/NIRMALA SITHARAMAN.png"
    },
    "Manipur": {
        voters: "2.0M",
        rulingParty: "BJP",
        gdp: "$4B",
        monument: "https://images.unsplash.com/photo-1626245199616-09a296564619?q=80&w=400&auto=format&fit=crop",
        monumentName: "Kangla Fort",
        flavorText: "The jewel of India. Cultural richness meets strategic importance.",
        avatar: "Avaters/SMRITI IRANI.png"
    },
    "Meghalaya": {
        voters: "1.9M",
        rulingParty: "NPP",
        gdp: "$5B",
        monument: "https://images.unsplash.com/photo-1626245199616-09a296564619?q=80&w=400&auto=format&fit=crop",
        monumentName: "Living Root Bridge",
        flavorText: "The abode of clouds. Wettest place on Earth with unique tactical terrain.",
        avatar: "Avaters/PRIYANKA GANDHI.png"
    },
    "Mizoram": {
        voters: "0.8M",
        rulingParty: "ZPM",
        gdp: "$3B",
        monument: "https://images.unsplash.com/photo-1626245199616-09a296564619?q=80&w=400&auto=format&fit=crop",
        monumentName: "Vantawng Falls",
        flavorText: "High literacy and distinct culture. Every vote counts in the hills.",
        avatar: "Avaters/PRASHANT KISHOR.png"
    },
    "Nagaland": {
        voters: "1.3M",
        rulingParty: "NDPP",
        gdp: "$4B",
        monument: "https://images.unsplash.com/photo-1626245199616-09a296564619?q=80&w=400&auto=format&fit=crop",
        monumentName: "Kohima War Cemetery",
        flavorText: "The land of festivals. Strategic depth in the North Eastern corridor.",
        avatar: "Avaters/AMIT SHAH.png"
    },
    "Tripura": {
        voters: "2.5M",
        rulingParty: "BJP",
        gdp: "$7B",
        monument: "https://images.unsplash.com/photo-1626245199616-09a296564619?q=80&w=400&auto=format&fit=crop",
        monumentName: "Ujjayanta Palace",
        flavorText: "A strategic gateway. Balanced political dynamics require precise handling.",
        avatar: "Avaters/RAJNATH SINGH.png"
    },
    "Puducherry": {
        voters: "1.0M",
        rulingParty: "AINRC",
        gdp: "$5B",
        monument: "https://images.unsplash.com/photo-1626245199616-09a296564619?q=80&w=400&auto=format&fit=crop",
        monumentName: "Auroville Dome",
        flavorText: "French flair in the South. A unique blend of culture and commerce.",
        avatar: "Avaters/M K STALIN.png"
    },
    "Chandigarh": {
        voters: "0.7M",
        rulingParty: "AAP",
        gdp: "$6B",
        monument: "https://images.unsplash.com/photo-1626245199616-09a296564619?q=80&w=400&auto=format&fit=crop",
        monumentName: "Rock Garden",
        flavorText: "The planned city. A modern administrative success story.",
        avatar: "Avaters/BHAGWANT MANN.png"
    },
    // Aliases for common spelling variations
    "Sikim": {
        voters: "0.4M",
        rulingParty: "SKM",
        gdp: "$6B",
        monument: "https://images.unsplash.com/photo-1582236479702-f209368dcc34?q=80&w=400&auto=format&fit=crop",
        monumentName: "Kanchenjunga Range",
        flavorText: "The peak sentinel. Organic leadership and strategic altitude.",
        avatar: "Avaters/MALLIKARJUN KHARGE.png"
    },
    "Jarkhand": {
        voters: "25.0M",
        rulingParty: "JMM+",
        gdp: "$50B",
        monument: "https://images.unsplash.com/photo-1615822606543-91340a6b7201?q=80&w=400&auto=format&fit=crop",
        monumentName: "Jamshedpur Steel",
        flavorText: "The industrial bedrock. Iron and coal reserves fuel the national machine.",
        avatar: "Avaters/LALU PRASAD YADAV.png"
    },
    "Himachal Pardesh": {
        voters: "5.5M",
        rulingParty: "INC",
        gdp: "$25B",
        monument: "https://images.unsplash.com/photo-1605142859862-978be7eba909?q=80&w=400&auto=format&fit=crop",
        monumentName: "Shimla Mall",
        flavorText: "The mountain fortress. High terrain advantage for defensive strategy.",
        avatar: "Avaters/MAYAWATI.png"
    }
};

export const DEFAULT_STATE_DATA: StateData = {
    voters: "12.5M",
    rulingParty: "NEUTRAL",
    gdp: "$45B",
    monument: "https://images.unsplash.com/photo-1548013146-72479768bbaa?q=80&w=400&auto=format&fit=crop",
    monumentName: "Regional Fortress",
    flavorText: "A key territory in the operational theater. Stability here is paramount for broader success.",
    avatar: "Avaters/MALLIKARJUN KHARGE.png"
};
