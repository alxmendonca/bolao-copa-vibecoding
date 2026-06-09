import * as XLSX from "xlsx";
import { ALL_MATCHES } from "../data/groupStage";
import type { ScoreInput } from "./standings";
import type { ParticipantGuess } from "./scoring";

export function importParticipantFromExcel(
  buffer: ArrayBuffer,
): ParticipantGuess | null {
  try {
    const book = XLSX.read(buffer, { type: "array" });
    const sheetName = book.SheetNames[0];
    if (!sheetName) return null;
    const ws = book.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];

    let participantName = "";
    let headerRowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const cell0 = String(row[0] ?? "").trim();
      if (cell0 === "Participante" && row[1]) {
        participantName = String(row[1]).trim();
      }
      if (cell0 === "#") {
        headerRowIndex = i;
      }
    }

    if (!participantName || headerRowIndex === -1) return null;

    const scores: Record<string, ScoreInput> = {};
    const dataStartIndex = headerRowIndex + 1;

    for (let i = dataStartIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 6) continue;

      const group = String(row[1] ?? "").trim();
      const home = String(row[2] ?? "").trim();
      const homeGoals = String(row[3] ?? "").trim();
      const away = String(row[4] ?? "").trim();
      const awayGoals = String(row[5] ?? "").trim();

      if (!group || !home || !away) continue;

      const match = ALL_MATCHES.find(
        (m) => m.group === group && m.home.name === home && m.away.name === away,
      );

      if (match) {
        scores[match.id] = { home: homeGoals, away: awayGoals };
      }
    }

    return { name: participantName, scores };
  } catch {
    return null;
  }
}
