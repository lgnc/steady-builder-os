import { format, addDays } from "date-fns";
import {
  addMinutes,
  toMin,
  makeBlock,
  dayTimes,
  type BaseConfig,
  type BlockInput,
  type ShiftEntry,
  type OnboardingDurations,
} from "./shared";
import type { ScheduleBlock } from "@/hooks/useBlockDrag";

// ── Types ───────────────────────────────────────────────────

export interface ShiftConfig extends BaseConfig {
  rosterDay?: number | null;    // day-of-week for roster reminder (if any)
  scheduleMode?: string;        // default 'home'
}

export type ShiftType = "day" | "afternoon" | "night" | "overnight";
export type ShiftKind = "day" | "night" | "off";

type CommuteRole = "to_work" | "from_work" | "to_gym" | "from_gym" | "gym_to_work" | "other";

type TransitionType =
  | "day_to_day" | "day_to_night" | "day_to_off"
  | "night_to_night" | "night_to_day" | "night_to_off"
  | "off_to_day" | "off_to_night" | "off_to_off";

// ── Public entry points ─────────────────────────────────────

/**
 * Called during onboarding for shift workers.
 * Returns soft placeholder structure — no fake work blocks.
 * Shows morning/evening routines, sleep, and a roster reminder.
 */
export function generateProvisionalSchedule(config: ShiftConfig): BlockInput[] {
  const blocks: BlockInput[] = [];
  const uid = config.userId;
  const mode = config.scheduleMode ?? "home";
  const mr = config.morningRoutineMinutes;
  const er = config.eveningRoutineMinutes;

  for (let dow = 0; dow < 7; dow++) {
    const { wakeTime, bedtime } = dayTimes(dow, config);
    const morningEnd = addMinutes(wakeTime, mr);
    const eveningStart = addMinutes(bedtime, -er);
    const nextDow = (dow + 1) % 7;
    const { wakeTime: nextWake } = dayTimes(nextDow, config);

    blocks.push(makeBlock(uid, "morning_routine", "Morning Routine", wakeTime, morningEnd, dow, { locked: true, scheduleMode: mode }));
    blocks.push(makeBlock(uid, "evening_routine", "Evening Routine", eveningStart, bedtime, dow, { locked: true, scheduleMode: mode }));
    blocks.push(makeBlock(uid, "sleep", "Sleep", bedtime, nextWake, dow, { locked: true, scheduleMode: mode }));
  }

  // Roster reminder
  if (config.rosterDay != null) {
    const rd = config.rosterDay;
    const { wakeTime } = dayTimes(rd, config);
    const reminderStart = addMinutes(wakeTime, mr + 15);
    blocks.push(makeBlock(uid, "roster_reminder", "Update Weekly Shifts", reminderStart, addMinutes(reminderStart, 15), rd, { locked: true, scheduleMode: mode }));
  }

  return blocks;
}

/**
 * Called by Calendar.tsx whenever shift entries change for the visible week.
 * Rebuilds each day that has a shift entry; leaves days without entries as-is.
 * Mirrors the previous rebuildDayAroundShift loop in Calendar.tsx effectiveBlocks.
 */
