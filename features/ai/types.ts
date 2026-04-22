type BaseGenerateInput = {
  repoSlug: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  includeDaySummary: boolean;
};

export type GenerateDailyLogInput =
  | (BaseGenerateInput & {
      outputMode: "log";
      rawDailyActivity: string;
    })
  | (BaseGenerateInput & {
      outputMode: "standup";
      rawStandupActivity: string;
    });
