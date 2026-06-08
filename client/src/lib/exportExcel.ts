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
  const infoRows = [
    { Campo: "Participante", Valor: meta.participantName.trim() },
    { Campo: "Exportado em", Valor: formatDateTime(meta.exportedAt) },
    {
      Campo: "Jogos preenchidos",
      Valor: `${meta.filledCount}/${meta.totalMatches}`,
    },
  ];

  const matchRows = matches.map((m, i) => {
    const s = scores[m.id] ?? { home: "", away: "" };
    return {
      "#": i + 1,
      Grupo: m.group,
      Mandante: m.home.name,
      "Gols mandante": s.home.trim(),
      Visitante: m.away.name,
      "Gols visitante": s.away.trim(),
    };
  });

  const infoSheet = XLSX.utils.json_to_sheet(infoRows);
  const gamesSheet = XLSX.utils.json_to_sheet(matchRows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, infoSheet, "Info");
  XLSX.utils.book_append_sheet(book, gamesSheet, "Jogos");

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
