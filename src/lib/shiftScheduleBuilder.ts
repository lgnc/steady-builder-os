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

/** Add minutes to an HH:MM string, wrapping at 24h */
export function addMinutesTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

/** Duration of a block in minutes */
function blockDuration(block: ScheduleBlock): number {
  const [sh, sm] = block.start_time.split(":").map(Number);
  const [eh, em] = block.end_time.split(":").map(Number);
  let dur = (eh * 60 + em) - (sh * 60 + sm);
  if (dur <= 0) dur += 1440; // crosses midnight
  return dur;
}

/** Convert HH:MM to total minutes for comparison */
function toMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Commute role detection by title
type CommuteRole = "to_work" | "from_work" | "to_gym" | "from_gym" | "gym_to_work" | "other";

function classifyCommute(title: string): CommuteRole {
  const t = title.toLowerCase();
  if (t.includes("gym to work") || t.includes("gym → work")) return "gym_to_work";
  if (t.includes("to gym from work") || t.includes("work to gym")) return "to_gym"; // post-work gym commute
  if (t.includes("to gym")) return "to_gym";
  if (t.includes("home from gym") || t.includes("from gym")) return "from_gym";
  if (t.includes("to work")) return "to_work";
  if (t.includes("home from work") || t.includes("from work")) return "from_work";
  return "other";
}

/**
 * Rebuild ALL blocks for a single day around a shift entry.
 * Returns the repositioned blocks for that day.
 */
