// scratch/fetch_db_promises.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xbgjkmahmyuoaspevipd.supabase.co';
const supabaseKey = 'sb_publishable_HOCcMDFfM0cyzsEEuj8opg_EZMZIUZ5';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    try {
        const { data, error } = await supabase
            .from('manifesto_promises')
            .select('id, title, status, source_manifesto_year');
        if (error) throw error;
        console.log(`Found ${data.length} promises:`);
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}
main();