export function rebuildWeekFromShifts(
  weekBlocks: ScheduleBlock[],
  config: ShiftConfig,
  shiftEntries: Map<string, ShiftEntry>,
  weekStart: Date
): ScheduleBlock[] {
  const durations: OnboardingDurations = {
    commuteMinutes: config.commuteMinutes,
    gymCommuteMinutes: config.gymCommuteMinutes,
    workToGymMinutes: config.workToGymMinutes,
    sleepDuration: config.sleepDuration,
    bedtime: config.bedtime,
    weekendBedtime: config.weekendBedtime,
  };

  // Group blocks by day_of_week
  const blocksByDay = new Map<number, ScheduleBlock[]>();
  weekBlocks.forEach((b) => {
    const list = blocksByDay.get(b.day_of_week) ?? [];
    list.push(b);
    blocksByDay.set(b.day_of_week, list);
  });

  const result: ScheduleBlock[] = [];

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const date = addDays(weekStart, dayIdx);
    const dow = date.getDay();
    const dateStr = format(date, "yyyy-MM-dd");
    const shift = shiftEntries.get(dateStr);
    const dayBlocks = blocksByDay.get(dow) ?? [];

    if (!shift) {
      result.push(...dayBlocks);
    } else {
      const prevDateStr = format(addDays(date, -1), "yyyy-MM-dd");
      const nextDateStr = format(addDays(date, 1), "yyyy-MM-dd");
      const prevShift = shiftEntries.get(prevDateStr) ?? null;
      const nextShift = shiftEntries.get(nextDateStr) ?? null;
      const rebuilt = rebuildDayAroundShift(dayBlocks, shift, durations, prevShift, nextShift);
      result.push(...rebuilt);
    }
  }

  return result;
}

// ── Shift classification ────────────────────────────────────

/** Classify a shift entry into a display type per the brief spec. */
export function classifyShiftType(entry: ShiftEntry): ShiftType {
  if (entry.isOff) return "day"; // not used for off days
  const startMin = toMin(entry.startTime);
  const crossesMidnight = toMin(entry.endTime) < startMin;
  if (crossesMidnight) return "overnight";
  if (startMin >= 5 * 60 && startMin < 13 * 60) return "day";
  if (startMin >= 13 * 60 && startMin < 19 * 60) return "afternoon";
  return "night";
}

// ── Core single-day rebuild (ported verbatim from shiftScheduleBuilder.ts) ──

/**
 * Rebuild ALL blocks for a single day around a shift entry,
 * with awareness of adjacent days for intelligent sleep placement.
 */
export function rebuildDayAroundShift(
  dayBlocks: ScheduleBlock[],
  shift: ShiftEntry,
  durations: OnboardingDurations,
  prevDayShift?: ShiftEntry | null,
  nextDayShift?: ShiftEntry | null
): ScheduleBlock[] {
  const currentKind = shiftKind(shift);

  if (shift.isOff) {
    return rebuildOffDay(dayBlocks, durations, prevDayShift, nextDayShift);
  }

  const { blocksByType, commutesByRole } = categoriseBlocks(dayBlocks);
  const result: ScheduleBlock[] = [];

  if (currentKind !== "night") {
    buildDayShift(dayBlocks, shift, durations, prevDayShift, nextDayShift, blocksByType, commutesByRole, result);
  } else {
    buildNightShift(dayBlocks, shift, durations, prevDayShift, nextDayShift, blocksByType, commutesByRole, result);
  }

  return result;
}

// ── Off day builder ─────────────────────────────────────────

