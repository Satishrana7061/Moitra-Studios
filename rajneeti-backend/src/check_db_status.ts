import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xbgjkmahmyuoaspevipd.supabase.co';
const supabaseKey = 'sb_publishable_HOCcMDFfM0cyzsEEuj8opg_EZMZIUZ5';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    try {
        console.log("Resetting National Litigation Policy to let it run in the new 28-29s style...");
        await supabase
            .from('manifesto_promises')
            .update({ reel_posted: false })
            .eq('slug', 'implement-national-litigation-policy-2014');

        console.log("--- Manifesto Promises Stats ---");
        const { data: all, error: err1 } = await supabase
            .from('manifesto_promises')
            .select('id, title, published, verified_by_ai, reel_posted, verification_conflict');
        
        if (err1) throw err1;
        
        console.log(`Total Promises: ${all.length}`);
        
        const publishedCount = all.filter(p => p.published).length;
        const verifiedCount = all.filter(p => p.verified_by_ai).length;
        const postedCount = all.filter(p => p.reel_posted).length;
        const conflictCount = all.filter(p => p.verification_conflict).length;
        
        console.log(`Published: ${publishedCount}`);
        console.log(`Verified by AI: ${verifiedCount}`);
        console.log(`Reel Posted: ${postedCount}`);
        console.log(`Verification Conflict: ${conflictCount}`);
        
        console.log("\n--- Active candidates for verification (published=true, verified_by_ai != true) ---");
        const candidatesForVerify = all.filter(p => p.published && !p.verified_by_ai);
        console.log(`Count: ${candidatesForVerify.length}`);
        if (candidatesForVerify.length > 0) {
            console.log(JSON.stringify(candidatesForVerify.slice(0, 5), null, 2));
        }
        
        console.log("\n--- Active candidates for reels (published=true, verified_by_ai=true, reel_posted != true) ---");
        const candidatesForReel = all.filter(p => p.published && p.verified_by_ai && !p.reel_posted && !p.verification_conflict);
        console.log(`Count: ${candidatesForReel.length}`);
        if (candidatesForReel.length > 0) {
            console.log(JSON.stringify(candidatesForReel.slice(0, 5), null, 2));
        }

    } catch (e) {
        console.error(e);
    }
}
main();
