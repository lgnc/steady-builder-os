import { Car, MapPin, Building2, Home, Dumbbell, ArrowRight } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface GymCommuteStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

interface CommuteSliderProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function CommuteSlider({ icon, label, value, onChange }: CommuteSliderProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </label>
      <div className="px-2">
        <Slider
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          min={0}
          max={60}
          step={5}
          className="w-full"
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0 min</span>
        <span className="font-medium text-foreground text-sm">{value} min</span>
        <span>60 min</span>
      </div>
    </div>
  );
}

interface PreviewBlockProps {
  icon: React.ReactNode;
  label: string;
  minutes: number;
  variant: "commute" | "training" | "work";
}

function PreviewBlock({ icon, label, minutes, variant }: PreviewBlockProps) {
  const bgClass =
    variant === "commute"
      ? "bg-accent/10 border-accent/20"
      : variant === "training"
      ? "bg-primary/10 border-primary/20"
      : "bg-muted/30 border-border/50";

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 ${bgClass}`}>
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{minutes} min</span>
      </div>
    </div>
  );
}

export function GymCommuteStep({ data, updateData }: GymCommuteStepProps) {
  const homeToWork = data.commuteMinutes ?? 30;
  const homeToGym = data.gymCommuteMinutes ?? 15;
  const workToGym = data.workToGymMinutes ?? 15;
  const gymToWorkDirect = data.gymToWorkDirect ?? false;

  const isMorning = data.preferredTrainingWindow === "morning";
  const isEvening = data.preferredTrainingWindow === "evening";
  const isAfternoon = data.preferredTrainingWindow === "afternoon";
  const isStandard = data.workType === "standard";

  // Show the toggle only for morning trainers with standard work
  const showDirectToggle = isMorning && isStandard;

  // Build preview blocks based on training window
  const previewBlocks: PreviewBlockProps[] = [];
  const carIcon = <Car className="h-4 w-4 text-accent" />;
  const gymIcon = <Dumbbell className="h-4 w-4 text-primary" />;
  const workIcon = <Building2 className="h-4 w-4 text-muted-foreground" />;

  if (isStandard) {
    if (isMorning) {
      if (homeToGym > 0) previewBlocks.push({ icon: carIcon, label: "Drive to Gym", minutes: homeToGym, variant: "commute" });
      previewBlocks.push({ icon: gymIcon, label: "Training", minutes: 60, variant: "training" });
      if (gymToWorkDirect) {
        if (workToGym > 0) previewBlocks.push({ icon: carIcon, label: "Gym → Work", minutes: workToGym, variant: "commute" });
      } else {
        if (homeToGym > 0) previewBlocks.push({ icon: carIcon, label: "Drive Home from Gym", minutes: homeToGym, variant: "commute" });
        if (homeToWork > 0) previewBlocks.push({ icon: carIcon, label: "Drive to Work", minutes: homeToWork, variant: "commute" });
      }
      previewBlocks.push({ icon: workIcon, label: "Work", minutes: 480, variant: "work" });
      if (homeToWork > 0) previewBlocks.push({ icon: carIcon, label: "Drive Home from Work", minutes: homeToWork, variant: "commute" });
    } else if (isEvening) {
      if (homeToWork > 0) previewBlocks.push({ icon: carIcon, label: "Drive to Work", minutes: homeToWork, variant: "commute" });
      previewBlocks.push({ icon: workIcon, label: "Work", minutes: 480, variant: "work" });
      if (workToGym > 0) previewBlocks.push({ icon: carIcon, label: "Drive to Gym from Work", minutes: workToGym, variant: "commute" });
      previewBlocks.push({ icon: gymIcon, label: "Training", minutes: 60, variant: "training" });
      if (homeToGym > 0) previewBlocks.push({ icon: carIcon, label: "Drive Home from Gym", minutes: homeToGym, variant: "commute" });
    } else if (isAfternoon) {
      if (homeToWork > 0) previewBlocks.push({ icon: carIcon, label: "Drive to Work", minutes: homeToWork, variant: "commute" });
      previewBlocks.push({ icon: workIcon, label: "Work (AM)", minutes: 180, variant: "work" });
      if (workToGym > 0) previewBlocks.push({ icon: carIcon, label: "Drive to Gym from Work", minutes: workToGym, variant: "commute" });
      previewBlocks.push({ icon: gymIcon, label: "Training", minutes: 60, variant: "training" });
      if (workToGym > 0) previewBlocks.push({ icon: carIcon, label: "Gym → Work", minutes: workToGym, variant: "commute" });
      previewBlocks.push({ icon: workIcon, label: "Work (PM)", minutes: 180, variant: "work" });
      if (homeToWork > 0) previewBlocks.push({ icon: carIcon, label: "Drive Home from Work", minutes: homeToWork, variant: "commute" });
    }
  } else {
    // Non-standard work: just show home-gym-home
    if (homeToGym > 0) previewBlocks.push({ icon: carIcon, label: "Drive to Gym", minutes: homeToGym, variant: "commute" });
    previewBlocks.push({ icon: gymIcon, label: "Training", minutes: 60, variant: "training" });
    if (homeToGym > 0) previewBlocks.push({ icon: carIcon, label: "Drive Home from Gym", minutes: homeToGym, variant: "commute" });
  }

  const totalCommute = previewBlocks
    .filter((b) => b.variant === "commute")
    .reduce((sum, b) => sum + b.minutes, 0);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Your Commutes</h2>
        <p className="text-muted-foreground">
          Travel time matters. We'll build every leg into your schedule so nothing overlaps.
        </p>
      </div>

      <div className="space-y-6">
        {/* Slider 1: Home to Work (only for standard work) */}
        {isStandard && (
          <CommuteSlider
            icon={<Building2 className="h-4 w-4 text-primary" />}
            label="Home → Work"
            value={homeToWork}
            onChange={(v) => updateData({ commuteMinutes: v })}
          />
        )}

        {/* Slider 2: Home to Gym */}
        <CommuteSlider
          icon={<Dumbbell className="h-4 w-4 text-primary" />}
          label="Home → Gym"
          value={homeToGym}
          onChange={(v) => updateData({ gymCommuteMinutes: v })}
        />

        {/* Slider 3: Work to Gym (only for standard work) */}
        {isStandard && (
          <CommuteSlider
            icon={<Car className="h-4 w-4 text-primary" />}
            label="Work → Gym"
            value={workToGym}
            onChange={(v) => updateData({ workToGymMinutes: v })}
          />
        )}

        {/* Morning routing toggle */}
        {showDirectToggle && (
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="gym-to-work" className="text-sm font-medium">
                  Go straight to work after gym?
                </Label>
                <p className="text-xs text-muted-foreground">
                  {gymToWorkDirect
                    ? "Gym → Work directly"
                    : "Gym → Home → Work"}
                </p>
              </div>
              <Switch
                id="gym-to-work"
                checked={gymToWorkDirect}
                onCheckedChange={(v) => updateData({ gymToWorkDirect: v })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Visual Preview */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-primary" />
          Your training day flow
        </label>

        <div className="rounded-lg border border-border overflow-hidden">
          {previewBlocks.map((block, idx) => (
            <PreviewBlock key={idx} {...block} />
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Total commute time:{" "}
          <span className="font-medium text-foreground">{totalCommute} min</span>
        </p>
      </div>
    </div>
  );
}
