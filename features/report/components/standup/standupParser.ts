export type StandupSectionKey = "Kemarin" | "Hari ini" | "Blocker";

export interface ParsedStandup {
  sections: Record<StandupSectionKey, string[]>;
}

const STANDUP_TITLE = "Standup";
export const STANDUP_SECTIONS: StandupSectionKey[] = [
  "Kemarin",
  "Hari ini",
  "Blocker",
];

function normalizeStandupLine(rawLine: string): string | null {
  let line = rawLine.replace(/\r/g, "").trim();
  if (!line || line === `## ${STANDUP_TITLE}` || line.startsWith("```")) {
    return null;
  }

  line = line.replace(/^>\s*/, "").trim();
  if (!line || line.startsWith("```")) {
    return null;
  }

  return line.replace(/^([-*]|\d+\.)\s+/, "").trim() || null;
}

function isEmptySectionFiller(
  section: StandupSectionKey,
  line: string,
): boolean {
  if (section === "Kemarin") {
    return false;
  }

  const normalized = line.toLowerCase();
  return (
    normalized === "<kosong>" ||
    normalized === "belum ada update." ||
    normalized === "belum ada update" ||
    normalized === "belum ada blocker yang terdeteksi dari data." ||
    normalized === "belum ada blocker yang terdeteksi dari data" ||
    normalized === "tidak ada blocker kandidat." ||
    normalized === "tidak ada blocker kandidat"
  );
}

export function isStandupContent(content: string): boolean {
  return content.includes(`## ${STANDUP_TITLE}`) || content.includes("### Kemarin");
}

export function parseStandupContent(content: string): ParsedStandup | null {
  if (!isStandupContent(content)) return null;

  const sections: Record<StandupSectionKey, string[]> = {
    Kemarin: [],
    "Hari ini": [],
    Blocker: [],
  };

  let currentSection: StandupSectionKey | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/\r/g, "").trim();
    if (!line || line === `## ${STANDUP_TITLE}`) continue;

    if (line.startsWith("### ")) {
      const header = line.slice(4).trim() as StandupSectionKey;
      currentSection = STANDUP_SECTIONS.includes(header) ? header : null;
      continue;
    }

    if (!currentSection) continue;

    const normalizedLine = normalizeStandupLine(rawLine);
    if (!normalizedLine) continue;
    if (isEmptySectionFiller(currentSection, normalizedLine)) continue;

    sections[currentSection].push(normalizedLine);
  }

  return { sections };
}
