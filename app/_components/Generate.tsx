"use client";

import { useState, useEffect } from "react";
import { Sidebar, type GenerateParams } from "@/app/_components/Sidebar";
import { ReportOutput } from "@/app/_components/ReportOutput";
import type { Project, Provider } from "@/lib/types";

interface Props {
  projects: Project[];
  provider: Provider;
}

const STORAGE_KEY = "daily-recap:report";

export function GeneratePage({ projects, provider }: Props) {
  const [reportContent, setReportContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setReportContent(saved);
  }, []);

  function handleClear() {
    setReportContent("");
    localStorage.removeItem(STORAGE_KEY);
  }

  async function handleGenerate(params: GenerateParams) {
    setError(null);
    setReportContent("");
    setIsGenerating(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string }).message ?? `Error ${res.status}`,
        );
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body.");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setReportContent(accumulated);
      }

      localStorage.setItem(STORAGE_KEY, accumulated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar
        projects={projects}
        provider={provider}
        onGenerate={handleGenerate}
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

        <ReportOutput content={reportContent} isStreaming={isGenerating} onClear={handleClear} />
      </main>
    </div>
  );
}
