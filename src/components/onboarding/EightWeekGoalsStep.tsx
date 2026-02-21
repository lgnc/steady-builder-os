import { Target, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingData } from "@/pages/Onboarding";

export interface EightWeekGoal {
  goal_type: string;
  goal_label: string;
  target_value: number;
}

interface EightWeekGoalsStepProps {
  goals: EightWeekGoal[];
  onGoalsChange: (goals: EightWeekGoal[]) => void;
  data: OnboardingData;
}

interface GoalCategory {
  type: string;
  label: string;
  icon: string;
  presets: { label: string; value: number }[];
}

const GOAL_CATEGORIES: GoalCategory[] = [
  {
    type: "weight_loss",
    label: "Weight Loss",
    icon: "⚖️",
    presets: [
      { label: "Lose 3kg", value: 3 },
      { label: "Lose 5kg", value: 5 },
      { label: "Lose 8kg", value: 8 },
    ],
  },
  {
    type: "bench_press",
    label: "Bench Press",
    icon: "🏋️",
    presets: [
      { label: "Bench 80kg", value: 80 },
      { label: "Bench 100kg", value: 100 },
      { label: "Bench 120kg", value: 120 },
    ],
  },
  {
    type: "squat",
    label: "Squat",
    icon: "🦵",
    presets: [
      { label: "Squat 100kg", value: 100 },
      { label: "Squat 120kg", value: 120 },
      { label: "Squat 140kg", value: 140 },
    ],
  },
  {
    type: "deadlift",
    label: "Deadlift",
    icon: "💪",
    presets: [
      { label: "Deadlift 120kg", value: 120 },
      { label: "Deadlift 140kg", value: 140 },
      { label: "Deadlift 180kg", value: 180 },
    ],
  },
  {
    type: "pull_ups",
    label: "Pull-ups",
    icon: "🤸",
    presets: [
      { label: "5 pull-ups", value: 5 },
      { label: "8 pull-ups", value: 8 },
      { label: "10 pull-ups", value: 10 },
    ],
  },
  {
    type: "consistency",
    label: "Training Consistency",
    icon: "🔥",
    presets: [
      { label: "80% sessions completed", value: 80 },
      { label: "90% sessions completed", value: 90 },
    ],
  },
  {
    type: "habits",
    label: "Habit Completion",
    icon: "✅",
    presets: [
      { label: "80% habit completion", value: 80 },
      { label: "90% habit completion", value: 90 },
    ],
  },
  {
    type: "nutrition",
    label: "Nutrition Adherence",
    icon: "🥗",
    presets: [
      { label: "80% nutrition targets", value: 80 },
      { label: "90% nutrition targets", value: 90 },
    ],
  },
];

export function EightWeekGoalsStep({ goals, onGoalsChange, data }: EightWeekGoalsStepProps) {
  const addGoal = (category: GoalCategory, preset: { label: string; value: number }) => {
    if (goals.length >= 3) return;
    // Don't add duplicate types
    if (goals.some((g) => g.goal_type === category.type)) return;
    onGoalsChange([
      ...goals,
      { goal_type: category.type, goal_label: preset.label, target_value: preset.value },
    ]);
  };

  const removeGoal = (index: number) => {
    onGoalsChange(goals.filter((_, i) => i !== index));
  };

  const selectedTypes = new Set(goals.map((g) => g.goal_type));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">8-Week Goals</h2>
        <p className="text-muted-foreground">
          Pick 1–3 measurable goals. Less is more — commit with intent.
        </p>
      </div>

      {/* Selected goals */}
      {goals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Your Goals ({goals.length}/3)</h3>
          {goals.map((goal, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20"
            >
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{goal.goal_label}</span>
              </div>
              <button
                onClick={() => removeGoal(idx)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Categories */}
      {goals.length < 3 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Choose a goal</h3>
          {GOAL_CATEGORIES.filter((c) => !selectedTypes.has(c.type)).map((category) => (
            <div key={category.type} className="space-y-2">
              <div className="flex items-center gap-2">
                <span>{category.icon}</span>
                <span className="text-sm font-medium">{category.label}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {category.presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => addGoal(category, preset)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm border transition-all duration-200",
                      "bg-muted/30 border-border hover:bg-muted/50 hover:border-primary/30"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-3 w-3" />
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {goals.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Select at least one goal to focus your 8-week commitment.
        </p>
      )}
    </div>
  );
}
