import { motion } from "motion/react";

export default function Visualizer({ isPlaying, height = 32 }: { isPlaying: boolean, height?: number }) {
  return (
    <div className="flex items-end justify-center gap-1 w-full" style={{ height: `${height}px` }}>
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-blue-500 rounded-full"
          animate={{
            height: isPlaying ? [height * 0.1, height * 0.5, height * 0.2, height * 0.8, height * 0.3, height, height * 0.4, height * 0.1] : 4,
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
