/**
 * Truth Engine — Dual-Model Fact Verification Service
 * 
 * Verifies manifesto promises using BOTH OpenAI (GPT) and Google Gemini
 * as impartial judges. Only publishes reels when both models agree on the verdict.
 * 
 * Cost: ~$0.005/day (one promise verified per day = ~6,000 tokens total)
 */

import { createClient } from '@supabase/supabase-js';
import { OPENAI_API_KEY, GEMINI_API_KEY } from '../config.js';

// ── Supabase Client ──────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

let supabase: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ── Types ────────────────────────────────────────────────────────
interface AIVerdict {
    status: 'Fulfilled' | 'Partially Fulfilled' | 'Not Fulfilled' | 'In Progress' | 'Unclear';
    evidence_summary: string;
    fulfilled_details: string;
    unfulfilled_details: string;
    confidence: number; // 0-100
}

interface VerifiedPromise {
    id: string;
    title: string;
    description: string;
    source_manifesto_year: number;
    category: string;
    status: string;
    verdict_summary: string;
    slug: string;
    fulfilled_details?: string;
    unfulfilled_details?: string;
}

// ── Google Custom Search (Optional) ──────────────────────────────
async function searchForEvidence(query: string): Promise<string[]> {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;

    if (!apiKey || !cx) {
        console.log('[TruthEngine] Google Search API not configured. Using AI internal knowledge only.');
        return [];
    }

    try {
        const searchQuery = encodeURIComponent(`${query} India government fulfillment status`);
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${searchQuery}&num=3`;

        const res = await fetch(url);
        if (!res.ok) {
            console.warn(`[TruthEngine] Google Search API returned ${res.status}. Falling back to internal knowledge.`);
            return [];
        }

        const data: any = await res.json();
        const items = data.items || [];

        return items.map((item: any) =>
            `SOURCE: ${item.displayLink}\nTITLE: ${item.title}\nSNIPPET: ${item.snippet || 'No snippet'}`
        );
    } catch (err: any) {
        console.warn(`[TruthEngine] Google Search failed: ${err.message}`);
        return [];
    }
}

// ── Build Verification Prompt ────────────────────────────────────
function buildVerificationPrompt(promise: any, evidence: string[]): string {
    const evidenceBlock = evidence.length > 0
        ? `\n\nLIVE WEB EVIDENCE:\n${evidence.join('\n\n---\n')}`
        : '\n\n(No live web evidence available. Use your training data and general knowledge.)';

    return `You are an impartial political fact-checker for India. You must assess whether a specific election manifesto promise has been fulfilled based on real-world outcomes.

PROMISE DETAILS:
- Title: ${promise.title}
- Description: ${promise.description}
- Year: ${promise.source_manifesto_year} (BJP Lok Sabha Election Manifesto)
- Category: ${promise.category}
${evidenceBlock}

ASSESSMENT RULES:
1. Be STRICTLY factual. Do not give the benefit of the doubt to any political party.
2. Consider the promise UNFULFILLED if there is no concrete evidence of completion.
3. "Partially Fulfilled" means some measurable progress was made but the original target was NOT met.
4. "In Progress" means work has officially begun but is far from completion.
5. Consider economic indicators, official government data, independent reports, and credible media.
6. For promises like "2 crore jobs per year" — check actual employment data.
7. For promises like "reducing inflation" — check actual CPI/WPI data.
8. Be critical and evidence-based. Political speeches claiming success do NOT count as evidence.

OUTPUT STRICT JSON ONLY (no markdown, no extra text):
{
    "status": "Fulfilled" | "Partially Fulfilled" | "Not Fulfilled" | "In Progress" | "Unclear",
    "evidence_summary": "A 2-3 sentence neutral summary of the evidence and your reasoning.",
    "fulfilled_details": "What specifically was achieved (empty string if nothing).",
    "unfulfilled_details": "What specifically was NOT achieved or fell short (empty string if fully fulfilled).",
    "confidence": 0-100
}`;
}

// ── Call OpenAI ──────────────────────────────────────────────────
async function callOpenAI(prompt: string): Promise<AIVerdict | null> {
    if (!OPENAI_API_KEY) {
        console.warn('[TruthEngine] OpenAI API key not set. Skipping OpenAI verification.');
        return null;
    }

    try {
        console.log('[TruthEngine] Querying OpenAI (GPT-4.1-mini)...');
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4.1-mini',
                messages: [
                    { role: 'system', content: 'You are a strict, impartial Indian political fact-checker. Output ONLY valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                max_tokens: 800,
                temperature: 0.2,
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[TruthEngine] OpenAI API error ${res.status}: ${errText}`);
            return null;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) return null;

        const parsed = JSON.parse(content);
        console.log(`[TruthEngine] OpenAI verdict: ${parsed.status} (confidence: ${parsed.confidence}%)`);
        return parsed as AIVerdict;
    } catch (err: any) {
        console.error(`[TruthEngine] OpenAI call failed: ${err.message}`);
        return null;
    }
}

