export const LEADER_AVATARS: Record<string, string> = {
    "Narendra Modi": "/Avaters/NARENDRA MODI (PM).png",
    "Rahul Gandhi": "/Avaters/RAHUL GANDHI.png",
    "Arvind Kejriwal": "/Avaters/ARVIND KEJRIWAL.png",
    "Mamata Banerjee": "/Avaters/MAMTA BENRJEE.png",
    "Yogi Adityanath": "/Avaters/YOGI ADITYANATH.png",
    "M.K. Stalin": "/Avaters/M K STALIN.png",
    "Akhilesh Yadav": "/Avaters/AKHILESH YADAV.png",
    "Nitish Kumar": "/Avaters/NITISH KUMAR.png",
    "Uddhav Thackeray": "/Avaters/UDDAV THACKREAY.png",
    "Amit Shah": "/Avaters/AMIT SHAH.png",
    "Priyanka Gandhi": "/Avaters/PRIYANKA GANDHI.png",
    "Rajnath Singh": "/Avaters/RAJNATH SINGH.png",
    "Bhagwant Mann": "/Avaters/BHAGWANT MANN.png",
    "Lalu Prasad Yadav": "/Avaters/LALU PRASAD YADAV.png",
    "Smriti Irani": "/Avaters/SMRITI IRANI.png",
    "Mayawati": "/Avaters/MAYAWATI.png",
    "Nirmala Sitharaman": "/Avaters/NIRMALA SITHARAMAN.png",
    "N. Chandrababu Naidu": "/Avaters/N. CHANDRABABU NAIDU.png",
    "Pinarayi Vijayan": "/Avaters/PINARAYI VIJAYAN.png",
    "Prashant Kishor": "/Avaters/PRASHANT KISHOR.png",
    "Tejaswi Yadav": "/Avaters/TEJASWI YADAV.png",
    "Mallikarjun Kharge": "/Avaters/MALLIKARJUN KHARGE.png",
    "Regional Front": "/Avaters/MAMTA BENRJEE.png",
    "National Front": "/Avaters/NARENDRA MODI (PM).png",
};

export function getLeaderAvatar(name: string, stateName?: string): string {
    const getPath = () => {
        if (LEADER_AVATARS[name]) return LEADER_AVATARS[name];

        const lowerName = name.toLowerCase();
        const lowerState = stateName?.toLowerCase();

        // Regional Fallbacks
        if (lowerState === "west bengal" && (lowerName.includes("regional") || lowerName.includes("front"))) {
            return "/Avaters/MAMTA BENRJEE.png";
        }
        if (lowerState === "tamil nadu" && (lowerName.includes("regional") || lowerName.includes("front"))) {
            return "/Avaters/M K STALIN.png";
        }
        if (lowerState === "delhi" && (lowerName.includes("regional") || lowerName.includes("front"))) {
            return "/Avaters/ARVIND KEJRIWAL.png";
        }

        for (const [key, val] of Object.entries(LEADER_AVATARS)) {
            if (lowerName.includes(key.toLowerCase().split(" ")[0])) return val;
        }
        return "/Avaters/NARENDRA MODI (PM).png";
    };

    const path = getPath();
    const baseUrl = import.meta.env.BASE_URL || '/';
    return `${baseUrl}${path.replace(/^\//, '')}`;
}
