"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/Textarea";
import { ReportStreamingView } from "@/features/report/components/shared/ReportStreaming";
import { mdComponents } from "@/features/report/components/daily-log/DailyLogMarkdown";
import { StandupView } from "@/features/report/components/standup/StandupReport";
import { isStandupContent } from "@/features/report/components/standup/standupParser";
import { exportContentAsPdf } from "@/utils/pdf-export";

interface Props {
  content: string;
  isStreaming: boolean;
  onClear?: () => void;
}

export function ReportOutput({ content, isStreaming, onClear }: Props) {
  const [editedContent, setEditedContent] = useState("");
  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!isStreaming && content) {
      setEditedContent(content);
    }
  }, [isStreaming, content]);

  async function handleDownloadPdf() {
    setIsExporting(true);
    try {
      await exportContentAsPdf(displayContent);
    } finally {
      setIsExporting(false);
    }
  }

  if (!content && !isStreaming) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center dot-grid">
        <div className="text-center">
          <p className="font-display text-2xl text-muted/50 italic mb-2">
            No report yet
          </p>
          <p className="text-xs font-sans text-muted/40">
            Select a repo and click Generate report
          </p>
        </div>
      </div>
    );
  }

  const displayContent = editedContent || content;
  const showStandupView = isStandupContent(displayContent);

  return (
    <div className="flex-1 min-h-0 flex flex-col p-8">
      <div className="flex items-center justify-between mb-4 shrink-0">
        {isStreaming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted uppercase tracking-widest">
              Generating
            </span>
            <span className="flex gap-1">
              <span className="w-1 h-1 rounded-full bg-accent animate-pulse [animation-delay:0ms]" />
              <span className="w-1 h-1 rounded-full bg-accent animate-pulse [animation-delay:150ms]" />
              <span className="w-1 h-1 rounded-full bg-accent animate-pulse [animation-delay:300ms]" />
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted uppercase tracking-widest">
                Report
              </span>
              <div className="flex border border-border rounded-[2px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={`px-3 py-1 text-xs font-mono transition-colors cursor-pointer ${
                    viewMode === "preview"
                      ? "bg-accent text-white"
                      : "bg-surface text-muted hover:text-text"
                  }`}
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className={`px-3 py-1 text-xs font-mono transition-colors cursor-pointer border-l border-border ${
                    viewMode === "edit"
                      ? "bg-accent text-white"
                      : "bg-surface text-muted hover:text-text"
                  }`}
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-muted hover:text-error border border-border hover:border-error/40 rounded-[2px] transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-[2px] transition-colors cursor-pointer"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                {isExporting ? "Exporting..." : "PDF"}
              </button>
            </div>
          </>
        )}
      </div>

      {isStreaming ? (
        <ReportStreamingView content={content} />
      ) : showStandupView && viewMode === "preview" ? (
        <StandupView content={displayContent} />
      ) : viewMode === "preview" ? (
        <div className="flex-1 min-h-0 bg-surface border border-border rounded-[2px] p-6 overflow-y-auto">
          <ReactMarkdown components={mdComponents}>
            {displayContent}
          </ReactMarkdown>
        </div>
      ) : (
        <Textarea
          mono
          value={displayContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="flex-1 min-h-0 h-full"
          spellCheck={false}
        />
      )}
    </div>
  );
}
