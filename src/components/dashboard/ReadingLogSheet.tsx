import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { format } from "date-fns";

interface ReadingLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  selectedDate?: Date;
}

export function ReadingLogSheet({ open, onOpenChange, userId, selectedDate }: ReadingLogSheetProps) {
  const [pagesRead, setPagesRead] = useState(0);
  const [minutesRead, setMinutesRead] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const dateStr = format(selectedDate ?? new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!open) {
      setLoaded(false);
      return;
    }

    const fetchData = async () => {
      const { data } = await supabase
        .from("reading_logs")
        .select("pages_read, minutes_read")
        .eq("user_id", userId)
        .eq("log_date", dateStr)
        .maybeSingle();

      if (data) {
        setPagesRead(data.pages_read ?? 0);
        setMinutesRead(data.minutes_read ?? 0);
      } else {
        setPagesRead(0);
        setMinutesRead(0);
      }
      setLoaded(true);
    };

    fetchData();
  }, [open, userId, dateStr]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("reading_logs")
      .upsert(
        {
          user_id: userId,
          log_date: dateStr,
          pages_read: pagesRead,
          minutes_read: minutesRead,
        },
        { onConflict: "user_id,log_date" }
      );

    setSaving(false);
    if (error) {
      toast.error("Failed to save reading log");
    } else {
      toast.success("Reading logged");
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Log Reading
          </SheetTitle>
        </SheetHeader>

        {loaded && (
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="pages">Pages read</Label>
              <Input
                id="pages"
                type="number"
                min={0}
                value={pagesRead || ""}
                onChange={(e) => setPagesRead(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minutes">Minutes spent</Label>
              <Input
                id="minutes"
                type="number"
                min={0}
                value={minutesRead || ""}
                onChange={(e) => setMinutesRead(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
