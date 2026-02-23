import type { ScheduleBlock } from "@/hooks/useBlockDrag";

export interface ShiftEntry {
  startTime: string;
  endTime: string;
  isOff: boolean;
}

export interface OnboardingDurations {
  commuteMinutes: number;       // home ↔ work
  gymCommuteMinutes: number;    // home ↔ gym
  workToGymMinutes: number;     // work ↔ gym
  sleepDuration: number;        // hours
  bedtime: string;              // e.g. "22:00"
  weekendBedtime: string;
}

// ── Time helpers ───────────────────────────────────────────

/** Add minutes to an HH:MM string, wrapping at 24h */
export function addMinutesTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

function blockDuration(block: ScheduleBlock): number {
  const [sh, sm] = block.start_time.split(":").map(Number);
  const [eh, em] = block.end_time.split(":").map(Number);
  let dur = (eh * 60 + em) - (sh * 60 + sm);
  if (dur <= 0) dur += 1440;
  return dur;
}

function toMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// ── Commute classification ─────────────────────────────────

type CommuteRole = "to_work" | "from_work" | "to_gym" | "from_gym" | "gym_to_work" | "other";

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

// ── Transition detection ───────────────────────────────────

type ShiftKind = "day" | "night" | "off";

function shiftKind(shift: ShiftEntry | null | undefined): ShiftKind {
  if (!shift || shift.isOff) return "off";
  // Night shift = end time is before start time (crosses midnight)
  return shift.endTime < shift.startTime ? "night" : "day";
}

type TransitionType =
  | "day_to_day"
  | "day_to_night"
  | "day_to_off"
  | "night_to_night"
  | "night_to_day"
  | "night_to_off"
  | "off_to_day"
  | "off_to_night"
  | "off_to_off";

function detectTransition(
  prevShift: ShiftEntry | null | undefined,
  currentShift: ShiftEntry | null | undefined
): TransitionType {
  const from = shiftKind(prevShift);
  const to = shiftKind(currentShift);
  return `${from}_to_${to}` as TransitionType;
}

// ── Core builder ───────────────────────────────────────────

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
  const transitionIn = detectTransition(prevDayShift, shift);
  const transitionOut = detectTransition(shift, nextDayShift);
  const currentKind = shiftKind(shift);
  const prevKind = shiftKind(prevDayShift);

  // Off day: remove work blocks, keep everything else
  if (shift.isOff) {
    return rebuildOffDay(dayBlocks, durations, prevDayShift, nextDayShift);
  }

  // Categorise blocks
  const { blocksByType, commutesByRole } = categoriseBlocks(dayBlocks);
  const getFirst = (type: string) => (blocksByType.get(type) || [])[0];
  const result: ScheduleBlock[] = [];

  const place = (block: ScheduleBlock, start: string, end: string) => {
    result.push({ ...block, start_time: start, end_time: end });
  };

  const isNight = currentKind === "night";

  if (!isNight) {
    // ─── DAY SHIFT ─────────────────────────────────────
    buildDayShift(dayBlocks, shift, durations, prevDayShift, nextDayShift, blocksByType, commutesByRole, result);
  } else {
    // ─── NIGHT SHIFT ───────────────────────────────────
    buildNightShift(dayBlocks, shift, durations, prevDayShift, nextDayShift, blocksByType, commutesByRole, result);
  }

  return result;
}

// ── Off day builder ────────────────────────────────────────

