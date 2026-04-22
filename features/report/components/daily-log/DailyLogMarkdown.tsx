"use client";

import { useState, type ReactNode } from "react";
import type { Components } from "react-markdown";
import { getTextContent, getBlockquoteText } from "@/utils/markdown";

const COPY_RESET_DELAY_MS = 2000;

interface SummaryBlockProps {
  children: ReactNode;
}

interface ActivityListItem {
  prefix: string;
  text: string;
}

function parseActivityListItem(text: string): ActivityListItem | null {
  if (text.startsWith("[commit] ")) {
    return { prefix: "commit", text: text.replace(/^\[commit\]\s+/, "") };
  }

  const prefixedMatch = text.match(/^\[(PR|MR|issue)\s+([^\]]+)\]\s+(.*)$/i);
  if (!prefixedMatch) return null;

  const [, kind, state, label] = prefixedMatch;
  return {
    prefix: `${kind} ${state}`,
    text: label,
  };
}

function SummaryBlock({ children }: SummaryBlockProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = getBlockquoteText(children);
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_RESET_DELAY_MS);
  }

  return (
    <blockquote className="mt-3 mb-1 border border-accent/25 border-l-2 border-l-accent bg-accent/5 rounded-r-[3px] overflow-hidden">
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0">{children}</div>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 mt-0.5 text-[0.65rem] font-mono text-accent/50 hover:text-accent transition-colors cursor-pointer"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
    </blockquote>
  );
}

export const mdComponents: Components = {
  h2: ({ children }) => (
    <h2 className="flex items-center gap-2.5 font-mono text-sm font-semibold text-text mt-8 mb-3 pb-2 border-b border-border first:mt-0">
      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-mono text-xs font-semibold text-muted mt-4 mb-1 first:mt-0">
      {children}
    </h3>
  ),
  ul: ({ children }) => (
    <ul className="flex flex-col gap-0 my-1.5 pl-0 list-none">{children}</ul>
  ),
  ol: ({ children }) => <ol className="list-decimal pl-5 my-1">{children}</ol>,
  li: ({ children }) => {
    const activityItem = parseActivityListItem(getTextContent(children));
    if (activityItem) {
      return (
        <li className="py-px list-none text-[0.65rem] font-mono text-muted/55 leading-relaxed tracking-tight lowercase">
          <span className="text-muted/35">{activityItem.prefix}: </span>
          <span>{activityItem.text}</span>
        </li>
      );
    }

    return (
      <li className="text-[0.8125rem] font-sans text-text leading-relaxed my-0.5 list-disc ml-4">
        {children}
      </li>
    );
  },
  blockquote: ({ children }) => <SummaryBlock>{children}</SummaryBlock>,
  p: ({ children }) => (
    <p className="text-[0.8125rem] font-sans text-muted leading-relaxed my-1">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text">{children}</strong>
  ),
};
