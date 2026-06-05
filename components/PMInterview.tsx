import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, ArrowLeft, Mic, Calendar, User, Newspaper, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NAV_LINKS } from '../constants';

interface Interview {
    id: string;
    title: string;
    news_date: string;
    reporter_name: string;
    reporter_voice_id: string;
    question: string;
    answer: string;
    news_context: string;
    source_url?: string;
    video_url?: string;
    created_at: string;
}

// Map anchor avatars
const ANCHOR_AVATARS: Record<string, string> = {
    'Kanika': 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Kamala_Gurung_Nepali_Female_Journalist.jpg',
    'Amit Gupta': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Tarun_J_Tejpal_2007.jpg',
    'Sia': 'https://upload.wikimedia.org/wikipedia/commons/b/be/Juhi_Smita_Indian_Journalist_with_Padmashree.jpg',
    'Mitali': 'https://upload.wikimedia.org/wikipedia/commons/b/be/Juhi_Smita_Indian_Journalist_with_Padmashree.jpg'
};
const MODI_AVATAR = 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Narendra_Damodardas_Modi.jpg';

const PMInterview: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [activeInterview, setActiveInterview] = useState<Interview | null>(null);
    const [loading, setLoading] = useState(true);
    const [generatingReel, setGeneratingReel] = useState(false);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

    // Mock data for fallback
    const mockInterview: Interview = {
        id: 'mock-1',
        title: 'Judicial Infrastructure & Modernization',
        news_date: new Date().toISOString().split('T')[0],
        reporter_name: 'Kanika',
        reporter_voice_id: 'y2H4TwIU5I2L0JXOdBeX',
        question: 'मोदी जी, देश की अदालतों में लंबित मुकदमों की संख्या लगातार बढ़ रही है और इंफ्रास्ट्रक्चर की भारी कमी है। आपकी सरकार इस गंभीर संकट को दूर करने के लिए क्या कदम उठा रही है?',
        answer: 'हमारे देश के न्यायालयों को आधुनिक बनाना हमारी प्राथमिकता है। हमने फास्ट ट्रैक कोर्ट्स का विस्तार किया है और डिजिटल न्याय वितरण को बढ़ावा देने के लिए ई-कोर्ट्स मिशन मोड प्रोजेक्ट लॉन्च किया है। इसके अलावा, हमने पिछले वर्षों में 1500 से अधिक पुराने और अप्रासंगिक कानूनों को पूरी तरह से समाप्त कर दिया है, जिससे कानूनी प्रक्रिया सरल और तीव्र हो सके। सरकार न्याय प्रणाली को मजबूत करने के लिए प्रतिबद्ध है।',
        news_context: 'देश भर की जिला अदालतों में आधुनिक बुनियादी ढांचे और प्रौद्योगिकी का अभाव है, जिसके कारण मुकदमों के निपटारे में अत्यधिक देरी हो रही है। कानून मंत्रालय के हालिया आंकड़ों के अनुसार न्याय प्रणाली में डिजिटलीकरण की तत्काल आवश्यकता है।',
        source_url: 'https://moitrastudios.com',
        created_at: new Date().toISOString()
    };

    useEffect(() => {
        document.title = "PM Open Press Conference | Rajneeti";

        const fetchInterviews = async () => {
            setLoading(true);
            try {
                if (supabase) {
                    const { data, error } = await supabase
                        .from('pm_interviews')
                        .select('*')
                        .order('news_date', { ascending: false });

                    if (!error && data && data.length > 0) {
                        setInterviews(data);
                        // If slug matches an interview, set it active, otherwise use the latest
                        if (slug) {
                            const match = data.find(i => i.id === slug || i.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug);
                            setActiveInterview(match || data[0]);
                        } else {
                            setActiveInterview(data[0]);
                        }
                    } else {
                        // Fallback if empty database
                        setInterviews([mockInterview]);
                        setActiveInterview(mockInterview);
                    }
                } else {
                    setInterviews([mockInterview]);
                    setActiveInterview(mockInterview);
                }
            } catch (err) {
                console.error("Failed to fetch interviews:", err);
                setInterviews([mockInterview]);
                setActiveInterview(mockInterview);
            } finally {
                setLoading(false);
            }
        };

        fetchInterviews();
    }, [slug]);

    useEffect(() => {
        setGeneratedVideoUrl(null);
    }, [activeInterview?.id]);

    const handleGenerateReel = async (interviewId: string) => {
        setGeneratingReel(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
            const response = await fetch(`${backendUrl}/api/admin/trigger-conversational-reel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ interviewId }),
            });

            const data = await response.json();
            if (response.ok && data.success && data.publicUrl) {
                setGeneratedVideoUrl(data.publicUrl);
                alert("Reel compiled successfully!");
            } else {
                alert(`Failed to compile reel: ${data.error || 'Unknown error'}`);
            }
        } catch (err: any) {
            console.error("Failed to generate reel:", err);
            alert(`Error connecting to backend: ${err.message}`);
        } finally {
            setGeneratingReel(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 pb-12 bg-slate-950 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-gameOrange/20 border-t-gameOrange rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-rajdhani text-sm tracking-widest uppercase">Fetching PM Briefings...</p>
            </div>
        );
    }

    const reporterAvatar = activeInterview ? (ANCHOR_AVATARS[activeInterview.reporter_name] || ANCHOR_AVATARS['Kanika']) : ANCHOR_AVATARS['Kanika'];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col overflow-x-hidden pt-12 md:pt-16">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.08)_0%,rgba(29,78,216,0.05)_50%,rgba(0,0,0,0.95)_100%)] pointer-events-none z-0" />
            
            <main className="flex-1 max-w-6xl mx-auto w-full px-4 pb-20 relative z-10">
                <header className="mb-12 text-center">
                    <div className="inline-flex items-center justify-center gap-3 bg-gameOrange/10 text-gameOrange border border-gameOrange/20 px-4 py-2 rounded-full mb-6">
                        <MessageSquare size={16} className="animate-pulse" />
                        <span className="text-[10px] font-black tracking-widest uppercase">Rajneeti Daily Accountability</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black font-serif text-white tracking-tight mb-4 uppercase">
                        PM <span className="bg-gradient-to-r from-gameOrange to-amber-500 bg-clip-text text-transparent">Open Press</span> Conference
                    </h1>
                    <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed normal-case">
                        Daily open press conference dialogues with Prime Minister Narendra Modi regarding major problems and latest developments facing India. Factual responses verified against genuine official records.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT PANEL: Archived Interviews list */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-lg font-black font-rajdhani text-white uppercase tracking-widest border-b border-white/5 pb-4 mb-4 flex items-center gap-2">
                                <Newspaper size={18} className="text-gameOrange" /> Past Conferences
                            </h3>
                            <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                {interviews.map(item => {
                                    const isActive = activeInterview?.id === item.id;
                                    const linkSlug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => navigate(`/pm-interview/${linkSlug}`)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                                isActive 
                                                    ? 'bg-gameOrange/15 border-gameOrange text-white shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
                                                    : 'bg-slate-950/40 border-white/5 hover:border-white/10 hover:bg-slate-900/40 text-slate-400'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <Calendar size={12} className="text-gameOrange" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">{item.news_date}</span>
                                            </div>
                                            <h4 className={`text-sm font-bold leading-snug line-clamp-2 ${isActive ? 'text-white' : 'text-slate-300'}`}>
                                                {item.title}
                                            </h4>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* MAIN DIALOGUE INTERVIEW CONTAINER */}
                    {activeInterview && (
                        <div className="lg:col-span-8 flex flex-col gap-6">
                            {/* News context details */}
                            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl pointer-events-none" />
                                <h3 className="text-xs font-black text-gameBlue uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Newspaper size={14} /> Background Context / Daily News Issue
                                </h3>
                                <p className="text-slate-300 text-sm leading-relaxed normal-case font-medium">
                                    {activeInterview.news_context}
                                </p>
                            </div>

                            {/* Dialogue Chat area */}
                            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col gap-8 relative overflow-hidden min-h-[500px]">
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gameOrange/5 rounded-full blur-3xl pointer-events-none" />
                                
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                                    <div>
                                        <h2 className="text-2xl font-black font-rajdhani text-white uppercase tracking-wider">
                                            {activeInterview.title}
                                        </h2>
                                        <div className="flex items-center gap-2 text-slate-500 mt-1">
                                            <Calendar size={12} />
                                            <span className="text-xs font-bold">{activeInterview.news_date}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            onClick={() => handleGenerateReel(activeInterview.id)}
                                            disabled={generatingReel}
                                            className="flex items-center gap-2 bg-gradient-to-r from-gameOrange to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-gameOrange/20 hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none"
                                        >
                                            {generatingReel ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                    <span>Compiling Reel...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Mic size={14} />
                                                    <span>Generate Video Reel</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-6">
                                    {(() => {
                                        const qTurns = activeInterview.question.split('\n\n');
                                        const aTurns = activeInterview.answer.split('\n\n');
                                        
                                        return qTurns.map((q, idx) => {
                                            const cleanQ = q.replace(/^(1\.|2\.|Q1:|Q2:)\s*/i, '').trim();
                                            const rawA = aTurns[idx] || '';
                                            const cleanA = rawA.replace(/^(1\.|2\.|A1:|A2:)\s*/i, '').trim();

                                            return (
                                                <React.Fragment key={idx}>
                                                    {cleanQ && (
                                                        <div className="flex gap-4 items-start max-w-[85%] self-start animate-fade-in">
                                                            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 shadow-md shrink-0 bg-blue-950 flex items-center justify-center">
                                                                <img src={reporterAvatar} alt={activeInterview.reporter_name} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-black text-gameBlue uppercase tracking-widest">Reporter {activeInterview.reporter_name}</span>
                                                                    <Mic size={10} className="text-gameBlue" />
                                                                </div>
                                                                <div className="bg-slate-950/60 border border-blue-900/20 text-slate-200 px-5 py-4 rounded-2xl rounded-tl-none shadow-md text-sm md:text-base leading-relaxed normal-case">
                                                                    {cleanQ}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {cleanA && (
                                                        <div className="flex gap-4 items-start max-w-[85%] self-end flex-row-reverse animate-fade-in">
                                                            <div className="w-12 h-12 rounded-full overflow-hidden border border-gameOrange/30 shadow-md shrink-0 bg-orange-950 flex items-center justify-center">
                                                                <img src={MODI_AVATAR} alt="Narendra Modi" className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="flex flex-col gap-1 items-end">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-black text-gameOrange uppercase tracking-widest">PM Narendra Modi</span>
                                                                    <Mic size={10} className="text-gameOrange" />
                                                                </div>
                                                                <div className="bg-gameOrange/5 border border-gameOrange/20 text-slate-200 px-5 py-4 rounded-2xl rounded-tr-none shadow-md text-sm md:text-base leading-relaxed normal-case">
                                                                    {cleanA}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </React.Fragment>
                                            );
                                        });
                                    })()}
                                </div>

                                {/* Video Player Section */}
                                {(activeInterview.video_url || generatedVideoUrl) && (
                                    <div className="mt-8 border-t border-white/5 pt-8 animate-fade-in">
                                        <h3 className="text-xs font-black text-gameOrange uppercase tracking-widest mb-4">
                                            📺 Compiled Press Conference Reel
                                        </h3>
                                        <div className="max-w-md mx-auto aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-black">
                                            <video 
                                                src={activeInterview.video_url || generatedVideoUrl || ''} 
                                                controls 
                                                className="w-full h-full object-cover"
                                                poster="https://upload.wikimedia.org/wikipedia/commons/e/ec/Narendra_Modi_delivering_his_address_to_the_Nation.jpg"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PMInterview;
