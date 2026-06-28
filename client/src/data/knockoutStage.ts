import type { Team, MatchDef } from "./groupStage";

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
  mkK("16-AVOS-3", "16-avos", "ger", "par", "29 de jun às 20:00"),
  mkK("16-AVOS-4", "16-avos", "ned", "mar", "29 de jun às 23:00"),
  mkK("16-AVOS-5", "16-avos", "civ", "nor", "30 de jun às 16:00"),
  mkK("16-AVOS-6", "16-avos", "fra", "swe", "30 de jun às 20:00"),
  mkK("16-AVOS-7", "16-avos", "mex", "ecu", "30 de jun às 23:00"),
  mkK("16-AVOS-8", "16-avos", "usa", "bih", "01 de jul às 16:00"),
  mkK("16-AVOS-9", "16-avos", "sui", "alg", "01 de jul às 20:00"),
  mkK("16-AVOS-10", "16-avos", "bel", "sen", "01 de jul às 23:00"),
  mkK("16-AVOS-11", "16-avos", "col", "gha", "02 de jul às 16:00"),
  mkK("16-AVOS-12", "16-avos", "eng", "cod", "02 de jul às 20:00"),
  mkK("16-AVOS-13", "16-avos", "por", "cro", "02 de jul às 23:00"),
  mkK("16-AVOS-14", "16-avos", "aus", "egy", "03 de jul às 16:00"),
  mkK("16-AVOS-15", "16-avos", "arg", "cpv", "03 de jul às 20:00"),
  mkK("16-AVOS-16", "16-avos", "esp", "uru", "03 de jul às 23:00"),
];

export const OITAVAS_MATCHES: MatchDef[] = [
  { id: "OITAVAS-1", group: "Oitavas", home: { id: "TBD", name: "Vencedor 16-AVOS-1" }, away: { id: "TBD", name: "Vencedor 16-AVOS-2" }, scheduled: "04 de jul às 16:00" },
  { id: "OITAVAS-2", group: "Oitavas", home: { id: "TBD", name: "Vencedor 16-AVOS-3" }, away: { id: "TBD", name: "Vencedor 16-AVOS-4" }, scheduled: "04 de jul às 20:00" },
  { id: "OITAVAS-3", group: "Oitavas", home: { id: "TBD", name: "Vencedor 16-AVOS-5" }, away: { id: "TBD", name: "Vencedor 16-AVOS-6" }, scheduled: "05 de jul às 16:00" },
  { id: "OITAVAS-4", group: "Oitavas", home: { id: "TBD", name: "Vencedor 16-AVOS-7" }, away: { id: "TBD", name: "Vencedor 16-AVOS-8" }, scheduled: "05 de jul às 20:00" },
  { id: "OITAVAS-5", group: "Oitavas", home: { id: "TBD", name: "Vencedor 16-AVOS-9" }, away: { id: "TBD", name: "Vencedor 16-AVOS-10" }, scheduled: "06 de jul às 16:00" },
  { id: "OITAVAS-6", group: "Oitavas", home: { id: "TBD", name: "Vencedor 16-AVOS-11" }, away: { id: "TBD", name: "Vencedor 16-AVOS-12" }, scheduled: "06 de jul às 20:00" },
  { id: "OITAVAS-7", group: "Oitavas", home: { id: "TBD", name: "Vencedor 16-AVOS-13" }, away: { id: "TBD", name: "Vencedor 16-AVOS-14" }, scheduled: "07 de jul às 16:00" },
  { id: "OITAVAS-8", group: "Oitavas", home: { id: "TBD", name: "Vencedor 16-AVOS-15" }, away: { id: "TBD", name: "Vencedor 16-AVOS-16" }, scheduled: "07 de jul às 20:00" },
];

export const QUARTAS_MATCHES: MatchDef[] = [
  { id: "QUARTAS-1", group: "Quartas", home: { id: "TBD", name: "Vencedor OITAVAS-1" }, away: { id: "TBD", name: "Vencedor OITAVAS-2" }, scheduled: "09 de jul às 16:00" },
  { id: "QUARTAS-2", group: "Quartas", home: { id: "TBD", name: "Vencedor OITAVAS-3" }, away: { id: "TBD", name: "Vencedor OITAVAS-4" }, scheduled: "09 de jul às 20:00" },
  { id: "QUARTAS-3", group: "Quartas", home: { id: "TBD", name: "Vencedor OITAVAS-5" }, away: { id: "TBD", name: "Vencedor OITAVAS-6" }, scheduled: "10 de jul às 16:00" },
  { id: "QUARTAS-4", group: "Quartas", home: { id: "TBD", name: "Vencedor OITAVAS-7" }, away: { id: "TBD", name: "Vencedor OITAVAS-8" }, scheduled: "10 de jul às 20:00" },
];

export const SEMI_MATCHES: MatchDef[] = [
  { id: "SEMI-1", group: "Semifinais", home: { id: "TBD", name: "Vencedor QUARTAS-1" }, away: { id: "TBD", name: "Vencedor QUARTAS-2" }, scheduled: "14 de jul às 20:00" },
  { id: "SEMI-2", group: "Semifinais", home: { id: "TBD", name: "Vencedor QUARTAS-3" }, away: { id: "TBD", name: "Vencedor QUARTAS-4" }, scheduled: "15 de jul às 20:00" },
];

export const FINAL_MATCHES: MatchDef[] = [
  { id: "FINAL-2", group: "3º Lugar", home: { id: "TBD", name: "Perdedor SEMI-1" }, away: { id: "TBD", name: "Perdedor SEMI-2" }, scheduled: "18 de jul às 16:00" },
  { id: "FINAL-1", group: "Final", home: { id: "TBD", name: "Vencedor SEMI-1" }, away: { id: "TBD", name: "Vencedor SEMI-2" }, scheduled: "19 de jul às 16:00" },
];

export const ALL_KNOCKOUT_MATCHES: MatchDef[] = [
  ...KNOCKOUT_MATCHES,
  ...OITAVAS_MATCHES,
  ...QUARTAS_MATCHES,
  ...SEMI_MATCHES,
  ...FINAL_MATCHES,
];
