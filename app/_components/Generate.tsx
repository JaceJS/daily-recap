"use client";

import { Sidebar } from "@/app/_components/Sidebar";
import { ReportOutput } from "@/app/_components/ReportOutput";
import { useReport } from "@/hooks/useReport";
import type { Project, Provider } from "@/types";

interface Props {
  projects: Project[];
  provider: Provider;
}

export function GeneratePage({ projects, provider }: Props) {
  const { content, isGenerating, error, generate, clear } = useReport();

  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar
        projects={projects}
        provider={provider}
        onGenerate={generate}
        isGenerating={isGenerating}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {error && (
          <div className="px-8 pt-6">
            <p className="text-xs font-sans text-error bg-error/8 border border-error/30 rounded-[2px] px-4 py-3">
              {error}
            </p>
          </div>
        )}

        <ReportOutput content={content} isStreaming={isGenerating} onClear={clear} />
      </main>
    </div>
  );
}
