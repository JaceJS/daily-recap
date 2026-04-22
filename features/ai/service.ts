import { env } from "@/config/env";
import type { DailyActivityData, StandupActivityData } from "@/types";
import type { GenerateDailyLogInput } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const SSE_DATA_PREFIX = "data: ";
const SSE_DONE_SIGNAL = "[DONE]";

const SYSTEM_PROMPT =
  "Kamu membuat laporan kerja engineer Indonesia. Pakai Bahasa Indonesia natural dengan istilah teknis English bila lebih jelas. Jangan terjemahkan proper noun, nama branch, atau nama fitur. Tulis singkat, jelas, natural, dan fokus pada outcome atau dampak yang layak dilaporkan. Gunakan bahasa sederhana; jika perlu istilah teknis, beri konteks singkat. Hindari gaya formal ala AI, jargon berlebihan, dan frasa template. Jangan mengarang di luar data. Abaikan noise seperti merge/WIP, formatting, typo, rename kecil, clean-up minor, refactor tanpa perubahan behavior, dan update dependency rutin.";

const SHARED_SUMMARY_RULES = [
  "Tulis 1-3 poin; 4 hanya jika memang ada 4 hasil yang benar-benar berbeda dan penting.",
  "Jangan menambah poin hanya untuk memenuhi kuota.",
  "Setiap poin harus berisi outcome atau progress yang meaningful, bukan item kecil atau variasi dari hal yang sama.",
  "Setiap poin harus berupa satu kalimat yang cukup deskriptif agar konteks dan dampaknya jelas.",
  "Gunakan bahasa sederhana; jika ada istilah teknis, jelaskan singkat tujuannya atau dampaknya.",
  "Abaikan commit minor seperti formatting, typo, clean-up kecil, rename kecil, merge branch, atau update yang tidak berdampak.",
] as const;

function formatRules(
  rules: readonly string[],
  marker: string,
  prefix = "",
): string {
  return rules.map((rule) => `${prefix}${marker} ${rule}`).join("\n");
}

function buildLogPrompt(input: GenerateDailyLogInput): string {
  if (input.outputMode !== "log") {
    throw new Error("buildLogPrompt only supports log mode.");
  }
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
    ? "\n\nUntuk setiap hari, setelah daftar aktivitas, tambahkan ringkasan sebagai blockquote. Aturan penting:\n" +
      formatRules(SHARED_SUMMARY_RULES, "-", "> ")
    : "";

  return (
    `Repository: ${input.repoSlug}\nPeriode: ${input.dateRangeStart} -> ${input.dateRangeEnd}\n\n` +
    "Format daily log:\n" +
    "- Gunakan heading `##` untuk setiap hari.\n" +
    "- Tampilkan daftar item aktivitas sebelum ringkasan.\n" +
    "- Pertahankan prefix item persis seperti input: `[commit]`, `[PR <state>]`, `[issue <state>]`.\n" +
    "- Ringkasan blockquote hanya melengkapi daftar, bukan menggantikannya.\n\n" +
    `Data aktivitas (urutan lama ke baru):\n\n${dayBlocks.join("\n\n")}` +
    summaryInstruction
  );
}

function buildStandupPrompt(input: GenerateDailyLogInput): string {
  if (input.outputMode !== "standup") {
    throw new Error("buildStandupPrompt only supports standup mode.");
  }
  const data = JSON.parse(input.rawStandupActivity) as StandupActivityData;

  const formatActivityGroup = (label: string, items: StandupActivityData["yesterday"]) => {
    const primaryLines =
      items.pullRequests.length > 0
        ? items.pullRequests.map((pr) => `- [PR ${pr.state}] ${pr.title}`)
        : items.commits.map((commit) => `- [commit] ${commit.title}`);
    const lines = [
      ...primaryLines,
      ...items.issues.map((issue) => `- [issue ${issue.state}] ${issue.title}`),
    ];

    return `${label} (${items.label}):\n${lines.join("\n") || "<kosong>"}`;
  };

  const blockerLines = data.blockers.map(
    (blocker) => `- [${blocker.kind} ${blocker.state}] ${blocker.title}`,
  );

  return (
    `Repository: ${input.repoSlug}\nTimezone: ${data.timezone}\nPeriode standup: ${input.dateRangeStart} -> ${input.dateRangeEnd}\n\n` +
    `Data standup terstruktur:\n` +
    `${formatActivityGroup("Kemarin", data.yesterday)}\n\n` +
    `${formatActivityGroup("Hari ini", data.today)}\n\n` +
    `Blocker kandidat:\n${blockerLines.join("\n") || "- Tidak ada blocker kandidat."}` +
    "\n\nFormat standup:\n" +
    "- Gunakan `## Standup`, lalu `### Kemarin`, `### Hari ini`, `### Blocker`.\n" +
    "- Semua isi section berupa bullet `- `.\n" +
    "- `Kemarin`: 2-3 bullet outcome/progress nyata; jangan hanya 1 bullet.\n" +
    "- `Hari ini`: hanya aktivitas yang benar-benar terdeteksi hari ini; tidak boleh rekomendasi, rencana, atau inferensi. Jika input `Hari ini` = `<kosong>`, biarkan kosong.\n" +
    "- `Blocker`: 0-2 bullet blocker yang benar-benar terlihat dari data. Jika tidak ada, biarkan kosong.\n\n" +
    "Aturan isi bullet:\n" +
    formatRules(SHARED_SUMMARY_RULES, "-") +
    "\n- `Kemarin` boleh sedikit lebih deskriptif agar konteks dan dampaknya jelas.\n" +
    "- Jika ada perubahan yang masih terkait, pecah menjadi 2-3 poin berbeda berdasarkan outcome, area kerja, atau dampak; jangan digabung jadi satu kalimat panjang.\n\n" +
    "Template:\n## Standup\n### Kemarin\n- ...\n- ...\n### Hari ini\n- ...\n### Blocker\n"
  );
}

export async function* generateDailyLogStream(
  input: GenerateDailyLogInput,
): AsyncGenerator<string> {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const systemPrompt = SYSTEM_PROMPT;
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
      temperature: 0.2,
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
