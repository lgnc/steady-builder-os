import {
  addMinutes,
  toMin,
  makeBlock,
  dayTimes,
  type BaseConfig,
  type BlockInput,
} from "./shared";
import { generateStandardSchedule } from "./StandardScheduler";

// ── Types ───────────────────────────────────────────────────

export interface FIFOHomeConfig extends BaseConfig {
  scheduleMode?: string;          // default 'home'
}

export interface FIFOOnSiteConfig extends BaseConfig {
  shiftType: "days" | "nights";
  shiftStart: string;             // HH:MM
  shiftEnd: string;               // HH:MM
  allDays?: number[];             // default [0,1,2,3,4,5,6]
  scheduleMode?: string;          // default 'on_site'
}

// ── Home mode ───────────────────────────────────────────────

/**
 * Generate home-mode blocks for FIFO workers.
 * Home days use full Standard Hours scheduling with no fixed work block.
 */
export function generateFIFOHomeSchedule(config: FIFOHomeConfig): BlockInput[] {
  return generateStandardSchedule({
    ...config,
    workDays: [],        // no work block at home
    workStart: "09:00",  // irrelevant — workDays is empty
    workEnd: "17:00",
    preferredTrainingWindow: "after_work",
    gymToWorkDirect: false,
    scheduleMode: config.scheduleMode ?? "home",
  });
}

// ── On-site mode ────────────────────────────────────────────

/**
 * Generate on-site blocks for FIFO workers.
 * On-site days use a compressed survival schedule.
 * Extracted and consolidated from Calendar.tsx's generateOnSiteBlocksFromConfig.
 */
export function generateFIFOOnSiteSchedule(config: FIFOOnSiteConfig): BlockInput[] {
  const uid = config.userId;
  const mode = config.scheduleMode ?? "on_site";
  const allDays = config.allDays ?? [0, 1, 2, 3, 4, 5, 6];
  const shortRoutine = 20;  // compressed on-site routine length in minutes
  const { shiftType, shiftStart, shiftEnd } = config;
  const blocks: BlockInput[] = [];

  allDays.forEach((dow) => {
    const hasTraining = config.trainingDayMap.has(dow);
    const trainingDayId = config.trainingDayMap.get(dow) ?? null;
    const trainingDuration = config.trainingDuration;

    if (shiftType === "days") {
      // ─── DAY SHIFT ON-SITE ─────────────────────────────
      const wakeTime = addMinutes(shiftStart, -60);
      const bedtime = addMinutes(shiftEnd, 180);
      const cappedBedtime = toMin(bedtime) > toMin("23:00") ? "22:00" : bedtime;
      const nextDow = (dow + 1) % 7;
      const nextWake = addMinutes(shiftStart, -60); // same pattern each day on-site

      blocks.push(makeBlock(uid, "morning_routine", "Morning Routine",
        wakeTime, addMinutes(wakeTime, shortRoutine), dow,
        { locked: true, scheduleMode: mode }));

      blocks.push(makeBlock(uid, "work", "Site Shift",
        shiftStart, shiftEnd, dow,
        { locked: true, scheduleMode: mode }));

      // Training after shift — only if there is room before bedtime
      if (hasTraining) {
        const trainingStart = addMinutes(shiftEnd, 30);
        const trainingEnd = addMinutes(trainingStart, trainingDuration);
        if (toMin(trainingEnd) <= toMin("20:30")) {
          blocks.push(makeBlock(uid, "training", "On-Site Training",
            trainingStart, trainingEnd, dow,
            { locked: false, trainingDayId, scheduleMode: mode }));
        }
      }

      blocks.push(makeBlock(uid, "evening_routine", "Evening Routine",
        addMinutes(cappedBedtime, -shortRoutine), cappedBedtime, dow,
        { locked: true, scheduleMode: mode }));

      blocks.push(makeBlock(uid, "sleep", "Sleep",
        cappedBedtime, nextWake, dow,
        { locked: true, scheduleMode: mode }));

    } else {
      // ─── NIGHT SHIFT ON-SITE ───────────────────────────
      const wakeTime = addMinutes(shiftStart, -120);
      const sleepEnd = wakeTime;
      const sleepStart = addMinutes(shiftEnd, 60); // sleep after shift + buffer

      blocks.push(makeBlock(uid, "sleep", "Sleep",
        sleepStart, sleepEnd, dow,
        { locked: true, scheduleMode: mode }));

      blocks.push(makeBlock(uid, "morning_routine", "Afternoon Routine",
        wakeTime, addMinutes(wakeTime, shortRoutine), dow,
        { locked: true, scheduleMode: mode }));

      // Training before shift — only if there is room
      if (hasTraining) {
        const trainingStart = addMinutes(wakeTime, shortRoutine + 15);
        const trainingEnd = addMinutes(trainingStart, trainingDuration);
        const latestTraining = addMinutes(shiftStart, -30);
        if (toMin(trainingEnd) <= toMin(latestTraining)) {
          blocks.push(makeBlock(uid, "training", "On-Site Training",
            trainingStart, trainingEnd, dow,
            { locked: false, trainingDayId, scheduleMode: mode }));
        }
      }

      blocks.push(makeBlock(uid, "work", "Night Shift",
        shiftStart, shiftEnd, dow,
        { locked: true, scheduleMode: mode }));
    }
  });

  return blocks;
}

