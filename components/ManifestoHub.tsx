import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, AlertCircle, TrendingUp, CheckCircle, Clock, XCircle, HelpCircle, Shield, FileText, ArrowRight, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ManifestoPromise, PromiseStatus } from '../types';
import PromiseStatusBadge from './PromiseStatusBadge';

const Counter = ({ end, duration = 1000 }: { end: number, duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function: easeOutQuart
      const easeOut = 1 - Math.pow(1 - percentage, 4);
      setCount(Math.floor(end * easeOut));

      if (percentage < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span>{count}</span>;
};

const ManifestoHub: React.FC = () => {
  const [promises, setPromises] = useState<ManifestoPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<PromiseStatus | 'All'>('All');
  const [filterYear, setFilterYear] = useState<number | 'All'>('All');
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    fetchPromises();
  }, []);

  const fetchPromises = async () => {
    try {
      setLoading(true);
      if (!supabase) {
        setPromises([]);
        return;
      }
      const { data, error } = await supabase
        .from('manifesto_promises')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromises(data || []);
    } catch (error) {
      console.error('Error fetching promises:', error);
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from(new Set(promises.map(p => p.source_manifesto_year))).sort((a, b) => b - a);

  const filteredPromises = useMemo(() => {
    return promises.filter(promise => {
      const matchesSearch = promise.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            promise.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'All' || promise.status === filterStatus;
      const matchesYear = filterYear === 'All' || promise.source_manifesto_year === filterYear;
      return matchesSearch && matchesStatus && matchesYear;
    });
  }, [promises, searchQuery, filterStatus, filterYear]);

  const visiblePromises = filteredPromises.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 24);
  };

  const getStatusIcon = (status: PromiseStatus) => {
    switch (status) {
      case 'Fulfilled': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'Partially Fulfilled': return <TrendingUp className="w-5 h-5 text-amber-400" />;
      case 'Not Fulfilled': return <XCircle className="w-5 h-5 text-rose-500" />;
      case 'In Progress': return <Clock className="w-5 h-5 text-sky-400" />;
      case 'Unclear': return <HelpCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  // Stats
  const totalPromises = promises.length;
  const fulfilledCount = promises.filter(p => p.status === 'Fulfilled').length;
  const partialCount = promises.filter(p => p.status === 'Partially Fulfilled').length;
  const notFulfilledCount = promises.filter(p => p.status === 'Not Fulfilled').length;
  const inProgressCount = promises.filter(p => p.status === 'In Progress').length;
  const unclearCount = promises.filter(p => p.status === 'Unclear').length;

  // CSS Donut Chart logic
  const total = totalPromises || 1;
  const fulfilledPct = (fulfilledCount / total) * 100;
  const partialPct = (partialCount / total) * 100;
  const notFulfilledPct = (notFulfilledCount / total) * 100;
  const inProgressPct = (inProgressCount / total) * 100;
  const unclearPct = (unclearCount / total) * 100;

  const p1 = fulfilledPct;
  const p2 = p1 + partialPct;
  const p3 = p2 + notFulfilledPct;
  const p4 = p3 + inProgressPct;
  const p5 = p4 + unclearPct;

  const conicGradient = `conic-gradient(
    #34d399 0% ${p1}%,
    #fbbf24 ${p1}% ${p2}%,
    #f43f5e ${p2}% ${p3}%,
    #38bdf8 ${p3}% ${p4}%,
    #94a3b8 ${p4}% ${p5}%
  )`;

  return (
    <div className="min-h-screen bg-lokBlue-950 text-white selection:bg-gameOrange/30 selection:text-white pb-20">
      {/* Premium Bloomberg/Apple style Hero */}
      <div className="relative pt-24 pb-16 overflow-hidden border-b border-slate-800/60 bg-gradient-to-b from-lokBlue-950 to-slate-900/50">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-gameOrange/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-sky-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gameOrange/10 border border-gameOrange/20 mb-6">
                <Shield className="w-4 h-4 text-gameOrange" />
                <span className="text-xs font-bold uppercase tracking-widest text-gameOrange">Non-Partisan Tracker</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-6 tracking-tight">
                PM Promises <br />
                <span className="text-gameOrange">Accountability</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 font-medium max-w-2xl leading-relaxed">
                A verified, data-driven audit of official election manifestos. 
                Tracking political commitments with transparent evidence and independent analysis.
              </p>
            </div>

            {/* CSS Donut Chart & Overview */}
            {totalPromises > 0 && (
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl flex items-center gap-8 shadow-2xl shrink-0 hover:border-slate-700/80 transition-colors">
                <div className="relative w-32 h-32 flex-shrink-0">
                  {/* The Donut */}
                  <div 
                    className="w-full h-full rounded-full"
                    style={{ background: conicGradient }}
                  />
                  {/* The Inner Hole */}
                  <div className="absolute inset-2 bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-3xl font-black text-white leading-none"><Counter end={totalPromises} /></span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-1">Total</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                    <span className="text-sm font-semibold text-slate-300 w-24">Fulfilled</span>
                    <span className="text-sm font-bold text-white"><Counter end={fulfilledCount} /></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                    <span className="text-sm font-semibold text-slate-300 w-24">Partially</span>
                    <span className="text-sm font-bold text-white"><Counter end={partialCount} /></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                    <span className="text-sm font-semibold text-slate-300 w-24">Unfulfilled</span>
                    <span className="text-sm font-bold text-white"><Counter end={notFulfilledCount} /></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-12">
        {/* Advanced Filters */}
        <div className="sticky top-4 z-40 bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 p-2 pl-4 rounded-2xl flex flex-col md:flex-row gap-3 mb-10 shadow-2xl">
          <div className="flex-1 relative flex items-center">
            <Search className="absolute left-0 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search manifesto promises, policies, or keywords..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(24); }}
              className="w-full bg-transparent pl-8 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm font-medium"
            />
          </div>
          
          <div className="h-px w-full md:h-10 md:w-px bg-slate-800" />
          
          <div className="flex gap-2 p-1">
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value as any); setVisibleCount(24); }}
                className="appearance-none bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl pl-4 pr-10 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-gameOrange/50 focus:ring-1 focus:ring-gameOrange/50 transition-all cursor-pointer h-full"
              >
                <option value="All">All Statuses</option>
                <option value="Fulfilled">Fulfilled</option>
                <option value="Partially Fulfilled">Partially Fulfilled</option>
                <option value="Not Fulfilled">Not Fulfilled</option>
                <option value="In Progress">In Progress</option>
                <option value="Unclear">Unclear</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={filterYear}
                onChange={(e) => { setFilterYear(e.target.value === 'All' ? 'All' : Number(e.target.value)); setVisibleCount(24); }}
                className="appearance-none bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl pl-4 pr-10 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-gameOrange/50 focus:ring-1 focus:ring-gameOrange/50 transition-all cursor-pointer h-full"
              >
                <option value="All">All Years</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-t-2 border-gameOrange animate-spin" />
              <div className="absolute inset-2 rounded-full border-r-2 border-sky-400 animate-spin opacity-50" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
            <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Compiling Evidence...</span>
          </div>
        ) : filteredPromises.length === 0 ? (
          <div className="text-center py-32 bg-slate-900/30 rounded-3xl border border-slate-800/50 backdrop-blur-md">
            <div className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-8 shadow-inner border border-slate-700/50">
              <FileText className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-3xl font-black text-white mb-3 tracking-tight">No Promises Found</h3>
            <p className="text-slate-400 max-w-md mx-auto text-lg">
              {promises.length === 0 
                ? 'The database is currently being populated with verified manifestos.'
                : 'Adjust your filters or search terms to uncover specific policies.'}
            </p>
            {promises.length > 0 && (
              <button 
                onClick={() => { setFilterStatus('All'); setFilterYear('All'); setSearchQuery(''); }}
                className="mt-8 px-8 py-3 bg-white text-slate-900 rounded-full font-bold text-sm tracking-wide hover:bg-slate-200 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
                Showing <span className="text-white">{visiblePromises.length}</span> of <span className="text-white">{filteredPromises.length}</span> Results
              </p>
              <div className="h-px bg-slate-800 flex-1 ml-6" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visiblePromises.map((promise, idx) => (
                <Link 
                  key={promise.id} 
                  to={`/prime-ministers-promises/${promise.slug}`}
                  className="group relative bg-slate-900/40 backdrop-blur-md border border-slate-800 hover:border-gameOrange/50 rounded-3xl p-7 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(255,107,0,0.15)] flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationFillMode: 'both', animationDelay: `${(idx % 24) * 50}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-gameOrange/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-5 gap-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-md uppercase tracking-wider border border-slate-700/50">
                          {promise.source_manifesto_year}
                        </span>
                        <span className="text-[10px] font-bold text-gameOrange/90 bg-gameOrange/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-gameOrange/20 truncate max-w-[120px]">
                          {promise.category}
                        </span>
                      </div>
                      <div className="shrink-0 p-2 bg-slate-800/50 rounded-xl border border-slate-700/50 group-hover:scale-110 transition-transform duration-300">
                        {getStatusIcon(promise.status)}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-3 line-clamp-3 group-hover:text-gameOrange transition-colors leading-snug">
                      {promise.title}
                    </h3>
                    
                    <p className="text-slate-400 text-sm line-clamp-3 mb-6 leading-relaxed flex-1">
                      {promise.description}
                    </p>
                    
                    <div className="pt-5 border-t border-slate-800/80 flex justify-between items-center mt-auto">
                      <PromiseStatusBadge status={promise.status} />
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-gameOrange transition-colors border border-slate-700">
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {visibleCount < filteredPromises.length && (
              <div className="flex justify-center pt-8">
                <button
                  onClick={handleLoadMore}
                  className="px-8 py-4 bg-slate-900 border border-slate-700 hover:border-gameOrange/50 hover:bg-slate-800 rounded-full text-sm font-bold text-white uppercase tracking-widest transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,107,0,0.15)] flex items-center gap-3"
                >
                  <ChevronDown className="w-4 h-4" />
                  Load More Promises
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManifestoHub;
