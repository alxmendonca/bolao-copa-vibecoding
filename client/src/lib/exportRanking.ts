import * as XLSX from "xlsx";
import type { ParticipantResult } from "./scoring";

export function buildRankingBuffer(ranking: ParticipantResult[]): ArrayBuffer {
  const data: unknown[][] = [
    ["Ranking — Bolão Copa do Mundo 2026"],
    [],
    [
      "Posição",
      "Participante",
      "Pontos",
      "Acertos resultado (1pt)",
      "Placas exatos (3pts)",
      "Jogos preenchidos",
    ],
    ...ranking.map((r, i) => [
      i + 1,
      r.participant.name,
      r.totalPoints,
      r.resultOnly,
      r.exactMatches,
      r.filledCount,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, ws, "Ranking");

  return XLSX.write(book, { type: "array", bookType: "xlsx" });
}

export function downloadRankingExcel(ranking: ParticipantResult[]): void {
  const buffer = buildRankingBuffer(ranking);
  const filename = `ranking-bolao-copa-2026.xlsx`;
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
