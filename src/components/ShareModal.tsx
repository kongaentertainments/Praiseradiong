import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Check, Share2, Twitter, Facebook, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { RadioStation } from "../types";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: RadioStation | null;
}

export default function ShareModal({ isOpen, onClose, station }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!station) return null;

  const shareUrl = window.location.href;
  const shareText = `Listening to ${station.name} on PraiseRadioNG! 🎧`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    {
      name: "Twitter",
      icon: <Twitter size={20} />,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      color: "hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2]"
    },
    {
      name: "Facebook",
      icon: <Facebook size={20} />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      color: "hover:bg-[#4267B2]/20 hover:text-[#4267B2]"
    }
  ];

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
                  <h2 className="text-2xl font-black tracking-tight text-[#003366]">Share Station</h2>
                  <p className="text-sm text-slate-400">Spread the vibes of {station.name}</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-[#003366]"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  {shareLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all ${link.color}`}
                    >
                      {link.icon}
                      <span className="text-xs font-bold text-[#003366]">{link.name}</span>
                    </a>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-blue-600">Station Link</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-slate-300">
                      <LinkIcon size={16} />
                    </div>
                    <input 
                      readOnly
                      type="text" 
                      value={shareUrl}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-12 text-sm text-slate-500 focus:outline-none"
                    />
                    <button 
                      onClick={copyToClipboard}
                      className="absolute right-2 p-2 bg-[#0056b3] text-white rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="w-full mt-8 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm font-bold text-[#003366]"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
