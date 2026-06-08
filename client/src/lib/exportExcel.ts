import * as XLSX from "xlsx";
import type { MatchDef } from "../data/groupStage";
import type { ScoreInput } from "./standings";

export type ExportMeta = {
  participantName: string;
  exportedAt: Date;
  filledCount: number;
  totalMatches: number;
};

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "participante";
  return trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .toLowerCase();
}

export function countFilledMatches(
  matches: MatchDef[],
  scores: Record<string, ScoreInput>,
): number {
  let n = 0;
  for (const m of matches) {
    const s = scores[m.id];
    if (s?.home.trim() !== "" && s?.away.trim() !== "") n += 1;
  }
  return n;
}

export function buildWorkbookBuffer(
  matches: MatchDef[],
  scores: Record<string, ScoreInput>,
  meta: ExportMeta,
): ArrayBuffer {
  const data: unknown[][] = [
    ["Participante", meta.participantName.trim()],
    ["Exportado em", formatDateTime(meta.exportedAt)],
    ["Jogos preenchidos", `${meta.filledCount}/${meta.totalMatches}`],
    [],
    ["#", "Grupo", "Mandante", "Gols mandante", "Visitante", "Gols visitante"],
    ...matches.map((m, i) => {
      const s = scores[m.id] ?? { home: "", away: "" };
      return [
        i + 1,
        m.group,
        m.home.name,
        s.home.trim(),
        m.away.name,
        s.away.trim(),
      ];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, ws, "Bolão Copa 2026");

  return XLSX.write(book, { type: "array", bookType: "xlsx" });
}

export function downloadBolaoExcel(
  matches: MatchDef[],
  scores: Record<string, ScoreInput>,
  participantName: string,
): void {
  const exportedAt = new Date();
  const filledCount = countFilledMatches(matches, scores);
  const buffer = buildWorkbookBuffer(matches, scores, {
    participantName,
    exportedAt,
    filledCount,
    totalMatches: matches.length,
  });

  const slug = sanitizeFileName(participantName);
  const filename = `bolao-copa-2026-${slug}.xlsx`;
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
