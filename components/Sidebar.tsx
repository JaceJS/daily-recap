"use client";

import { useState } from "react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Label } from "@/components/Label";
import { listBranches } from "@/features/repos/actions";
import type { Project, Provider, GenerateParams, Branch } from "@/types";

const RANGE_PRESETS = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
] as const;

type RangePreset = (typeof RANGE_PRESETS)[number]["label"] | "custom";

interface Props {
  projects: Project[];
  provider: Provider;
  onGenerate: (params: GenerateParams) => void;
  isGenerating: boolean;
}

export function Sidebar({ projects, provider, onGenerate, isGenerating }: Props) {
  const [selectedRepo, setSelectedRepo] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState("");
  const [rangePreset, setRangePreset] = useState<RangePreset>("24h");
  const [customSince, setCustomSince] = useState("");
  const [customUntil, setCustomUntil] = useState("");
  const [outputMode, setOutputMode] = useState<"log" | "standup">("log");
  const [includePRs, setIncludePRs] = useState(true);
  const [includeIssues, setIncludeIssues] = useState(false);
  const [validationError, setValidationError] = useState("");

  async function handleRepoChange(repoSlug: string) {
    setSelectedRepo(repoSlug);
    setSelectedBranch("");
    setBranches([]);
    setBranchesError("");
    if (!repoSlug) return;
    setBranchesLoading(true);
    try {
      const result = await listBranches(repoSlug);
      if (result.success) {
        setBranches(result.data);
        const preferred =
          result.data.find((b) => b.name === "main") ??
          result.data.find((b) => b.name === "master") ??
          result.data.find((b) => b.isDefault) ??
          result.data[0];
        if (preferred) setSelectedBranch(preferred.name);
      } else {
        setBranchesError(result.error);
      }
    } finally {
      setBranchesLoading(false);
    }
  }

  function handleRangePreset(preset: RangePreset) {
    setRangePreset(preset);
  }

  function computeDateRange(): { since: string; until: string } | null {
    if (rangePreset === "custom") {
      if (!customSince || !customUntil) {
        setValidationError("Both start and end dates are required.");
        return null;
      }
      const since = new Date(customSince);
      const until = new Date(customUntil);
      if (since >= until) {
        setValidationError("Start date must be before end date.");
        return null;
      }
      return { since: since.toISOString(), until: until.toISOString() };
    }

    const preset = RANGE_PRESETS.find((p) => p.label === rangePreset);
    const hours = preset?.hours ?? 24;
    return {
      since: new Date(Date.now() - hours * 3_600_000).toISOString(),
      until: new Date().toISOString(),
    };
  }

  function handleSubmit() {
    setValidationError("");
    if (!selectedRepo) {
      setValidationError("Please select a repository.");
      return;
    }
    if (!selectedBranch) {
      setValidationError("Please select a branch.");
      return;
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (outputMode === "standup") {
      const until = new Date().toISOString();
      const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
      onGenerate({
        repoSlug: selectedRepo,
        branch: selectedBranch,
        since,
        until,
        timezone,
        includePRs,
        includeIssues,
        outputMode,
      });
      return;
    }
    const dates = computeDateRange();
    if (!dates) return;
    onGenerate({
      repoSlug: selectedRepo,
      branch: selectedBranch,
      ...dates,
      timezone,
      includePRs,
      includeIssues,
      outputMode,
    });
  }

  const disabled = isGenerating;

  // Shared toggle button class — used for all pill-style toggles in the sidebar
  const toggleBtn = (active: boolean, isDisabled = false) =>
    [
      "flex-1 py-2 text-xs font-mono rounded-[2px] border transition-colors duration-150",
      isDisabled
        ? "opacity-40 cursor-not-allowed bg-surface text-muted border-border"
        : "cursor-pointer",
      active
        ? "bg-accent text-white border-accent"
        : !isDisabled
        ? "bg-surface text-muted border-border hover:border-accent/50 hover:text-text"
        : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <aside className="w-72 shrink-0 border-r border-border bg-surface flex flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-5">
        {/* Repository */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="repo">Repository</Label>
          {projects.length === 0 ? (
            <p className="text-xs font-sans text-error">
              No projects found. Check your token permissions.
            </p>
          ) : (
            <SearchableSelect
              id="repo"
              options={projects.map((p) => ({ label: p.name, value: p.slug }))}
              value={selectedRepo}
              onChange={handleRepoChange}
              placeholder="Select a repository"
              disabled={disabled}
            />
          )}
        </div>

        {/* Branch */}
        {selectedRepo && (
          <div className="flex flex-col gap-1.5 animate-fade-in">
            <Label htmlFor="branch">Branch</Label>
            {branchesLoading ? (
              <p className="text-xs font-mono text-muted">
                Loading branches...
              </p>
            ) : branchesError ? (
              <p className="text-xs font-sans text-error">{branchesError}</p>
            ) : (
              <SearchableSelect
                id="branch"
                options={branches.map((b) => ({
                  label: b.name,
                  value: b.name,
                }))}
                value={selectedBranch}
                onChange={setSelectedBranch}
                placeholder="Select a branch"
                disabled={disabled || branchesLoading}
              />
            )}
          </div>
        )}

        {/* Output format */}
        <div className="flex flex-col gap-2">
          <Label>Output format</Label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setOutputMode("log")}
              disabled={disabled}
              className={toggleBtn(outputMode === "log")}
            >
              Daily log
            </button>
            <button
              type="button"
              onClick={() => setOutputMode("standup")}
              disabled={disabled}
              className={toggleBtn(outputMode === "standup")}
            >
              Standup
            </button>
          </div>
          {outputMode === "standup" && (
            <p className="text-[11px] font-sans text-muted/60">
              Standup uses previous workday plus today so far.
            </p>
          )}
        </div>

        {outputMode === "log" && (
          <div className="flex flex-col gap-2">
            <Label>Date range</Label>
            <div className="flex gap-1.5">
              {RANGE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleRangePreset(preset.label)}
                  disabled={disabled}
                  className={toggleBtn(rangePreset === preset.label)}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleRangePreset("custom")}
                disabled={disabled}
                className={toggleBtn(rangePreset === "custom")}
              >
                custom
              </button>
            </div>

            {rangePreset === "custom" && (
              <div className="flex flex-col gap-2 animate-fade-in">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-mono text-muted">From</span>
                  <Input
                    type="datetime-local"
                    value={customSince}
                    onChange={(e) => setCustomSince(e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-mono text-muted">To</span>
                  <Input
                    type="datetime-local"
                    value={customUntil}
                    onChange={(e) => setCustomUntil(e.target.value)}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Data sources */}
        <div className="flex flex-col gap-2">
          <Label>Data sources</Label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={includePRs}
              onChange={(e) => setIncludePRs(e.target.checked)}
              disabled={disabled}
              className="w-3.5 h-3.5 accent-accent cursor-pointer"
            />
            <span className="text-xs font-sans text-muted group-hover:text-text transition-colors">
              {provider === "github" ? "Pull Requests" : "Merge Requests"}
            </span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeIssues}
              onChange={(e) => setIncludeIssues(e.target.checked)}
              disabled={disabled}
              className="w-3.5 h-3.5 accent-accent cursor-pointer"
            />
            <span className="text-xs font-sans text-muted group-hover:text-text transition-colors">
              Issues
            </span>
          </label>
        </div>

        {validationError && (
          <p className="text-xs font-sans text-error">{validationError}</p>
        )}
      </div>

      {/* Generate button — pinned to bottom */}
      <div className="px-5 py-4 border-t border-border">
        <Button
          type="button"
          loading={isGenerating}
          onClick={handleSubmit}
          disabled={projects.length === 0}
        >
          {isGenerating ? "Generating..." : "Generate report →"}
        </Button>
      </div>
    </aside>
  );
}
