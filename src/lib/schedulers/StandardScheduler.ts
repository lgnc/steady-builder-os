import {
  addMinutes,
  toMin,
  makeBlock,
  dayTimes,
  isWeekday,
  type BaseConfig,
  type BlockInput,
} from "./shared";

// ── Types ───────────────────────────────────────────────────

export type TrainingWindow = "morning" | "afternoon" | "evening" | "after_work";

export interface StandardConfig extends BaseConfig {
  workDays: number[];               // day-of-week indices, e.g. [1,2,3,4,5]
  workStart: string;                // HH:MM
  workEnd: string;                  // HH:MM
  preferredTrainingWindow: TrainingWindow;
  gymToWorkDirect: boolean;         // true = gym → work without going home
  scheduleMode?: string;            // propagated to every block (default 'home')
}

// ── Public entry point ──────────────────────────────────────

/**
 * Generate a deterministic weekly template for a Standard Hours worker.
 * Returns DB-ready BlockInput[] covering all 7 days.
 * Same inputs always produce the same output.
 */
export function generateStandardSchedule(config: StandardConfig): BlockInput[] {
  const blocks: BlockInput[] = [];
  const mode = config.scheduleMode ?? "home";

  for (let dow = 0; dow < 7; dow++) {
    const { wakeTime, bedtime } = dayTimes(dow, config);
    const dayName = DOW_NAMES[dow];
    const hasWork = config.workDays.includes(dow) && !!(config.workStart && config.workEnd);
    const trainingDayId = config.trainingDayMap.get(dow) ?? null;
    const hasTraining = trainingDayId !== null;

    const dayBlocks = buildDay(
      config,
      dow,
      wakeTime,
      bedtime,
      hasWork,
      hasTraining,
      trainingDayId,
      mode
    );
    blocks.push(...dayBlocks);
  }

  return blocks;
}

// ── Per-day builder ─────────────────────────────────────────

function buildDay(
  config: StandardConfig,
  dow: number,
  wakeTime: string,
  bedtime: string,
  hasWork: boolean,
  hasTraining: boolean,
  trainingDayId: string | null,
  mode: string
): BlockInput[] {
  const uid = config.userId;
  const blocks: BlockInput[] = [];
  const push = (b: BlockInput) => blocks.push(b);
  const mr = config.morningRoutineMinutes;
  const er = config.eveningRoutineMinutes;
  const hw = config.commuteMinutes;       // home ↔ work
  const hg = config.gymCommuteMinutes;   // home ↔ gym
  const wg = config.workToGymMinutes;    // work ↔ gym
  const td = config.trainingDuration;
  const direct = config.gymToWorkDirect;

  const morningEnd = addMinutes(wakeTime, mr);
  const eveningStart = addMinutes(bedtime, -er);
  const eveningEnd = bedtime;

  // ── Morning Routine ────────────────────────────────────────
  push(makeBlock(uid, "morning_routine", "Morning Routine", wakeTime, morningEnd, dow, { locked: true, scheduleMode: mode }));

  // ── Workday training placement ─────────────────────────────
  if (hasWork) {
    buildWorkdayTraining(config, dow, wakeTime, morningEnd, hasTraining, trainingDayId, mode, blocks);
  } else {
    // ── Non-workday ────────────────────────────────────────
    if (hasTraining) {
      buildNonWorkdayTraining(config, dow, morningEnd, hasTraining, trainingDayId, mode, blocks);
    }
  }

  // ── Evening Routine ────────────────────────────────────────
  push(makeBlock(uid, "evening_routine", "Evening Routine", eveningStart, eveningEnd, dow, { locked: true, scheduleMode: mode }));

  // ── Sleep ──────────────────────────────────────────────────
  // end_time = next-day's wakeTime (cross-midnight; Calendar handles rendering)
  const nextDow = (dow + 1) % 7;
  const { wakeTime: nextWake } = dayTimes(nextDow, config);
  push(makeBlock(uid, "sleep", "Sleep", bedtime, nextWake, dow, { locked: true, scheduleMode: mode }));

  return blocks;
}

// ── Workday training placement ──────────────────────────────

