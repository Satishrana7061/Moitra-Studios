import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, BookOpen, AlertCircle, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ManifestoPromise, PromiseEvidence } from '../types';
import PromiseStatusBadge from './PromiseStatusBadge';

const PromiseDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [promise, setPromise] = useState<ManifestoPromise | null>(null);
  const [evidence, setEvidence] = useState<PromiseEvidence[]>([]);
  const [loading, setLoading] = useState(true);

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
        navigate('/manifesto');
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
          to="/manifesto" 
          className="inline-flex items-center text-slate-400 hover:text-gameOrange transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Manifesto Hub
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
            
            {/* Verdict Summary */}
            <section className="bg-lokBlue-900/20 border border-slate-700/50 rounded-xl p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <AlertCircle className="text-gameOrange w-6 h-6" />
                Our Verdict
              </h2>
              <div className="prose prose-invert prose-orange max-w-none">
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-lg">
                  {promise.verdict_summary}
                </p>
              </div>
            </section>

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

          {/* Sidebar: Reel Integration */}
          <div className="space-y-6">
            {promise.reel_link ? (
              <div className="bg-lokBlue-900/40 border border-slate-700 rounded-xl p-1 overflow-hidden sticky top-24">
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
               <div className="bg-lokBlue-900/20 border border-slate-700/50 border-dashed rounded-xl p-8 text-center sticky top-24">
                 <PlayCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                 <h3 className="text-lg font-bold text-slate-300 mb-2">Reel Coming Soon</h3>
                 <p className="text-slate-500 text-sm">We are producing the video breakdown for this promise.</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromiseDetail;
