import { env } from "@/config/env";
import type { DailyActivityData } from "@/types";
import type { GenerateDailyLogInput } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const SSE_DATA_PREFIX = "data: ";
const SSE_DONE_SIGNAL = "[DONE]";

const SYSTEM_PROMPT = {
  log:
    "Kamu adalah generator log aktivitas harian untuk engineer Indonesia. Tulis dengan gaya bahasa kerja yang natural: dominan Bahasa Indonesia, tetapi tetap biarkan istilah teknis umum dalam English jika lebih lazim dipakai, seperti pull request, issue, deploy, endpoint, refactor, bugfix, staging, dan production. Jangan memaksakan terjemahan istilah teknis, jangan mengubah nama branch, nama fitur, atau proper noun. Untuk setiap hari yang diberikan, tulis ringkasan singkat berdasarkan commit message, merge request, dan issue. Gunakan markdown dengan heading ## per hari. Jadilah faktual dan ringkas, jangan mengarang pekerjaan yang tidak ada di data. Saat mendaftar item individual, pertahankan tag prefix persis seperti yang diberikan: [commit], [PR <state>], atau [issue <state>].",
  standup:
    "Kamu adalah generator laporan standup untuk engineer Indonesia. Tulis dengan gaya bahasa kerja yang natural: dominan Bahasa Indonesia, tetapi tetap biarkan istilah teknis umum dalam English jika lebih lazim dipakai, seperti pull request, issue, deploy, endpoint, refactor, bugfix, staging, dan production. Jangan memaksakan terjemahan istilah teknis, jangan mengubah nama branch, nama fitur, atau proper noun. Berdasarkan aktivitas repository dari 24 jam terakhir, buat laporan standup singkat dengan tiga bagian: **Kemarin**, **Hari ini**, dan **Blocker**. Gunakan markdown. Ringkas, profesional, dan faktual. Tentukan mana yang dikerjakan kemarin vs hari ini dari data yang ada. Saat mendaftar item individual, pertahankan tag prefix persis seperti yang diberikan: [commit], [PR <state>], atau [issue <state>].",
} as const;

function buildLogPrompt(input: GenerateDailyLogInput): string {
  const data = JSON.parse(input.rawDailyActivity) as DailyActivityData;

  const dayBlocks = data.days.map((day) => {
    const commitLines = day.commits
      .map((c) => `  - [commit] ${c.title}`)
      .join("\n");
    const mrLines = day.pullRequests
      .map((pr) => `  - [PR ${pr.state}] ${pr.title}`)
      .join("\n");
    const issueLines = day.issues
      .map((i) => `  - [issue ${i.state}] ${i.title}`)
      .join("\n");
    const items = [commitLines, mrLines, issueLines].filter(Boolean).join("\n");

    return `### ${day.label} — ${day.date}\n${items || "  - Tidak ada aktivitas"}`;
  });

  const summaryInstruction = input.includeDaySummary
    ? "\n\nUntuk setiap hari, setelah daftar aktivitas, tambahkan ringkasan sebagai blockquote berisi 2-3 poin singkat yang merangkum konteks pekerjaan hari itu. Gunakan gaya bahasa kerja Indonesia campur English yang natural. Contoh format:\n> - Mengerjakan perbaikan flow autentikasi\n> - Update beberapa UI component"
    : "";

  return (
    `Repository: ${input.repoSlug}\n` +
    `Periode: ${input.dateRangeStart} -> ${input.dateRangeEnd}\n\n` +
    `Data aktivitas (urutan lama ke baru):\n\n${dayBlocks.join("\n\n")}` +
    summaryInstruction
  );
}

function buildStandupPrompt(input: GenerateDailyLogInput): string {
  const data = JSON.parse(input.rawDailyActivity) as DailyActivityData;

  const allCommits = data.days.flatMap((d) =>
    d.commits.map((c) => `- [commit] ${c.title} (${d.label})`),
  );
  const allMRs = data.days.flatMap((d) =>
    d.pullRequests.map((pr) => `- [PR ${pr.state}] ${pr.title} (${d.label})`),
  );
  const allIssues = data.days.flatMap((d) =>
    d.issues.map((i) => `- [issue ${i.state}] ${i.title} (${d.label})`),
  );

  const activityLines = [...allCommits, ...allMRs, ...allIssues].join("\n");

  return (
    `Repository: ${input.repoSlug}\n` +
    `Periode: ${input.dateRangeStart} -> ${input.dateRangeEnd}\n\n` +
    `Aktivitas:\n${activityLines || "Tidak ada aktivitas."}`
  );
}

export async function* generateDailyLogStream(
  input: GenerateDailyLogInput,
): AsyncGenerator<string> {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const systemPrompt = SYSTEM_PROMPT[input.outputMode];
  const userPrompt =
    input.outputMode === "standup"
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