function buildWorkdayTraining(
  config: StandardConfig,
  dow: number,
  wakeTime: string,
  morningEnd: string,
  hasTraining: boolean,
  trainingDayId: string | null,
  mode: string,
  blocks: BlockInput[]
) {
  const uid = config.userId;
  const push = (b: BlockInput) => blocks.push(b);
  const hw = config.commuteMinutes;
  const hg = config.gymCommuteMinutes;
  const wg = config.workToGymMinutes;
  const td = config.trainingDuration;
  const direct = config.gymToWorkDirect;
  const ws = config.workStart;
  const we = config.workEnd;
  const win = config.preferredTrainingWindow;

  // Helper — push a commute block
  const commute = (title: string, start: string, end: string) =>
    push(makeBlock(uid, "commute", title, start, end, dow, { locked: true, scheduleMode: mode }));
  const training = (start: string, end: string) =>
    push(makeBlock(uid, "training", "Training", start, end, dow, { locked: true, trainingDayId, scheduleMode: mode }));
  const work = () =>
    push(makeBlock(uid, "work", "Work", ws, we, dow, { locked: false, scheduleMode: mode }));

  if (hasTraining && win === "morning") {
    // Try to fit training before work, fall back to after-work
    const commuteAfterGym = direct ? wg : hg + hw;
    const latestGymEnd = addMinutes(ws, -(commuteAfterGym));
    const latestGymStart = addMinutes(latestGymEnd, -td);
    const latestDepartHome = addMinutes(latestGymStart, -hg);

    if (toMin(latestDepartHome) >= toMin(morningEnd)) {
      // Fits before work
      let cursor = latestDepartHome;
      if (hg > 0) { commute("Drive to Gym", cursor, addMinutes(cursor, hg)); cursor = addMinutes(cursor, hg); }
      training(cursor, addMinutes(cursor, td)); cursor = addMinutes(cursor, td);
      if (direct) {
        if (wg > 0) { commute("Gym to Work", cursor, addMinutes(cursor, wg)); }
        work();
        if (hw > 0) commute("Drive Home from Work", we, addMinutes(we, hw));
      } else {
        if (hg > 0) { commute("Drive Home from Gym", cursor, addMinutes(cursor, hg)); }
        if (hw > 0) commute("Drive to Work", addMinutes(ws, -hw), ws);
        work();
        if (hw > 0) commute("Drive Home from Work", we, addMinutes(we, hw));
      }
      return;
    }
    // Fall through to after-work
  }

  if (hasTraining && win === "afternoon") {
    // Lunch training at 12:00
    const trainingStart = "12:00";
    if (hw > 0) commute("Drive to Work", addMinutes(ws, -hw), ws);
    work();
    if (wg > 0) commute("Drive to Gym from Work", addMinutes(trainingStart, -wg), trainingStart);
    training(trainingStart, addMinutes(trainingStart, td));
    const afterTd = addMinutes(trainingStart, td);
    if (wg > 0) commute("Gym to Work", afterTd, addMinutes(afterTd, wg));
    if (hw > 0) commute("Drive Home from Work", we, addMinutes(we, hw));
    return;
  }

  if (hasTraining && (win === "evening" || win === "after_work")) {
    // After work
    if (hw > 0) commute("Drive to Work", addMinutes(ws, -hw), ws);
    work();
    let cursor = we;
    if (wg > 0) { commute("Drive to Gym from Work", cursor, addMinutes(cursor, wg)); cursor = addMinutes(cursor, wg); }
    else if (hg > 0 && hw > 0) {
      // Go home first, then gym
      commute("Drive Home from Work", we, addMinutes(we, hw));
      cursor = addMinutes(we, hw);
      commute("Drive to Gym", cursor, addMinutes(cursor, hg));
      cursor = addMinutes(cursor, hg);
    } else if (hg > 0) {
      commute("Drive to Gym", cursor, addMinutes(cursor, hg));
      cursor = addMinutes(cursor, hg);
    }
    training(cursor, addMinutes(cursor, td)); cursor = addMinutes(cursor, td);
    if (hg > 0) commute("Drive Home from Gym", cursor, addMinutes(cursor, hg));
    return;
  }

  // No training (or no preference matched) — just work
  if (hw > 0) commute("Drive to Work", addMinutes(ws, -hw), ws);
  work();
  if (hw > 0) commute("Drive Home from Work", we, addMinutes(we, hw));
}

// ── Non-workday training ────────────────────────────────────

function buildNonWorkdayTraining(
  config: StandardConfig,
  dow: number,
  morningEnd: string,
  hasTraining: boolean,
  trainingDayId: string | null,
  mode: string,
  blocks: BlockInput[]
) {
  if (!hasTraining) return;
  const uid = config.userId;
  const push = (b: BlockInput) => blocks.push(b);
  const hg = config.gymCommuteMinutes;
  const td = config.trainingDuration;
  const win = config.preferredTrainingWindow;

  const commute = (title: string, start: string, end: string) =>
    push(makeBlock(uid, "commute", title, start, end, dow, { locked: true, scheduleMode: mode }));
  const training = (start: string, end: string) =>
    push(makeBlock(uid, "training", "Training", start, end, dow, { locked: true, trainingDayId, scheduleMode: mode }));

  let trainingStart: string;
  if (win === "afternoon") {
    trainingStart = "12:00";
    if (hg > 0) commute("Drive to Gym", addMinutes(trainingStart, -hg), trainingStart);
    training(trainingStart, addMinutes(trainingStart, td));
    if (hg > 0) commute("Drive Home from Gym", addMinutes(trainingStart, td), addMinutes(addMinutes(trainingStart, td), hg));
  } else if (win === "evening") {
    trainingStart = "17:00";
    if (hg > 0) commute("Drive to Gym", trainingStart, addMinutes(trainingStart, hg));
    const tstart = hg > 0 ? addMinutes(trainingStart, hg) : trainingStart;
    training(tstart, addMinutes(tstart, td));
    if (hg > 0) commute("Drive Home from Gym", addMinutes(tstart, td), addMinutes(addMinutes(tstart, td), hg));
  } else {
    // morning (default for non-workdays)
    let cursor = morningEnd;
    if (hg > 0) { commute("Drive to Gym", cursor, addMinutes(cursor, hg)); cursor = addMinutes(cursor, hg); }
    training(cursor, addMinutes(cursor, td)); cursor = addMinutes(cursor, td);
    if (hg > 0) commute("Drive Home from Gym", cursor, addMinutes(cursor, hg));
  }
}

// ── Constants ───────────────────────────────────────────────

const DOW_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
