import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface MobilityItem {
  label: string;
}

interface MobilityBlockProps {
  mobilityItems: MobilityItem[];
}

export function MobilityBlock({ mobilityItems }: MobilityBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  if (mobilityItems.length === 0) return null;

  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
            🧘
          </div>
          <div>
            <h3 className="font-medium text-sm">Mobility & Recovery</h3>
            <p className="text-xs text-muted-foreground">
              Optional • {checkedCount}/{mobilityItems.length} done
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="px-4 pb-4 space-y-2"
        >
          {mobilityItems.map((item, idx) => (
            <label
              key={idx}
              className="flex items-center gap-3 cursor-pointer py-1"
            >
              <Checkbox
                checked={!!checked[idx]}
                onCheckedChange={() =>
                  setChecked((prev) => ({ ...prev, [idx]: !prev[idx] }))
                }
              />
              <span
                className={cn(
                  "text-sm transition-colors",
                  checked[idx]
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                )}
              >
                {item.label}
              </span>
            </label>
          ))}
        </motion.div>
      )}
    </div>
  );
}