function rebuildOffDay(
  dayBlocks: ScheduleBlock[],
  durations: OnboardingDurations,
  prevDayShift?: ShiftEntry | null,
  nextDayShift?: ShiftEntry | null
): ScheduleBlock[] {
  const prevKind = shiftKind(prevDayShift);
  const nextKind = shiftKind(nextDayShift);
  const { blocksByType, commutesByRole } = categoriseBlocks(dayBlocks);
  const getFirst = (type: string) => (blocksByType.get(type) || [])[0];
  const result: ScheduleBlock[] = [];

  const place = (block: ScheduleBlock, start: string, end: string) => {
    result.push({ ...block, start_time: start, end_time: end });
  };

  // Filter out work blocks and work commutes
  const filtered = dayBlocks.filter((b) => {
    if (b.block_type === "work" || b.block_type === "roster_reminder") return false;
    if (b.block_type === "commute") {
      const role = classifyCommute(b.title);
      if (role === "to_work" || role === "from_work") return false;
    }
    return true;
  });

  if (prevKind === "night" && prevDayShift) {
    // ─── OFF DAY AFTER NIGHT SHIFT ─────────────────────
    // Recovery sleep in morning, then normal bedtime evening
    const commuteFromWork = commutesByRole.get("from_work");
    const commuteFromWorkDur = commuteFromWork ? blockDuration(commuteFromWork) : durations.commuteMinutes;
    const arriveHome = addMinutesTime(prevDayShift.endTime, commuteFromWorkDur);

    // Place commute home
    if (commuteFromWork && commuteFromWorkDur > 0) {
      place(commuteFromWork, prevDayShift.endTime, arriveHome);
    }

    // Recovery sleep: arrive home → sleep for full duration
    const sleepBlock = getFirst("sleep");
    const sleepMinutes = durations.sleepDuration * 60;
    const recoverySleepEnd = addMinutesTime(arriveHome, sleepMinutes);
    if (sleepBlock) {
      place(sleepBlock, arriveHome, recoverySleepEnd);
    }

    // Morning routine after waking
    const morningRoutine = getFirst("morning_routine");
    const wakeTime = recoverySleepEnd;
    if (morningRoutine) {
      const dur = blockDuration(morningRoutine);
      place(morningRoutine, wakeTime, addMinutesTime(wakeTime, dur));
    }

    // Training + gym commutes in afternoon
    const routineEnd = morningRoutine
      ? addMinutesTime(wakeTime, blockDuration(morningRoutine))
      : wakeTime;
    placeTrainingCluster(blocksByType, commutesByRole, routineEnd, "21:00", result);

    // Evening routine + normal bedtime sleep handled by global anchor in Calendar.tsx
    // Place a second sleep block at normal bedtime
    const eveningRoutine = getFirst("evening_routine");
    const bedtimeSleep = sleepBlock
      ? { ...sleepBlock, id: sleepBlock.id + "_evening" }
      : null;
    if (bedtimeSleep) {
      const normalSleepStart = durations.bedtime;
      const normalSleepEnd = addMinutesTime(normalSleepStart, sleepMinutes);
      place(bedtimeSleep, normalSleepStart, normalSleepEnd);
    }
    if (eveningRoutine) {
      const eveningEnd = durations.bedtime;
      const eveningStart = addMinutesTime(eveningEnd, -60);
      place(eveningRoutine, eveningStart, eveningEnd);
    }

    // Other blocks
    pushOtherBlocks(filtered, result);

  } else if (nextKind === "night") {
    // ─── OFF DAY BEFORE NIGHT SHIFT ────────────────────
    // Normal wake, free day, optional pre-shift nap, evening routine before commute
    const sleepBlock = getFirst("sleep");
    const sleepMinutes = durations.sleepDuration * 60;

    // Normal sleep (previous night) — wake at normal time
    const normalBedtime = durations.bedtime;
    const wakeTime = addMinutesTime(normalBedtime, sleepMinutes);

    if (sleepBlock) {
      place(sleepBlock, normalBedtime, wakeTime);
    }

    // Morning routine
    const morningRoutine = getFirst("morning_routine");
    let cursor = wakeTime;
    if (morningRoutine) {
      const dur = blockDuration(morningRoutine);
      place(morningRoutine, cursor, addMinutesTime(cursor, dur));
      cursor = addMinutesTime(cursor, dur);
    }

    // Training in morning/early afternoon
    placeTrainingCluster(blocksByType, commutesByRole, cursor, "14:00", result);

    // Pre-shift nap: 90 min in afternoon (~14:00-15:30)
    if (sleepBlock && nextDayShift) {
      const commuteToWork = commutesByRole.get("to_work");
      const commuteToWorkDur = commuteToWork ? blockDuration(commuteToWork) : durations.commuteMinutes;
      const commuteToWorkStart = addMinutesTime(nextDayShift.startTime, -commuteToWorkDur);

      // Nap ends 2h before commute start (time for evening routine + buffer)
      const napEnd = addMinutesTime(commuteToWorkStart, -120);
      const napStart = addMinutesTime(napEnd, -90);

      // Only place if nap fits after 13:00
      if (toMin(napStart) >= 13 * 60) {
        result.push({
          ...sleepBlock,
          id: sleepBlock.id + "_nap",
          title: "Pre-shift nap",
          start_time: napStart,
          end_time: napEnd,
        });
      }

      // Evening routine: 1h before commute to work
      const eveningRoutine = getFirst("evening_routine");
      if (eveningRoutine) {
        const eveningEnd = commuteToWorkStart;
        const eveningStart = addMinutesTime(eveningEnd, -60);
        place(eveningRoutine, eveningStart, eveningEnd);
      }

      // Commute to work (night shift starts today)
      if (commuteToWork && commuteToWorkDur > 0) {
        place(commuteToWork, commuteToWorkStart, nextDayShift.startTime);
      }

      // Work block for the night shift
      const workBlock = getFirst("work");
      if (workBlock) {
        place(workBlock, nextDayShift.startTime, nextDayShift.endTime);
      }
    }

    // Other blocks
    pushOtherBlocks(filtered, result);

  } else {
    // ─── NORMAL OFF DAY ────────────────────────────────
    // Keep non-work blocks as-is; sleep/evening handled by global anchor
    filtered.forEach((b) => result.push(b));
  }

  return result;
}

