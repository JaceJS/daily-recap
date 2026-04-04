"use client";

import { useState, useActionState } from "react";
import { registerUserAction } from "@/actions/auth";
import { Button } from "@/app/_components/ui/Button";
import { Input } from "@/app/_components/ui/Input";
import { Label } from "@/app/_components/ui/Label";
import { ErrorBox } from "@/app/_components/ui/ErrorBox";

const FEATURES = [
  { symbol: "⚡", label: "Connect your repository in seconds" },
  { symbol: "✦", label: "AI-powered daily logs & standups" },
  { symbol: "↓", label: "Export to PDF" },
];

const PROVIDERS = [
  { id: "gitlab", label: "GitLab", soon: false },
  { id: "github", label: "GitHub", soon: false },
] as const;

type Provider = (typeof PROVIDERS)[number]["id"];

const TOKEN_CONFIG = {
  gitlab: {
    label: "GitLab Access Token",
    placeholder: "glpat-xxxxxxxxxxxxxxxxxxxx",
    hint: (
      <>
        <code className="text-accent">read_api</code> scope ·{" "}
        <a
          href="https://gitlab.com/-/user_settings/personal_access_tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-text transition-colors"
        >
          Create one →
        </a>
      </>
    ),
  },
  github: {
    label: "GitHub Personal Access Token",
    placeholder: "github_pat_xxxxxxxxxxxxxxxxxxxx",
    hint: (
      <>
        <code className="text-accent">repo</code> scope ·{" "}
        <a
          href="https://github.com/settings/tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-text transition-colors"
        >
          Create one →
        </a>
      </>
    ),
  },
};

export default function SetupForm() {
  const [state, action, isPending] = useActionState(registerUserAction, null);
  const [provider, setProvider] = useState<Provider>("gitlab");

  const token = TOKEN_CONFIG[provider];

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      {/* ── Left panel ───────────────────────────────────── */}
      <div className="relative lg:w-[55%] bg-accent overflow-hidden flex flex-col justify-between p-10 lg:p-14 min-h-[260px] lg:min-h-dvh">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative">
          <span className="font-display text-white/90 text-lg font-semibold tracking-wide lg:text-2xl">
            DailyRecap
          </span>
        </div>

        <div className="relative my-auto lg:my-0">
          <h1 className="font-display text-4xl lg:text-5xl text-white leading-[1.15] mb-2 animate-fade-up stagger-1">
            Your commits,
          </h1>
          <h1 className="font-display text-4xl lg:text-5xl text-white/70 italic font-light leading-[1.15] mb-10 animate-fade-up stagger-2">
            turned into clear updates.
          </h1>

          <div className="flex flex-col gap-3 animate-fade-up stagger-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="font-mono text-white text-sm lg:text-lg w-5 shrink-0">
                  {f.symbol}
                </span>
                <span className="font-sans text-white/85 text-sm lg:text-lg">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative font-mono font-bold text-lg text-white animate-fade-up stagger-4">
          No data stored · Session only
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-surface">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden mb-8">
            <span className="font-display text-xl text-text font-semibold">
              DailyRecap
            </span>
          </div>

          <h2 className="font-display text-4xl lg:text-6xl text-text text-center mb-8">
            Get started
          </h2>

          {/* Provider selector */}
          <div className="flex gap-2 mb-6">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvider(p.id)}
                className={[
                  "flex-1 py-2 text-xs lg:text-base font-mono border rounded-[2px] transition-colors duration-150 flex items-center justify-center gap-2",
                  provider === p.id
                    ? "bg-accent text-white border-accent cursor-pointer"
                    : "bg-surface text-muted border-border hover:border-accent/50 hover:text-text cursor-pointer",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
          </div>

          <form action={action} className="flex flex-col gap-5 lg:text-lg">
            <input type="hidden" name="provider" value={provider} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Name..."
                required
                autoComplete="name"
                maxLength={50}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="token">{token.label}</Label>
              <Input
                id="token"
                name="token"
                type="password"
                placeholder={token.placeholder}
                required
                autoComplete="off"
                mono
              />
              <span className="font-mono text-xs text-muted">{token.hint}</span>
            </div>

            {state?.error && <ErrorBox message={state.error} />}

            <Button
              type="submit"
              loading={isPending}
              className="mt-1 lg:text-base"
            >
              {isPending ? "Connecting..." : "Get started →"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