function rebuildOffDay(
  dayBlocks: ScheduleBlock[],
  durations: OnboardingDurations,
  prevDayShift?: ShiftEntry | null,
  nextDayShift?: ShiftEntry | null
): ScheduleBlock[] {
  const prevKind = shiftKind(prevDayShift);
  const nextKind = shiftKind(nextDayShift);
  const { blocksByType, commutesByRole } = categoriseBlocks(dayBlocks);
  const getFirst = (type: string) => (blocksByType.get(type) ?? [])[0];
  const result: ScheduleBlock[] = [];
  const place = (block: ScheduleBlock, start: string, end: string) => {
    result.push({ ...block, start_time: start, end_time: end });
  };

  const filtered = dayBlocks.filter((b) => {
    if (b.block_type === "work" || b.block_type === "roster_reminder") return false;
    if (b.block_type === "commute") {
      const role = classifyCommute(b.title);
      if (role === "to_work" || role === "from_work") return false;
    }
    return true;
  });

  if (prevKind === "night" && prevDayShift) {
    // ─── OFF DAY AFTER NIGHT SHIFT ────────────────────────
    const dayOfWeek = dayBlocks[0]?.day_of_week ?? 0;
    const commuteFromWorkData = getOrCreateCommute("from_work", commutesByRole, durations, dayOfWeek);
    const commuteFromWorkDur = commuteFromWorkData?.duration ?? 0;
    const arriveHome = addMinutes(prevDayShift.endTime, commuteFromWorkDur);

    if (commuteFromWorkData && commuteFromWorkDur > 0) {
      place(commuteFromWorkData.block, prevDayShift.endTime, arriveHome);
    }

    const sleepBlock = getFirst("sleep");
    const sleepMinutes = durations.sleepDuration * 60;
    const recoverySleepEnd = addMinutes(arriveHome, sleepMinutes);
    if (sleepBlock) place(sleepBlock, arriveHome, recoverySleepEnd);

    const morningRoutine = getFirst("morning_routine");
    const wakeTime = recoverySleepEnd;
    if (morningRoutine) {
      const dur = blockDur(morningRoutine);
      place(morningRoutine, wakeTime, addMinutes(wakeTime, dur));
    }

    const routineEnd = morningRoutine ? addMinutes(wakeTime, blockDur(morningRoutine)) : wakeTime;
    placeTrainingCluster(blocksByType, commutesByRole, routineEnd, "21:00", result, durations, dayBlocks[0]?.day_of_week ?? 0);

    const eveningRoutine = getFirst("evening_routine");
    const bedtimeSleep = sleepBlock ? { ...sleepBlock, id: sleepBlock.id + "_evening" } : null;
    if (bedtimeSleep) {
      const normalSleepStart = durations.bedtime;
      place(bedtimeSleep, normalSleepStart, addMinutes(normalSleepStart, sleepMinutes));
    }
    if (eveningRoutine) {
      const eveningEnd = durations.bedtime;
      place(eveningRoutine, addMinutes(eveningEnd, -60), eveningEnd);
    }

    pushOtherBlocks(filtered, result);

  } else if (nextKind === "night") {
    // ─── OFF DAY BEFORE NIGHT SHIFT ──────────────────────
    const sleepBlock = getFirst("sleep");
    const sleepMinutes = durations.sleepDuration * 60;
    const normalBedtime = durations.bedtime;
    const wakeTime = addMinutes(normalBedtime, sleepMinutes);

    if (sleepBlock) place(sleepBlock, normalBedtime, wakeTime);

    const morningRoutine = getFirst("morning_routine");
    let cursor = wakeTime;
    if (morningRoutine) {
      const dur = blockDur(morningRoutine);
      place(morningRoutine, cursor, addMinutes(cursor, dur));
      cursor = addMinutes(cursor, dur);
    }

    placeTrainingCluster(blocksByType, commutesByRole, cursor, "14:00", result, durations, dayBlocks[0]?.day_of_week ?? 0);

    if (sleepBlock && nextDayShift) {
      const dayOfWeek2 = dayBlocks[0]?.day_of_week ?? 0;
      const commuteToWorkData = getOrCreateCommute("to_work", commutesByRole, durations, dayOfWeek2);
      const commuteToWorkDur = commuteToWorkData?.duration ?? 0;
      const commuteToWorkStart = addMinutes(nextDayShift.startTime, -commuteToWorkDur);
      const napEnd = addMinutes(commuteToWorkStart, -120);
      const napStart = addMinutes(napEnd, -90);

      if (toMin(napStart) >= 13 * 60) {
        result.push({
          ...sleepBlock,
          id: sleepBlock.id + "_nap",
          title: "Pre-shift nap",
          start_time: napStart,
          end_time: napEnd,
        });
      }

      const eveningRoutine = getFirst("evening_routine");
      if (eveningRoutine) {
        place(eveningRoutine, addMinutes(commuteToWorkStart, -60), commuteToWorkStart);
      }

      if (commuteToWorkData && commuteToWorkDur > 0) {
        place(commuteToWorkData.block, commuteToWorkStart, nextDayShift.startTime);
      }

      const workBlock = getFirst("work");
      if (workBlock) place(workBlock, nextDayShift.startTime, nextDayShift.endTime);
    }

    pushOtherBlocks(filtered, result);

  } else {
    // ─── NORMAL OFF DAY ────────────────────────────────
    filtered.forEach((b) => result.push(b));
  }

  return result;
}

