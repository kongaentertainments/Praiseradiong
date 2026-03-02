import { RadioStation } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Play, Music, Heart } from "lucide-react";
import { cn } from "../lib/utils";

interface StationListProps {
  stations: RadioStation[];
  currentStation: RadioStation | null;
  onSelect: (station: RadioStation) => void;
  favorites: string[];
  onToggleFavorite: (stationId: string) => void;
}

export default function StationList({ 
  stations, 
  currentStation, 
  onSelect, 
  favorites, 
  onToggleFavorite 
}: StationListProps) {
  const favoriteStations = stations.filter(s => favorites.includes(s.id));
  const otherStations = stations.filter(s => !favorites.includes(s.id));

  const renderStation = (station: RadioStation) => (
    <motion.div
      key={station.id}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative"
    >
      <button
        onClick={() => onSelect(station)}
        className={cn(
          "flex items-center gap-4 p-3 rounded-xl transition-all text-left w-full",
          currentStation?.id === station.id 
            ? "bg-blue-50 border border-blue-200 text-[#003366]" 
            : "bg-slate-50 border border-transparent hover:bg-slate-100 text-slate-600"
        )}
      >
        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
          <img 
            src={station.cover} 
            alt={station.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          {currentStation?.id === station.id && (
            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
              <Music size={16} className="text-blue-600 animate-pulse" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-bold truncate text-sm">{station.name}</h3>
          <p className="text-[10px] opacity-60 truncate uppercase tracking-wider font-bold">{station.genre}</p>
        </div>

        <div className={cn(
          "opacity-0 group-hover:opacity-100 transition-opacity",
          currentStation?.id === station.id && "opacity-100"
        )}>
          <Play size={16} fill="currentColor" className="text-blue-600" />
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(station.id);
        }}
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all z-10",
          favorites.includes(station.id)
            ? "text-rose-500 opacity-100"
            : "text-slate-300 opacity-0 group-hover:opacity-100 hover:text-rose-400"
        )}
      >
        <Heart size={16} fill={favorites.includes(station.id) ? "currentColor" : "none"} />
      </button>
    </motion.div>
  );

  return (
    <div className="space-y-8 overflow-y-auto max-h-full pr-2 custom-scrollbar">
      <AnimatePresence mode="popLayout">
        {favoriteStations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-rose-500/60 text-[10px] font-bold uppercase tracking-widest px-2 flex items-center gap-2">
              <Heart size={10} fill="currentColor" />
              Favorites
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {favoriteStations.map(renderStation)}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-2">
            {favoriteStations.length > 0 ? "Other Stations" : "All Stations"}
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {otherStations.map(renderStation)}
          </div>
        </div>
      </AnimatePresence>
    </div>
  );
}
