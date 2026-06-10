import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://xbgjkmahmyuoaspevipd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseKey) {
    console.error("No supabase key found in backend .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Querying all rows in pm_interviews...");
    const { data, error } = await supabase
        .from('pm_interviews')
        .select('*')
        .order('news_date', { ascending: false });

    if (error) {
        console.error("Error querying:", error);
    } else {
        console.log(`Found ${data.length} rows:`);
        for (const row of data) {
            console.log(`\nID: ${row.id}`);
            console.log(`Title: ${row.title}`);
            console.log(`Date: ${row.news_date}`);
            console.log(`Reporter: ${row.reporter_name} (Voice: ${row.reporter_voice_id})`);
            console.log(`Question:\n${row.question}`);
            console.log(`Answer:\n${row.answer}`);
            console.log(`Video URL: ${row.video_url}`);
        }
    }
}

main();
