import { Car, MapPin } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { Slider } from "@/components/ui/slider";

interface GymCommuteStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function GymCommuteStep({ data, updateData }: GymCommuteStepProps) {
  const commuteMinutes = data.gymCommuteMinutes ?? 15;
  const roundTrip = commuteMinutes * 2;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Gym Commute</h2>
        <p className="text-muted-foreground">
          Your commute time matters. We'll build it into your schedule so nothing overlaps.
        </p>
      </div>

      <div className="space-y-8">
        {/* Commute Slider */}
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Car className="h-4 w-4 text-primary" />
            One-way travel time
          </label>

          <div className="px-2">
            <Slider
              value={[commuteMinutes]}
              onValueChange={(value) => updateData({ gymCommuteMinutes: value[0] })}
              min={0}
              max={60}
              step={5}
              className="w-full"
            />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 min</span>
            <span>30 min</span>
            <span>60 min</span>
          </div>

          {/* Display Value */}
          <div className="text-center py-4 rounded-lg bg-muted/50 border border-border">
            <span className="text-3xl font-semibold text-foreground">
              {commuteMinutes}
            </span>
            <span className="text-muted-foreground ml-2">min one-way</span>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            What your training block will look like
          </label>

          <div className="rounded-lg border border-border overflow-hidden">
            {commuteMinutes > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/50">
                <Car className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Drive to gym</span>
                  <span className="text-xs text-muted-foreground ml-2">{commuteMinutes} min</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 border-b border-border/50">
              <div className="w-4 h-4 rounded-sm bg-primary" />
              <div>
                <span className="text-sm font-medium">Training session</span>
                <span className="text-xs text-muted-foreground ml-2">60 min</span>
              </div>
            </div>
            {commuteMinutes > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                <Car className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Drive home</span>
                  <span className="text-xs text-muted-foreground ml-2">{commuteMinutes} min</span>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Total time commitment: <span className="font-medium text-foreground">{60 + roundTrip} min</span>
            {commuteMinutes > 0 && (
              <span> ({commuteMinutes} + 60 + {commuteMinutes})</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
