import { findOrImportWikimediaImage } from './services/wikimediaService.js';
import { createClient } from '@supabase/supabase-js';
import './config.js'; // Ensure dotenv config is executed first

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
let supabase: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Predefined set of core categories and topics to pre-fetch for the news reels
const CORE_TOPICS = [
    { name: 'Narendra Modi', category: 'Leader', tags: ['Narendra Modi', 'Prime Minister', 'BJP'] },
    { name: 'Indian Railways', category: 'Infrastructure', tags: ['Indian Railways', 'Trains', 'Railways'] },
    { name: 'Indian Ports', category: 'Economy', tags: ['Ports', 'Shipping', 'Maritime', 'Sagarmala'] },
    { name: 'Indian Highways', category: 'Infrastructure', tags: ['Highways', 'NHAI', 'Roads', 'Expressway'] },
    { name: 'Clean India Mission', category: 'Swachh Bharat', tags: ['Swachh Bharat', 'Sanitation', 'Clean India'] },
    { name: 'Digital India', category: 'Technology', tags: ['Digital India', 'UPI', 'Internet', 'Technology'] },
    { name: 'Make in India', category: 'Economy', tags: ['Make in India', 'Manufacturing', 'Industry'] },
    { name: 'Indian Solar Power', category: 'Energy', tags: ['Solar energy', 'Renewable energy', 'Solar power India'] },
    { name: 'Indian Agriculture', category: 'Agriculture', tags: ['Farming India', 'Agriculture', 'Indian farmers'] },
    { name: 'G20 India Summit', category: 'Foreign Policy', tags: ['G20 India', 'Foreign Policy', 'Summit'] }
];

async function seedPreFetchedAssets() {
    console.log('=== STARTING WIKIMEDIA PRE-FETCH SEED SCRIPT ===');
    if (!supabase) {
        console.error('Supabase is not initialized. Please configure SUPABASE_URL and SUPABASE_KEY in .env.');
        process.exit(1);
    }

    // Step 1: Query database to see if we can get all unique categories currently in manifesto_promises
    let dynamicTopics: string[] = [];
    try {
        const { data: promises, error } = await (supabase as any)
            .from('manifesto_promises')
            .select('category');
            
        if (!error && promises) {
            const uniqueCats = Array.from(new Set(promises.map((p: any) => p.category).filter(Boolean))) as string[];
            console.log(`[Seed] Found unique promise categories in database: ${uniqueCats.join(', ')}`);
            dynamicTopics = uniqueCats;
        }
    } catch (err: any) {
        console.warn(`[Seed] Could not query promise categories dynamically: ${err.message}. Using static list.`);
    }

    // Blend static list and dynamic categories
    const finalQueue = [...CORE_TOPICS];
    for (const cat of dynamicTopics) {
        // Avoid duplicate topics
        if (!finalQueue.some(t => t.name.toLowerCase() === cat.toLowerCase())) {
            finalQueue.push({
                name: cat,
                category: cat,
                tags: [cat, 'India']
            });
        }
    }

    console.log(`[Seed] Queue contains ${finalQueue.length} topics to pre-fetch. Starting process...`);

    let successCount = 0;
    let skipCount = 0;

    for (const item of finalQueue) {
        console.log(`\n--------------------------------------------`);
        console.log(`[Seed] Processing topic: "${item.name}" (Category: ${item.category})`);
        
        try {
            const isLeader = item.category === 'Leader' ? 'modi' : undefined;
            const result = await findOrImportWikimediaImage(
                item.name,
                item.tags,
                isLeader
            );

            if (result) {
                console.log(`[Seed] Success! Asset mapped at: ${result.path}`);
                successCount++;
            } else {
                console.log(`[Seed] No image could be found/downloaded for "${item.name}"`);
            }
        } catch (err: any) {
            console.error(`[Seed] Error importing image for topic "${item.name}":`, err.message);
        }
        
        // Wait 1.5 seconds between requests to be polite to the MediaWiki API rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log('\n============================================');
    console.log('=== SEED PRE-FETCH SCRIPT COMPLETED ===');
    console.log(`Total processed: ${finalQueue.length}`);
    console.log(`Successfully Seeded: ${successCount}`);
    console.log(`Failed/No Match: ${finalQueue.length - successCount}`);
    console.log('============================================');
    process.exit(0);
}

seedPreFetchedAssets();