// ── Transition days ─────────────────────────────────────────

/**
 * First day home after on-site roster — recovery and decompression.
 * Suppresses full morning ritual and training. Sleep is prioritised.
 */
export function generateFIFOTransitionHomeDay(
  config: FIFOHomeConfig,
  dow: number
): BlockInput[] {
  const uid = config.userId;
  const mode = config.scheduleMode ?? "home";
  const { wakeTime, bedtime } = dayTimes(dow, config);
  const er = config.eveningRoutineMinutes;
  const nextDow = (dow + 1) % 7;
  const { wakeTime: nextWake } = dayTimes(nextDow, config);

  return [
    // Shortened morning — 15 min only
    makeBlock(uid, "morning_routine", "Morning Routine", wakeTime, addMinutes(wakeTime, 15), dow, { locked: true, scheduleMode: mode }),
    // No training — recovery day
    makeBlock(uid, "evening_routine", "Evening Routine", addMinutes(bedtime, -er), bedtime, dow, { locked: true, scheduleMode: mode }),
    makeBlock(uid, "sleep", "Sleep", bedtime, nextWake, dow, { locked: true, scheduleMode: mode }),
  ];
}

/**
 * Day before on-site roster starts — preparation day.
 * Structure is mostly normal; nothing demanding in the evening.
 */
export function generateFIFOTransitionOnSiteDay(
  config: FIFOOnSiteConfig,
  dow: number
): BlockInput[] {
  const uid = config.userId;
  const mode = config.scheduleMode ?? "home";
  const { wakeTime, bedtime } = dayTimes(dow, config);
  const mr = config.morningRoutineMinutes;
  const er = config.eveningRoutineMinutes;
  const nextDow = (dow + 1) % 7;
  const { wakeTime: nextWake } = dayTimes(nextDow, config);

  // Normal structure but end evening routine early — early night before site start
  const prepBedtime = addMinutes(config.shiftStart, -540); // 9h before first shift
  const actualBedtime = toMin(prepBedtime) < toMin("20:00") ? prepBedtime : bedtime;

  return [
    makeBlock(uid, "morning_routine", "Morning Routine", wakeTime, addMinutes(wakeTime, mr), dow, { locked: true, scheduleMode: mode }),
    makeBlock(uid, "evening_routine", "Evening Routine", addMinutes(actualBedtime, -er), actualBedtime, dow, { locked: true, scheduleMode: mode }),
    makeBlock(uid, "sleep", "Sleep", actualBedtime, nextWake, dow, { locked: true, scheduleMode: mode }),
  ];
}
