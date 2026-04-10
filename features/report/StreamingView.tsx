"use client";

interface StreamingViewProps {
  content: string;
}

/**
 * Renders the live streaming output as raw pre-formatted text
 * with a blinking cursor appended at the end.
 */
export function StreamingView({ content }: StreamingViewProps) {
  return (
    <div className="flex-1 min-h-0 bg-surface border border-border rounded-[2px] p-6 overflow-y-auto">
      <pre className="font-mono text-sm text-text leading-relaxed whitespace-pre-wrap">
        {content}
        <span className="inline-block w-0.5 h-4 bg-accent animate-pulse-cursor ml-0.5 align-middle" />
      </pre>
    </div>
  );
}
