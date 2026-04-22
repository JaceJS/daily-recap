export type GenerateDailyLogInput = {
  rawDailyActivity: string;
  repoSlug: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  outputMode: "log" | "standup";
  includeDaySummary: boolean;
};
