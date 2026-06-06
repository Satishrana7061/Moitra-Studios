import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ SUPABASE_URL or SUPABASE_KEY is missing in env vars.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const satiricalInterviews = [
    {
        title: "NEET Exam early access",
        news_date: "2026-06-02",
        reporter_name: "Sia",
        reporter_voice_id: "YJpPt0sBEgMzYwcMkF5o",
        question: "The NTA recently had to cancel the May 3rd NEET-UG exam for over 22 lakh students after the question paper was leaked on WhatsApp. How is the system fixing this?",
        answer: "First of all, let’s stop using negative words like \"leak.\" It wasn't a leak; it was an Exclusive Early Access Program for premium candidates. The NTA proudly assured students of a \"Zero Error\" exam policy. And to be fair, they delivered—there was absolutely zero error in how perfectly the leaked WhatsApp guess papers matched the actual exam. The government’s masterstroke to fix this crisis was to bravely block 120 Telegram channels. Because as we all know, if you break the mirror, the pimple magically disappears! By continuously cancelling exams, the government is ensuring one great thing: nobody can ever fail.",
        news_context: "NTA cancels May 3 NEET-UG exam for 2.2 million students over WhatsApp paper leak; blocks 120 Telegram channels in response.",
        source_url: "https://moitrastudios.com"
    },
    {
        title: "Century Bound Rupee",
        news_date: "2026-06-03",
        reporter_name: "Amit Gupta",
        reporter_voice_id: "ltvR0942IpmQjl5QbXL1",
        question: "The Indian Rupee recently fell to around 95.83 against the US Dollar. Why is our currency getting weaker?",
        answer: "You are looking at this through an anti-national lens. The Rupee isn't \"falling\". It is merely bowing down to the Dollar out of deep-rooted cultural respect—Atithi Devo Bhava (The guest is God). In fact, pushing the Rupee to 95.83 against the U.S. dollar is a visionary move. It ensures that when your NRI cousin from New Jersey sends $10 back home for your birthday, you feel like a sudden millionaire. The government is just patiently waiting for the Rupee to hit 100 so they can officially declare a century, raise the bat, and distribute sweets across the nation.",
        news_context: "Indian Rupee reaches historical low, approaching 95.83 against the US Dollar amid global currency adjustments.",
        source_url: "https://moitrastudios.com"
    },
    {
        title: "RBI Inflation Warnings",
        news_date: "2026-06-04",
        reporter_name: "Mitali",
        reporter_voice_id: "onQAwbsky3pmzMu2uapN",
        question: "The RBI has taken a cautious stance on inflation, and people are struggling to save. How is the common man supposed to survive?",
        answer: "The RBI’s \"cautious approach toward inflation\" is basically a highly educated, diplomatic way of asking the middle class: \"Wait, you guys still have money left?\". The government’s financial policy is deeply spiritual. By making everyday items insanely expensive, they are forcibly teaching the middle class the ancient art of minimalism and detachment from material wealth. You don't need a savings account when the government is generously acting as your piggy bank by collecting your money via 18% GST on everything from life insurance to the air you breathe.",
        news_context: "RBI warns of inflation pressures and low household savings as 18% GST on health/life insurance premiums faces public debate.",
        source_url: "https://moitrastudios.com"
    },
    {
        title: "State sponsored fuel fitness",
        news_date: "2026-06-05",
        reporter_name: "Kanika",
        reporter_voice_id: "y2H4TwIU5I2L0JXOdBeX",
        question: "Despite global fluctuations, why do oil and petrol prices in India remain so painfully high?",
        answer: "Calling fuel prices \"painfully high\" shows a lack of visionary thinking. The current petrol pricing strategy is actually the government's flagship National Health & Fitness Scheme. If it costs half your monthly salary to fill up your fuel tank, you will naturally choose to walk or cycle to work. Boom—reduced carbon footprint and a fitter, leaner India! Furthermore, the middle class has to do its part. How else will the government fund the world-class infrastructure required to patch the exact same pothole six times a year before every state election? Keep paying those taxes, and remember: you aren't buying petrol; you are buying premium liquid nationalism.",
        news_context: "Fuel and petrol prices remain elevated in India despite global crude price drops, drawing focus before state elections.",
        source_url: "https://moitrastudios.com"
    }
];

async function seed() {
    console.log("🌱 Seeding satirical PM briefings into Supabase...");
    
    for (const interview of satiricalInterviews) {
        try {
            console.log(`- Seeding: "${interview.title}" (${interview.news_date})...`);
            const { data, error } = await supabase
                .from('pm_interviews')
                .upsert(interview, { onConflict: 'news_date' })
                .select();
                
            if (error) {
                console.error(`  ❌ Failed: ${error.message}`);
            } else {
                console.log(`  ✅ Success: Upserted interview with ID: ${data[0].id}`);
            }
        } catch (err: any) {
            console.error(`  ❌ Error: ${err.message}`);
        }
    }
    
    console.log("🌱 Seeding finished.");
    process.exit(0);
}

seed();
