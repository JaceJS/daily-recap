import { useState, useEffect } from "react";
import { streamClientText } from "@/lib/http/client";
import type { GenerateParams } from "@/types";

const STORAGE_KEY = "daily-recap:report";

export function useReport() {
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setContent(saved);
  }, []);

  async function generate(params: GenerateParams) {
    setError(null);
    setContent("");
    setIsGenerating(true);

    try {
      const accumulated = await streamClientText("/api/generate", {
        method: "POST",
        jsonBody: params,
        onChunk: (_chunk, fullText) => {
          setContent(fullText);
        },
      });

      localStorage.setItem(STORAGE_KEY, accumulated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }

  function clear() {
    setContent("");
    localStorage.removeItem(STORAGE_KEY);
  }

  return { content, isGenerating, error, generate, clear };
}
