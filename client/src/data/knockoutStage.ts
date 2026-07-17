import type { Team, MatchDef } from "./groupStage";
import type { ScoreInput } from "../lib/standings";

const KNOCKOUT_TEAMS: Record<string, Team> = {
  can: { id: "can", name: "Canadá" },
  rsa: { id: "rsa", name: "África do Sul" },
  bra: { id: "bra", name: "Brasil" },
  jpn: { id: "jpn", name: "Japão" },
  ger: { id: "ger", name: "Alemanha" },
  par: { id: "par", name: "Paraguai" },
  ned: { id: "ned", name: "Países Baixos" },
  mar: { id: "mar", name: "Marrocos" },
  civ: { id: "civ", name: "Costa do Marfim" },
  nor: { id: "nor", name: "Noruega" },
  fra: { id: "fra", name: "França" },
  swe: { id: "swe", name: "Suécia" },
  mex: { id: "mex", name: "México" },
  ecu: { id: "ecu", name: "Equador" },
  usa: { id: "usa", name: "Estados Unidos" },
  bih: { id: "bih", name: "Bósnia e Herzegovina" },
  sui: { id: "sui", name: "Suíça" },
  alg: { id: "alg", name: "Argélia" },
  bel: { id: "bel", name: "Bélgica" },
  sen: { id: "sen", name: "Senegal" },
  col: { id: "col", name: "Colômbia" },
  gha: { id: "gha", name: "Gana" },
  eng: { id: "eng", name: "Inglaterra" },
  cod: { id: "cod", name: "RD Congo" },
  por: { id: "por", name: "Portugal" },
  cro: { id: "cro", name: "Croácia" },
  aus: { id: "aus", name: "Austrália" },
  egy: { id: "egy", name: "Egito" },
  arg: { id: "arg", name: "Argentina" },
  cpv: { id: "cpv", name: "Cabo Verde" },
  esp: { id: "esp", name: "Espanha" },
  uru: { id: "uru", name: "Uruguai" },
  aut: { id: "aut", name: "Áustria" },
};

function mkK(
  id: string,
  group: string,
  home: keyof typeof KNOCKOUT_TEAMS,
  away: keyof typeof KNOCKOUT_TEAMS,
  scheduled: string,
): MatchDef {
  return {
    id,
    group,
    home: KNOCKOUT_TEAMS[home],
    away: KNOCKOUT_TEAMS[away],
    scheduled,
  };
}

export const KNOCKOUT_MATCHES: MatchDef[] = [
  mkK("16-AVOS-1", "16-avos", "can", "rsa", "28 de jun às 16:00"),
  mkK("16-AVOS-2", "16-avos", "bra", "jpn", "29 de jun às 14:00"),
  mkK("16-AVOS-3", "16-avos", "ger", "par", "29 de jun às 17:30"),
  mkK("16-AVOS-4", "16-avos", "ned", "mar", "29 de jun às 22:00"),
  mkK("16-AVOS-5", "16-avos", "civ", "nor", "30 de jun às 14:00"),
  mkK("16-AVOS-6", "16-avos", "fra", "swe", "30 de jun às 18:00"),
  mkK("16-AVOS-7", "16-avos", "mex", "ecu", "30 de jun às 22:00"),
  mkK("16-AVOS-8", "16-avos", "usa", "bih", "01 de jul às 21:00"),
  mkK("16-AVOS-9", "16-avos", "sui", "alg", "03 de jul às 00:00"),
  mkK("16-AVOS-10", "16-avos", "bel", "sen", "01 de jul às 17:00"),
  mkK("16-AVOS-11", "16-avos", "col", "gha", "03 de jul às 22:30"),
  mkK("16-AVOS-12", "16-avos", "eng", "cod", "01 de jul às 13:00"),
  mkK("16-AVOS-13", "16-avos", "por", "cro", "02 de jul às 20:00"),
  mkK("16-AVOS-14", "16-avos", "aus", "egy", "03 de jul às 15:00"),
  mkK("16-AVOS-15", "16-avos", "arg", "cpv", "03 de jul às 19:00"),
  mkK("16-AVOS-16", "16-avos", "esp", "aut", "02 de jul às 16:00"),
];

export const OITAVAS_MATCHES: MatchDef[] = [
  { id: "OITAVAS-1", group: "Oitavas", home: KNOCKOUT_TEAMS.par, away: KNOCKOUT_TEAMS.fra, scheduled: "04 de jul às 18:00" },
  { id: "OITAVAS-2", group: "Oitavas", home: KNOCKOUT_TEAMS.can, away: KNOCKOUT_TEAMS.mar, scheduled: "04 de jul às 14:00" },
  { id: "OITAVAS-3", group: "Oitavas", home: KNOCKOUT_TEAMS.por, away: KNOCKOUT_TEAMS.esp, scheduled: "06 de jul às 16:00" },
  { id: "OITAVAS-4", group: "Oitavas", home: KNOCKOUT_TEAMS.usa, away: KNOCKOUT_TEAMS.bel, scheduled: "06 de jul às 21:00" },
  { id: "OITAVAS-5", group: "Oitavas", home: KNOCKOUT_TEAMS.bra, away: KNOCKOUT_TEAMS.nor, scheduled: "05 de jul às 17:00" },
  { id: "OITAVAS-6", group: "Oitavas", home: KNOCKOUT_TEAMS.mex, away: KNOCKOUT_TEAMS.eng, scheduled: "05 de jul às 21:00" },
  { id: "OITAVAS-7", group: "Oitavas", home: KNOCKOUT_TEAMS.arg, away: KNOCKOUT_TEAMS.egy, scheduled: "07 de jul às 13:00" },
  { id: "OITAVAS-8", group: "Oitavas", home: KNOCKOUT_TEAMS.sui, away: KNOCKOUT_TEAMS.col, scheduled: "07 de jul às 17:00" },
];

