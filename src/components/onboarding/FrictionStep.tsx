import { AlertTriangle, Brain, BookOpen, Utensils, PenLine } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface FrictionStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const frictionOptions = [
  { value: "inconsistency", label: "Inconsistency", description: "Starting and stopping" },
  { value: "overwhelm", label: "Overwhelm", description: "Too much at once" },
  { value: "low_energy", label: "Low Energy", description: "Always tired" },
  { value: "anxiety", label: "Anxiety", description: "Racing mind, worry" },
  { value: "lack_direction", label: "Lack of Direction", description: "Don't know what to do" },
  { value: "discipline_collapse", label: "Discipline Collapse", description: "Can't maintain habits" },
];

export function FrictionStep({ data, updateData }: FrictionStepProps) {
  const toggleFriction = (friction: string) => {
    const current = data.frictionPoints;
    if (current.includes(friction)) {
      updateData({ frictionPoints: current.filter((f) => f !== friction) });
    } else {
      updateData({ frictionPoints: [...current, friction] });
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Current State</h2>
        <p className="text-muted-foreground">
          Honesty here helps us calibrate your system.
        </p>
      </div>

      {/* Friction Points */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Biggest friction points</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {frictionOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleFriction(option.value)}
              className={cn(
                "text-left p-3 rounded-lg border transition-all duration-200",
                data.frictionPoints.includes(option.value)
                  ? "bg-primary/10 border-primary"
                  : "bg-muted/30 border-border hover:bg-muted/50"
              )}
            >
              <span className="text-sm font-medium">{option.label}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Scales */}
      <div className="space-y-6">
        {/* Stress Level */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Current stress level</h3>
          </div>
          <Slider
            value={[data.stressLevel]}
            onValueChange={(value) => updateData({ stressLevel: value[0] })}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Calm</span>
            <span className="font-medium text-foreground">{data.stressLevel}/10</span>
            <span>Overwhelmed</span>
          </div>
        </div>

        {/* Reading Habit */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Current reading habit</h3>
          </div>
          <Slider
            value={[data.readingHabit]}
            onValueChange={(value) => updateData({ readingHabit: value[0] })}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Never</span>
            <span className="font-medium text-foreground">{data.readingHabit}/10</span>
            <span>Daily</span>
          </div>
        </div>

        {/* Journaling Openness */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Openness to journaling</h3>
          </div>
          <Slider
            value={[data.journalingOpenness]}
            onValueChange={(value) => updateData({ journalingOpenness: value[0] })}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Skeptical</span>
            <span className="font-medium text-foreground">{data.journalingOpenness}/10</span>
            <span>Very open</span>
          </div>
        </div>

        {/* Nutrition Confidence */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Nutrition confidence</h3>
          </div>
          <Slider
            value={[data.nutritionConfidence]}
            onValueChange={(value) => updateData({ nutritionConfidence: value[0] })}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Clueless</span>
            <span className="font-medium text-foreground">{data.nutritionConfidence}/10</span>
            <span>Dialed in</span>
          </div>
        </div>
      </div>
    </div>
  );
}
