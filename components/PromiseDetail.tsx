import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, BookOpen, AlertCircle, PlayCircle, Video, Loader, CheckCircle } from 'lucide-react';
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
        <div className="w-10 h-10 border-2 border-gameOrange/20 border-t-gameOrange rounded-full animate-spin" />
      </div>
    );
  }

  if (!promise) return null;

  return (
    <div className="min-h-screen bg-lokBlue-950 text-white p-4 md:p-8 pt-24">
      <div className="max-w-4xl mx-auto">
        <Link 
          to="/prime-ministers-promises" 
          className="inline-flex items-center text-slate-400 hover:text-gameOrange transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to MP Promises
        </Link>

        {/* Header Section */}
        <div className="bg-lokBlue-900/40 border border-slate-700 rounded-2xl p-6 md:p-10 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gameOrange/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="flex flex-wrap gap-3 mb-6 relative z-10">
            <PromiseStatusBadge status={promise.status} className="text-sm px-3 py-1" />
            <span className="inline-flex items-center text-sm text-slate-300 bg-lokBlue-800 px-3 py-1 rounded-full border border-slate-700">
              <Calendar className="w-4 h-4 mr-1" /> {promise.source_manifesto_year} Manifesto
            </span>
            <span className="inline-flex items-center text-sm text-slate-300 bg-lokBlue-800 px-3 py-1 rounded-full border border-slate-700">
              <BookOpen className="w-4 h-4 mr-1" /> {promise.category}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold font-heading text-white mb-6 leading-tight relative z-10">
            {promise.title}
          </h1>

          <div className="bg-slate-900/50 border-l-4 border-gameOrange p-6 rounded-r-xl relative z-10">
            <h3 className="text-sm font-semibold text-gameOrange uppercase tracking-wider mb-2">Original Promise</h3>
            <p className="text-xl text-slate-200 italic font-medium">"{promise.description}"</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content: Verdict & Evidence */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Announcement Details */}
            <section className="bg-lokBlue-900/20 border border-slate-700/50 rounded-xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="text-gameOrange w-5 h-5" />
                Announcement Context
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <span className="text-slate-400 block mb-1">Announcement Date</span>
                  <span className="text-white font-medium text-base">
                    {promise.announced_date ? new Date(promise.announced_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : `Prior to the ${promise.source_manifesto_year} Elections`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Situation / Location</span>
                  <span className="text-white font-medium text-base">
                    {promise.announced_situation || `Released in the Official BJP Sankalp Patra (${promise.source_manifesto_year} Manifesto) by PM Narendra Modi.`}
                  </span>
                </div>
              </div>
            </section>

            {/* Verdict Summary */}
            <section className="bg-lokBlue-900/20 border border-slate-700/50 rounded-xl p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <AlertCircle className="text-gameOrange w-6 h-6" />
                Neutral Verdict
              </h2>
              <div className="prose prose-invert prose-orange max-w-none">
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-lg">
                  {promise.verdict_summary}
                </p>
              </div>
            </section>

            {/* Detailed Performance Audit */}
            {(promise.fulfilled_details || promise.unfulfilled_details) && (
              <section className="bg-lokBlue-900/20 border border-slate-700/50 rounded-xl p-6 md:p-8 space-y-6">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                  <AlertCircle className="text-gameOrange w-6 h-6" />
                  Accountability Audit
                </h2>
                
                {promise.fulfilled_details && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Fulfillment & Actions Delivered</h3>
                    <p className="text-slate-300 leading-relaxed text-base whitespace-pre-wrap">{promise.fulfilled_details}</p>
                  </div>
                )}
                
                {promise.unfulfilled_details && (
                  <div className="space-y-2 border-t border-slate-800 pt-6">
                    <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wider">What is Missing / Why Not Fulfilled & What Went Wrong</h3>
                    <p className="text-slate-300 leading-relaxed text-base whitespace-pre-wrap">{promise.unfulfilled_details}</p>
                  </div>
                )}
              </section>
            )}

            {/* Evidence List */}
            <section className="bg-lokBlue-900/20 border border-slate-700/50 rounded-xl p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-6">Sources & Evidence</h2>
              {evidence.length === 0 ? (
                <p className="text-slate-500 italic">No external sources linked yet.</p>
              ) : (
                <div className="space-y-4">
                  {evidence.map((item) => (
                    <a 
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 rounded-lg bg-lokBlue-800/30 border border-slate-700 hover:border-gameOrange/50 transition-colors group"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {item.source_type}
                            </span>
                            {item.date_published && (
                              <span className="text-xs text-slate-500">
                                {new Date(item.date_published).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <h4 className="text-white font-medium group-hover:text-gameOrange transition-colors">
                            {item.title}
                          </h4>
                        </div>
                        <ExternalLink className="w-5 h-5 text-slate-500 group-hover:text-gameOrange flex-shrink-0 mt-1" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar: Reel Integration & Publisher Studio */}
          <div className="space-y-6 sticky top-24">
            {promise.reel_link ? (
              <div className="bg-lokBlue-900/40 border border-slate-700 rounded-xl p-1 overflow-hidden">
                <div className="bg-slate-900 p-4 text-center rounded-t-lg border-b border-slate-800">
                  <h3 className="font-bold flex items-center justify-center gap-2">
                    <PlayCircle className="text-gameOrange w-5 h-5" />
                    Watch Reality Check
                  </h3>
                </div>
                {/* Embedded Reel or Link Placeholder */}
                <div className="aspect-[9/16] bg-slate-900 relative rounded-b-lg flex flex-col items-center justify-center p-6 text-center">
                   <p className="text-slate-400 mb-4">View the 30-second breakdown for this promise.</p>
                   <a 
                     href={promise.reel_link}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="bg-gameOrange hover:bg-gameOrange/90 text-white font-bold py-3 px-6 rounded-full transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,107,0,0.3)]"
                   >
                     <PlayCircle className="w-5 h-5" />
                     Watch Reel
                   </a>
                </div>
              </div>
            ) : (
               <div className="bg-lokBlue-900/20 border border-slate-700/50 border-dashed rounded-xl p-8 text-center">
                 <PlayCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                 <h3 className="text-lg font-bold text-slate-300 mb-2">Reel Coming Soon</h3>
                 <p className="text-slate-500 text-sm">We are producing the video breakdown for this promise.</p>
               </div>
            )}

            {/* Premium Reel Generation & Publishing Studio */}
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gameOrange/5 rounded-full blur-2xl" />
              
              <h3 className="text-md font-bold uppercase tracking-wider text-gameOrange flex items-center gap-2 mb-3">
                <Video className="w-5 h-5 text-gameOrange" />
                Reality Check Studio
              </h3>
              
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Generate a dynamic, high-impact YouTube Short showcasing our neutral review of this PM Promise.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    AI Voice Narrator Script (Hindi)
                  </label>
                  <textarea
                    value={customHindiScript}
                    onChange={(e) => setCustomHindiScript(e.target.value)}
                    rows={4}
                    disabled={isPublishing}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-gameOrange/50 focus:ring-1 focus:ring-gameOrange/20 transition-all font-sans leading-relaxed resize-none"
                    placeholder="Enter the voiceover script for ElevenLabs..."
                  />
                </div>

                <button
                  onClick={triggerCloudPublish}
                  disabled={isPublishing || !customHindiScript.trim()}
                  className={`w-full py-3 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                    isPublishing 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                      : 'bg-gameOrange hover:bg-gameOrange/90 text-white shadow-[0_0_20px_rgba(255,107,0,0.2)] active:scale-98'
                  }`}
                >
                  {isPublishing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin text-gameOrange" />
                      {publishStatus === 'generating' && 'Generating Audio...'}
                      {publishStatus === 'capturing' && 'Capturing Video...'}
                      {publishStatus === 'publishing' && 'Publishing to YouTube...'}
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      Publish Short to YouTube
                    </>
                  )}
                </button>

                {/* Status Messages */}
                {publishStatus === 'success' && (
                  <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-lg p-3 flex items-center gap-3 text-xs text-emerald-400 animate-fade-in">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold block">Video Published!</span>
                      The Short is live on your YouTube channel.
                    </div>
                  </div>
                )}

                {publishStatus === 'error' && (
                  <div className="bg-red-950/40 border border-red-800/30 rounded-lg p-3 flex items-center gap-3 text-xs text-red-400 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <div>
                      <span className="font-bold block">Production Failed</span>
                      Check your backend API keys & local connection.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromiseDetail;
