import { startOfWeek, format } from "date-fns";

/**
 * Returns the Monday (ISO week start) for the given date as "YYYY-MM-DD".
 */
export function getWeekStartDate(date: Date): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}