export function rebuildDayAroundShift(
  dayBlocks: ScheduleBlock[],
  shift: ShiftEntry,
  durations: OnboardingDurations
): ScheduleBlock[] {
  // Off day: remove work blocks and roster_reminder, keep everything else as-is
  if (shift.isOff) {
    return dayBlocks.filter((b) => {
      if (b.block_type === "work" || b.block_type === "roster_reminder") return false;
      if (b.block_type === "commute") {
        const role = classifyCommute(b.title);
        if (role === "to_work" || role === "from_work") return false;
      }
      return true;
    });
  }

  const isNight = shift.endTime < shift.startTime; // crosses midnight
  const result: ScheduleBlock[] = [];

  // Categorise blocks
  const blocksByType = new Map<string, ScheduleBlock[]>();
  const commutesByRole = new Map<CommuteRole, ScheduleBlock>();

  dayBlocks.forEach((b) => {
    if (b.block_type === "roster_reminder") return; // always hide on shift days

    if (b.block_type === "commute") {
      const role = classifyCommute(b.title);
      commutesByRole.set(role, b);
    }

    const list = blocksByType.get(b.block_type) || [];
    list.push(b);
    blocksByType.set(b.block_type, list);
  });

  const getFirst = (type: string) => (blocksByType.get(type) || [])[0];

  // Helper to place a block with new times
  const place = (block: ScheduleBlock, start: string, end: string) => {
    result.push({ ...block, start_time: start, end_time: end });
  };

  // ─── DAY SHIFT ───────────────────────────────────────────
  if (!isNight) {
    const shiftStartMin = toMin(shift.startTime);
    const shiftEndMin = toMin(shift.endTime);

    // 1. Commute to work: immediately before shift
    const commuteToWork = commutesByRole.get("to_work");
    const commuteToWorkDur = commuteToWork ? blockDuration(commuteToWork) : durations.commuteMinutes;
    const commuteToWorkStart = addMinutesTime(shift.startTime, -commuteToWorkDur);
    if (commuteToWork && commuteToWorkDur > 0) {
      place(commuteToWork, commuteToWorkStart, shift.startTime);
    }

    // 2. Morning routine: before commute to work (or before shift if no commute)
    const morningRoutine = getFirst("morning_routine");
    const morningAnchor = commuteToWork && commuteToWorkDur > 0 ? commuteToWorkStart : shift.startTime;
    if (morningRoutine) {
      const dur = blockDuration(morningRoutine);
      const routineStart = addMinutesTime(morningAnchor, -dur);
      place(morningRoutine, routineStart, morningAnchor);
    }

    // 3. Sleep (morning portion): ends at wake time
    const sleepBlock = getFirst("sleep");
    const wakeAnchor = morningRoutine
      ? addMinutesTime(morningAnchor, -blockDuration(morningRoutine))
      : morningAnchor;
    const sleepMinutes = durations.sleepDuration * 60;
    const sleepStartTime = addMinutesTime(wakeAnchor, -sleepMinutes);
    if (sleepBlock) {
      place(sleepBlock, sleepStartTime, wakeAnchor);
    }

    // 4. Work/Shift
    const workBlock = getFirst("work");
    if (workBlock) {
      place(workBlock, shift.startTime, shift.endTime);
    }

    // 5. Commute home from work: immediately after shift
    const commuteFromWork = commutesByRole.get("from_work");
    const commuteFromWorkDur = commuteFromWork ? blockDuration(commuteFromWork) : durations.commuteMinutes;
    const commuteFromWorkEnd = addMinutesTime(shift.endTime, commuteFromWorkDur);
    if (commuteFromWork && commuteFromWorkDur > 0) {
      place(commuteFromWork, shift.endTime, commuteFromWorkEnd);
    }

    // 6. Training + gym commutes: find gap after shift
    const trainingBlock = getFirst("training");
    if (trainingBlock && trainingBlock.training_day_id) {
      const trainingDur = blockDuration(trainingBlock);
      const commuteToGym = commutesByRole.get("to_gym");
      const commuteFromGym = commutesByRole.get("from_gym");
      const gymToWork = commutesByRole.get("gym_to_work");

      const toGymDur = commuteToGym ? blockDuration(commuteToGym) : 0;
      const fromGymDur = commuteFromGym ? blockDuration(commuteFromGym) : 0;

      // Total cluster: commute-to-gym + training + commute-from-gym
      const clusterDur = toGymDur + trainingDur + fromGymDur;

      // Start after commute home from work (or after shift if no commute)
      let clusterStart: string;
      if (commuteFromWork && commuteFromWorkDur > 0) {
        clusterStart = addMinutesTime(commuteFromWorkEnd, 15); // 15 min buffer
      } else {
        clusterStart = addMinutesTime(shift.endTime, 15);
      }

      const clusterEnd = addMinutesTime(clusterStart, clusterDur);

      // Only place if it fits before 21:00
      if (toMin(clusterEnd) <= 21 * 60) {
        let cursor = clusterStart;
        if (commuteToGym && toGymDur > 0) {
          place(commuteToGym, cursor, addMinutesTime(cursor, toGymDur));
          cursor = addMinutesTime(cursor, toGymDur);
        }
        place(trainingBlock, cursor, addMinutesTime(cursor, trainingDur));
        cursor = addMinutesTime(cursor, trainingDur);
        if (commuteFromGym && fromGymDur > 0) {
          place(commuteFromGym, cursor, addMinutesTime(cursor, fromGymDur));
        }
      }
      // else: training doesn't fit, omit for this day
    }

    // 7. Evening routine: 1 hour before sleep starts
    const eveningRoutine = getFirst("evening_routine");
    if (eveningRoutine) {
      const eveningEnd = sleepStartTime;
      const eveningStart = addMinutesTime(eveningEnd, -60);
      place(eveningRoutine, eveningStart, eveningEnd);
    }

    // 8. Any other blocks (strategy, reading, custom, etc.) — keep as-is unless they overlap with shift
    dayBlocks.forEach((b) => {
      if (
        b.block_type === "roster_reminder" ||
        b.block_type === "work" ||
        b.block_type === "morning_routine" ||
        b.block_type === "evening_routine" ||
        b.block_type === "training" ||
        b.block_type === "sleep" ||
        b.block_type === "commute"
      ) return; // already handled
      result.push(b);
    });

  // ─── NIGHT SHIFT ─────────────────────────────────────────
  } else {
    // Night shift: shift starts in evening (e.g. 18:00), ends next morning (e.g. 06:00)
    const shiftStartMin = toMin(shift.startTime);

    // 1. Work/Shift
    const workBlock = getFirst("work");
    if (workBlock) {
      place(workBlock, shift.startTime, shift.endTime);
    }

    // 2. Commute to work: before shift start
    const commuteToWork = commutesByRole.get("to_work");
    const commuteToWorkDur = commuteToWork ? blockDuration(commuteToWork) : durations.commuteMinutes;
    const commuteToWorkStart = addMinutesTime(shift.startTime, -commuteToWorkDur);
    if (commuteToWork && commuteToWorkDur > 0) {
      place(commuteToWork, commuteToWorkStart, shift.startTime);
    }

    // 3. Sleep: after shift ends (e.g. 06:00 → 06:00 + travel home + sleep)
    const sleepBlock = getFirst("sleep");
    const commuteFromWork = commutesByRole.get("from_work");
    const commuteFromWorkDur = commuteFromWork ? blockDuration(commuteFromWork) : durations.commuteMinutes;

    // Commute home from work (morning after night shift)
    const arriveHome = addMinutesTime(shift.endTime, commuteFromWorkDur);
    if (commuteFromWork && commuteFromWorkDur > 0) {
      place(commuteFromWork, shift.endTime, arriveHome);
    }

    const sleepMinutes = durations.sleepDuration * 60;
    const sleepStart = arriveHome;
    const sleepEnd = addMinutesTime(sleepStart, sleepMinutes);
    if (sleepBlock) {
      place(sleepBlock, sleepStart, sleepEnd);
    }

    // 4. Morning/Afternoon routine: after waking
    const morningRoutine = getFirst("morning_routine");
    const wakeTime = sleepEnd;
    if (morningRoutine) {
      const dur = blockDuration(morningRoutine);
      place(morningRoutine, wakeTime, addMinutesTime(wakeTime, dur));
    }

    // 5. Training + gym commutes: in afternoon gap before shift
    const trainingBlock = getFirst("training");
    if (trainingBlock && trainingBlock.training_day_id) {
      const trainingDur = blockDuration(trainingBlock);
      const commuteToGym = commutesByRole.get("to_gym");
      const commuteFromGym = commutesByRole.get("from_gym");

      const toGymDur = commuteToGym ? blockDuration(commuteToGym) : 0;
      const fromGymDur = commuteFromGym ? blockDuration(commuteFromGym) : 0;
      const clusterDur = toGymDur + trainingDur + fromGymDur;

      // Place so that cluster ends before commute-to-work
      const clusterEnd = commuteToWorkStart;
      const clusterStart = addMinutesTime(clusterEnd, -clusterDur);

      // Only if it starts after wake + routine
      const routineEnd = morningRoutine
        ? addMinutesTime(wakeTime, blockDuration(morningRoutine))
        : wakeTime;

      if (toMin(clusterStart) >= toMin(routineEnd)) {
        let cursor = clusterStart;
        if (commuteToGym && toGymDur > 0) {
          place(commuteToGym, cursor, addMinutesTime(cursor, toGymDur));
          cursor = addMinutesTime(cursor, toGymDur);
        }
        place(trainingBlock, cursor, addMinutesTime(cursor, trainingDur));
        cursor = addMinutesTime(cursor, trainingDur);
        if (commuteFromGym && fromGymDur > 0) {
          place(commuteFromGym, cursor, addMinutesTime(cursor, fromGymDur));
        }
      }
      // else: training doesn't fit, omit
    }

    // 6. Evening routine: skip on night shifts (no meaningful evening)

    // 7. Other blocks — keep as-is
    dayBlocks.forEach((b) => {
      if (
        b.block_type === "roster_reminder" ||
        b.block_type === "work" ||
        b.block_type === "morning_routine" ||
        b.block_type === "evening_routine" ||
        b.block_type === "training" ||
        b.block_type === "sleep" ||
        b.block_type === "commute"
      ) return;
      result.push(b);
    });
  }

  return result;
}

