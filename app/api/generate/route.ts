import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/config/session";
import { checkRateLimit } from "@/utils/rate-limit";
import { groupActivityByDay } from "@/utils/activity";
import { fetchActivity as fetchGitLabActivity } from "@/features/gitlab/service";
import { fetchActivity as fetchGitHubActivity } from "@/features/github/service";
import { generateDailyLogStream } from "@/features/ai/service";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rl = checkRateLimit(ip);
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

  let body: {
    repoSlug?: string;
    branch?: string;
    since?: string;
    until?: string;
    includePRs?: boolean;
    includeIssues?: boolean;
    outputMode?: "log" | "standup";
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const {
    repoSlug,
    branch,
    since,
    until,
    includePRs = false,
    includeIssues = false,
    outputMode = "log",
  } = body;

  if (!repoSlug || !since || !until) {
    return NextResponse.json(
      { message: "repoSlug, since, and until are required." },
      { status: 400 }
    );
  }

  let rawDailyActivity: string;
  try {
    const fetchActivity = provider === "github" ? fetchGitHubActivity : fetchGitLabActivity;
    const activity = await fetchActivity({ token, repoSlug, branch, since, until, includePRs, includeIssues });
    const grouped = groupActivityByDay(activity, since, until);

    if (grouped.days.length === 0) {
      const msg = "Tidak ada aktivitas pada periode yang dipilih.";
      return new Response(msg, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    rawDailyActivity = JSON.stringify(grouped);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch activity.";
    return NextResponse.json({ message }, { status: 502 });
  }

  const stream = generateDailyLogStream({
    rawDailyActivity,
    repoSlug,
    dateRangeStart: since,
    dateRangeEnd: until,
    outputMode,
    includeDaySummary: outputMode === "log",
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
