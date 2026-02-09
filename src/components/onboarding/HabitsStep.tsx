import { Plus, X, Sparkles, Shield } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface HabitsStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function HabitsStep({ data, updateData }: HabitsStepProps) {
  const [newBuildHabit, setNewBuildHabit] = useState("");
  const [newBreakHabit, setNewBreakHabit] = useState("");

  const addBuildHabit = () => {
    const trimmed = newBuildHabit.trim();
    if (!trimmed || data.habitsBuild.includes(trimmed)) return;
    updateData({ habitsBuild: [...data.habitsBuild, trimmed] });
    setNewBuildHabit("");
  };

  const removeBuildHabit = (index: number) => {
    updateData({ habitsBuild: data.habitsBuild.filter((_, i) => i !== index) });
  };

  const addBreakHabit = () => {
    const trimmed = newBreakHabit.trim();
    if (!trimmed || data.habitsBreak.includes(trimmed)) return;
    updateData({ habitsBreak: [...data.habitsBreak, trimmed] });
    setNewBreakHabit("");
  };

  const removeBreakHabit = (index: number) => {
    updateData({ habitsBreak: data.habitsBreak.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Habits</h2>
        <p className="text-muted-foreground">
          Small daily actions compound into transformation. Choose what you're building and what you're leaving behind.
        </p>
      </div>

      {/* Habits to Introduce */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>Habits to Introduce</span>
        </div>

        <div className="space-y-2">
          {data.habitsBuild.map((habit, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
            >
              <span className="text-sm">{habit}</span>
              <button
                onClick={() => removeBuildHabit(index)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newBuildHabit}
            onChange={(e) => setNewBuildHabit(e.target.value)}
            placeholder="Add a habit to build..."
            className="bg-muted/30"
            onKeyDown={(e) => e.key === "Enter" && addBuildHabit()}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={addBuildHabit}
            disabled={!newBuildHabit.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Habits to Break */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Shield className="h-4 w-4 text-rose-400" />
          <span>Habits to Break</span>
        </div>

        <div className="space-y-2">
          {data.habitsBreak.map((habit, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-rose-500/5 border border-rose-500/10"
            >
              <span className="text-sm">{habit}</span>
              <button
                onClick={() => removeBreakHabit(index)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newBreakHabit}
            onChange={(e) => setNewBreakHabit(e.target.value)}
            placeholder="Add a habit to break..."
            className="bg-muted/30"
            onKeyDown={(e) => e.key === "Enter" && addBreakHabit()}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={addBreakHabit}
            disabled={!newBreakHabit.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
