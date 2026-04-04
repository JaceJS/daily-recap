export type GenerateDailyLogInput = {
  rawDailyActivity: string; // JSON string of DailyActivityData
  repoSlug: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  language: "en" | "id";
  outputMode: "log" | "standup";
  includeDaySummary: boolean;
};