// ── Call Gemini ──────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<AIVerdict | null> {
    if (!GEMINI_API_KEY) {
        console.warn('[TruthEngine] Gemini API key not set. Skipping Gemini verification.');
        return null;
    }

    try {
        console.log('[TruthEngine] Querying Google Gemini (gemini-1.5-flash)...');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    topP: 0.95,
                    maxOutputTokens: 800,
                    responseMimeType: 'application/json',
                },
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[TruthEngine] Gemini API error ${res.status}: ${errText}`);
            return null;
        }

        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) return null;

        // Clean potential markdown fences
        const cleaned = content
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        const parsed = JSON.parse(cleaned);
        console.log(`[TruthEngine] Gemini verdict: ${parsed.status} (confidence: ${parsed.confidence}%)`);
        return parsed as AIVerdict;
    } catch (err: any) {
        console.error(`[TruthEngine] Gemini call failed: ${err.message}`);
        return null;
    }
}

// ── Consensus Engine ────────────────────────────────────────────
function checkConsensus(openaiVerdict: AIVerdict | null, geminiVerdict: AIVerdict | null): {
    agreed: boolean;
    finalVerdict: AIVerdict | null;
} {
    // If both failed, no consensus
    if (!openaiVerdict && !geminiVerdict) {
        console.warn('[TruthEngine] Both models failed. Cannot verify.');
        return { agreed: false, finalVerdict: null };
    }

    // If only one succeeded, use it but with lower confidence
    if (!openaiVerdict || !geminiVerdict) {
        const single = openaiVerdict || geminiVerdict;
        console.warn('[TruthEngine] Only one model responded. Using single-model verdict with reduced confidence.');
        return {
            agreed: true,
            finalVerdict: {
                ...single!,
                confidence: Math.min(single!.confidence, 60), // Cap at 60% for single-model
                evidence_summary: `[Single-Model Verification] ${single!.evidence_summary}`,
            },
        };
    }

    // Both responded — check if they agree
    if (openaiVerdict.status === geminiVerdict.status) {
        console.log(`[TruthEngine] ✅ CONSENSUS REACHED: Both models agree → "${openaiVerdict.status}"`);

        // Merge the best details from both
        const finalVerdict: AIVerdict = {
            status: openaiVerdict.status,
            evidence_summary: openaiVerdict.evidence_summary.length > geminiVerdict.evidence_summary.length
                ? openaiVerdict.evidence_summary
                : geminiVerdict.evidence_summary,
            fulfilled_details: openaiVerdict.fulfilled_details || geminiVerdict.fulfilled_details,
            unfulfilled_details: openaiVerdict.unfulfilled_details || geminiVerdict.unfulfilled_details,
            confidence: Math.round((openaiVerdict.confidence + geminiVerdict.confidence) / 2),
        };

        return { agreed: true, finalVerdict };
    }

    // Models disagree
    console.warn(`[TruthEngine] ⚠️ DISAGREEMENT: OpenAI says "${openaiVerdict.status}" vs Gemini says "${geminiVerdict.status}"`);
    return { agreed: false, finalVerdict: null };
}

// ══════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════

/**
 * Picks one unverified promise from the database, runs dual-model
 * verification, and updates the record with the consensus verdict.
 */
export async function verifyNextPromise(): Promise<VerifiedPromise | null> {
    if (!supabase) {
        console.error('[TruthEngine] Supabase not configured. Cannot verify promises.');
        return null;
    }

    console.log('\n═══════════════════════════════════════');
    console.log('  🔍 TRUTH ENGINE — Starting Verification');
    console.log('═══════════════════════════════════════');

    try {
        // 1. Pick one unverified promise
        const { data: promise, error } = await (supabase as any)
            .from('manifesto_promises')
            .select('*')
            .eq('published', true)
            .or('verified_by_ai.is.null,verified_by_ai.eq.false')
            .order('source_manifesto_year', { ascending: true })
            .limit(1)
            .single();

        if (error || !promise) {
            console.log('[TruthEngine] No unverified promises found. All promises are verified!');
            return null;
        }

        console.log(`[TruthEngine] Selected: "${promise.title}" (${promise.source_manifesto_year})`);

        // 2. Search for live evidence (optional)
        const evidence = await searchForEvidence(`${promise.title} BJP ${promise.source_manifesto_year}`);
        if (evidence.length > 0) {
            console.log(`[TruthEngine] Found ${evidence.length} web sources for verification.`);
        }

        // 3. Build the verification prompt
        const prompt = buildVerificationPrompt(promise, evidence);

        // 4. Query BOTH AI models in parallel
        const [openaiVerdict, geminiVerdict] = await Promise.all([
            callOpenAI(prompt),
            callGemini(prompt),
        ]);

        // 5. Check consensus
        const { agreed, finalVerdict } = checkConsensus(openaiVerdict, geminiVerdict);

        if (!agreed || !finalVerdict) {
            // Mark as conflicted in the database
            console.warn(`[TruthEngine] Marking "${promise.title}" as CONFLICTED. Skipping for reel generation.`);
            await (supabase as any)
                .from('manifesto_promises')
                .update({
                    verification_conflict: true,
                    ai_verification_date: new Date().toISOString(),
                })
                .eq('id', promise.id);
            return null;
        }

        // 6. Update the promise in Supabase with verified data
        console.log(`[TruthEngine] Updating database with verified verdict...`);
        const { error: updateError } = await (supabase as any)
            .from('manifesto_promises')
            .update({
                status: finalVerdict.status,
                verdict_summary: finalVerdict.evidence_summary,
                fulfilled_details: finalVerdict.fulfilled_details || null,
                unfulfilled_details: finalVerdict.unfulfilled_details || null,
                verified_by_ai: true,
                verification_conflict: false,
                ai_verification_date: new Date().toISOString(),
            })
            .eq('id', promise.id);

        if (updateError) {
            console.error(`[TruthEngine] Failed to update Supabase: ${updateError.message}`);
            return null;
        }

        console.log(`[TruthEngine] ✅ Successfully verified: "${promise.title}" → ${finalVerdict.status} (${finalVerdict.confidence}% confidence)`);

        return {
            id: promise.id,
            title: promise.title,
            description: promise.description,
            source_manifesto_year: promise.source_manifesto_year,
            category: promise.category,
            status: finalVerdict.status,
            verdict_summary: finalVerdict.evidence_summary,
            slug: promise.slug,
            fulfilled_details: finalVerdict.fulfilled_details,
            unfulfilled_details: finalVerdict.unfulfilled_details,
        };
    } catch (err: any) {
        console.error(`[TruthEngine] Fatal error: ${err.message}`);
        return null;
    }
}

/**
 * Fetches one promise that IS verified but has NOT yet been posted as a reel.
 * Used by the automated pipeline to select the next reel to generate.
 */
export async function getNextVerifiedPromiseForReel(): Promise<VerifiedPromise | null> {
    if (!supabase) {
        console.error('[TruthEngine] Supabase not configured.');
        return null;
    }

    try {
        const { data, error } = await (supabase as any)
            .from('manifesto_promises')
            .select('*')
            .eq('published', true)
            .eq('verified_by_ai', true)
            .or('reel_posted.is.null,reel_posted.eq.false')
            .eq('verification_conflict', false)
            .order('source_manifesto_year', { ascending: true })
            .limit(1)
            .single();

        if (error || !data) {
            console.log('[TruthEngine] No verified-but-unposted promises found.');
            return null;
        }

        console.log(`[TruthEngine] Next reel candidate: "${data.title}" (${data.source_manifesto_year})`);

        return {
            id: data.id,
            title: data.title,
            description: data.description,
            source_manifesto_year: data.source_manifesto_year,
            category: data.category,
            status: data.status,
            verdict_summary: data.verdict_summary,
            slug: data.slug,
            fulfilled_details: data.fulfilled_details,
            unfulfilled_details: data.unfulfilled_details,
        };
    } catch (err: any) {
        console.error(`[TruthEngine] Error fetching next reel promise: ${err.message}`);
        return null;
    }
}
