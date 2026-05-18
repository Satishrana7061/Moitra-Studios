import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, AlertCircle, TrendingUp, CheckCircle, Clock, XCircle, HelpCircle, Shield, BarChart3, FileText, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ManifestoPromise, PromiseStatus } from '../types';
import PromiseStatusBadge from './PromiseStatusBadge';

const ManifestoHub: React.FC = () => {
  const [promises, setPromises] = useState<ManifestoPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<PromiseStatus | 'All'>('All');
  const [filterYear, setFilterYear] = useState<number | 'All'>('All');

  useEffect(() => {
    fetchPromises();
  }, []);

  const fetchPromises = async () => {
    try {
      setLoading(true);
      if (!supabase) {
        console.warn('Supabase not configured. Cannot load manifesto promises.');
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

  const filteredPromises = promises.filter(promise => {
    const matchesSearch = promise.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          promise.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || promise.status === filterStatus;
    const matchesYear = filterYear === 'All' || promise.source_manifesto_year === filterYear;

    return matchesSearch && matchesStatus && matchesYear;
  });

  const getStatusIcon = (status: PromiseStatus) => {
    switch (status) {
      case 'Fulfilled': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'Partially Fulfilled': return <TrendingUp className="w-5 h-5 text-yellow-400" />;
      case 'Not Fulfilled': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'In Progress': return <Clock className="w-5 h-5 text-blue-400" />;
      case 'Unclear': return <HelpCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  // Stats
  const totalPromises = promises.length;
  const fulfilledCount = promises.filter(p => p.status === 'Fulfilled').length;
  const partialCount = promises.filter(p => p.status === 'Partially Fulfilled').length;
  const notFulfilledCount = promises.filter(p => p.status === 'Not Fulfilled').length;
  const inProgressCount = promises.filter(p => p.status === 'In Progress').length;
  const unclearCount = promises.filter(p => p.status === 'Unclear').length;

  return (
    <div className="min-h-screen bg-lokBlue-950 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gameOrange/10 via-transparent to-blue-900/10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gameOrange/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gameOrange/20 border border-gameOrange/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-gameOrange" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-gameOrange/80">Independent • Non-Partisan</span>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black font-heading text-white mb-4 leading-tight">
            Prime Minister's <br/>
            <span className="text-gameOrange">Manifest Tracker</span>
          </h1>
          <p className="text-slate-400 max-w-2xl text-base md:text-lg leading-relaxed">
            A neutral, data-driven accountability tracker. We document election promises from official manifestos, 
            verify their status with legitimate sources, and present the facts transparently.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
        {/* Stats Bar */}
        {totalPromises > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8 -mt-2">
            {[
              { label: 'Total Tracked', count: totalPromises, color: 'text-white', bg: 'bg-slate-800/80', border: 'border-slate-700/50' },
              { label: 'Fulfilled', count: fulfilledCount, color: 'text-green-400', bg: 'bg-green-950/40', border: 'border-green-800/30' },
              { label: 'Partially', count: partialCount, color: 'text-yellow-400', bg: 'bg-yellow-950/40', border: 'border-yellow-800/30' },
              { label: 'Not Fulfilled', count: notFulfilledCount, color: 'text-red-400', bg: 'bg-red-950/40', border: 'border-red-800/30' },
              { label: 'Under Review', count: inProgressCount + unclearCount, color: 'text-blue-400', bg: 'bg-blue-950/40', border: 'border-blue-800/30' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-xl p-4 text-center backdrop-blur-sm`}>
                <div className={`text-2xl md:text-3xl font-black ${stat.color}`}>{stat.count}</div>
                <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 p-4 md:p-5 rounded-2xl flex flex-col md:flex-row gap-4 mb-8 shadow-lg">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search promises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-lokBlue-950/80 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-gameOrange/60 focus:ring-1 focus:ring-gameOrange/20 transition-all text-sm"
            />
          </div>
          
          <div className="flex gap-3 flex-wrap md:flex-nowrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-lokBlue-950/80 border border-slate-700/60 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:border-gameOrange/60 cursor-pointer hover:border-slate-500 transition-all appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2024%2024%22%20fill%3d%22none%22%20stroke%3d%22%239ca3af%22%20stroke-width%3d%222%22%20stroke-linecap%3d%22round%22%20stroke-linejoin%3d%22round%22%3e%3cpath%20d%3d%22m6%209%206%206%206-6%22%2f%3e%3c%2fsvg%3e')] bg-no-repeat bg-[right_12px_center] pr-10"
            >
              <option value="All">All Statuses</option>
              <option value="Fulfilled">Fulfilled</option>
              <option value="Partially Fulfilled">Partially Fulfilled</option>
              <option value="Not Fulfilled">Not Fulfilled</option>
              <option value="In Progress">In Progress</option>
              <option value="Unclear">Unclear</option>
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              className="bg-lokBlue-950/80 border border-slate-700/60 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:border-gameOrange/60 cursor-pointer hover:border-slate-500 transition-all appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2024%2024%22%20fill%3d%22none%22%20stroke%3d%22%239ca3af%22%20stroke-width%3d%222%22%20stroke-linecap%3d%22round%22%20stroke-linejoin%3d%22round%22%3e%3cpath%20d%3d%22m6%209%206%206%206-6%22%2f%3e%3c%2fsvg%3e')] bg-no-repeat bg-[right_12px_center] pr-10"
            >
              <option value="All">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 gap-4">
            <div className="w-12 h-12 border-2 border-gameOrange/20 border-t-gameOrange rounded-full animate-spin" />
            <span className="text-slate-500 text-sm font-medium">Loading promises...</span>
          </div>
        ) : filteredPromises.length === 0 ? (
          <div className="text-center py-24 bg-slate-900/30 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
            <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-300 mb-2 uppercase tracking-wide">No Promises Found</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              {promises.length === 0 
                ? 'Promise data is being prepared. Please check back soon or ensure the database has been seeded.'
                : 'Try adjusting your filters or search query to find what you\'re looking for.'}
            </p>
            {promises.length > 0 && (
              <button 
                onClick={() => { setFilterStatus('All'); setFilterYear('All'); setSearchQuery(''); }}
                className="mt-6 px-6 py-3 bg-gameOrange/20 hover:bg-gameOrange/30 text-gameOrange border border-gameOrange/30 rounded-xl font-bold text-sm uppercase tracking-wider transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-slate-500 font-medium">
                Showing <span className="text-white font-bold">{filteredPromises.length}</span> of {promises.length} promises
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPromises.map((promise, idx) => (
                <Link 
                  key={promise.id} 
                  to={`/manifesto/${promise.slug}`}
                  className="bg-slate-900/50 border border-slate-700/40 hover:border-gameOrange/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(255,107,0,0.08)] group backdrop-blur-sm relative overflow-hidden"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Subtle glow on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gameOrange/0 to-gameOrange/0 group-hover:from-gameOrange/[0.03] group-hover:to-transparent transition-all duration-500 rounded-2xl" />
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[11px] font-bold text-gameOrange/90 bg-gameOrange/10 px-2.5 py-1 rounded-lg tracking-wide uppercase">
                        {promise.source_manifesto_year} • {promise.category}
                      </span>
                      {getStatusIcon(promise.status)}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3 line-clamp-2 group-hover:text-gameOrange transition-colors leading-snug">
                      {promise.title}
                    </h3>
                    <p className="text-slate-400 text-sm line-clamp-3 mb-5 leading-relaxed">
                      "{promise.description}"
                    </p>
                    <div className="pt-4 border-t border-slate-700/30 flex justify-between items-center">
                      <PromiseStatusBadge status={promise.status} />
                      <span className="text-xs text-slate-500 group-hover:text-gameOrange transition-colors flex items-center gap-1 font-semibold">
                        View Details <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Source Attribution Footer */}
        <div className="mt-16 pt-8 border-t border-slate-800/50 text-center">
          <p className="text-xs text-slate-600 max-w-2xl mx-auto leading-relaxed">
            <span className="text-slate-500 font-semibold">Methodology:</span> All promises are sourced directly from official party manifestos and verified campaign speeches. 
            Status evaluations are based on publicly available government data, independent reports, and credible media analysis. 
            This tracker is non-partisan and is updated as new information becomes available.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManifestoHub;
