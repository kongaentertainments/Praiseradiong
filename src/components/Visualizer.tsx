import { motion } from "motion/react";

interface VisualizerProps {
  isPlaying: boolean;
  height?: number;
}

export default function Visualizer({ isPlaying, height = 16 }: VisualizerProps) {
  const bars = Array.from({ length: 12 });

  return (
    <div className="flex items-end gap-[2px] px-2" style={{ height: `${height}px` }}>
      {bars.map((_, i) => (
        <motion.div
          key={i}
          className="w-[2px] bg-blue-400 rounded-full"
          animate={{
            height: isPlaying 
              ? [
                  `${Math.random() * 40 + 20}%`,
                  `${Math.random() * 80 + 20}%`,
                  `${Math.random() * 40 + 20}%`
                ] 
              : "20%"
          }}
          transition={{
            duration: isPlaying ? 0.5 + Math.random() * 0.5 : 0.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
