import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://xbgjkmahmyuoaspevipd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseKey) {
    console.error("No supabase key found in backend .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Querying all pm_interviews...");
    const { data, error } = await supabase
        .from('pm_interviews')
        .select('*')
        .order('news_date', { ascending: false });

    if (error) {
        console.error("Error querying:", error);
    } else {
        console.log(`Found ${data?.length || 0} rows:`);
        data?.forEach((row: any) => {
            console.log(`- Date: ${row.news_date} | Title: "${row.title}" | Reporter: "${row.reporter_name}" | Voice ID: "${row.reporter_voice_id}" | Video URL: ${row.video_url || 'NULL'}`);
        });
    }
    process.exit(0);
}

main();