// ─── Day shift builder ─────────────────────────────────────

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
  const getFirst = (type: string) => (blocksByType.get(type) || [])[0];
  const place = (block: ScheduleBlock, start: string, end: string) => {
    result.push({ ...block, start_time: start, end_time: end });
  };
  const prevKind = shiftKind(prevDayShift);
  const nextKind = shiftKind(nextDayShift);

  // 1. Commute to work
  const commuteToWork = commutesByRole.get("to_work");
  const commuteToWorkDur = commuteToWork ? blockDuration(commuteToWork) : durations.commuteMinutes;
  const commuteToWorkStart = addMinutesTime(shift.startTime, -commuteToWorkDur);
  if (commuteToWork && commuteToWorkDur > 0) {
    place(commuteToWork, commuteToWorkStart, shift.startTime);
  }

  // 2. Morning routine
  const morningRoutine = getFirst("morning_routine");
  const morningAnchor = commuteToWork && commuteToWorkDur > 0 ? commuteToWorkStart : shift.startTime;

  if (prevKind === "night" && prevDayShift) {
    // ─── DAY AFTER NIGHT SHIFT ─────────────────────────
    // Post-shift recovery sleep first, then morning routine
    const commuteFromWorkPrev = commutesByRole.get("from_work");
    const commuteFromWorkDur = commuteFromWorkPrev ? blockDuration(commuteFromWorkPrev) : durations.commuteMinutes;
    const arriveHome = addMinutesTime(prevDayShift.endTime, commuteFromWorkDur);

    // Commute home from night shift
    if (commuteFromWorkPrev && commuteFromWorkDur > 0) {
      place(commuteFromWorkPrev, prevDayShift.endTime, arriveHome);
    }

    // Shortened recovery sleep to reset circadian rhythm
    const sleepBlock = getFirst("sleep");
    const recoverySleepHours = Math.min(durations.sleepDuration, 6); // Cap at 6h for reset
    const recoverySleepEnd = addMinutesTime(arriveHome, recoverySleepHours * 60);
    if (sleepBlock) {
      place(sleepBlock, arriveHome, recoverySleepEnd);
    }

    // Morning routine after recovery sleep
    if (morningRoutine) {
      const dur = blockDuration(morningRoutine);
      place(morningRoutine, recoverySleepEnd, addMinutesTime(recoverySleepEnd, dur));
    }
  } else {
    // Normal morning: sleep → routine → commute → work
    if (morningRoutine) {
      const dur = blockDuration(morningRoutine);
      const routineStart = addMinutesTime(morningAnchor, -dur);
      place(morningRoutine, routineStart, morningAnchor);
    }

    // Sleep (ending at wake time)
    const sleepBlock = getFirst("sleep");
    const wakeAnchor = morningRoutine
      ? addMinutesTime(morningAnchor, -blockDuration(morningRoutine))
      : morningAnchor;
    const sleepMinutes = durations.sleepDuration * 60;
    const sleepStartTime = addMinutesTime(wakeAnchor, -sleepMinutes);
    if (sleepBlock) {
      place(sleepBlock, sleepStartTime, wakeAnchor);
    }
  }

  // 3. Work/Shift
  const workBlock = getFirst("work");
  if (workBlock) {
    place(workBlock, shift.startTime, shift.endTime);
  }

  // 4. Commute home from work
  const commuteFromWork = commutesByRole.get("from_work");
  const commuteFromWorkDur = commuteFromWork ? blockDuration(commuteFromWork) : durations.commuteMinutes;
  const commuteFromWorkEnd = addMinutesTime(shift.endTime, commuteFromWorkDur);
  if (commuteFromWork && commuteFromWorkDur > 0) {
    place(commuteFromWork, shift.endTime, commuteFromWorkEnd);
  }

  // 5. Training + gym commutes after shift
  const afterShift = commuteFromWork && commuteFromWorkDur > 0
    ? addMinutesTime(commuteFromWorkEnd, 15)
    : addMinutesTime(shift.endTime, 15);
  placeTrainingCluster(blocksByType, commutesByRole, afterShift, "21:00", result);

  // 6. Evening sleep
  if (nextKind === "night" && nextDayShift) {
    // Going into a night shift tomorrow: normal bedtime tonight
    const sleepBlock = getFirst("sleep");
    const sleepMinutes = durations.sleepDuration * 60;
    if (sleepBlock) {
      const normalSleepStart = durations.bedtime;
      const normalSleepEnd = addMinutesTime(normalSleepStart, sleepMinutes);
      // Only add if not already placed (from recovery)
      if (!result.find(b => b.block_type === "sleep" && b.id === sleepBlock.id)) {
        place(sleepBlock, normalSleepStart, normalSleepEnd);
      }
    }
  } else {
    // Normal: sleep anchored backward from tomorrow's wake time
    const sleepBlock = getFirst("sleep");
    if (sleepBlock && !result.find(b => b.block_type === "sleep")) {
      const sleepMinutes = durations.sleepDuration * 60;
      const wakeAnchor = morningRoutine
        ? addMinutesTime(morningAnchor, -blockDuration(morningRoutine))
        : morningAnchor;
      const sleepStartTime = addMinutesTime(wakeAnchor, -sleepMinutes);
      place(sleepBlock, sleepStartTime, wakeAnchor);
    }
  }

  // 7. Evening routine (anchored by global post-process in Calendar.tsx)
  const eveningRoutine = getFirst("evening_routine");
  if (eveningRoutine && !result.find(b => b.block_type === "evening_routine")) {
    // Placeholder — will be repositioned by global anchor
    result.push(eveningRoutine);
  }

  // 8. Other blocks
  pushOtherBlocks(dayBlocks, result);
}

