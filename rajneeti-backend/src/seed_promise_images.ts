import { createClient } from '@supabase/supabase-js';
import { findOrImportWikimediaImage } from './services/wikimediaService.js';
import './config.js'; // Ensures dotenv is loaded
import { OPENAI_API_KEY, GEMINI_API_KEY } from './config.js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

let supabase: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

async function getSearchQueriesFromAI(promise: {
    title: string;
    description: string;
    category: string;
}): Promise<{ query1: string; query2: string; query3: string } | null> {
    const activeGeminiKey = process.env.GEMINI_API_KEY || GEMINI_API_KEY;

    const systemPromptText = `You are a search query expert for Wikimedia Commons. 
Your goal is to generate 3 short, specific search queries in English that will help find high-quality, real photographic images on Wikimedia Commons representing a political promise in India.
Wikimedia Commons search matches files by title or description. Keep queries very simple, using 2-4 keywords. Do not use punctuation, special symbols, or verbs like "finding", "searching".

For the given promise, output exactly 3 queries:
1. query1 (Category/Topic context): A general query representing the topic or category (e.g. "Indian Railways", "Indian Solar Power", "Delhi Sanitation").
2. query2 (Concrete development/action context): A query representing actual work, progress, construction, or ground infrastructure in India (e.g. "highway construction India", "Anganwadi India", "manufacturing factory India").
3. query3 (Official/Government audit context): A query representing the government or audit context (e.g. "Narendra Modi speech", "Parliament of India", "Government Office India").

Output ONLY raw JSON format:
{
    "query1": "...",
    "query2": "...",
    "query3": "..."
}`;

    const userPromptText = `Promise Title: "${promise.title}"
Promise Description: "${promise.description}"
Category: "${promise.category}"`;

    // Try Gemini API first
    if (activeGeminiKey && activeGeminiKey !== 'PLACEHOLDER_API_KEY') {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeGeminiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                {
                                    text: `${systemPromptText}\n\n${userPromptText}`
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: 'application/json'
                    }
                })
            });

            if (res.ok) {
                const data: any = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                if (text) {
                    return JSON.parse(text);
                }
            }
        } catch (err: any) {
            console.warn(`[Gemini] Error generating queries: ${err.message}. Trying OpenAI...`);
        }
    }

    // Try OpenAI fallback
    if (OPENAI_API_KEY) {
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPromptText },
                        { role: 'user', content: userPromptText }
                    ],
                    response_format: { type: 'json_object' },
                    max_completion_tokens: 150,
                    temperature: 0.5
                })
            });

            if (res.ok) {
                const data: any = await res.json();
                const content = data.choices?.[0]?.message?.content?.trim();
                if (content) {
                    return JSON.parse(content);
                }
            }
        } catch (err: any) {
            console.warn(`[OpenAI] Error generating queries: ${err.message}. Using default fallbacks.`);
        }
    }

    // Default Fallbacks
    return {
        query1: promise.category || 'India Politics',
        query2: promise.title.split(' ').slice(0, 3).join(' '),
        query3: 'Parliament of India'
    };
}

