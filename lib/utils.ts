export const LEADER_AVATARS: Record<string, string> = {
    "Narendra Modi": "/Avaters/.webp",
    "Rahul Gandhi": "/Avaters/.webp",
    "Arvind Kejriwal": "/Avaters/.webp",
    "Mamata Banerjee": "/Avaters/.webp",
    "Yogi Adityanath": "/Avaters/.webp",
    "M.K. Stalin": "/Avaters/.webp",
    "Akhilesh Yadav": "/Avaters/.webp",
    "Nitish Kumar": "/Avaters/.webp",
    "Uddhav Thackeray": "/Avaters/.webp",
    "Amit Shah": "/Avaters/.webp",
    "Priyanka Gandhi": "/Avaters/.webp",
    "Rajnath Singh": "/Avaters/.webp",
    "Bhagwant Mann": "/Avaters/.webp",
    "Lalu Prasad Yadav": "/Avaters/.webp",
    "Smriti Irani": "/Avaters/.webp",
    "Mayawati": "/Avaters/.webp",
    "Nirmala Sitharaman": "/Avaters/.webp",
    "N. Chandrababu Naidu": "/Avaters/N. CHANDRABABU NAIDU.png",
    "Pinarayi Vijayan": "/Avaters/.webp",
    "Prashant Kishor": "/Avaters/.webp",
    "Tejaswi Yadav": "/Avaters/.webp",
    "Mallikarjun Kharge": "/Avaters/.webp",
    "Regional Front": "/Avaters/.webp",
    "National Front": "/Avaters/.webp",
};

export function getLeaderAvatar(name: string, stateName?: string): string {
    const getPath = () => {
        if (LEADER_AVATARS[name]) return LEADER_AVATARS[name];

        const lowerName = name.toLowerCase();
        const lowerState = stateName?.toLowerCase();

        // Regional Fallbacks
        if (lowerState === "west bengal" && (lowerName.includes("regional") || lowerName.includes("front"))) {
            return "/Avaters/.webp";
        }
        if (lowerState === "tamil nadu" && (lowerName.includes("regional") || lowerName.includes("front"))) {
            return "/Avaters/.webp";
        }
        if (lowerState === "delhi" && (lowerName.includes("regional") || lowerName.includes("front"))) {
            return "/Avaters/.webp";
        }

        for (const [key, val] of Object.entries(LEADER_AVATARS)) {
            if (lowerName.includes(key.toLowerCase().split(" ")[0])) return val;
        }
        return "/Avaters/.webp";
    };

    const path = getPath();
    const baseUrl = import.meta.env.BASE_URL || '/';
    return `${baseUrl}${path.replace(/^\//, '')}`;
}