// ── Day shift builder ───────────────────────────────────────

function buildDayShift(
  dayBlocks: ScheduleBlock[],
  shift: ShiftEntry,
  durations: OnboardingDurations,
  prevDayShift: ShiftEntry | null | undefined,
  nextDayShift: ShiftEntry | null | undefined,
  blocksByType: Map<string, ScheduleBlock[]>,
  commutesByRole: Map<CommuteRole, ScheduleBlock>,
  result: ScheduleBlock[]
) {
  const getFirst = (type: string) => (blocksByType.get(type) ?? [])[0];
  const place = (block: ScheduleBlock, start: string, end: string) =>
    result.push({ ...block, start_time: start, end_time: end });
  const prevKind = shiftKind(prevDayShift);
  const nextKind = shiftKind(nextDayShift);
  const dayOfWeek = dayBlocks[0]?.day_of_week ?? 0;

  // 1. Commute to work
  const commuteToWorkData = getOrCreateCommute("to_work", commutesByRole, durations, dayOfWeek);
  const commuteToWorkDur = commuteToWorkData?.duration ?? 0;
  const commuteToWorkStart = addMinutes(shift.startTime, -commuteToWorkDur);
  if (commuteToWorkData && commuteToWorkDur > 0) {
    place(commuteToWorkData.block, commuteToWorkStart, shift.startTime);
  }

  // 2. Morning routine / sleep
  const morningRoutine = getFirst("morning_routine");
  const morningAnchor = commuteToWorkDur > 0 ? commuteToWorkStart : shift.startTime;

  if (prevKind === "night" && prevDayShift) {
    // Day after night shift — post-shift recovery sleep first
    const commuteFromWorkPrevData = getOrCreateCommute("from_work", commutesByRole, durations, dayOfWeek);
    const cfwDur = commuteFromWorkPrevData?.duration ?? 0;
    const arriveHome = addMinutes(prevDayShift.endTime, cfwDur);
    if (commuteFromWorkPrevData && cfwDur > 0) {
      place(commuteFromWorkPrevData.block, prevDayShift.endTime, arriveHome);
    }
    const sleepBlock = getFirst("sleep");
    const recoverySleepHours = Math.min(durations.sleepDuration, 6);
    const recoverySleepEnd = addMinutes(arriveHome, recoverySleepHours * 60);
    if (sleepBlock) place(sleepBlock, arriveHome, recoverySleepEnd);
    if (morningRoutine) {
      const dur = blockDur(morningRoutine);
      place(morningRoutine, recoverySleepEnd, addMinutes(recoverySleepEnd, dur));
    }
  } else {
    // Normal morning: sleep → routine → commute → work
    if (morningRoutine) {
      const dur = blockDur(morningRoutine);
      const routineStart = addMinutes(morningAnchor, -dur);
      place(morningRoutine, routineStart, morningAnchor);
    }
    const sleepBlock = getFirst("sleep");
    const wakeAnchor = morningRoutine ? addMinutes(morningAnchor, -blockDur(morningRoutine)) : morningAnchor;
    const sleepMinutes = durations.sleepDuration * 60;
    if (sleepBlock) place(sleepBlock, addMinutes(wakeAnchor, -sleepMinutes), wakeAnchor);
  }

  // 3. Work block
  const workBlock = getFirst("work");
  if (workBlock) place(workBlock, shift.startTime, shift.endTime);

  // 4. Commute home from work
  const commuteFromWorkData = getOrCreateCommute("from_work", commutesByRole, durations, dayOfWeek);
  const cfwDur = commuteFromWorkData?.duration ?? 0;
  const commuteFromWorkEnd = addMinutes(shift.endTime, cfwDur);
  if (commuteFromWorkData && cfwDur > 0) {
    place(commuteFromWorkData.block, shift.endTime, commuteFromWorkEnd);
  }

  // 5. Training + gym commutes after shift
  const afterShift = cfwDur > 0 ? addMinutes(commuteFromWorkEnd, 15) : addMinutes(shift.endTime, 15);
  placeTrainingCluster(blocksByType, commutesByRole, afterShift, "21:00", result, durations, dayOfWeek);

  // 6. Evening sleep
  if (nextKind === "night" && nextDayShift) {
    const sleepBlock = getFirst("sleep");
    const sleepMinutes = durations.sleepDuration * 60;
    if (sleepBlock && !result.find(b => b.block_type === "sleep" && b.id === sleepBlock.id)) {
      place(sleepBlock, durations.bedtime, addMinutes(durations.bedtime, sleepMinutes));
    }
  } else {
    const sleepBlock = getFirst("sleep");
    if (sleepBlock && !result.find(b => b.block_type === "sleep")) {
      const sleepMinutes = durations.sleepDuration * 60;
      const wakeAnchor = morningRoutine
        ? addMinutes(morningAnchor, -blockDur(morningRoutine))
        : morningAnchor;
      place(sleepBlock, addMinutes(wakeAnchor, -sleepMinutes), wakeAnchor);
    }
  }

  // 7. Evening routine placeholder (repositioned by global anchor in Calendar)
  const eveningRoutine = getFirst("evening_routine");
  if (eveningRoutine && !result.find(b => b.block_type === "evening_routine")) {
    result.push(eveningRoutine);
  }

  // 8. Other blocks
  pushOtherBlocks(dayBlocks, result);
}

