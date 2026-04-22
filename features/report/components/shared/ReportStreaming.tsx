"use client";

import { StandupView } from "@/features/report/components/standup/StandupReport";
import { isStandupContent } from "@/features/report/components/standup/standupParser";

interface ReportStreamingViewProps {
  content: string;
}

export function ReportStreamingView({ content }: ReportStreamingViewProps) {
  if (isStandupContent(content)) {
    return <StandupView content={content} isStreaming />;
  }

  return (
    <div className="flex-1 min-h-0 bg-surface border border-border rounded-[2px] p-6 overflow-y-auto">
      <pre className="font-mono text-sm text-text leading-relaxed whitespace-pre-wrap">
        {content}
        <span className="inline-block w-0.5 h-4 bg-accent animate-pulse-cursor ml-0.5 align-middle" />
      </pre>
    </div>
  );
}
