import * as XLSX from "xlsx-js-style";
import type { MatchDef } from "../data/groupStage";
import { ALL_MATCHES } from "../data/groupStage";
import { KNOCKOUT_MATCHES } from "../data/knockoutStage";
import type { ScoreInput } from "./standings";
import type { League, Participant } from "./firebaseService";

export type ExportMeta = {
  participantName: string;
  exportedAt: Date;
  filledCount: number;
  totalMatches: number;
};

// Mapeamento completo de seleções da Copa 2026 para Emojis de Bandeiras
const FLAG_EMOJIS: Record<string, string> = {
  mex: "🇲🇽", rsa: "🇿🇦", kor: "🇰🇷", cze: "🇨🇿",
  can: "🇨🇦", bih: "🇧🇦", qat: "🇶🇦", sui: "🇨🇭",
  bra: "🇧🇷", mar: "🇲🇦", hai: "🇭🇹", sco: "\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F",
  usa: "🇺🇸", par: "🇵🇾", aus: "🇦🇺", tur: "🇹🇷",
  ger: "🇩🇪", cuw: "🇨🇼", civ: "🇨🇮", ecu: "🇪🇨",
  ned: "🇳🇱", jpn: "🇯🇵", swe: "🇸🇪", tun: "🇹🇳",
  bel: "🇧🇪", egy: "🇪🇬", irn: "🇮🇷", nzl: "🇳🇿",
  esp: "🇪🇸", cpv: "🇨🇻", ksa: "🇸🇦", uru: "🇺🇾",
  fra: "🇫🇷", sen: "🇸🇳", irq: "🇮🇶", nor: "🇳🇴",
  arg: "🇦🇷", alg: "🇩🇿", aut: "🇦🇹", jor: "🇯🇴",
  por: "🇵🇹", cod: "🇨🇩", uzb: "🇺🇿", col: "🇨🇴",
  eng: "\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F", cro: "🇭🇷", gha: "🇬🇭", pan: "🇵🇦",
};

// Cores pastéis para cabeçalho de cada grupo (A a L)
const GROUP_COLORS: Record<string, string> = {
  A: "DCE6F1", // Azul Claro
  B: "E2EFDA", // Verde Claro
  C: "FFF2CC", // Amarelo Claro
  D: "FCE4D6", // Laranja Claro
  E: "E1D5E7", // Roxo Claro
  F: "FADBD8", // Rosa Claro
  G: "D1F2EB", // Ciano Claro
  H: "D5F5E3", // Esmeralda Claro
  I: "FCF3CF", // Dourado Claro
  J: "FDEBD0", // Pêssego Claro
  K: "EBF5FB", // Azul Bebê
  L: "E8F8F5", // Menta Claro
};

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "liga";
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
  ws["!protect"] = { password: "bolao2026" };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, ws, "BET do Bolin");

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

// Estilos Reutilizáveis para Exportação da Liga
const cellNormalHeader = {
  fill: { fgColor: { rgb: "E6E6E6" } },
  font: { bold: true, name: "Segoe UI", sz: 10 },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: "000000" } },
    bottom: { style: "medium", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "A6A6A6" } },
    right: { style: "thin", color: { rgb: "A6A6A6" } }
  }
};

const cellParticipantData = {
  font: { name: "Segoe UI", sz: 10 },
  alignment: { horizontal: "left", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "D9D9D9" } },
    bottom: { style: "thin", color: { rgb: "D9D9D9" } },
    left: { style: "thin", color: { rgb: "D9D9D9" } },
    right: { style: "thin", color: { rgb: "D9D9D9" } }
  }
};

const cellScoreData = {
  font: { name: "Segoe UI", sz: 10 },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "D9D9D9" } },
    bottom: { style: "thin", color: { rgb: "D9D9D9" } },
    left: { style: "thin", color: { rgb: "D9D9D9" } },
    right: { style: "thin", color: { rgb: "D9D9D9" } }
  }
};

function getGroupHeaderStyle(group: string) {
  const color = GROUP_COLORS[group.toUpperCase()] || "EAEAEA";
  return {
    fill: { fgColor: { rgb: color } },
    font: { bold: true, name: "Segoe UI", sz: 10 },
    alignment: { wrapText: true, horizontal: "center", vertical: "center" },
    border: {
      top: { style: "medium", color: { rgb: "000000" } },
      bottom: { style: "medium", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "A6A6A6" } },
      right: { style: "thin", color: { rgb: "A6A6A6" } }
    }
  };
}

