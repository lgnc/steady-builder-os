import { Clock, Calendar, Target, Dumbbell, Moon, Car, CalendarClock, Sparkles, Shield, Crosshair } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { type EightWeekGoal } from "./EightWeekGoalsStep";

interface ReviewStepProps {
  data: OnboardingData;
  eightWeekGoals?: EightWeekGoal[];
}

const programLabels: Record<string, string> = {
  "3_day_strength": "3-Day Strength & Hypertrophy",
  "4_day_strength": "4-Day Strength & Hypertrophy",
  "4_day_hybrid": "4-Day Hybrid",
  "5_day_hybrid": "5-Day Hybrid Performance",
};

const experienceLabels: Record<string, string> = {
  absolute_amateur: "Absolute Amateur",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const workTypeLabels: Record<string, string> = {
  standard: "Standard Hours",
  shift_work: "Shift Work",
  fifo: "FIFO / Roster",
};

const goalLabels: Record<string, string> = {
  fat_loss: "Fat Loss",
  recomposition: "Recomposition",
  muscle_gain: "Muscle / Strength",
  athletic: "Athletic Performance",
  energy: "Energy",
  confidence: "Confidence",
  structure: "Structure",
  stress: "Stress Regulation",
  cognitive: "Cognitive Performance",
};

const strategyDayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getDayLabel(day: number): string {
  return strategyDayLabels[day] ?? "Sunday";
}

export function ReviewStep({ data, eightWeekGoals = [] }: ReviewStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Review Your Structure</h2>
        <p className="text-muted-foreground">
          This is what we're installing. Confirm and begin.
        </p>
      </div>

      <div className="space-y-4">
        {/* Sleep Schedule */}
        <div className="card-ritual">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Moon className="h-4 w-4 text-info" />
            </div>
            <h3 className="font-medium">Sleep Schedule</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weekday wake</span>
              <span className="font-medium">{data.weekdayWakeTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weekend wake</span>
              <span className="font-medium">{data.weekendWakeTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weekday bedtime</span>
              <span className="font-medium">{data.bedtime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weekend bedtime</span>
              <span className="font-medium">{data.weekendBedtime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{data.sleepDuration}h</span>
            </div>
          </div>
        </div>

        {/* Work Schedule */}
        <div className="card-ritual">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-muted">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="font-medium">Work & Training</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Work type</span>
              <span className="font-medium">{workTypeLabels[data.workType]}</span>
            </div>
            {data.workType === "standard" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Work hours</span>
                <span className="font-medium">{data.workStart} - {data.workEnd}</span>
              </div>
            )}
            {data.workType === "fifo" && data.fifoShiftLength && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shift length</span>
                  <span className="font-medium">{data.fifoShiftLength}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shift type</span>
                  <span className="font-medium capitalize">{data.fifoShiftType}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Training window</span>
              <span className="font-medium capitalize">{data.preferredTrainingWindow}</span>
            </div>
            {data.preferredTrainingDays.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Training days</span>
                <span className="font-medium capitalize">{data.preferredTrainingDays.join(", ")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rest days</span>
              <span className="font-medium capitalize">{data.restDays.join(", ")}</span>
            </div>
          </div>
        </div>

        {/* Commutes */}
        {((data.commuteMinutes ?? 0) > 0 || (data.gymCommuteMinutes ?? 0) > 0 || (data.workToGymMinutes ?? 0) > 0) && (
          <div className="card-ritual">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-muted">
                <Car className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="font-medium">Commutes</h3>
            </div>
            <div className="space-y-2 text-sm">
              {(data.commuteMinutes ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Home → Work</span>
                  <span className="font-medium">{data.commuteMinutes} min</span>
                </div>
              )}
              {(data.gymCommuteMinutes ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Home → Gym</span>
                  <span className="font-medium">{data.gymCommuteMinutes} min</span>
                </div>
              )}
              {(data.workToGymMinutes ?? 0) > 0 && data.workType === "standard" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Work → Gym</span>
                  <span className="font-medium">{data.workToGymMinutes} min</span>
                </div>
              )}
              {data.gymToWorkDirect && data.preferredTrainingWindow === "morning" && data.workType === "standard" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">After gym</span>
                  <span className="font-medium">Straight to work</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sunday Planning Ritual */}
        <div className="card-ritual">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <CalendarClock className="h-4 w-4 text-amber-400" />
            </div>
            <h3 className="font-medium">Sunday Planning Ritual</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Planning day</span>
              <span className="font-medium">{getDayLabel(data.strategyDay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">45 min</span>
            </div>
          </div>
        </div>

        {/* Program */}
        <div className="card-ritual">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-medium">Training Program</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Program</span>
              <span className="font-medium">{programLabels[data.selectedProgram]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Experience</span>
              <span className="font-medium">{experienceLabels[data.experienceTier]}</span>
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="card-ritual">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Target className="h-4 w-4 text-success" />
            </div>
            <h3 className="font-medium">Goals</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs block mb-1">Primary</span>
              <div className="flex flex-wrap gap-1">
                {data.primaryGoals.map((goal) => (
                  <span key={goal} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                    {goalLabels[goal]}
                  </span>
                ))}
              </div>
            </div>
            {data.secondaryGoals.length > 0 && (
              <div>
                <span className="text-muted-foreground text-xs block mb-1">Secondary</span>
                <div className="flex flex-wrap gap-1">
                  {data.secondaryGoals.map((goal) => (
                    <span key={goal} className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                      {goalLabels[goal]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 8-Week Goals */}
        {eightWeekGoals.length > 0 && (
          <div className="card-ritual">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Crosshair className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-medium">8-Week Goals</h3>
            </div>
            <div className="space-y-2 text-sm">
              {eightWeekGoals.map((goal, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-muted-foreground">{goal.goal_label}</span>
                  <span className="font-medium">Target: {goal.target_value}{["consistency", "habits", "nutrition"].includes(goal.goal_type) ? "%" : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Habits */}
        {(data.habitsBuild.length > 0 || data.habitsBreak.length > 0) && (
          <div className="card-ritual">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Sparkles className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="font-medium">Habits</h3>
            </div>
            <div className="space-y-3 text-sm">
              {data.habitsBuild.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">Building</span>
                  <div className="flex flex-wrap gap-1">
                    {data.habitsBuild.map((h) => (
                      <span key={h} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {data.habitsBreak.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">Breaking</span>
                  <div className="flex flex-wrap gap-1">
                    {data.habitsBreak.map((h) => (
                      <span key={h} className="px-2 py-1 bg-rose-500/10 text-rose-400 rounded text-xs">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Commitment */}
      <div className="border border-primary/20 rounded-lg p-4 bg-primary/5">
        <p className="text-sm text-center text-muted-foreground">
          You're committing to <span className="text-foreground font-medium">8 weeks</span> of consistent execution.
          No changes. No excuses. Just structure.
        </p>
      </div>
    </div>
  );
}
