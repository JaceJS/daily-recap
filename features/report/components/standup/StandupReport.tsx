"use client";

import {
  parseStandupContent,
  STANDUP_SECTIONS,
  type StandupSectionKey,
} from "@/features/report/components/standup/standupParser";

interface Props {
  content: string;
  isStreaming?: boolean;
}

const SECTION_STYLES: Record<
  StandupSectionKey,
  { badge: string; border: string; background: string }
> = {
  Kemarin: {
    badge: "bg-accent/10 text-accent",
    border: "border-accent/20",
    background: "bg-accent/5",
  },
  "Hari ini": {
    badge: "bg-sky-500/10 text-sky-700",
    border: "border-sky-500/20",
    background: "bg-sky-500/5",
  },
  Blocker: {
    badge: "bg-amber-500/12 text-amber-700",
    border: "border-amber-500/25",
    background: "bg-amber-500/5",
  },
};

export function StandupView({ content, isStreaming = false }: Props) {
  const parsed = parseStandupContent(content);
  if (!parsed) return null;

  return (
    <div className="flex-1 min-h-0 bg-surface border border-border rounded-[2px] p-6 overflow-y-auto">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
        <h2 className="font-mono text-sm font-semibold text-text">Standup</h2>
      </div>

      <div className="grid gap-4">
        {STANDUP_SECTIONS.map((section) => {
          const items = parsed.sections[section];
          const style = SECTION_STYLES[section];

          return (
            <section
              key={section}
              className={`border rounded-[2px] p-4 ${style.border} ${style.background}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`px-2 py-1 rounded-[2px] text-[0.65rem] font-mono font-semibold uppercase tracking-wide ${style.badge}`}
                >
                  {section}
                </span>
              </div>

              {items.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {items.map((item, index) => (
                    <li
                      key={`${section}-${index}`}
                      className="flex items-start gap-2 text-[0.9rem] font-sans text-text leading-relaxed"
                    >
                      <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-mono text-muted/70 leading-relaxed">
                  {section === "Kemarin" ? "Belum ada update." : "-"}
                </p>
              )}
            </section>
          );
        })}
      </div>

      {isStreaming && (
        <div className="mt-4 flex items-center gap-2 text-xs font-mono text-muted">
          <span>Generating</span>
          <span className="inline-block w-0.5 h-4 bg-accent animate-pulse-cursor align-middle" />
        </div>
      )}
    </div>
  );
}
