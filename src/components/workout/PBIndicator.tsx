import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

interface PBIndicatorProps {
  type: "weight" | "reps" | "volume";
}

const labels: Record<string, string> = {
  weight: "Weight PB",
  reps: "Rep PB",
  volume: "Vol PB",
};

export function PBIndicator({ type }: PBIndicatorProps) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-semibold whitespace-nowrap"
    >
      <TrendingUp className="h-2.5 w-2.5" />
      {labels[type]}
    </motion.span>
  );
}
