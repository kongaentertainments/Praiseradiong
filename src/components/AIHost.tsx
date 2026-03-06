import { GoogleGenAI } from "@google/genai";
import { useState, useEffect } from "react";
import { RadioStation } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2 } from "lucide-react";
import Markdown from "react-markdown";

export default function AIHost({ station, metadata }: { station: RadioStation | null; metadata: { artist: string; title: string } | null }) {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!station) return;

    const fetchInsight = async () => {
      setLoading(true);
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("API Key missing");
        }
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = metadata 
          ? `You are a cool, knowledgeable radio host for "PraiseRadioNG". 
          The current song is "${metadata.title}" by ${metadata.artist}.
          The station is playing "${station.genre}" music.
          Give a short, engaging 2-sentence insight or fun fact about this song or artist. 
          Keep it punchy and atmospheric.`
          : `You are a cool, knowledgeable radio host for "PraiseRadioNG". 
          The current station is "${station.name}" playing "${station.genre}" music.
          Give a short, engaging 2-sentence insight or fun fact about this genre or the vibe of this station. 
          Keep it punchy and atmospheric.`;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
        setInsight(response.text || "");
      } catch (error: any) {
        console.error("AI Host error:", error.message || "Unknown error");
        setInsight("Enjoy the vibes on PraiseRadioNG!");
      } finally {
        setLoading(false);
      }
    };

    fetchInsight();
  }, [station]);

  if (!station) return null;

  return (
    <div className="p-6 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl shadow-inner">
      <div className="flex items-center gap-2 mb-3 text-blue-200">
        <Sparkles size={18} />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Radio Guide Insight</span>
      </div>
      
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-blue-200/60"
          >
            <Loader2 className="animate-spin" size={16} />
            <span className="text-xs italic">Connecting to the frequency...</span>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-sm leading-relaxed italic font-medium"
          >
            <Markdown>{insight}</Markdown>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
