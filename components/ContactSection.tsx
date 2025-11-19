import React, { useState } from 'react';
import { SectionId, ContactFormState } from '../types';
import { Mail, Twitter, Linkedin, CheckCircle } from 'lucide-react';
import { STUDIO_INFO } from '../constants';

const ContactSection: React.FC = () => {
  const [form, setForm] = useState<ContactFormState>({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submission logic
    setTimeout(() => {
      setSubmitted(true);
      setForm({ name: '', email: '', message: '' });
    }, 1000);
  };

  return (
    <section id={SectionId.CONTACT} className="py-24 bg-lokBlue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Get In Touch</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Found a bug? Have a partnership idea? Or just want to say hi? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="bg-lokBlue-900 p-8 rounded-2xl border border-slate-700">
            <h3 className="text-2xl font-bold text-white mb-6">Contact Information</h3>
            <div className="space-y-6">
              <a href={`mailto:${STUDIO_INFO.email}`} className="flex items-center gap-4 text-slate-300 hover:text-lokGold-400 transition-colors">
                <div className="bg-slate-800 p-3 rounded-full">
                  <Mail size={20} />
                </div>
                <span>{STUDIO_INFO.email}</span>
              </a>
              
              <div className="pt-8 border-t border-slate-800">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Follow Us</h4>
                <div className="flex gap-4">
                  <a href={STUDIO_INFO.twitter} className="bg-slate-800 p-3 rounded-full text-slate-300 hover:text-blue-400 hover:bg-slate-700 transition-all">
                    <Twitter size={24} />
                  </a>
                  <a href={STUDIO_INFO.linkedin} className="bg-slate-800 p-3 rounded-full text-slate-300 hover:text-blue-600 hover:bg-slate-700 transition-all">
                    <Linkedin size={24} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-lokBlue-900 p-8 rounded-2xl border border-slate-700">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <CheckCircle className="w-16 h-16 text-lokGreen-500 mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Message Sent!</h3>
                <p className="text-slate-400">Thank you for reaching out. We'll get back to you shortly.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="mt-6 text-lokGold-400 hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="w-full bg-lokBlue-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lokGold-500 transition-all"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="w-full bg-lokBlue-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lokGold-500 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-400 mb-1">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    value={form.message}
                    onChange={handleChange}
                    className="w-full bg-lokBlue-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lokGold-500 transition-all resize-none"
                    placeholder="How can we help?"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-lokGreen-600 hover:bg-lokGreen-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
