import { useState } from "react";
import { listBranches } from "@/features/repos/actions";
import type { Branch } from "@/types";

export function useRepoBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadBranches(repoSlug: string): Promise<Branch[]> {
    if (!repoSlug) {
      setBranches([]);
      setError("");
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await listBranches(repoSlug);
      if (!result.success) {
        setBranches([]);
        setError(result.error);
        return [];
      }

      setBranches(result.data);
      return result.data;
    } finally {
      setIsLoading(false);
    }
  }

  return { branches, isLoading, error, loadBranches };
}
