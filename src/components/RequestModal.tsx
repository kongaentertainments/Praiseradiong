import { motion, AnimatePresence } from "motion/react";
import { X, Send, Heart, User, MessageSquare } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RequestModal({ isOpen, onClose }: RequestModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-[#003366]">Submit a Prayer Request</h2>
                  <p className="text-sm text-slate-400">Share your prayer points with our community.</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-[#003366]"
                >
                  <X size={24} />
                </button>
              </div>

              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-blue-600">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        required
                        type="text" 
                        placeholder="e.g. John Doe"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-blue-500 transition-colors text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-blue-600">Prayer Topic</label>
                    <div className="relative">
                      <Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        required
                        type="text" 
                        placeholder="e.g. Family, Health, Career"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-blue-500 transition-colors text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-blue-600">Your Prayer Request</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-4 text-slate-300" size={18} />
                      <textarea 
                        required
                        placeholder="How can we pray for you?"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 h-24 focus:outline-none focus:border-blue-500 transition-colors resize-none text-slate-800"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "w-full py-4 bg-[#0056b3] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#004494] active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20",
                      loading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={18} />
                        Submit Request
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-4"
                >
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart className="text-blue-600" size={32} fill="currentColor" />
                  </div>
                  <h3 className="text-xl font-bold text-[#003366]">Request Submitted!</h3>
                  <p className="text-slate-500 text-sm max-w-[240px] mx-auto">
                    Our prayer team has received your request. We are standing in faith with you.
                  </p>
                  <button 
                    onClick={onClose}
                    className="mt-8 px-8 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm font-bold text-[#003366]"
                  >
                    Back to Radio
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
