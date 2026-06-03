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
    console.log("Querying pm_interviews structure...");
    const { data, error } = await supabase
        .from('pm_interviews')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error querying:", error);
    } else {
        console.log("Columns in pm_interviews:", data.length > 0 ? Object.keys(data[0]) : "No rows found");
        console.log("Sample Row:", data[0]);
    }
}

main();
