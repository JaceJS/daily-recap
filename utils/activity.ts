import type {
  ActivityData,
  DailyActivity,
  DailyActivityData,
  Commit,
  PullRequest,
  Issue,
  StandupActivityData,
  StandupActivityGroup,
  StandupBlocker,
} from "@/types";

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

const LOW_SIGNAL_PATTERNS = [
  /^merge\b/i,
  /^wip\b/i,
  /\btypo\b/i,
  /\bformat(?:ting)?\b/i,
  /\bprettier\b/i,
  /\blint\b/i,
  /\beslint\b/i,
  /\bclean[- ]?up\b/i,
  /\brename\b/i,
  /\bpackage-lock\b/i,
  /\bdeps?\b/i,
  /\bbump\b/i,
];

type ActivityWithDate = {
  authoredDate?: string;
  updatedAt?: string;
};

type TimeZoneParts = {
  year: string;
  month: string;
  day: string;
};

function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getSafeTimeZone(timezone: string): string {
  return isValidTimeZone(timezone) ? timezone : "UTC";
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getDatePartsInTimeZone(date: Date, timezone: string): TimeZoneParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  return {
    year: parts.find((part) => part.type === "year")?.value ?? "1970",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
  };
}

function getDateKeyInTimeZone(date: Date, timezone: string): string {
  const { year, month, day } = getDatePartsInTimeZone(date, timezone);
  return `${year}-${month}-${day}`;
}

function getTimeZoneOffsetMs(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? 1970);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 1);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 1);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const second = Number(parts.find((part) => part.type === "second")?.value ?? 0);

  return Date.UTC(year, month - 1, day, hour, minute, second) - date.getTime();
}

function zonedMidnightToUtc(date: string, timezone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const firstOffset = getTimeZoneOffsetMs(guess, timezone);
  let result = new Date(guess.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(result, timezone);
  if (secondOffset !== firstOffset) {
    result = new Date(guess.getTime() - secondOffset);
  }
  return result;
}

function getPreviousWorkday(today: string): string {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  if (weekday === 1) return shiftDate(today, -3);
  if (weekday === 0) return shiftDate(today, -2);
  if (weekday === 6) return shiftDate(today, -1);
  return shiftDate(today, -1);
}

function isLowSignalTitle(title: string): boolean {
  return LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(title));
}

function getItemDate(activity: ActivityWithDate): string {
  return activity.authoredDate ?? activity.updatedAt ?? "";
}

function filterMeaningful<T extends { title: string }>(items: T[]): T[] {
  return items.filter((item) => !isLowSignalTitle(item.title));
}

function bucketByDate<T extends ActivityWithDate>(items: T[], timezone: string): Map<string, T[]> {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const dateValue = getItemDate(item);
    if (!dateValue) continue;
    const dateKey = getDateKeyInTimeZone(new Date(dateValue), timezone);
    const existing = buckets.get(dateKey) ?? [];
    existing.push(item);
    buckets.set(dateKey, existing);
  }
  return buckets;
}

function buildStandupGroup(
  date: string,
  commits: Commit[],
  pullRequests: PullRequest[],
  issues: Issue[],
): StandupActivityGroup {
  return {
    date,
    label: makeLabel(date),
    commits,
    pullRequests,
    issues,
  };
}

function isOpenPullRequestState(state: string): boolean {
  return ["open", "opened", "reopened", "draft"].includes(state.toLowerCase());
}

function isOpenIssueState(state: string): boolean {
  return ["open", "opened", "reopened"].includes(state.toLowerCase());
}

export function resolveStandupWindow(
  timezone: string,
  now: Date = new Date(),
): {
  timezone: string;
  yesterdayDate: string;
  todayDate: string;
  effectiveSince: string;
  effectiveUntil: string;
} {
  const safeTimezone = getSafeTimeZone(timezone);
  const todayDate = getDateKeyInTimeZone(now, safeTimezone);
  const yesterdayDate = getPreviousWorkday(todayDate);

  return {
    timezone: safeTimezone,
    yesterdayDate,
    todayDate,
    effectiveSince: zonedMidnightToUtc(yesterdayDate, safeTimezone).toISOString(),
    effectiveUntil: now.toISOString(),
  };
}

function isStandupWindowDate(date: string, window: ReturnType<typeof resolveStandupWindow>): boolean {
  return date === window.todayDate || date === window.yesterdayDate;
}

export function buildStandupActivity(
  activity: ActivityData,
  window: ReturnType<typeof resolveStandupWindow>,
): StandupActivityData {
  const meaningfulActivity: ActivityData = {
    commits: filterMeaningful(activity.commits),
    pullRequests: filterMeaningful(activity.pullRequests),
    issues: filterMeaningful(activity.issues),
  };

  const commitBuckets = bucketByDate(meaningfulActivity.commits, window.timezone);
  const pullRequestBuckets = bucketByDate(meaningfulActivity.pullRequests, window.timezone);
  const issueBuckets = bucketByDate(meaningfulActivity.issues, window.timezone);

  const yesterday = buildStandupGroup(
    window.yesterdayDate,
    commitBuckets.get(window.yesterdayDate) ?? [],
    pullRequestBuckets.get(window.yesterdayDate) ?? [],
    issueBuckets.get(window.yesterdayDate) ?? [],
  );

  const today = buildStandupGroup(
    window.todayDate,
    commitBuckets.get(window.todayDate) ?? [],
    pullRequestBuckets.get(window.todayDate) ?? [],
    issueBuckets.get(window.todayDate) ?? [],
  );

  const blockers: StandupBlocker[] = [
    ...meaningfulActivity.pullRequests
      .filter(
        (pr) =>
          isOpenPullRequestState(pr.state) &&
          isStandupWindowDate(
            getDateKeyInTimeZone(new Date(pr.updatedAt), window.timezone),
            window,
          ),
      )
      .map((pr) => ({
        kind: "PR" as const,
        title: pr.title,
        state: pr.state,
        updatedAt: pr.updatedAt,
        webUrl: pr.webUrl,
      })),
    ...meaningfulActivity.issues
      .filter(
        (issue) =>
          isOpenIssueState(issue.state) &&
          isStandupWindowDate(
            getDateKeyInTimeZone(new Date(issue.updatedAt), window.timezone),
            window,
          ),
      )
      .map((issue) => ({
        kind: "issue" as const,
        title: issue.title,
        state: issue.state,
        updatedAt: issue.updatedAt,
        webUrl: issue.webUrl,
      })),
  ];

  return {
    timezone: window.timezone,
    effectiveSince: window.effectiveSince,
    effectiveUntil: window.effectiveUntil,
    yesterday,
    today,
    blockers,
  };
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
