
import React, { useState, useEffect } from 'react';
import { ContactFormState } from '../types';
import { Mail, Send, CheckCircle, ExternalLink } from 'lucide-react';
import { STUDIO_INFO } from '../constants';

const ContactSection: React.FC = () => {
  const [form, setForm] = useState<ContactFormState>({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Contact Moitra Studios | Rajneeti Game Support';
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => {
      setSubmitted(true);
      setForm({ name: '', email: '', message: '' });
    }, 1000);
  };

  return (
    <section className="min-h-full w-full bg-slate-950 font-sans overflow-y-auto">
      {/* Hero Banner */}
      <div className="relative w-full py-10 md:py-16 bg-gradient-to-b from-red-900/30 via-slate-950 to-slate-950">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FF6B00 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-1.5 rounded-full mb-4">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em]">Moitra Studios HQ</span>
          </div>
          <h1 className="font-cinzel text-2xl md:text-4xl font-black text-white mb-3 uppercase tracking-wider">
            Get In Touch
          </h1>
          <p className="text-slate-400 text-sm md:text-base normal-case max-w-xl mx-auto">
            Have feedback about Rajneeti or want to collaborate? We would love to hear from you.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 -mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: Info Cards */}
          <div className="lg:col-span-2 space-y-4">
            {/* Email Card */}
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 hover:border-gameOrange/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gameOrange/10 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-gameOrange" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Email</p>
                  <a href={`mailto:${STUDIO_INFO.email}`} className="text-white text-sm font-bold hover:text-gameOrange transition-colors normal-case">
                    {STUDIO_INFO.email}
                  </a>
                </div>
              </div>
            </div>

            {/* Social Card */}
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">Follow Us</p>
              <div className="flex gap-3">
                <a href={STUDIO_INFO.twitter} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 group">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-300 group-hover:fill-white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="text-xs text-slate-300 group-hover:text-white font-bold uppercase tracking-wider">X / Twitter</span>
                </a>
                <a href={STUDIO_INFO.linkedin} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 group">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-300 group-hover:fill-blue-400" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <span className="text-xs text-slate-300 group-hover:text-white font-bold uppercase tracking-wider">LinkedIn</span>
                </a>
              </div>
            </div>

            {/* Play Store Card */}
            <div className="bg-gradient-to-br from-gameOrange/10 to-red-900/10 backdrop-blur-sm border border-gameOrange/20 rounded-2xl p-6">
              <p className="text-[10px] text-gameOrange uppercase tracking-widest font-bold mb-3">Download The Game</p>
              <a
                href="https://play.google.com/store/apps/details?id=com.rajneeti"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-black/40 hover:bg-black/60 border border-white/10 px-5 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 group w-full"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-gameOrange" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a2.203 2.203 0 01-.61-1.511V3.325c0-.573.22-1.092.61-1.511zM14.502 12.71l2.583 2.583-9.524 5.49a2.189 2.189 0 01-1.353.284l8.294-8.357zM17.839 12.427L20.8 10.71c.73-.418.73-1.482 0-1.9L17.84 7.093l-3.34 3.341 3.339 1.993zM14.502 11.29l-8.293-8.357a2.189 2.189 0 011.353.284l9.524 5.49-2.584 2.583z" />
                </svg>
                <div className="flex flex-col items-start leading-none gap-[1px]">
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Get it on</span>
                  <span className="text-[15px] font-black text-white tracking-tight">Google Play</span>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 ml-auto group-hover:text-white transition-colors" />
              </a>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 md:p-8">
              {submitted ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-cinzel font-black text-white mb-2 uppercase tracking-widest">Message Sent</h3>
                  <p className="text-slate-400 text-sm normal-case mb-6">Thank you for reaching out. We'll get back to you soon.</p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-gameOrange font-bold uppercase tracking-widest hover:text-white transition-colors text-xs border border-gameOrange/30 px-6 py-2 rounded-lg hover:bg-gameOrange/10"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Your Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3.5 text-white text-sm focus:outline-none focus:border-gameOrange/50 focus:ring-1 focus:ring-gameOrange/20 transition-all placeholder-slate-600 normal-case"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3.5 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-slate-600 normal-case"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Message</label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none placeholder-slate-600 normal-case"
                      placeholder="How can we help?"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="relative overflow-hidden bg-gradient-to-r from-gameOrange to-red-600 hover:from-red-500 hover:to-gameOrange text-white font-cinzel font-black py-3.5 px-10 uppercase tracking-[0.2em] transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,107,0,0.3)] rounded-xl border border-white/10 hover:border-white/20 group text-sm"
                    >
                      <div className="flex items-center gap-3 relative z-10">
                        <Send size={16} className="group-hover:rotate-12 transition-transform duration-300" />
                        Send Message
                      </div>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
