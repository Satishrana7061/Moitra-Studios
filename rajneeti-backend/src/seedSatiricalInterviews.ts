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
        reporter_voice_id: "EXAVITQu4vr4xnSDxMaL",
        question: "1. NTA ne paper leak ke baad May third ka NEET-UG exam cancel kar diya. Sarkar is system breakdown ko kaise theek kar rahi hai?\n\n2. Lekin is cancellation se twenty two lakh bacchon ka nuksaan ho raha hai. Telegram channels block karne se kya hoga?",
        answer: "1. Dekhiye, sabse pehle toh negative shabdon ka istemal band kijiye. Yeh leak nahi, premium candidates ke liye Exclusive Early Access Program tha.\n\n2. NTA ne Zero Error exam policy ka vaada kiya tha. Guess paper WhatsApp leak se one hundred percent match hua, toh zero error hi hua na! Aur Telegram block kar diya, kyunki mirror todne se pimple dikhna band ho jata hai! Baar-baar exam cancel karke sarkar ensure kar rahi hai ki koi fail hi na ho!",
        news_context: "NTA cancels May third NEET-UG exam for twenty two lakh students over WhatsApp paper leak; blocks one hundred and twenty Telegram channels in response.",
        source_url: "https://moitrastudios.com",
        video_url: null
    },
    {
        title: "Century Bound Rupee",
        news_date: "2026-06-03",
        reporter_name: "Pooja",
        reporter_voice_id: "XB0fDUncoFtcwTr3yv1t",
        question: "1. Indian Rupee dollar ke khilaaf lagatar girte hue ninety five point eighty three tak pahunch gaya hai. Hamari currency itni kamzor kyun ho rahi hai?\n\n2. Lekin isse imports mehnge ho rahe hain aur aam janta par bojh badh raha hai.",
        answer: "1. Aap ise anti-national lens se dekh rahe hain. Rupee gir nahi raha, dollar ke aage cultural respect mein jhuk raha hai—Atithi Devo Bhava!\n\n2. NRIs jab New Jersey se ten dollars birthday gift bhejenge, toh aap sudden millionaire feel karenge! Hum toh wait kar rahe hain kab Rupee hundred hit kare aur hum bat raise karke pure desh mein sweets baant sakein!",
        news_context: "Indian Rupee reaches historical low, approaching ninety five point eighty three against the US Dollar amid global currency adjustments.",
        source_url: "https://moitrastudios.com",
        video_url: null
    },
    {
        title: "RBI Inflation Warnings",
        news_date: "2026-06-04",
        reporter_name: "Mitali",
        reporter_voice_id: "HSdLdxNgP1KF3yQK3IkB",
        question: "1. RBI ne inflation par cautious stance liya hai aur aam janta ki savings khatam ho rahi hain. Log kaise survive karenge?\n\n2. Lekin savings ke bina common man ka future kaise chalega?",
        answer: "1. RBI ka cautious approach toh bas middle class se poochne ka ek highly educated tareeqa hai ki: 'Wait, kya sach mein abhi bhi tum logo ke paas paise bache hain?'.\n\n2. Hum middle class ko ancient art of minimalism aur detachment seekha rahe hain. Jab life insurance se lekar saans lene par eighteen percent GST lag raha ho, toh savings account ki kya zaroorat hai!",
        news_context: "RBI warns of inflation pressures and low household savings as eighteen percent GST on health and life insurance premiums faces public debate.",
        source_url: "https://moitrastudios.com",
        video_url: null
    },
    {
        title: "State sponsored fuel fitness",
        news_date: "2026-06-05",
        reporter_name: "Kanika",
        reporter_voice_id: "21m00Tcm4TlvDq8ikWAM",
        question: "1. Global crude prices girne ke baad bhi India mein petrol ke daam itne painfully high kyun hain?\n\n2. Lekin log heavy taxes de rahe hain aur badle mein unhe bas potholes milte hain.",
        answer: "1. Petrol ke daam high bolna galat hai. Yeh sarkar ki flagship National Health and Fitness Scheme hai—daam mehnge honge toh aap walk karenge aur India fit hoga!\n\n2. Arey, unhi taxes se toh hum election se pehle ek hi pothole ko six times patch karne ka world-class infrastructure fund karte hain! Yeh petrol nahi, premium liquid nationalism hai!",
        news_context: "Fuel and petrol prices remain elevated in India despite global crude price drops, drawing focus before state elections.",
        source_url: "https://moitrastudios.com",
        video_url: null
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
