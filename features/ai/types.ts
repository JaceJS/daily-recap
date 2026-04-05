export type GenerateDailyLogInput = {
  rawDailyActivity: string;
  repoSlug: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  language: "en" | "id";
  outputMode: "log" | "standup";
  includeDaySummary: boolean;
};
