export const LEADER_AVATARS: Record<string, string> = {
    "Narendra Modi": "/Avaters/NARENDRA MODI (PM).webp",
    "Rahul Gandhi": "/Avaters/RAHUL GANDHI.webp",
    "Arvind Kejriwal": "/Avaters/ARVIND KEJRIWAL.webp",
    "Mamata Banerjee": "/Avaters/MAMTA BENRJEE.webp",
    "Yogi Adityanath": "/Avaters/YOGI ADITYANATH.webp",
    "M.K. Stalin": "/Avaters/M K STALIN.webp",
    "Akhilesh Yadav": "/Avaters/AKHILESH YADAV.webp",
    "Nitish Kumar": "/Avaters/NITISH KUMAR.webp",
    "Uddhav Thackeray": "/Avaters/UDDAV THACKREAY.webp",
    "Amit Shah": "/Avaters/AMIT SHAH.webp",
    "Priyanka Gandhi": "/Avaters/PRIYANKA GANDHI.webp",
    "Rajnath Singh": "/Avaters/RAJNATH SINGH.webp",
    "Bhagwant Mann": "/Avaters/BHAGWANT MANN.webp",
    "Lalu Prasad Yadav": "/Avaters/LALU PRASAD YADAV.webp",
    "Smriti Irani": "/Avaters/SMRITI IRANI.webp",
    "Mayawati": "/Avaters/MAYAWATI.webp",
    "Nirmala Sitharaman": "/Avaters/NIRMALA SITHARAMAN.webp",
    "N. Chandrababu Naidu": "/Avaters/N. CHANDRABABU NAIDU.webp",
    "Pinarayi Vijayan": "/Avaters/PINARAYI VIJAYAN.webp",
    "Prashant Kishor": "/Avaters/PRASHANT KISHOR.webp",
    "Tejaswi Yadav": "/Avaters/TEJASWI YADAV.webp",
    "Mallikarjun Kharge": "/Avaters/MALLIKARJUN KHARGE.webp",
    "Regional Front": "/Avaters/MAMTA BENRJEE.webp",
    "National Front": "/Avaters/NARENDRA MODI (PM).webp",
};

export function getLeaderAvatar(name: string, stateName?: string): string {
    const getPath = () => {
        if (LEADER_AVATARS[name]) return LEADER_AVATARS[name];

        const lowerName = name.toLowerCase();
        const lowerState = stateName?.toLowerCase();

        // Regional Fallbacks
        if (lowerState === "west bengal" && (lowerName.includes("regional") || lowerName.includes("front"))) {
            return "/Avaters/MAMTA BENRJEE.webp";
        }
        if (lowerState === "tamil nadu" && (lowerName.includes("regional") || lowerName.includes("front"))) {
            return "/Avaters/M K STALIN.webp";
        }
        if (lowerState === "delhi" && (lowerName.includes("regional") || lowerName.includes("front"))) {
            return "/Avaters/ARVIND KEJRIWAL.webp";
        }

        for (const [key, val] of Object.entries(LEADER_AVATARS)) {
            if (lowerName.includes(key.toLowerCase().split(" ")[0])) return val;
        }
        return "/Avaters/NARENDRA MODI (PM).webp";
    };

    const path = getPath();
    const baseUrl = import.meta.env.BASE_URL || '/';
    return `${baseUrl}${path.replace(/^\//, '')}`;
}