export function downloadLeagueExcel(
  league: League,
  participants: Participant[],
): void {
  // Ordenar partidas por grupo (matches já vem ordenada de A a L / mata-mata)
  const matches = league.isKnockout ? KNOCKOUT_MATCHES : ALL_MATCHES;

  // 1. Calcular spans dos grupos para fazer a mesclagem correta no cabeçalho
  const groupSpans: { group: string; span: number }[] = [];
  for (const m of matches) {
    const last = groupSpans[groupSpans.length - 1];
    if (last && last.group === m.group) {
      last.span += 1;
    } else {
      groupSpans.push({ group: m.group, span: 1 });
    }
  }

  // 2. Criar a linha de cabeçalho dos Grupos (Ex: "Grupo A" mesclado nas colunas dos jogos daquele grupo)
  const groupHeaderRow: any[] = [
    { v: "Nome do Participante", t: "s", s: cellNormalHeader },
    { v: "Apelido", t: "s", s: cellNormalHeader },
  ];

  for (const g of groupSpans) {
    const color = GROUP_COLORS[g.group.toUpperCase()] || "EAEAEA";
    groupHeaderRow.push({
      v: `Grupo ${g.group}`,
      t: "s",
      s: {
        fill: { fgColor: { rgb: color } },
        font: { bold: true, name: "Segoe UI", sz: 11 },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "medium", color: { rgb: "000000" } },
          bottom: { style: "medium", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "A6A6A6" } },
          right: { style: "thin", color: { rgb: "A6A6A6" } }
        }
      }
    });
    // Células vazias para preencher as colunas que serão mescladas (com estilos clonados e bordas explícitas)
    for (let i = 1; i < g.span; i++) {
      groupHeaderRow.push({
        v: "",
        t: "s",
        s: {
          fill: { fgColor: { rgb: color } },
          border: {
            top: { style: "medium", color: { rgb: "000000" } },
            bottom: { style: "medium", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "A6A6A6" } },
            right: { style: "thin", color: { rgb: "A6A6A6" } }
          }
        }
      });
    }
  }

  // 3. Criar a linha de bandeiras das Partidas (isolando os emojis)
  const flagHeaderRow: any[] = [
    { v: "", t: "s", s: cellNormalHeader },
    { v: "", t: "s", s: cellNormalHeader },
    ...matches.map((m) => {
      const flagA = FLAG_EMOJIS[m.home.id] || "🏳️";
      const flagB = FLAG_EMOJIS[m.away.id] || "🏳️";
      return {
        v: `${flagA} x ${flagB}`,
        t: "s",
        s: getGroupHeaderStyle(m.group),
      };
    })
  ];

  // 4. Criar a linha detalhada de texto das Partidas (nomes das seleções e data, livre de emojis)
  const matchTextHeaderRow: any[] = [
    { v: "", t: "s", s: cellNormalHeader },
    { v: "", t: "s", s: cellNormalHeader },
    ...matches.map((m) => {
      const parts = (m.scheduled || "").split(" às ");
      const datePart = parts[0] || "";
      const headerText = `${m.home.name} x ${m.away.name}\n${datePart}`;
      return {
        v: headerText,
        t: "s",
        s: getGroupHeaderStyle(m.group),
      };
    })
  ];

  // Informações Gerais da Liga (Sem o e-mail do organizador)
  const titleRow = [
    { v: `LIGA: ${league.name}`, t: "s", s: { font: { bold: true, name: "Segoe UI", sz: 14 } } }
  ];
  const dateRow = [
    { v: `Exportado em: ${formatDateTime(new Date())}`, t: "s", s: { font: { italic: true, name: "Segoe UI", sz: 10 } } }
  ];
  const rulesRow = [
    { v: `Regras de Pontuação — Placar Exato: ${league.rules.exact} pts | Resultado: ${league.rules.result} pts`, t: "s", s: { font: { name: "Segoe UI", sz: 10 } } }
  ];
  const creatorRow = [
    { v: `Organizador: ${league.creatorName}`, t: "s", s: { font: { name: "Segoe UI", sz: 10 } } }
  ];

  const rows: any[][] = [
    titleRow,
    dateRow,
    rulesRow,
    creatorRow,
    [], // linha em branco
    groupHeaderRow,      // Linha 6: Agrupamento de Grupos (Ex: Grupo A)
    flagHeaderRow,       // Linha 7: Emojis das Bandeiras
    matchTextHeaderRow,  // Linha 8: Nomes dos Confrontos e Datas (sem emojis)
    ...participants.map((p) => {
      return [
        { v: p.name, t: "s", s: cellParticipantData },
        { v: p.nickname, t: "s", s: cellParticipantData },
        ...matches.map((m) => {
          const pred = p.scores[m.id];
          const val = pred && pred.home.trim() !== "" && pred.away.trim() !== "" 
            ? `${pred.home} × ${pred.away}` 
            : "";
          return { v: val, t: "s", s: cellScoreData };
        })
      ];
    })
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!protect"] = { password: "bolao2026" };

  // Nome e Apelido mesclados verticalmente através das 3 linhas de cabeçalho (Linhas 6, 7 e 8)
  const merges: any[] = [
    { s: { r: 5, c: 0 }, e: { r: 7, c: 0 } }, 
    { s: { r: 5, c: 1 }, e: { r: 7, c: 1 } }, 
  ];

  // Adicionar as mesclagens horizontais para os grupos ("Grupo A" se estendendo sobre as 6 partidas)
  let colIdx = 2;
  for (const g of groupSpans) {
    if (g.span > 1) {
      merges.push({
        s: { r: 5, c: colIdx },
        e: { r: 5, c: colIdx + g.span - 1 }
      });
    }
    colIdx += g.span;
  }

  ws["!merges"] = merges;

  // Definir largura das colunas: A (25), B (18), partidas (22) para caber os textos
  ws["!cols"] = [
    { wch: 25 },
    { wch: 18 },
    ...matches.map(() => ({ wch: 22 }))
  ];

  // Definir alturas das linhas
  ws["!rows"] = [
    { hpt: 25 }, // Título
    { hpt: 18 }, // Data
    { hpt: 18 }, // Regras
    { hpt: 18 }, // Organizador
    { hpt: 12 }, // Linha em branco
    { hpt: 30 }, // Linha 6: Cabeçalho de Grupos (Ex: Grupo A)
    { hpt: 25 }, // Linha 7: Cabeçalho de Bandeiras (Ex: 🏴󠁧󠁢󠁳󠁣󠁴󠁿 x 🇧🇷)
    { hpt: 40 }, // Linha 8: Cabeçalho de Partidas (nomes, data)
    ...participants.map(() => ({ hpt: 20 })) // Linhas dos participantes
  ];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, ws, "Palpites da Liga");

  const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" });
  
  const slug = sanitizeFileName(league.name);
  const filename = `liga-copa-2026-${slug}.xlsx`;
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