// ── Night shift builder ─────────────────────────────────────

function buildNightShift(
  dayBlocks: ScheduleBlock[],
  shift: ShiftEntry,
  durations: OnboardingDurations,
  prevDayShift: ShiftEntry | null | undefined,
  nextDayShift: ShiftEntry | null | undefined,
  blocksByType: Map<string, ScheduleBlock[]>,
  commutesByRole: Map<CommuteRole, ScheduleBlock>,
  result: ScheduleBlock[]
) {
  const getFirst = (type: string) => (blocksByType.get(type) ?? [])[0];
  const place = (block: ScheduleBlock, start: string, end: string) =>
    result.push({ ...block, start_time: start, end_time: end });
  const prevKind = shiftKind(prevDayShift);
  const dayOfWeek = dayBlocks[0]?.day_of_week ?? 0;

  const commuteToWorkData = getOrCreateCommute("to_work", commutesByRole, durations, dayOfWeek);
  const ctdDur = commuteToWorkData?.duration ?? 0;
  const commuteToWorkStart = addMinutes(shift.startTime, -ctdDur);

  if (prevKind === "night" && prevDayShift) {
    // ─── NIGHT → NIGHT ──────────────────────────────────
    const commuteFromWorkData = getOrCreateCommute("from_work", commutesByRole, durations, dayOfWeek);
    const cfwDur = commuteFromWorkData?.duration ?? 0;
    const arriveHome = addMinutes(prevDayShift.endTime, cfwDur);
    if (commuteFromWorkData && cfwDur > 0) {
      place(commuteFromWorkData.block, prevDayShift.endTime, arriveHome);
    }

    const sleepBlock = getFirst("sleep");
    const sleepMinutes = durations.sleepDuration * 60;
    const sleepEnd = addMinutes(arriveHome, sleepMinutes);
    if (sleepBlock) place(sleepBlock, arriveHome, sleepEnd);

    const morningRoutine = getFirst("morning_routine");
    let cursor = sleepEnd;
    if (morningRoutine) {
      const dur = blockDur(morningRoutine);
      place(morningRoutine, cursor, addMinutes(cursor, dur));
      cursor = addMinutes(cursor, dur);
    }

    placeTrainingCluster(blocksByType, commutesByRole, cursor, commuteToWorkStart, result, durations, dayOfWeek);

  } else {
    // ─── DAY/OFF → NIGHT (transition day) ───────────────
    const sleepBlock = getFirst("sleep");
    const sleepMinutes = durations.sleepDuration * 60;
    const wakeTime = addMinutes(durations.bedtime, sleepMinutes);
    if (sleepBlock) place(sleepBlock, durations.bedtime, wakeTime);

    const morningRoutine = getFirst("morning_routine");
    let cursor = wakeTime;
    if (morningRoutine) {
      const dur = blockDur(morningRoutine);
      place(morningRoutine, cursor, addMinutes(cursor, dur));
      cursor = addMinutes(cursor, dur);
    }

    placeTrainingCluster(blocksByType, commutesByRole, cursor, "14:00", result, durations, dayOfWeek);

    // Pre-shift nap: 90 min, ending ~2h before commute
    if (sleepBlock) {
      const napEnd = addMinutes(commuteToWorkStart, -120);
      const napStart = addMinutes(napEnd, -90);
      if (toMin(napStart) >= 13 * 60) {
        result.push({
          ...sleepBlock,
          id: sleepBlock.id + "_nap",
          title: "Pre-shift nap",
          start_time: napStart,
          end_time: napEnd,
        });
      }
    }
  }

  // Evening routine: 1 hour before commute
  const eveningRoutine = getFirst("evening_routine");
  if (eveningRoutine) {
    place(eveningRoutine, addMinutes(commuteToWorkStart, -60), commuteToWorkStart);
  }

  // Commute to work
  if (commuteToWorkData && ctdDur > 0) {
    place(commuteToWorkData.block, commuteToWorkStart, shift.startTime);
  }

  // Work block
  const workBlock = getFirst("work");
  if (workBlock) place(workBlock, shift.startTime, shift.endTime);

  pushOtherBlocks(dayBlocks, result);
}

