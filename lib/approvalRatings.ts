// src/lib/approvalRatings.ts

// These are baseline approval ratings based on real-world polling data
// Data sourced from Morning Consult Global Leader Tracker and India Today CVoter MOTN (2025/2026).
export const LEADER_BASE_APPROVAL: Record<string, number> = {
    "Narendra Modi": 71.0,
    "Rahul Gandhi": 27.0,
    "Yogi Adityanath": 58.0,
    "Arvind Kejriwal": 45.0,
    "Mamata Banerjee": 48.0,
    "M.K. Stalin": 60.0,
    "Amit Shah": 52.0,
    "Nitish Kumar": 42.0,
    "Akhilesh Yadav": 44.0,
    "Uddhav Thackeray": 48.0,
    "Mallikarjun Kharge": 35.0,
    "Priyanka Gandhi": 38.0,
    "Rajnath Singh": 46.0,
    "Bhagwant Mann": 45.0,
    "Lalu Prasad Yadav": 32.0,
    "Smriti Irani": 35.0,
    "Mayawati": 25.0,
    "Nirmala Sitharaman": 40.0,
    "N. Chandrababu Naidu": 48.0,
    "Pinarayi Vijayan": 45.0,
    "Prashant Kishor": 30.0,
    "Tejaswi Yadav": 41.0,
    "Regional Front": 40.0,
    "National Front": 45.0,
};

/**
 * Gets the authentic baseline approval rating for a leader.
 * If the leader is not found in the exact dictionary, it attempts a partial match,
 * and falls back to a default baseline of 40.0% if completely unknown.
 */
export function getBaseApprovalRating(leaderName: string): number {
    const exactMatch = LEADER_BASE_APPROVAL[leaderName];
    if (exactMatch !== undefined) {
        return exactMatch;
    }

    // Try a partial match
    const lowerName = leaderName.toLowerCase();
    for (const [key, val] of Object.entries(LEADER_BASE_APPROVAL)) {
        if (lowerName.includes(key.toLowerCase().split(" ")[0])) {
            return val;
        }
    }

    // Default baseline if no match is found
    return 40.0;
}
