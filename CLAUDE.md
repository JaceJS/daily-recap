# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use `bun` as the package manager for all operations.

```bash
bun dev      # Start dev server with Turbopack on http://localhost:3000
bun build    # Production build (Turbopack)
bun start    # Serve production build
bun lint     # Run ESLint
```

## Architecture

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript + iron-session + Tailwind CSS v4

### Modular feature structure

Business logic lives in `features/` — each domain has its own `service.ts` (logic) and `types.ts` (TypeScript types):

- `features/auth/types.ts` — `UserSession` type (no service; logic inlined in `actions/auth.ts`)
- `features/gitlab/` — GitLab API integration; normalizes raw API responses to shared `types/`
- `features/github/` — GitHub API integration; same interface as GitLab feature
- `features/ai/` — LLM streaming via OpenRouter

### Entry points

- `app/page.tsx` — checks session; shows `SetupForm` or renders `GeneratePage`
- `actions/auth.ts` — register, login, logout; session read/write
- `actions/repos.ts` — unified `listRepos()` that dispatches to the correct provider based on session
- `app/api/generate/route.ts` — Route Handler for streaming AI responses; includes IP-based rate limiting (10 req/hour)

### React hooks

Custom hooks live in `hooks/` — extract stateful/side-effect logic out of components:

- `hooks/useReport.ts` — streaming fetch + localStorage persistence for the generated report
- `hooks/useDropdown.ts` — click-outside + ESC-key close behavior for dropdown menus

### Shared utilities

- `config/env.ts` — **all env vars go through here**; use `env.VAR_NAME`, never `process.env` directly
- `config/session.ts` — iron-session config and `getSession()` helper; session TTL 3 hours
- `types/index.ts` — shared domain types: `Project`, `Commit`, `PullRequest`, `Issue`, `ActivityData`, `DailyActivityData`, `FetchActivityInput`, `GenerateParams`
- `utils/rate-limit.ts` — in-memory sliding window rate limiter (10 req/hour per IP)
- `utils/activity.ts` — `groupActivityByDay()` and `validateDateRange()` shared by all provider services
- `utils/markdown.ts` — React node text extraction helpers for markdown rendering
- `utils/pdf-export.ts` — client-side PDF export via jsPDF

### Data flow

```
UI Component → Server Action (actions/) → Feature Service (features/)
                     ↕                              ↕
              iron-session cookie           GitLab API / LLM API
```

## Environment variables

All vars are declared and validated in `config/env.ts`. Add values to `.env.local`.

| Variable             | Required | Purpose                                                            |
| -------------------- | -------- | ------------------------------------------------------------------ |
| `SESSION_SECRET`     | yes      | Min 32-char secret for iron-session AEAD encryption                |
| `GITLAB_URL`         | no       | GitLab base URL (default: `https://gitlab.com`)                    |
| `OPENROUTER_API_KEY` | yes      | OpenRouter API key                                                 |
| `OPENROUTER_MODEL`   | no       | Model override (default: `meta-llama/llama-3.3-70b-instruct:free`) |

## Conventions

- All env vars go through `config/env.ts`
- Session config lives in `config/session.ts`
- Server Actions go in `actions/`; they validate input and manage session state, then delegate to `features/`.
- Feature services (`features/*/service.ts`) are pure business logic — no HTTP, no cookie access.
- `app/api/` is used only when Server Actions cannot be used (e.g., streaming responses).
- Auth is stateless — PAT stored in an iron-session encrypted cookie (`session`). No database. Session TTL: 3 hours.

### UI Components

Reusable UI primitives live in `app/_components/ui/`. Use these instead of inline styles or global CSS classes.

| Component  | Usage                                        |
| ---------- | -------------------------------------------- |
| `Button`   | `<Button loading={isPending}>Label</Button>` |
| `Input`    | `<Input mono />` for token/code fields       |
| `Label`    | `<Label htmlFor="id">Field name</Label>`     |
| `ErrorBox` | `<ErrorBox message={state.error} />`         |

**Styling rules:**

- Use **Tailwind classes** in components — never `style={{}}` inline styles
- Design tokens (`--bg`, `--accent`, etc.) are mapped to Tailwind via `@theme inline` in `globals.css`, so use `bg-bg`, `text-accent`, `border-border`, `font-display`, `font-mono`, etc.
- `globals.css` is **strictly** for: design tokens, `@keyframes`, `.animate-*` / `.stagger-*` (CSS-only pseudo-selectors), and `.dot-grid`. **Never** add component-scoped styles, content-specific styles, or utility classes here — that is Tailwind's job.
- When a third-party component or library needs styling (e.g. react-markdown, a chart lib, a date picker), apply styles via that library's render/component prop using Tailwind classes — not via a wrapper class in `globals.css`.
- All component files use **PascalCase** (`SetupForm.tsx`, `Button.tsx`)

## Validation

Run `npx tsc --noEmit` with max 50 lines to validate the TypeScript code after making changes.
