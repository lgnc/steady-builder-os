// ── Shared types ───────────────────────────────────────────

/** DB-ready block for insert operations. */
export interface BlockInput {
  user_id: string;
  block_type: string;
  title: string;
  start_time: string;            // HH:MM
  end_time: string;              // HH:MM
  day_of_week: number;           // 0=Sun … 6=Sat
  is_locked: boolean;
  training_day_id?: string | null;
  schedule_mode?: string;        // 'home' | 'on_site' (FIFO only)
}

/** Common inputs shared by all three schedulers. */
export interface BaseConfig {
  userId: string;
  wakeTime: string;              // weekday wake HH:MM
  weekendWakeTime: string;
  bedtime: string;               // weekday bedtime HH:MM
  weekendBedtime: string;
  sleepDuration: number;         // hours
  commuteMinutes: number;        // home ↔ work
  gymCommuteMinutes: number;     // home ↔ gym
  workToGymMinutes: number;      // work ↔ gym
  trainingDayMap: Map<number, string | null>; // day_of_week → training_day_id
  trainingDuration: number;      // minutes (default 60)
  morningRoutineMinutes: number; // minutes (default 45)
  eveningRoutineMinutes: number; // minutes (default 45)
}

/** Shift entry — one day's shift data as provided by the user. */
export interface ShiftEntry {
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  isOff: boolean;
}

/** Commute durations extracted from onboarding, consumed by ShiftScheduler. */
export interface OnboardingDurations {
  commuteMinutes: number;
  gymCommuteMinutes: number;
  workToGymMinutes: number;
  sleepDuration: number;
  bedtime: string;
  weekendBedtime: string;
}

// ── Time utilities ──────────────────────────────────────────

/** Add minutes to an HH:MM string, wrapping at 24h. */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

/** Parse HH:MM to total minutes since midnight. */
export function toMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Duration in minutes between two HH:MM times (handles cross-midnight). */
export function blockDurationMin(start: string, end: string): number {
  let dur = toMin(end) - toMin(start);
  if (dur <= 0) dur += 1440;
  return dur;
}

// ── Block factory ───────────────────────────────────────────

export interface MakeBlockOpts {
  locked?: boolean;
  trainingDayId?: string | null;
  scheduleMode?: string;
}

/** Create a DB-ready BlockInput. */
export function makeBlock(
  userId: string,
  type: string,
  title: string,
  start: string,
  end: string,
  dow: number,
  opts: MakeBlockOpts = {}
): BlockInput {
  return {
    user_id: userId,
    block_type: type,
    title,
    start_time: start,
    end_time: end,
    day_of_week: dow,
    is_locked: opts.locked ?? true,
    ...(opts.trainingDayId !== undefined ? { training_day_id: opts.trainingDayId } : {}),
    ...(opts.scheduleMode !== undefined ? { schedule_mode: opts.scheduleMode } : {}),
  };
}

// ── Day helpers ─────────────────────────────────────────────

/** Returns true if day (0=Sun..6=Sat) is a weekday. */
export function isWeekday(dow: number): boolean {
  return dow >= 1 && dow <= 5;
}

/** Resolve wake / bedtime for a given day depending on weekday/weekend. */
export function dayTimes(
  dow: number,
  config: Pick<BaseConfig, "wakeTime" | "weekendWakeTime" | "bedtime" | "weekendBedtime">
): { wakeTime: string; bedtime: string } {
  if (isWeekday(dow)) {
    return { wakeTime: config.wakeTime, bedtime: config.bedtime };
  }
  return { wakeTime: config.weekendWakeTime, bedtime: config.weekendBedtime };
}
