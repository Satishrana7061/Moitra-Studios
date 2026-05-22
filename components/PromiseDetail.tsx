import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, BookOpen, AlertCircle, PlayCircle, Video, Loader, CheckCircle, ShieldCheck, FileText, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ManifestoPromise, PromiseEvidence } from '../types';
import PromiseStatusBadge from './PromiseStatusBadge';

const PromiseDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [promise, setPromise] = useState<ManifestoPromise | null>(null);
  const [evidence, setEvidence] = useState<PromiseEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Studio & Publishing States
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'generating' | 'capturing' | 'publishing' | 'success' | 'error'>('idle');
  const [customHindiScript, setCustomHindiScript] = useState('');

  useEffect(() => {
    if (promise) {
      let script = `प्रधानमंत्री नरेंद्र मोदी का बड़ा वादा: ${promise.title}। `;
      if (promise.announced_situation) {
        script += `${promise.announced_situation} के दौरान यह वादा किया गया था। `;
      } else {
        script += `यह वादा ${promise.source_manifesto_year} के चुनावी घोषणापत्र में किया गया था। `;
      }
      
      script += `मूल वादा था कि: ${promise.description}। `;
      
      script += `हमारा निष्पक्ष विश्लेषण: `;
      if (promise.status === 'Fulfilled') {
        script += `यह वादा पूर्ण रूप से पूरा हो चुका है। `;
        if (promise.fulfilled_details) {
          script += `${promise.fulfilled_details} `;
        }
      } else if (promise.status === 'Partially Fulfilled') {
        script += `यह वादा आंशिक रूप से ही पूरा हो सका है। `;
        if (promise.fulfilled_details) {
          script += `${promise.fulfilled_details} `;
        }
        if (promise.unfulfilled_details) {
          script += `हालांकि, ${promise.unfulfilled_details} `;
        }
      } else if (promise.status === 'In Progress') {
        script += `इस वादे पर कार्य अभी प्रगति पर है। `;
        if (promise.fulfilled_details) {
          script += `${promise.fulfilled_details} `;
        }
        if (promise.unfulfilled_details) {
          script += `लेकिन इसे पूरी तरह पूरा होने में ${promise.unfulfilled_details} `;
        }
      } else if (promise.status === 'Not Fulfilled') {
        script += `यह वादा अधूरा रह गया है। `;
        if (promise.unfulfilled_details) {
          script += `${promise.unfulfilled_details} `;
        }
      } else {
        script += `${promise.verdict_summary} `;
      }
      
      script += `सच्चे और निष्पक्ष विश्लेषण के लिए Moitra Studios को फॉलो करें।`;
      
      // Clean up multiple spaces or backslashes
      script = script.replace(/\s+/g, ' ').trim();
      setCustomHindiScript(script);
    }
  }, [promise]);

  const triggerCloudPublish = async () => {
    if (!promise) return;
    setIsPublishing(true);
    setPublishStatus('generating');
    
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const cleanSlug = promise.slug;
      const title = `PM Promise Audit: ${promise.title}`;
      const summary = `Promise: "${promise.description}"\n\nVerdict: ${promise.verdict_summary}`;
      
      if (isLocal) {
        setPublishStatus('capturing');
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
        const publishRes = await fetch(`${backendUrl}/api/admin/trigger-manual-reel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: cleanSlug,
            title,
            summary,
            hindi_content: customHindiScript
          })
        });
        
        if (!publishRes.ok) {
          const errData = await publishRes.json().catch(() => ({ error: "Server error" }));
          throw new Error(errData.error || "Publishing failed");
        }
      } else {
        setPublishStatus('publishing');
        const githubPat = import.meta.env.VITE_GITHUB_PAT;
        if (!githubPat) throw new Error("GitHub PAT not configured for live publishing.");

        const res = await fetch('https://api.github.com/repos/Satishrana7061/Moitra-Studios/dispatches', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubPat}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event_type: 'daily-reels-manual',
            client_payload: {
              slug: cleanSlug,
              title,
              summary: customHindiScript
            }
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "GitHub Dispatch failed");
        }
      }
      
      setPublishStatus('success');
      setTimeout(() => {
        setIsPublishing(false);
        setPublishStatus('idle');
      }, 5000);
      
    } catch (err: any) {
      console.error("Publishing error:", err);
      setPublishStatus('error');
    }
  };

  useEffect(() => {
    if (slug) {
      fetchPromiseDetails(slug);
    }
  }, [slug]);

  const fetchPromiseDetails = async (promiseSlug: string) => {
    try {
      setLoading(true);
      // Fetch Promise
      const { data: promiseData, error: promiseError } = await supabase
        .from('manifesto_promises')
        .select('*')
        .eq('slug', promiseSlug)
        .single();

      if (promiseError) throw promiseError;
      if (!promiseData) {
        navigate('/prime-ministers-promises');
        return;
      }
      setPromise(promiseData);

      // Fetch Evidence
      const { data: evidenceData, error: evidenceError } = await supabase
        .from('promise_evidence')
        .select('*')
        .eq('promise_id', promiseData.id)
        .order('date_published', { ascending: false });

      if (evidenceError) throw evidenceError;
      setEvidence(evidenceData || []);
    } catch (error) {
      console.error('Error fetching promise details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-lokBlue-950 flex justify-center items-center">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-t-2 border-gameOrange animate-spin" />
          <div className="absolute inset-3 rounded-full border-r-2 border-white animate-spin opacity-50" style={{ animationDirection: 'reverse', animationDuration: '1s' }} />
        </div>
      </div>
    );
  }

  if (!promise) return null;

  return (
    <div className="min-h-screen bg-lokBlue-950 text-white selection:bg-gameOrange/30 selection:text-white pb-24">
      
      {/* Premium Gradient Hero */}
      <div className="relative bg-gradient-to-b from-slate-900 via-lokBlue-950 to-lokBlue-950 pt-24 pb-12 border-b border-slate-800/50">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gameOrange/5 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <Link 
            to="/prime-ministers-promises" 
            className="group inline-flex items-center text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-gameOrange transition-colors mb-10"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mr-3 group-hover:border-gameOrange/30 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Back to Database
          </Link>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <PromiseStatusBadge status={promise.status} className="text-xs px-4 py-1.5 shadow-sm" />
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            <span className="inline-flex items-center text-xs font-bold tracking-widest uppercase text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-md border border-slate-700">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {promise.source_manifesto_year}
            </span>
            <span className="inline-flex items-center text-xs font-bold tracking-widest uppercase text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-md border border-slate-700">
              <BookOpen className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {promise.category}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-8 leading-[1.1] tracking-tight">
            {promise.title}
          </h1>

          {/* Original Promise Callout */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 border-l-4 border-l-gameOrange p-6 md:p-8 rounded-2xl rounded-l-none shadow-2xl relative overflow-hidden">
            <ShieldCheck className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-800/30 rotate-12" />
            <h3 className="text-xs font-black text-gameOrange uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Official Commitment
            </h3>
            <p className="text-xl md:text-2xl text-slate-200 font-medium leading-relaxed italic relative z-10">
              "{promise.description}"
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* Verdict Section */}
            <section className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-3xl p-8 hover:border-slate-700 transition-colors group">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-gameOrange/10 border border-gameOrange/20 flex items-center justify-center">
                  <AlertCircle className="text-gameOrange w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Neutral Verdict</h2>
              </div>
              <div className="prose prose-invert prose-lg max-w-none">
                <p className="text-slate-300 leading-relaxed font-medium">
                  {promise.verdict_summary}
                </p>
              </div>
            </section>

            {/* Performance Audit */}
            {(promise.fulfilled_details || promise.unfulfilled_details) && (
              <section className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-3xl p-8 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <ShieldCheck className="text-sky-400 w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Accountability Audit</h2>
                </div>
                
                <div className="space-y-8">
                  {promise.fulfilled_details && (
                    <div className="relative pl-6 border-l-2 border-emerald-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-lokBlue-950 border-2 border-emerald-500" />
                      <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-3">Progress & Fulfillment</h3>
                      <p className="text-slate-300 leading-relaxed">{promise.fulfilled_details}</p>
                    </div>
                  )}
                  
                  {promise.unfulfilled_details && (
                    <div className="relative pl-6 border-l-2 border-rose-500/30">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-lokBlue-950 border-2 border-rose-500" />
                      <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-3">Shortfalls & Delays</h3>
                      <p className="text-slate-300 leading-relaxed">{promise.unfulfilled_details}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Context & Evidence Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-3xl p-8">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" /> Origins
                </h2>
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Date</span>
                    <span className="text-white font-medium">
                      {promise.announced_date ? new Date(promise.announced_date).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      }) : `${promise.source_manifesto_year} Manifesto`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Context</span>
                    <span className="text-white font-medium text-sm leading-relaxed">
                      {promise.announced_situation || `Official BJP Sankalp Patra ${promise.source_manifesto_year}`}
                    </span>
                  </div>
                </div>
              </section>

              <section className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-3xl p-8 flex flex-col">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" /> Citations ({evidence.length})
                </h2>
                {evidence.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-sm italic bg-slate-800/20 rounded-xl">
                    No verified citations yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {evidence.map((item) => (
                      <a 
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-gameOrange/40 hover:bg-slate-800 transition-all"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-900 text-slate-300">
                            {item.source_type}
                          </span>
                        </div>
                        <h4 className="text-sm text-slate-200 font-medium group-hover:text-white transition-colors line-clamp-2">
                          {item.title}
                        </h4>
                        <div className="flex items-center text-[10px] text-slate-500 mt-3 font-semibold uppercase tracking-wider group-hover:text-gameOrange transition-colors">
                          View Source <ChevronRight className="w-3 h-3 ml-1" />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            {/* Reel Player Widget */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-slate-800 bg-slate-900/50">
                <h3 className="font-black text-white flex items-center gap-2">
                  <PlayCircle className="text-gameOrange w-5 h-5" />
                  Reality Check Reel
                </h3>
              </div>
              
              {promise.reel_link ? (
                <div className="aspect-[9/16] bg-black relative flex flex-col items-center justify-center p-6 text-center group">
                  {/* Subtle video glow */}
                  <div className="absolute inset-0 bg-gameOrange/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  <div className="w-16 h-16 rounded-full bg-gameOrange/20 border-2 border-gameOrange/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(255,107,0,0.3)]">
                    <PlayCircle className="w-8 h-8 text-gameOrange ml-1" />
                  </div>
                  
                  <p className="text-sm text-slate-300 mb-6 font-medium relative z-10">
                    Watch our 60-second YouTube Short breakdown of this promise.
                  </p>
                  
                  <a 
                    href={promise.reel_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative z-10 bg-white hover:bg-slate-200 text-slate-900 font-bold py-3 px-6 rounded-full transition-colors flex items-center gap-2 text-sm uppercase tracking-wide"
                  >
                    Play Video
                  </a>
                </div>
              ) : (
                <div className="aspect-[9/16] bg-slate-900/50 relative flex flex-col items-center justify-center p-8 text-center border-t border-slate-800">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 border-dashed flex items-center justify-center mb-6">
                    <Video className="w-6 h-6 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">In Production</h3>
                  <p className="text-sm text-slate-400 font-medium">
                    The video breakdown for this policy is currently being animated.
                  </p>
                </div>
              )}
            </div>

            {/* Content Publisher Studio */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <Video className="w-4 h-4 text-sky-400" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-sky-400">
                  Creator Studio
                </h3>
              </div>
              
              <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
                Generate and deploy a YouTube Short for this promise automatically. Modifying the script alters the AI Voiceover.
              </p>

              <div className="space-y-5 relative z-10">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2 flex items-center justify-between">
                    <span>Hindi AI Script</span>
                    <span className="text-slate-600 font-mono">{customHindiScript.length} chars</span>
                  </label>
                  <textarea
                    value={customHindiScript}
                    onChange={(e) => setCustomHindiScript(e.target.value)}
                    rows={5}
                    disabled={isPublishing}
                    className="w-full bg-slate-950/50 border border-slate-700/80 rounded-xl p-4 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all font-medium leading-relaxed resize-none custom-scrollbar"
                    placeholder="Enter the voiceover script for ElevenLabs..."
                  />
                </div>

                <button
                  onClick={triggerCloudPublish}
                  disabled={isPublishing || !customHindiScript.trim()}
                  className={`w-full py-4 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 ${
                    isPublishing 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                      : 'bg-sky-500 hover:bg-sky-400 text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] active:scale-[0.98]'
                  }`}
                >
                  {isPublishing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin text-sky-400" />
                      {publishStatus === 'generating' && 'Synthesizing Audio...'}
                      {publishStatus === 'capturing' && 'Rendering Video...'}
                      {publishStatus === 'publishing' && 'Uploading to YouTube...'}
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      Deploy Short
                    </>
                  )}
                </button>

                {/* Status Feedback */}
                <div className="h-16 flex items-center justify-center">
                  {publishStatus === 'success' && (
                    <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-3 animate-in fade-in zoom-in duration-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block mb-1">Success</span>
                        <p className="text-[10px] text-emerald-500/80 font-medium">Short successfully published to YouTube channel.</p>
                      </div>
                    </div>
                  )}

                  {publishStatus === 'error' && (
                    <div className="w-full bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3 animate-in fade-in zoom-in duration-300">
                      <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-rose-400 uppercase tracking-widest block mb-1">Failure</span>
                        <p className="text-[10px] text-rose-500/80 font-medium">Deployment failed. Check API configuration.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromiseDetail;
