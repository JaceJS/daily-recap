import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/config/session";
import { checkRateLimit } from "@/utils/rate-limit";
import { buildStandupActivity, groupActivityByDay, resolveStandupWindow } from "@/utils/activity";
import { fetchActivity as fetchGitLabActivity } from "@/features/gitlab/service";
import { fetchActivity as fetchGitHubActivity } from "@/features/github/service";
import { generateDailyLogStream } from "@/features/ai/service";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_REPO_SLUG_LENGTH = 255;
const MAX_BRANCH_LENGTH = 255;
const MAX_TIMEZONE_LENGTH = 100;

type GenerateBody = {
  repoSlug?: unknown;
  branch?: unknown;
  since?: unknown;
  until?: unknown;
  timezone?: unknown;
  includePRs?: unknown;
  includeIssues?: unknown;
  outputMode?: unknown;
};

function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function isValidDateString(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function POST(req: NextRequest) {
  const contentLengthHeader = req.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return badRequest("Request body is too large.", 413);
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rl = await checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      }
    );
  }

  const session = await getSession();
  if (!session.name || !session.token || !session.provider) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  const { token, provider } = session;

  let body: GenerateBody;
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  if (typeof body.repoSlug !== "string") {
    return badRequest("repoSlug is required.");
  }
  const repoSlug = body.repoSlug.trim();
  if (!repoSlug || repoSlug.length > MAX_REPO_SLUG_LENGTH) {
    return badRequest("repoSlug is invalid.");
  }

  const branch =
    typeof body.branch === "string" ? body.branch.trim() || undefined : undefined;
  if (typeof body.branch !== "undefined" && typeof body.branch !== "string") {
    return badRequest("branch must be a string.");
  }
  if (branch && branch.length > MAX_BRANCH_LENGTH) {
    return badRequest("branch is too long.");
  }

  if (typeof body.since !== "string" || typeof body.until !== "string") {
    return badRequest("since and until are required.");
  }
  const since = body.since;
  const until = body.until;
  if (!isValidDateString(since) || !isValidDateString(until)) {
    return badRequest("Invalid date range.");
  }

  const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "UTC";
  if (!timezone || timezone.length > MAX_TIMEZONE_LENGTH || !isValidTimeZone(timezone)) {
    return badRequest("Invalid timezone.");
  }

  const includePRs = body.includePRs ?? false;
  if (typeof includePRs !== "boolean") {
    return badRequest("includePRs must be a boolean.");
  }

  const includeIssues = body.includeIssues ?? false;
  if (typeof includeIssues !== "boolean") {
    return badRequest("includeIssues must be a boolean.");
  }

  const outputMode = body.outputMode ?? "log";
  if (outputMode !== "log" && outputMode !== "standup") {
    return badRequest("Invalid outputMode.");
  }

  let rawDailyActivity: string | undefined;
  let rawStandupActivity: string | undefined;
  let effectiveSince = since;
  let effectiveUntil = until;
  try {
    const fetchActivity = provider === "github" ? fetchGitHubActivity : fetchGitLabActivity;
    if (outputMode === "standup") {
      const standupWindow = resolveStandupWindow(timezone);
      effectiveSince = standupWindow.effectiveSince;
      effectiveUntil = standupWindow.effectiveUntil;
      const activity = await fetchActivity({
        token,
        repoSlug,
        branch,
        since: effectiveSince,
        until: effectiveUntil,
        includePRs,
        includeIssues,
      });
      rawStandupActivity = JSON.stringify(
        buildStandupActivity(activity, standupWindow),
      );
    } else {
      const activity = await fetchActivity({ token, repoSlug, branch, since, until, includePRs, includeIssues });
      const grouped = groupActivityByDay(activity, since, until);

      if (grouped.days.length === 0) {
        const msg = "Tidak ada aktivitas pada periode yang dipilih.";
        return new Response(msg, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }

      rawDailyActivity = JSON.stringify(grouped);
    }
  } catch (err) {
    console.error("[generate] Failed to fetch activity", err);
    return NextResponse.json(
      { message: "Failed to fetch activity." },
      { status: 502 },
    );
  }

  const stream =
    outputMode === "standup"
      ? generateDailyLogStream({
          rawStandupActivity: rawStandupActivity ?? "",
          repoSlug,
          dateRangeStart: effectiveSince,
          dateRangeEnd: effectiveUntil,
          outputMode,
          includeDaySummary: false,
        })
      : generateDailyLogStream({
          rawDailyActivity: rawDailyActivity ?? "",
          repoSlug,
          dateRangeStart: effectiveSince,
          dateRangeEnd: effectiveUntil,
          outputMode,
          includeDaySummary: true,
        });

  const iterator = stream[Symbol.asyncIterator]();
  let firstChunk: IteratorResult<string>;
  try {
    firstChunk = await iterator.next();
  } catch (err) {
    console.error("[generate] Failed to generate report", err);
    return NextResponse.json(
      { message: "Failed to generate report. Please try again." },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      if (!firstChunk.done) {
        controller.enqueue(encoder.encode(firstChunk.value));
      }

      try {
        if (firstChunk.done) {
          controller.close();
          return;
        }

        while (true) {
          const { done, value } = await iterator.next();
          if (done) break;
          const chunk = value;
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (err) {
        console.error("[generate] Stream failed", err);
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
