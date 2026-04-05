const PDF_FILENAME = "daily-report.pdf";
const PAGE_MARGIN_MM = 20;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const LINE_HEIGHT_MM = 6;

type LineStyle = "h2" | "h3" | "bullet" | "quote" | "normal" | "empty";

interface ParsedLine {
  style: LineStyle;
  text: string;
}

function parseMarkdown(content: string): ParsedLine[] {
  return content
    .split("\n")
    .map((raw): ParsedLine | null => {
      const line = raw.trim();

      if (!line) return { style: "empty", text: "" };
      if (line.startsWith("## ")) return { style: "h2", text: line.slice(3) };
      if (line.startsWith("### ")) return { style: "h3", text: line.slice(4) };
      if (line.startsWith("> ")) return { style: "quote", text: line.slice(2) };

      const bulletMatch = line.match(/^[-*]\s+(.*)$/);
      if (bulletMatch) {
        const body = bulletMatch[1];
        if (body.startsWith("[commit]")) return null;
        return { style: "bullet", text: body };
      }

      return { style: "normal", text: line.replace(/\*\*([^*]+)\*\*/g, "$1") };
    })
    .filter((l): l is ParsedLine => l !== null);
}

export async function exportContentAsPdf(content: string): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const textWidth = PAGE_WIDTH_MM - PAGE_MARGIN_MM * 2;
  let y = PAGE_MARGIN_MM;

  function checkPageBreak(neededMm: number) {
    if (y + neededMm > PAGE_HEIGHT_MM - PAGE_MARGIN_MM) {
      pdf.addPage();
      y = PAGE_MARGIN_MM;
    }
  }

  function writeLine(text: string, x: number, lineHeight = LINE_HEIGHT_MM) {
    checkPageBreak(lineHeight);
    pdf.text(text, x, y);
    y += lineHeight;
  }

  function writeWrapped(text: string, x: number, maxWidth: number) {
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) writeLine(line, x);
  }

  for (const line of parseMarkdown(content)) {
    switch (line.style) {
      case "empty":
        y += LINE_HEIGHT_MM * 0.4;
        break;

      case "h2":
        y += 3;
        checkPageBreak(12);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        writeLine(line.text, PAGE_MARGIN_MM, 8);
        pdf.setDrawColor(180, 180, 180);
        pdf.line(PAGE_MARGIN_MM, y - 1, PAGE_WIDTH_MM - PAGE_MARGIN_MM, y - 1);
        y += 2;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        break;

      case "h3":
        checkPageBreak(8);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        writeLine(line.text, PAGE_MARGIN_MM);
        pdf.setFont("helvetica", "normal");
        break;

      case "bullet":
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(50, 50, 50);
        writeWrapped(`• ${line.text}`, PAGE_MARGIN_MM + 4, textWidth - 4);
        pdf.setTextColor(0, 0, 0);
        break;

      case "quote":
        y += 2;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        writeWrapped(line.text, PAGE_MARGIN_MM, textWidth);
        pdf.setFontSize(10);
        y += 1;
        break;

      default:
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        writeWrapped(line.text, PAGE_MARGIN_MM, textWidth);
    }
  }

  pdf.save(PDF_FILENAME);
}
