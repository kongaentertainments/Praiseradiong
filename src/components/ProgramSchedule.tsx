import { Program } from "../types";
import { SCHEDULE } from "../constants";
import { motion } from "motion/react";
import { Clock, User, Info } from "lucide-react";
import { cn } from "../lib/utils";
import { useEffect, useState } from "react";

export default function ProgramSchedule() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isCurrentProgram = (program: Program) => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [startH, startM] = program.startTime.split(":").map(Number);
    const [endH, endM] = program.endTime.split(":").map(Number);
    
    const start = startH * 60 + startM;
    let end = endH * 60 + endM;
    
    // Handle programs that end at midnight
    if (end === 0) end = 24 * 60;

    return now >= start && now < end;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-black text-[#003366] uppercase tracking-tight">Program Schedule</h2>
        <div className="flex items-center self-start sm:self-auto gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100 shadow-sm">
          <Clock size={14} className="text-blue-600" />
          <span className="text-[10px] md:text-xs font-bold text-blue-800 uppercase tracking-widest">
            Live Now: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="grid gap-4">
        {SCHEDULE.map((program, index) => {
          const isLive = isCurrentProgram(program);
          return (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-4 md:p-6 rounded-2xl border transition-all relative overflow-hidden group",
                isLive 
                  ? "bg-white border-blue-200 shadow-lg ring-1 ring-blue-500/20" 
                  : "bg-slate-50/50 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-sm"
              )}
            >
              {isLive && (
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
              )}
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm",
                      isLive ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"
                    )}>
                      {program.startTime} - {program.endTime}
                    </span>
                    {isLive && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-widest animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                        On Air
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-[#003366] text-lg md:text-xl mb-1.5 group-hover:text-blue-600 transition-colors truncate">
                    {program.title}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                      <User size={12} className="text-slate-400" />
                    </div>
                    <span>{program.host}</span>
                  </div>
                </div>
                
                <div className="lg:max-w-sm xl:max-w-md w-full lg:w-auto">
                  <p className="text-xs md:text-sm text-slate-500 leading-relaxed italic border-l-2 border-slate-100 pl-4 lg:border-l-0 lg:pl-0 lg:text-right">
                    {program.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex items-start gap-3">
        <Info size={16} className="text-slate-400 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Schedule is subject to change during special events and holidays. All times are in your local timezone.
        </p>
      </div>
    </div>
  );
}
