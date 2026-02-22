import { useState } from "react";
import { Sun, Moon, Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShiftConfig {
  shiftType: "days" | "nights";
  shiftStart: string;
  shiftEnd: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftLength: number;
  onConfirm: (config: ShiftConfig) => void;
}

const DAY_DEFAULTS = { start: "06:00", end10: "16:00", end12: "18:00" };
const NIGHT_DEFAULTS = { start: "18:00", end10: "04:00", end12: "06:00" };

const TIME_OPTIONS = [
  "04:00", "05:00", "06:00", "07:00", "08:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
  "19:00", "20:00", "21:00", "22:00",
];

export function ShiftConfigSheet({ open, onOpenChange, shiftLength, onConfirm }: Props) {
  const [shiftType, setShiftType] = useState<"days" | "nights">("days");
  const [customHours, setCustomHours] = useState(false);
  const [shiftStart, setShiftStart] = useState(DAY_DEFAULTS.start);
  const [shiftEnd, setShiftEnd] = useState(shiftLength === 10 ? DAY_DEFAULTS.end10 : DAY_DEFAULTS.end12);

  const handleShiftTypeChange = (type: "days" | "nights") => {
    setShiftType(type);
    if (!customHours) {
      if (type === "days") {
        setShiftStart(DAY_DEFAULTS.start);
        setShiftEnd(shiftLength === 10 ? DAY_DEFAULTS.end10 : DAY_DEFAULTS.end12);
      } else {
        setShiftStart(NIGHT_DEFAULTS.start);
        setShiftEnd(shiftLength === 10 ? NIGHT_DEFAULTS.end10 : NIGHT_DEFAULTS.end12);
      }
    }
  };

  const handleConfirm = () => {
    onConfirm({ shiftType, shiftStart, shiftEnd });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>On-Site Shift Setup</SheetTitle>
          <SheetDescription>
            Which shift are you on this swing? We'll adjust your on-site calendar.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Shift Type */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Shift Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleShiftTypeChange("days")}
                className={cn(
                  "flex items-center gap-2 p-4 rounded-lg border text-sm font-medium transition-all",
                  shiftType === "days"
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <Sun className="h-5 w-5" />
                Day Shift
              </button>
              <button
                onClick={() => handleShiftTypeChange("nights")}
                className={cn(
                  "flex items-center gap-2 p-4 rounded-lg border text-sm font-medium transition-all",
                  shiftType === "nights"
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <Moon className="h-5 w-5" />
                Night Shift
              </button>
            </div>
          </div>

          {/* Default hours display */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Shift hours</span>
            </div>
            <span className="text-sm font-medium">{shiftStart} – {shiftEnd}</span>
          </div>

          {/* Custom Hours Toggle */}
          <button
            onClick={() => setCustomHours(!customHours)}
            className="text-xs text-primary hover:underline"
          >
            {customHours ? "Use default hours" : "Set custom hours"}
          </button>

          {/* Custom Time Pickers */}
          {customHours && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                <select
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm"
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const t = `${i.toString().padStart(2, "0")}:00`;
                    return <option key={t} value={t}>{t}</option>;
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">End Time</label>
                <select
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm"
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const t = `${i.toString().padStart(2, "0")}:00`;
                    return <option key={t} value={t}>{t}</option>;
                  })}
                </select>
              </div>
            </div>
          )}

          <Button onClick={handleConfirm} className="w-full">
            Apply Shift Schedule
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
