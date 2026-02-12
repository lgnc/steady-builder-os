import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExerciseFormCuesProps {
  cues: string[];
}

export function ExerciseFormCues({ cues }: ExerciseFormCuesProps) {
  const [open, setOpen] = useState(false);

  if (!cues || cues.length === 0) return null;

  return (
    <div className="space-y-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="h-3 w-3" />
        <span>{open ? "Hide form cues" : "Form cues"}</span>
      </button>
      {open && (
        <ul className="space-y-1 pl-4">
          {cues.map((cue, i) => (
            <li key={i} className="text-xs text-muted-foreground/80 flex items-start gap-1.5">
              <span className="text-primary mt-0.5">•</span>
              {cue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
