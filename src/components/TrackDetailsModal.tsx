import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Loader2, Music, User, Clock } from "lucide-react";
import { RadioStation, Program } from "../types";
import { useState, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import Markdown from "react-markdown";
import { SCHEDULE } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface TrackDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: RadioStation | null;
  metadata: { artist: string; title: string } | null;
}

export default function TrackDetailsModal({ isOpen, onClose, station, metadata }: TrackDetailsModalProps) {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);

  useEffect(() => {
    const findCurrentProgram = () => {
      const now = new Date();
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
      
      const program = SCHEDULE.find(p => {
        const [startH, startM] = p.startTime.split(":").map(Number);
        const [endH, endM] = p.endTime.split(":").map(Number);
        const start = startH * 60 + startM;
        let end = endH * 60 + endM;
        if (end === 0) end = 24 * 60;
        return currentTimeInMinutes >= start && currentTimeInMinutes < end;
      });
      
      setCurrentProgram(program || null);
    };

    findCurrentProgram();
    const timer = setInterval(findCurrentProgram, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isOpen || !station) return;

    const fetchInsight = async () => {
      setLoading(true);
      try {
        let prompt = "";
        if (metadata) {
          prompt = `You are an expert radio host for "PraiseRadioNG". 
             The current song playing is "${metadata.title}" by ${metadata.artist}.
             The station is playing ${station?.genre} music.
             Provide a deep, engaging insight (3-4 sentences) about this specific song, its message, or the artist's impact on faith-based music. 
             If you don't know the specific song, talk about the themes of ${station?.genre} music that this song likely represents.
             Make it feel personal and uplifting.`;
        } else if (currentProgram) {
          prompt = `You are an expert radio host for "PraiseRadioNG". 
             The current program is "${currentProgram.title}" hosted by ${currentProgram.host}.
             Description: ${currentProgram.description}.
             The station is playing ${station?.genre} music.
             Provide a deep, engaging insight (3-4 sentences) about this program or the spiritual significance of the themes it might cover. 
             Make it feel personal and uplifting.`;
        } else {
          prompt = `You are an expert radio host for "PraiseRadioNG". 
             The current station is "${station?.name}" playing "${station?.genre}" music.
             Provide a deep, engaging insight (3-4 sentences) about this genre of faith-based music and its impact on the listener's journey. 
             Make it feel personal and uplifting.`;
        }

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
        setInsight(response.text || "");
      } catch (error) {
        console.error("AI Insight error:", error);
        setInsight("We're currently experiencing the divine presence through music. Stay tuned for more uplifting content.");
      } finally {
        setLoading(false);
      }
    };

    fetchInsight();
  }, [isOpen, station, currentProgram]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#001A33]/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
          >
            {/* Left Side: Visual/Cover */}
            <div className="w-full md:w-2/5 relative h-64 md:h-auto">
              <img 
                src={station?.cover} 
                className="absolute inset-0 w-full h-full object-cover"
                alt="Station Cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#003366] via-transparent to-transparent md:bg-gradient-to-r" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Now Broadcasting</span>
                </div>
                <h2 className="text-2xl font-black text-white leading-tight">
                  {metadata ? metadata.title : station?.name}
                </h2>
                <p className="text-blue-200 text-sm font-medium">
                  {metadata ? metadata.artist : station?.genre}
                </p>
              </div>
            </div>

            {/* Right Side: Details */}
            <div className="flex-1 p-8 md:p-10 flex flex-col">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-[#003366] hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Current Program</h3>
                {currentProgram ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-[#003366]">
                      <Music size={18} className="text-blue-600" />
                      <span className="text-xl font-bold">{currentProgram.title}</span>
                    </div>
                    <div className="flex items-center gap-6 text-slate-500 text-sm">
                      <div className="flex items-center gap-2">
                        <User size={14} />
                        <span>{currentProgram.host}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>{currentProgram.startTime} - {currentProgram.endTime}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">Continuous Praise & Worship</p>
                )}
              </div>

              <div className="flex-1 bg-blue-50/50 rounded-2xl p-6 border border-blue-100 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4 text-blue-600">
                  <Sparkles size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">AI Host Insight</span>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-3 text-blue-400">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-xs font-medium italic">Tuning into the spirit...</span>
                  </div>
                ) : (
                  <div className="text-slate-700 text-sm leading-relaxed italic font-medium">
                    <Markdown>{insight}</Markdown>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#003366] text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#002244] transition-colors shadow-lg"
                >
                  Close Details
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