// ─── Night shift builder ───────────────────────────────────

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
  const getFirst = (type: string) => (blocksByType.get(type) || [])[0];
  const place = (block: ScheduleBlock, start: string, end: string) => {
    result.push({ ...block, start_time: start, end_time: end });
  };
  const prevKind = shiftKind(prevDayShift);

  // Commute to work duration
  const commuteToWork = commutesByRole.get("to_work");
  const commuteToWorkDur = commuteToWork ? blockDuration(commuteToWork) : durations.commuteMinutes;
  const commuteToWorkStart = addMinutesTime(shift.startTime, -commuteToWorkDur);

  if (prevKind === "night" && prevDayShift) {
    // ─── NIGHT → NIGHT ────────────────────────────────
    // Morning: commute home, post-shift sleep, routine, activities, evening routine, commute, shift

    const commuteFromWork = commutesByRole.get("from_work");
    const commuteFromWorkDur = commuteFromWork ? blockDuration(commuteFromWork) : durations.commuteMinutes;
    const arriveHome = addMinutesTime(prevDayShift.endTime, commuteFromWorkDur);

    // Commute home from previous night shift
    if (commuteFromWork && commuteFromWorkDur > 0) {
      place(commuteFromWork, prevDayShift.endTime, arriveHome);
    }

    // Post-shift sleep
    const sleepBlock = getFirst("sleep");
    const sleepMinutes = durations.sleepDuration * 60;
    const sleepEnd = addMinutesTime(arriveHome, sleepMinutes);
    if (sleepBlock) {
      place(sleepBlock, arriveHome, sleepEnd);
    }

    // Morning routine after waking
    const morningRoutine = getFirst("morning_routine");
    let cursor = sleepEnd;
    if (morningRoutine) {
      const dur = blockDuration(morningRoutine);
      place(morningRoutine, cursor, addMinutesTime(cursor, dur));
      cursor = addMinutesTime(cursor, dur);
    }

    // Training in afternoon gap
    placeTrainingCluster(blocksByType, commutesByRole, cursor, commuteToWorkStart, result);

  } else {
    // ─── DAY/OFF → NIGHT (transition day) ──────────────
    // Normal wake, morning routine, free time / training, pre-shift nap, evening routine, commute, shift

    // Normal previous-night sleep
    const sleepBlock = getFirst("sleep");
    const sleepMinutes = durations.sleepDuration * 60;
    const normalBedtime = durations.bedtime;
    const wakeTime = addMinutesTime(normalBedtime, sleepMinutes);

    if (sleepBlock) {
      place(sleepBlock, normalBedtime, wakeTime);
    }

    // Morning routine
    const morningRoutine = getFirst("morning_routine");
    let cursor = wakeTime;
    if (morningRoutine) {
      const dur = blockDuration(morningRoutine);
      place(morningRoutine, cursor, addMinutesTime(cursor, dur));
      cursor = addMinutesTime(cursor, dur);
    }

    // Training in the morning/early afternoon
    placeTrainingCluster(blocksByType, commutesByRole, cursor, "14:00", result);

    // Pre-shift nap: 90 min, ending ~2h before commute
    if (sleepBlock) {
      const napEnd = addMinutesTime(commuteToWorkStart, -120);
      const napStart = addMinutesTime(napEnd, -90);
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

  // Evening routine: 1 hour before commute to work
  const eveningRoutine = getFirst("evening_routine");
  if (eveningRoutine) {
    const eveningEnd = commuteToWorkStart;
    const eveningStart = addMinutesTime(eveningEnd, -60);
    place(eveningRoutine, eveningStart, eveningEnd);
  }

  // Commute to work
  if (commuteToWork && commuteToWorkDur > 0) {
    place(commuteToWork, commuteToWorkStart, shift.startTime);
  }

  // Work/Shift
  const workBlock = getFirst("work");
  if (workBlock) {
    place(workBlock, shift.startTime, shift.endTime);
  }

  // Other blocks
  pushOtherBlocks(dayBlocks, result);
}

// ── Shared helpers ─────────────────────────────────────────

function categoriseBlocks(dayBlocks: ScheduleBlock[]) {
  const blocksByType = new Map<string, ScheduleBlock[]>();
  const commutesByRole = new Map<CommuteRole, ScheduleBlock>();

  dayBlocks.forEach((b) => {
    if (b.block_type === "roster_reminder") return;
    if (b.block_type === "commute") {
      const role = classifyCommute(b.title);
      commutesByRole.set(role, b);
    }
    const list = blocksByType.get(b.block_type) || [];
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
  result: ScheduleBlock[]
) {
  const trainingBlock = (blocksByType.get("training") || [])[0];
  if (!trainingBlock || !trainingBlock.training_day_id) return;

  const trainingDur = blockDuration(trainingBlock);
  const commuteToGym = commutesByRole.get("to_gym");
  const commuteFromGym = commutesByRole.get("from_gym");

  const toGymDur = commuteToGym ? blockDuration(commuteToGym) : 0;
  const fromGymDur = commuteFromGym ? blockDuration(commuteFromGym) : 0;
  const clusterDur = toGymDur + trainingDur + fromGymDur;

  const clusterStart = earliest;
  const clusterEnd = addMinutesTime(clusterStart, clusterDur);

  const latestMin = typeof latest === "string" && latest.includes(":")
    ? toMin(latest)
    : 21 * 60;

  if (toMin(clusterEnd) <= latestMin) {
    let cursor = clusterStart;
    if (commuteToGym && toGymDur > 0) {
      result.push({ ...commuteToGym, start_time: cursor, end_time: addMinutesTime(cursor, toGymDur) });
      cursor = addMinutesTime(cursor, toGymDur);
    }
    result.push({ ...trainingBlock, start_time: cursor, end_time: addMinutesTime(cursor, trainingDur) });
    cursor = addMinutesTime(cursor, trainingDur);
    if (commuteFromGym && fromGymDur > 0) {
      result.push({ ...commuteFromGym, start_time: cursor, end_time: addMinutesTime(cursor, fromGymDur) });
    }
  }
}

/** Push blocks that aren't already handled by the structured placement */
function pushOtherBlocks(dayBlocks: ScheduleBlock[], result: ScheduleBlock[]) {
  const handledTypes = new Set([
    "roster_reminder", "work", "morning_routine", "evening_routine",
    "training", "sleep", "commute"
  ]);
  dayBlocks.forEach((b) => {
    if (!handledTypes.has(b.block_type)) {
      result.push(b);
    }
  });
}