export const QUARTAS_MATCHES: MatchDef[] = [
  { id: "QUARTAS-1", group: "Quartas", home: KNOCKOUT_TEAMS.fra, away: KNOCKOUT_TEAMS.mar, scheduled: "09 de jul às 17:00" },
  { id: "QUARTAS-2", group: "Quartas", home: KNOCKOUT_TEAMS.esp, away: KNOCKOUT_TEAMS.bel, scheduled: "10 de jul às 16:00" },
  { id: "QUARTAS-3", group: "Quartas", home: KNOCKOUT_TEAMS.nor, away: KNOCKOUT_TEAMS.eng, scheduled: "11 de jul às 18:00" },
  { id: "QUARTAS-4", group: "Quartas", home: KNOCKOUT_TEAMS.arg, away: KNOCKOUT_TEAMS.sui, scheduled: "11 de jul às 22:00" },
];

export const SEMI_MATCHES: MatchDef[] = [
  { id: "SEMI-1", group: "Semifinais", home: KNOCKOUT_TEAMS.esp, away: KNOCKOUT_TEAMS.fra, scheduled: "14 de jul às 16:00" },
  { id: "SEMI-2", group: "Semifinais", home: KNOCKOUT_TEAMS.arg, away: KNOCKOUT_TEAMS.eng, scheduled: "15 de jul às 16:00" },
];

export const FINAL_MATCHES: MatchDef[] = [
  { id: "FINAL-2", group: "3º Lugar", home: KNOCKOUT_TEAMS.fra, away: KNOCKOUT_TEAMS.eng, scheduled: "18 de jul às 18:00" },
  { id: "FINAL-1", group: "Final", home: KNOCKOUT_TEAMS.esp, away: KNOCKOUT_TEAMS.arg, scheduled: "19 de jul às 16:00" },
];

export const ALL_KNOCKOUT_MATCHES: MatchDef[] = [
  ...KNOCKOUT_MATCHES,
  ...OITAVAS_MATCHES,
  ...QUARTAS_MATCHES,
  ...SEMI_MATCHES,
  ...FINAL_MATCHES,
];

// Helper to resolve knockout matches based on official results
export function resolveKnockoutMatches(matches: MatchDef[], officialScores: Record<string, ScoreInput>): MatchDef[] {
  // Clone matches to avoid mutations
  const resolved = matches.map(m => ({
    ...m,
    home: { ...m.home },
    away: { ...m.away }
  }));

  const getWinner = (matchId: string): Team | null => {
    const match = resolved.find(m => m.id === matchId);
    if (!match) return null;
    
    // Check if there is an official score
    const score = officialScores[matchId];
    if (!score || score.home.trim() === "" || score.away.trim() === "") return null;
    
    const h = parseInt(score.home, 10);
    const a = parseInt(score.away, 10);
    
    if (h > a) return match.home;
    if (a > h) return match.away;
    
    // If it's a draw, check qualified field (shootout winner)
    if (score.qualified) {
      if (score.qualified === match.home.id) return match.home;
      if (score.qualified === match.away.id) return match.away;
    }
    
    return null;
  };

  const getPerdedor = (matchId: string): Team | null => {
    const match = resolved.find(m => m.id === matchId);
    if (!match) return null;
    
    const score = officialScores[matchId];
    if (!score || score.home.trim() === "" || score.away.trim() === "") return null;
    
    const h = parseInt(score.home, 10);
    const a = parseInt(score.away, 10);
    
    if (h > a) return match.away;
    if (a > h) return match.home;
    
    // If it's a draw, check qualified field
    if (score.qualified) {
      if (score.qualified === match.home.id) return match.away;
      if (score.qualified === match.away.id) return match.home;
    }
    
    return null;
  };

  // Resolve SEMI-1 (Vencedor QUARTAS-1 x Vencedor QUARTAS-2)
  const semi1 = resolved.find(m => m.id === "SEMI-1");
  if (semi1) {
    const w1 = getWinner("QUARTAS-1");
    const w2 = getWinner("QUARTAS-2");
    if (w1) semi1.home = w1;
    if (w2) semi1.away = w2;
  }

  // Resolve SEMI-2 (Vencedor QUARTAS-3 x Vencedor QUARTAS-4)
  const semi2 = resolved.find(m => m.id === "SEMI-2");
  if (semi2) {
    const w3 = getWinner("QUARTAS-3");
    const w4 = getWinner("QUARTAS-4");
    if (w3) semi2.home = w3;
    if (w4) semi2.away = w4;
  }

  // Resolve FINAL-1 (Vencedor SEMI-1 x Vencedor SEMI-2)
  const final1 = resolved.find(m => m.id === "FINAL-1");
  if (final1) {
    const ws1 = getWinner("SEMI-1");
    const ws2 = getWinner("SEMI-2");
    if (ws1) final1.home = ws1;
    if (ws2) final1.away = ws2;
  }

  // Resolve FINAL-2 (Perdedor SEMI-1 x Perdedor SEMI-2)
  const final2 = resolved.find(m => m.id === "FINAL-2");
  if (final2) {
    const ls1 = getPerdedor("SEMI-1");
    const ls2 = getPerdedor("SEMI-2");
    if (ls1) final2.home = ls1;
    if (ls2) final2.away = ls2;
  }

  return resolved;
}