// ── Shared internal helpers ─────────────────────────────────

function shiftKind(shift: ShiftEntry | null | undefined): ShiftKind {
  if (!shift || shift.isOff) return "off";
  return shift.endTime < shift.startTime ? "night" : "day";
}

function classifyCommute(title: string): CommuteRole {
  const t = title.toLowerCase();
  if (t.includes("gym to work") || t.includes("gym → work")) return "gym_to_work";
  if (t.includes("to gym from work") || t.includes("work to gym")) return "to_gym";
  if (t.includes("to gym")) return "to_gym";
  if (t.includes("home from gym") || t.includes("from gym")) return "from_gym";
  if (t.includes("to work")) return "to_work";
  if (t.includes("home from work") || t.includes("from work")) return "from_work";
  return "other";
}

const COMMUTE_TITLES: Record<Exclude<CommuteRole, "other">, string> = {
  to_work: "Drive to Work",
  from_work: "Drive Home from Work",
  to_gym: "Drive to Gym",
  from_gym: "Drive Home from Gym",
  gym_to_work: "Gym to Work",
};

function commuteRoleDuration(role: CommuteRole, d: OnboardingDurations): number {
  switch (role) {
    case "to_work": case "from_work": return d.commuteMinutes;
    case "to_gym": case "from_gym": return d.gymCommuteMinutes;
    case "gym_to_work": return d.workToGymMinutes;
    default: return 0;
  }
}

