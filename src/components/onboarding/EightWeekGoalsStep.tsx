import { useState } from "react";
import { Target, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
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

interface SliderCategory {
  type: string;
  label: string;
  icon: string;
  kind: "slider";
  min: number;
  max: number;
  step: number;
  unit: string;
  labelTemplate: (v: number) => string;
  defaultValue: number;
}

interface PresetCategory {
  type: string;
  label: string;
  icon: string;
  kind: "preset";
  presets: { label: string; value: number }[];
}

type GoalCategory = SliderCategory | PresetCategory;

const GOAL_CATEGORIES: GoalCategory[] = [
  {
    type: "weight_loss",
    label: "Weight Loss",
    icon: "⚖️",
    kind: "slider",
    min: 1,
    max: 20,
    step: 0.5,
    unit: "kg",
    labelTemplate: (v) => `Lose ${v}kg`,
    defaultValue: 5,
  },
  {
    type: "bench_press",
    label: "Bench Press",
    icon: "🏋️",
    kind: "slider",
    min: 60,
    max: 300,
    step: 5,
    unit: "kg",
    labelTemplate: (v) => `Bench ${v}kg`,
    defaultValue: 100,
  },
  {
    type: "squat",
    label: "Squat",
    icon: "🦵",
    kind: "slider",
    min: 60,
    max: 300,
    step: 5,
    unit: "kg",
    labelTemplate: (v) => `Squat ${v}kg`,
    defaultValue: 120,
  },
  {
    type: "deadlift",
    label: "Deadlift",
    icon: "💪",
    kind: "slider",
    min: 60,
    max: 300,
    step: 5,
    unit: "kg",
    labelTemplate: (v) => `Deadlift ${v}kg`,
    defaultValue: 140,
  },
  {
    type: "pull_ups",
    label: "Pull-ups",
    icon: "🤸",
    kind: "slider",
    min: 1,
    max: 20,
    step: 1,
    unit: "reps",
    labelTemplate: (v) => `${v} pull-ups`,
    defaultValue: 8,
  },
  {
    type: "consistency",
    label: "Training Consistency",
    icon: "🔥",
    kind: "preset",
    presets: [
      { label: "80% sessions completed", value: 80 },
      { label: "90% sessions completed", value: 90 },
    ],
  },
  {
    type: "habits",
    label: "Habit Completion",
    icon: "✅",
    kind: "preset",
    presets: [
      { label: "80% habit completion", value: 80 },
      { label: "90% habit completion", value: 90 },
    ],
  },
  {
    type: "nutrition",
    label: "Nutrition Adherence",
    icon: "🥗",
    kind: "preset",
    presets: [
      { label: "80% nutrition targets", value: 80 },
      { label: "90% nutrition targets", value: 90 },
    ],
  },
];

export function EightWeekGoalsStep({ goals, onGoalsChange, data }: EightWeekGoalsStepProps) {
  const [activeSlider, setActiveSlider] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<number>(0);

  const addGoal = (goalType: string, goalLabel: string, targetValue: number) => {
    if (goals.length >= 3) return;
    if (goals.some((g) => g.goal_type === goalType)) return;
    onGoalsChange([
      ...goals,
      { goal_type: goalType, goal_label: goalLabel, target_value: targetValue },
    ]);
    setActiveSlider(null);
  };

  const removeGoal = (index: number) => {
    onGoalsChange(goals.filter((_, i) => i !== index));
  };

  const openSlider = (category: SliderCategory) => {
    setActiveSlider(category.type);
    setDraftValue(category.defaultValue);
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

              {category.kind === "slider" ? (
                activeSlider === category.type ? (
                  <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">
                        {category.labelTemplate(draftValue)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {draftValue} {category.unit}
                      </span>
                    </div>
                    <Slider
                      value={[draftValue]}
                      onValueChange={([v]) => setDraftValue(v)}
                      min={category.min}
                      max={category.max}
                      step={category.step}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{category.min} {category.unit}</span>
                      <span>{category.max} {category.unit}</span>
                    </div>
                    <button
                      onClick={() => addGoal(category.type, category.labelTemplate(draftValue), draftValue)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      Add Goal
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openSlider(category)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm border transition-all duration-200",
                      "bg-muted/30 border-border hover:bg-muted/50 hover:border-primary/30"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-3 w-3" />
                      Set target
                    </span>
                  </button>
                )
              ) : (
                <div className="flex flex-wrap gap-2">
                  {category.presets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => addGoal(category.type, preset.label, preset.value)}
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
              )}
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