async function seedPromiseImages() {
    console.log('=== STARTING WIKIMEDIA PROMISE-SPECIFIC PRE-FETCH SEED SCRIPT ===');
    if (!supabase) {
        console.error('Supabase is not initialized. Please configure SUPABASE_URL and SUPABASE_KEY.');
        process.exit(1);
    }

    // Step 1: Fetch verified, unposted promises (batch of 20 at a time)
    console.log('[Seed] Fetching verified, unposted promises from database...');
    const { data: promises, error } = await (supabase as any)
        .from('manifesto_promises')
        .select('*')
        .eq('verified_by_ai', true)
        .or('reel_posted.is.null,reel_posted.eq.false')
        .limit(20);

    if (error || !promises) {
        console.error('[Seed] Failed to fetch promises:', error?.message);
        process.exit(1);
    }

    console.log(`[Seed] Found ${promises.length} promises in database. Processing...`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < promises.length; i++) {
        const p = promises[i];
        console.log(`\n==================================================`);
        console.log(`[Seed] Promise [${i + 1}/${promises.length}]: "${p.title}" (${p.source_manifesto_year})`);
        console.log(`[Seed] Slug: ${p.slug}`);

        const slide1Slug = `${p.slug}_slide1`;
        const slide2Slug = `${p.slug}_slide2`;
        const slide3Slug = `${p.slug}_slide3`;

        // Check if images already exist for all three slides
        const { data: existing } = await (supabase as any)
            .from('media_assets')
            .select('slug')
            .in('slug', [slide1Slug, slide2Slug, slide3Slug]);

        const has1 = existing?.some((a: any) => a.slug === slide1Slug);
        const has2 = existing?.some((a: any) => a.slug === slide2Slug);
        const has3 = existing?.some((a: any) => a.slug === slide3Slug);

        if (has1 && has2 && has3) {
            console.log(`[Seed] All 3 slide images are already cached/pre-seeded. Skipping.`);
            skipCount++;
            continue;
        }

        // Get AI generated search queries
        console.log(`[Seed] Asking AI for Wikimedia search queries...`);
        const queries = await getSearchQueriesFromAI(p);
        
        const q1 = queries?.query1 || p.category || 'India';
        const q2 = queries?.query2 || p.title.split(' ').slice(0, 3).join(' ');
        const q3 = queries?.query3 || 'Parliament of India';

        console.log(`[Seed] Generated queries:`);
        console.log(`  • Slide 1 Query: "${q1}"`);
        console.log(`  • Slide 2 Query: "${q2}"`);
        console.log(`  • Slide 3 Query: "${q3}"`);

        const tags = [p.category, 'India', 'BJP', 'Narendra Modi'].filter(Boolean);

        // Fetch Slide 1
        if (!has1) {
            console.log(`[Seed] Fetching Slide 1 image...`);
            const res1 = await findOrImportWikimediaImage(q1, tags, 'modi', p.source_manifesto_year, slide1Slug);
            if (res1) {
                console.log(`  ✅ Cached Slide 1: ${res1.path}`);
                successCount++;
            } else {
                console.log(`  ❌ Failed Slide 1 fetch.`);
            }
            await new Promise(r => setTimeout(r, 1500));
        } else {
            console.log(`[Seed] Slide 1 already exists.`);
        }

        // Fetch Slide 2
        if (!has2) {
            console.log(`[Seed] Fetching Slide 2 image...`);
            const res2 = await findOrImportWikimediaImage(q2, tags, undefined, p.source_manifesto_year, slide2Slug);
            if (res2) {
                console.log(`  ✅ Cached Slide 2: ${res2.path}`);
                successCount++;
            } else {
                console.log(`  ❌ Failed Slide 2 fetch.`);
            }
            await new Promise(r => setTimeout(r, 1500));
        } else {
            console.log(`[Seed] Slide 2 already exists.`);
        }

        // Fetch Slide 3
        if (!has3) {
            console.log(`[Seed] Fetching Slide 3 image...`);
            const res3 = await findOrImportWikimediaImage(q3, tags, undefined, p.source_manifesto_year, slide3Slug);
            if (res3) {
                console.log(`  ✅ Cached Slide 3: ${res3.path}`);
                successCount++;
            } else {
                console.log(`  ❌ Failed Slide 3 fetch.`);
            }
            await new Promise(r => setTimeout(r, 1500));
        } else {
            console.log(`[Seed] Slide 3 already exists.`);
        }
    }

    console.log('\n==================================================');
    console.log('=== SEED PROMISE IMAGES COMPLETED ===');
    console.log(`Promises skipped (already complete): ${skipCount}`);
    console.log(`Images successfully pre-fetched and cached: ${successCount}`);
    console.log('==================================================');
    process.exit(0);
}

seedPromiseImages();
