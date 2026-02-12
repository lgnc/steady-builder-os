import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Unlock, ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface WarmUpSection {
  section: string;
  items: string[];
}

interface WarmUpBlockProps {
  warmupItems: WarmUpSection[];
  onCompleteChange: (complete: boolean) => void;
}

export function WarmUpBlock({ warmupItems, onCompleteChange }: WarmUpBlockProps) {
  const [expanded, setExpanded] = useState(true);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const allItems = warmupItems.flatMap((s) => s.items);
  const totalCount = allItems.length;
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const allComplete = totalCount > 0 && checkedCount === totalCount;

  const toggleItem = (key: string) => {
    const next = { ...checked, [key]: !checked[key] };
    setChecked(next);
    const complete = totalCount > 0 && Object.values(next).filter(Boolean).length === totalCount;
    onCompleteChange(complete);
  };

  if (totalCount === 0) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              allComplete
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {allComplete ? (
              <Unlock className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-sm">
              {allComplete ? "Warm-Up Complete" : "Warm-Up Required"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {checkedCount}/{totalCount} items • {allComplete ? "Working sets unlocked" : "Complete to unlock working sets"}
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
          className="px-4 pb-4 space-y-4"
        >
          {warmupItems.map((section) => (
            <div key={section.section} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {section.section}
              </p>
              {section.items.map((item) => {
                const key = `${section.section}::${item}`;
                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 cursor-pointer py-1"
                  >
                    <Checkbox
                      checked={!!checked[key]}
                      onCheckedChange={() => toggleItem(key)}
                    />
                    <span
                      className={cn(
                        "text-sm transition-colors",
                        checked[key]
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      )}
                    >
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
