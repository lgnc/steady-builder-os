// ── Compatibility shim ──────────────────────────────────────
// All logic has moved to src/lib/schedulers/.
// This file is kept for backward compatibility only.

export { addMinutes as addMinutesTime } from "./schedulers/shared";
export type { ShiftEntry, OnboardingDurations } from "./schedulers/shared";
export { rebuildDayAroundShift } from "./schedulers/ShiftScheduler";
