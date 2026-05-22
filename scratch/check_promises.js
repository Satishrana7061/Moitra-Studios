const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xbgjkmahmyuoaspevipd.supabase.co';
const supabaseAnonKey = 'sb_publishable_HOCcMDFfM0cyzsEEuj8opg_EZMZIUZ5';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log("Fetching all manifesto_promises...");
    const { data, error } = await supabase
      .from('manifesto_promises')
      .select('*');
      
    if (error) throw error;
    console.log(`Successfully fetched ${data.length} promises.`);
    
    // Check if any fields are null or unexpected types
    data.forEach((p, index) => {
      console.log(`[${index + 1}] Title: "${p.title}" | Status: "${p.status}" | Year: ${p.source_manifesto_year} | Published: ${p.published}`);
      if (!p.title) console.warn("WARNING: title is missing or empty!");
      if (!p.description) console.warn("WARNING: description is missing or empty!");
      if (p.source_manifesto_year === undefined || p.source_manifesto_year === null) console.warn("WARNING: year is missing!");
    });
  } catch (err) {
    console.error("Error fetching:", err);
  }
}

run();