function getOrCreateCommute(
  role: Exclude<CommuteRole, "other">,
  commutesByRole: Map<CommuteRole, ScheduleBlock>,
  durations: OnboardingDurations,
  dayOfWeek: number
): { block: ScheduleBlock; duration: number } | null {
  const existing = commutesByRole.get(role);
  if (existing) return { block: existing, duration: blockDur(existing) };
  const dur = commuteRoleDuration(role, durations);
  if (dur <= 0) return null;
  const synth: ScheduleBlock = {
    id: `synth_${role}_${dayOfWeek}`,
    title: COMMUTE_TITLES[role],
    block_type: "commute",
    day_of_week: dayOfWeek,
    start_time: "00:00",
    end_time: "00:00",
    is_locked: false,
    training_day_id: null,
  };
  return { block: synth, duration: dur };
}

function blockDur(block: ScheduleBlock): number {
  const [sh, sm] = block.start_time.split(":").map(Number);
  const [eh, em] = block.end_time.split(":").map(Number);
  let dur = (eh * 60 + em) - (sh * 60 + sm);
  if (dur <= 0) dur += 1440;
  return dur;
}

function categoriseBlocks(dayBlocks: ScheduleBlock[]) {
  const blocksByType = new Map<string, ScheduleBlock[]>();
  const commutesByRole = new Map<CommuteRole, ScheduleBlock>();
  dayBlocks.forEach((b) => {
    if (b.block_type === "roster_reminder") return;
    if (b.block_type === "commute") {
      commutesByRole.set(classifyCommute(b.title), b);
    }
    const list = blocksByType.get(b.block_type) ?? [];
    list.push(b);
    blocksByType.set(b.block_type, list);
  });
  return { blocksByType, commutesByRole };
}

function placeTrainingCluster(
  blocksByType: Map<string, ScheduleBlock[]>,
  commutesByRole: Map<CommuteRole, ScheduleBlock>,
  earliest: string,
  latest: string,
  result: ScheduleBlock[],
  durations?: OnboardingDurations,
  dayOfWeek?: number
) {
  const trainingBlock = (blocksByType.get("training") ?? [])[0];
  if (!trainingBlock || !trainingBlock.training_day_id) return;

  const trainingDur = blockDur(trainingBlock);
  const dow = dayOfWeek ?? trainingBlock.day_of_week;

  const toGymData = durations
    ? getOrCreateCommute("to_gym", commutesByRole, durations, dow)
    : commutesByRole.has("to_gym") ? { block: commutesByRole.get("to_gym")!, duration: blockDur(commutesByRole.get("to_gym")!) } : null;
  const fromGymData = durations
    ? getOrCreateCommute("from_gym", commutesByRole, durations, dow)
    : commutesByRole.has("from_gym") ? { block: commutesByRole.get("from_gym")!, duration: blockDur(commutesByRole.get("from_gym")!) } : null;

  const toGymDur = toGymData?.duration ?? 0;
  const fromGymDur = fromGymData?.duration ?? 0;
  const clusterDur = toGymDur + trainingDur + fromGymDur;
  const clusterEnd = addMinutes(earliest, clusterDur);
  const latestMin = toMin(latest);

  if (toMin(clusterEnd) <= latestMin) {
    let cursor = earliest;
    if (toGymData && toGymDur > 0) {
      result.push({ ...toGymData.block, start_time: cursor, end_time: addMinutes(cursor, toGymDur) });
      cursor = addMinutes(cursor, toGymDur);
    }
    result.push({ ...trainingBlock, start_time: cursor, end_time: addMinutes(cursor, trainingDur) });
    cursor = addMinutes(cursor, trainingDur);
    if (fromGymData && fromGymDur > 0) {
      result.push({ ...fromGymData.block, start_time: cursor, end_time: addMinutes(cursor, fromGymDur) });
    }
  }
}

function pushOtherBlocks(dayBlocks: ScheduleBlock[], result: ScheduleBlock[]) {
  const handled = new Set([
    "roster_reminder", "work", "morning_routine", "evening_routine",
    "training", "sleep", "commute"
  ]);
  dayBlocks.forEach((b) => {
    if (!handled.has(b.block_type)) result.push(b);
  });
}
