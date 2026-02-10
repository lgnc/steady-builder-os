import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Scale, Check } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DailyWeightTrackerProps {
  userId: string;
}

export function DailyWeightTracker({ userId }: DailyWeightTrackerProps) {
  const [weight, setWeight] = useState("");
  const [savedWeight, setSavedWeight] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("daily_weights")
        .select("weight_kg")
        .eq("user_id", userId)
        .eq("log_date", today)
        .maybeSingle();

      if (data) {
        setSavedWeight(Number(data.weight_kg));
        setWeight(String(data.weight_kg));
      }
    };
    fetch();
  }, [userId, today]);

  const handleSave = async () => {
    const val = parseFloat(weight);
    if (isNaN(val) || val < 20 || val > 300) return;

    setSaving(true);
    const { error } = await supabase
      .from("daily_weights")
      .upsert(
        { user_id: userId, log_date: today, weight_kg: val },
        { onConflict: "user_id,log_date" }
      );

    if (!error) {
      setSavedWeight(val);
      setEditing(false);
    }
    setSaving(false);
  };

  const showInput = savedWeight === null || editing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-transparent"
    >
      <Scale className="h-4 w-4 shrink-0 text-muted-foreground" />

      {showInput ? (
        <div className="flex items-center gap-2 flex-1">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="300"
            placeholder="kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="h-8 w-20 text-sm"
            autoFocus={editing}
          />
          <span className="text-xs text-muted-foreground">kg</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div
          className="flex items-center gap-1.5 flex-1 cursor-pointer"
          onClick={() => setEditing(true)}
        >
          <span className="text-sm">Weight</span>
          <span className="text-sm font-medium text-primary ml-auto">
            {savedWeight} kg
          </span>
        </div>
      )}
    </motion.div>
  );
}
