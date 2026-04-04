import { env } from "@/lib/env";
import type { DailyActivityData } from "@/lib/types";
import type { GenerateDailyLogInput } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const SSE_DATA_PREFIX = "data: ";
const SSE_DONE_SIGNAL = "[DONE]";

const SYSTEM_PROMPT = {
  log: {
    en: "You are a daily activity log generator. For each day provided, write a concise summary of what was accomplished based on the commit messages, merge requests, and issues. Use markdown with ## headings per day. Be factual and brief — do not invent work not present in the data. If a day has no activity, write 'No activity.' When listing individual items, preserve the original prefix tags exactly as given: [commit], [PR <state>], or [issue <state>].",
    id: "Kamu adalah generator log aktivitas harian. Untuk setiap hari yang diberikan, tulis ringkasan singkat tentang apa yang dikerjakan berdasarkan commit message, merge request, dan issue. Gunakan markdown dengan heading ## per hari. Jadilah faktual dan ringkas — jangan mengarang pekerjaan yang tidak ada di data. Jika suatu hari tidak ada aktivitas, tulis 'Tidak ada aktivitas.' Saat mendaftar item individual, pertahankan tag prefix persis seperti yang diberikan: [commit], [PR <state>], atau [issue <state>].",
  },
  standup: {
    en: "You are a standup report generator. Given GitLab activity from the last 24 hours, produce a concise daily standup with three sections: **Yesterday**, **Today**, and **Blockers**. Use markdown. Be brief and professional. Infer what was done yesterday vs today from the timestamps in the data. When listing individual items, preserve the original prefix tags exactly as given: [commit], [PR <state>], or [issue <state>].",
    id: "Kamu adalah generator laporan standup. Berdasarkan aktivitas GitLab dari 24 jam terakhir, buat laporan standup harian singkat dengan tiga bagian: **Kemarin**, **Hari ini**, dan **Blocker**. Gunakan markdown. Ringkas dan profesional. Tentukan mana yang dikerjakan kemarin vs hari ini dari timestamp yang ada di data. Saat mendaftar item individual, pertahankan tag prefix persis seperti yang diberikan: [commit], [PR <state>], atau [issue <state>].",
  },
} as const;

function buildLogPrompt(input: GenerateDailyLogInput): string {
  const data = JSON.parse(input.rawDailyActivity) as DailyActivityData;

  const dayBlocks = data.days.map((day) => {
    const commitLines = day.commits.map((c) => `  - [commit] ${c.title}`).join("\n");
    const mrLines = day.pullRequests.map((pr) => `  - [PR ${pr.state}] ${pr.title}`).join("\n");
    const issueLines = day.issues.map((i) => `  - [issue ${i.state}] ${i.title}`).join("\n");
    const items = [commitLines, mrLines, issueLines].filter(Boolean).join("\n");

    return `### ${day.label} — ${day.date}\n${items || (input.language === "id" ? "  - Tidak ada aktivitas" : "  - No activity")}`;
  });

  const summaryInstruction = input.includeDaySummary
    ? input.language === "id"
      ? "\n\nUntuk setiap hari, setelah daftar aktivitas, tambahkan ringkasan sebagai blockquote berisi 2-3 poin singkat yang merangkum konteks pekerjaan hari itu. Contoh format:\n> - Mengerjakan perbaikan autentikasi\n> - Memperbarui tampilan UI"
      : "\n\nFor each day, after the activity list, add a blockquote with 2-3 short bullet points summarising the context of that day's work. Example format:\n> - Worked on authentication fixes\n> - Updated UI components"
    : "";

  return (
    `Repository: ${input.repoSlug}\n` +
    `Periode: ${input.dateRangeStart} → ${input.dateRangeEnd}\n\n` +
    `Data aktivitas (urutan lama ke baru):\n\n${dayBlocks.join("\n\n")}` +
    summaryInstruction
  );
}

function buildStandupPrompt(input: GenerateDailyLogInput): string {
  const data = JSON.parse(input.rawDailyActivity) as DailyActivityData;

  const allCommits = data.days.flatMap((d) => d.commits.map((c) => `- [commit] ${c.title} (${d.label})`));
  const allMRs = data.days.flatMap((d) => d.pullRequests.map((pr) => `- [PR ${pr.state}] ${pr.title} (${d.label})`));
  const allIssues = data.days.flatMap((d) => d.issues.map((i) => `- [issue ${i.state}] ${i.title} (${d.label})`));

  const activityLines = [...allCommits, ...allMRs, ...allIssues].join("\n");

  return (
    `Repository: ${input.repoSlug}\n` +
    `Period: ${input.dateRangeStart} → ${input.dateRangeEnd}\n\n` +
    `Activity:\n${activityLines || (input.language === "id" ? "Tidak ada aktivitas." : "No activity found.")}`
  );
}

export async function* generateDailyLogStream(
  input: GenerateDailyLogInput
): AsyncGenerator<string> {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  console.log("[ai] mode:", input.outputMode, "lang:", input.language, "model:", env.OPENROUTER_MODEL);

  const systemPrompt = SYSTEM_PROMPT[input.outputMode][input.language];
  const userPrompt = input.outputMode === "standup"
    ? buildStandupPrompt(input)
    : buildLogPrompt(input);

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "X-Title": "DailyRecap",
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => response.statusText);
    console.error("[ai] OpenRouter error", response.status, text);
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  console.log("[ai] OpenRouter stream started");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const raw = decoder.decode(value, { stream: true });
    for (const chunk of parseSseChunks(raw)) {
      yield chunk;
    }
  }
}

/**
 * Parses raw SSE text and yields content chunks from OpenRouter delta responses.
 * Skips malformed lines and stops on the [DONE] signal.
 */
function* parseSseChunks(raw: string): Generator<string> {
  const lines = raw.split("\n");
  for (const line of lines) {
    if (!line.startsWith(SSE_DATA_PREFIX)) continue;
    const data = line.slice(SSE_DATA_PREFIX.length).trim();
    if (data === SSE_DONE_SIGNAL) return;

    try {
      const parsed = JSON.parse(data) as {
        choices: { delta: { content?: string } }[];
      };
      const chunk = parsed.choices[0]?.delta?.content;
      if (chunk) yield chunk;
    } catch {
      // Skip malformed SSE lines — not all lines carry JSON payloads
    }
  }
}
