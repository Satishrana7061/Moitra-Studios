import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Search, BookOpen, AlertCircle, TrendingUp, CheckCircle, Clock, XCircle, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ManifestoPromise, PromiseStatus } from '../types';
import PromiseStatusBadge from './PromiseStatusBadge';

const ManifestoHub: React.FC = () => {
  const [promises, setPromises] = useState<ManifestoPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<PromiseStatus | 'All'>('All');
  const [filterYear, setFilterYear] = useState<number | 'All'>('All');
  const [filterCategory, setFilterCategory] = useState<string | 'All'>('All');

  useEffect(() => {
    fetchPromises();
  }, []);

  const fetchPromises = async () => {
    try {
      setLoading(true);
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

  const categories = Array.from(new Set(promises.map(p => p.category)));
  const years = Array.from(new Set(promises.map(p => p.source_manifesto_year))).sort((a, b) => b - a);

  const filteredPromises = promises.filter(promise => {
    const matchesSearch = promise.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          promise.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || promise.status === filterStatus;
    const matchesYear = filterYear === 'All' || promise.source_manifesto_year === filterYear;
    const matchesCategory = filterCategory === 'All' || promise.category === filterCategory;

    return matchesSearch && matchesStatus && matchesYear && matchesCategory;
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

  return (
    <div className="min-h-screen bg-lokBlue-950 text-white p-4 md:p-8 pt-24 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-5xl font-bold font-heading text-gameOrange mb-4 flex items-center gap-3">
          <BookOpen className="w-10 h-10" />
          Prime Minister's Manifest
        </h1>
        <p className="text-slate-300 max-w-3xl text-lg mb-6">
          A neutral, data-driven tracker of political promises made during election campaigns. 
          We track what was promised, analyze the current status, and provide evidence from official sources.
        </p>

        {/* Filters */}
        <div className="bg-lokBlue-900/50 border border-slate-700 p-4 rounded-xl flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search promises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-lokBlue-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-gameOrange transition-colors"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap md:flex-nowrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-lokBlue-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gameOrange"
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
              className="bg-lokBlue-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gameOrange"
            >
              <option value="All">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-lokBlue-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gameOrange"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-2 border-gameOrange/20 border-t-gameOrange rounded-full animate-spin" />
        </div>
      ) : filteredPromises.length === 0 ? (
        <div className="text-center py-20 bg-lokBlue-900/30 rounded-xl border border-slate-800">
          <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300">No promises found</h3>
          <p className="text-slate-500 mt-2">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPromises.map(promise => (
            <Link 
              key={promise.id} 
              to={`/manifesto/${promise.slug}`}
              className="bg-lokBlue-900/40 border border-slate-700 hover:border-gameOrange/50 rounded-xl p-5 transition-all hover:-translate-y-1 group"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-semibold text-gameOrange bg-gameOrange/10 px-2 py-1 rounded">
                  {promise.source_manifesto_year} • {promise.category}
                </span>
                {getStatusIcon(promise.status)}
              </div>
              <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-gameOrange transition-colors">
                {promise.title}
              </h3>
              <p className="text-slate-400 text-sm line-clamp-3 mb-4">
                "{promise.description}"
              </p>
              <div className="mt-auto pt-4 border-t border-slate-700/50 flex justify-between items-center">
                <PromiseStatusBadge status={promise.status} />
                <span className="text-xs text-slate-500 group-hover:text-gameOrange transition-colors">
                  View Details →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManifestoHub;
