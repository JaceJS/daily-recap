import type { ActivityData, DailyActivity, DailyActivityData } from "@/types";

export const MAX_DATE_RANGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const DAY_NAMES = {
  id: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
};

function makeLabel(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  const dayName = DAY_NAMES.id[d.getUTCDay()];
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dayName}, ${dd}-${mm}-${yyyy}`;
}

export function validateDateRange(since: string, until: string): void {
  const sinceDate = new Date(since);
  const untilDate = new Date(until);
  if (isNaN(sinceDate.getTime()) || isNaN(untilDate.getTime())) {
    throw new Error("Invalid date format for since or until");
  }
  if (sinceDate >= untilDate) {
    throw new Error("since must be before until");
  }
  if (untilDate.getTime() - sinceDate.getTime() > MAX_DATE_RANGE_MS) {
    throw new Error("Date range cannot exceed 30 days");
  }
}

export function groupActivityByDay(
  activity: ActivityData,
  since: string,
  until: string
): DailyActivityData {
  const dates: string[] = [];
  const cursor = new Date(since);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDay = until.slice(0, 10);
  while (cursor.toISOString().slice(0, 10) <= endDay) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const days: DailyActivity[] = dates
    .map((date) => ({
      date,
      label: makeLabel(date),
      commits: activity.commits.filter((c) => c.authoredDate.slice(0, 10) === date),
      pullRequests: activity.pullRequests.filter((pr) => pr.updatedAt.slice(0, 10) === date),
      issues: activity.issues.filter((i) => i.updatedAt.slice(0, 10) === date),
    }))
    .filter((d) => d.commits.length > 0 || d.pullRequests.length > 0 || d.issues.length > 0);

  return { days };
}
