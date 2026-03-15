// ── StandardScheduler ───────────────────────────────────────
export { generateStandardSchedule } from "./StandardScheduler";
export type { StandardConfig, TrainingWindow } from "./StandardScheduler";

// ── ShiftScheduler ──────────────────────────────────────────
export {
  generateProvisionalSchedule,
  rebuildWeekFromShifts,
  rebuildDayAroundShift,
  classifyShiftType,
} from "./ShiftScheduler";
export type { ShiftConfig, ShiftType, ShiftKind } from "./ShiftScheduler";

// ── FIFOScheduler ───────────────────────────────────────────
export {
  generateFIFOHomeSchedule,
  generateFIFOOnSiteSchedule,
  generateFIFOTransitionHomeDay,
  generateFIFOTransitionOnSiteDay,
} from "./FIFOScheduler";
export type { FIFOHomeConfig, FIFOOnSiteConfig } from "./FIFOScheduler";

// ── Shared types & utilities ────────────────────────────────
export type {
  BlockInput,
  BaseConfig,
  ShiftEntry,
  OnboardingDurations,
} from "./shared";
export { addMinutes, toMin, blockDurationMin, makeBlock, dayTimes, isWeekday } from "./shared";
