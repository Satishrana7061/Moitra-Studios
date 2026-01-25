
import React, { useState } from 'react';
import { ContactFormState } from '../types';
import { Mail, Twitter, Linkedin, CheckCircle, Send } from 'lucide-react';
import { STUDIO_INFO } from '../constants';

const ContactSection: React.FC = () => {
  const [form, setForm] = useState<ContactFormState>({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

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
    <section className="h-full w-full flex flex-col bg-transparent font-sans overflow-hidden uppercase">
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-8 overflow-hidden">
        {/* Stationary Header Section - Shrunk and tight */}
        <div className="text-center mb-6 border-b-2 border-black/20 pb-4 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-cinzel font-black text-white mb-2 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase tracking-wider">Get In Touch</h2>
          <p className="text-gameOrange/80 font-cinzel text-[7px] uppercase tracking-[0.4em] font-black max-w-2xl mx-auto italic">
            Contact Moitra Studios HQ. We would love to hear from you.
          </p>
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 p-1">
            {/* Contact Info - Compact */}
            <div className="bg-gameDarkBlue border-[2px] border-black p-5 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] h-fit">
              <h3 className="text-md font-cinzel font-black text-white mb-6 uppercase tracking-widest border-b-2 border-black/20 pb-3">Our Information</h3>
              <div className="space-y-6">
                <a href={`mailto:${STUDIO_INFO.email}`} className="group flex items-center gap-4 text-slate-300 hover:text-gameYellow transition-all">
                  <div className="bg-lokBlue-950 p-3 border border-white/10 shadow-[4px_4px_0px_rgba(0,0,0,0.3)] group-hover:bg-gameOrange/20 transition-colors">
                    <Mail size={18} className="text-gameOrange" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] uppercase tracking-widest text-slate-500 font-black mb-0.5">Email</span>
                    <span className="font-cinzel font-bold text-sm lowercase">{STUDIO_INFO.email}</span>
                  </div>
                </a>

                <div className="pt-6 border-t-2 border-black/20">
                  <h4 className="text-[7px] font-black text-gameBlue uppercase tracking-[0.4em] mb-4">Follow Us</h4>
                  <div className="flex gap-4">
                    <a href={STUDIO_INFO.twitter} className="group p-2.5 bg-lokBlue-950 border border-white/10 shadow-[4px_4px_0px_rgba(0,0,0,0.3)] text-slate-300 hover:text-white hover:bg-black transition-all">
                      <Twitter size={18} className="group-hover:drop-shadow(0 0 8px rgba(0, 190, 255, 0.5))" />
                    </a>
                    <a href={STUDIO_INFO.linkedin} className="group p-2.5 bg-lokBlue-950 border border-white/10 shadow-[4px_4px_0px_rgba(0,0,0,0.3)] text-slate-300 hover:text-white hover:bg-black transition-all">
                      <Linkedin size={18} className="group-hover:drop-shadow(0 0 8px rgba(0, 190, 255, 0.5))" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Form - Compact scaling */}
            <div className="bg-gameDarkBlue border-[2px] border-black p-6 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] max-w-lg mx-auto w-full">
              {submitted ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 animate-fade-in font-cinzel">
                  <div className="w-14 h-14 bg-gameGreen/20 border-2 border-gameGreen rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(76,175,80,0.3)]">
                    <CheckCircle className="w-8 h-8 text-gameGreen" />
                  </div>
                  <h3 className="text-lg font-black text-white mb-2 uppercase tracking-widest">Message Sent</h3>
                  <p className="text-slate-400 font-medium text-[11px] lowercase">Thank you for your message.</p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 text-gameOrange font-black uppercase tracking-widest hover:text-white transition-colors text-[9px]"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="group">
                    <label htmlFor="name" className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 group-focus-within:text-gameOrange transition-colors">Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      className="w-full bg-lokBlue-950 border-2 border-black p-3 text-white font-cinzel text-xs focus:outline-none focus:border-gameOrange transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                      placeholder="YOUR NAME"
                    />
                  </div>
                  <div className="group">
                    <label htmlFor="email" className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 group-focus-within:text-gameBlue transition-colors">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      className="w-full bg-lokBlue-950 border-2 border-black p-3 text-white font-cinzel text-xs focus:outline-none focus:border-gameBlue transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                      placeholder="EMAIL@EXAMPLE.COM"
                    />
                  </div>
                  <div className="group">
                    <label htmlFor="message" className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 group-focus-within:text-gameGreen transition-colors">Message</label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={3}
                      value={form.message}
                      onChange={handleChange}
                      className="w-full bg-lokBlue-950 border-2 border-black p-3 text-white font-cinzel text-[11px] focus:outline-none focus:border-gameGreen transition-all resize-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                      placeholder="HOW CAN WE HELP?"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-gameGreen hover:bg-green-400 text-white font-cinzel font-black py-2 px-5 uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-[0_4px_0px_#2d5a2f] active:shadow-none border-[2px] border-black flex items-center justify-center gap-2 group text-[10px]"
                    >
                      <Send size={12} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      Send Transmission
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4CAF50; border-radius: 2px; }
      `}</style>
    </section>
  );
};

export default ContactSection;
