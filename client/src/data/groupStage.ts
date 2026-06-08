/**
 * Copa do Mundo FIFA 2026 — fase de grupos (48 seleções, grupos A–L).
 * Confrontos e mandante/visitante conforme calendário oficial pós-repescagens
 * (UEFA mar/2026 e intercontinentais mar–abr/2026).
 */

export type Team = { id: string; name: string };

export type MatchDef = {
  id: string;
  group: string;
  home: Team;
  away: Team;
  /** Data da partida (calendário oficial FIFA, horários omitidos). */
  scheduled?: string;
};

export type GroupData = {
  letter: string;
  teams: Team[];
  matches: MatchDef[];
};

const TEAMS: Record<string, Team> = {
  mex: { id: "mex", name: "México" },
  rsa: { id: "rsa", name: "África do Sul" },
  kor: { id: "kor", name: "Coreia do Sul" },
  cze: { id: "cze", name: "Tchéquia" },
  can: { id: "can", name: "Canadá" },
  bih: { id: "bih", name: "Bósnia e Herzegovina" },
  qat: { id: "qat", name: "Catar" },
  sui: { id: "sui", name: "Suíça" },
  bra: { id: "bra", name: "Brasil" },
  mar: { id: "mar", name: "Marrocos" },
  hai: { id: "hai", name: "Haiti" },
  sco: { id: "sco", name: "Escócia" },
  usa: { id: "usa", name: "Estados Unidos" },
  par: { id: "par", name: "Paraguai" },
  aus: { id: "aus", name: "Austrália" },
  tur: { id: "tur", name: "Turquia" },
  ger: { id: "ger", name: "Alemanha" },
  cuw: { id: "cuw", name: "Curaçau" },
  civ: { id: "civ", name: "Costa do Marfim" },
  ecu: { id: "ecu", name: "Equador" },
  ned: { id: "ned", name: "Países Baixos" },
  jpn: { id: "jpn", name: "Japão" },
  swe: { id: "swe", name: "Suécia" },
  tun: { id: "tun", name: "Tunísia" },
  bel: { id: "bel", name: "Bélgica" },
  egy: { id: "egy", name: "Egito" },
  irn: { id: "irn", name: "Irã" },
  nzl: { id: "nzl", name: "Nova Zelândia" },
  esp: { id: "esp", name: "Espanha" },
  cpv: { id: "cpv", name: "Cabo Verde" },
  ksa: { id: "ksa", name: "Arábia Saudita" },
  uru: { id: "uru", name: "Uruguai" },
  fra: { id: "fra", name: "França" },
  sen: { id: "sen", name: "Senegal" },
  irq: { id: "irq", name: "Iraque" },
  nor: { id: "nor", name: "Noruega" },
  arg: { id: "arg", name: "Argentina" },
  alg: { id: "alg", name: "Argélia" },
  aut: { id: "aut", name: "Áustria" },
  jor: { id: "jor", name: "Jordânia" },
  por: { id: "por", name: "Portugal" },
  cod: { id: "cod", name: "RD Congo" },
  uzb: { id: "uzb", name: "Uzbequistão" },
  col: { id: "col", name: "Colômbia" },
  eng: { id: "eng", name: "Inglaterra" },
  cro: { id: "cro", name: "Croácia" },
  gha: { id: "gha", name: "Gana" },
  pan: { id: "pan", name: "Panamá" },
};

function tm(id: keyof typeof TEAMS): Team {
  return TEAMS[id];
}

function mk(
  group: string,
  n: number,
  home: keyof typeof TEAMS,
  away: keyof typeof TEAMS,
  scheduled: string,
): MatchDef {
  return {
    id: `${group}-${n}`,
    group,
    home: tm(home),
    away: tm(away),
    scheduled,
  };
}

const GROUP_DEFS: { letter: string; teamIds: (keyof typeof TEAMS)[]; matches: MatchDef[] }[] =
  [
    {
      letter: "A",
      teamIds: ["mex", "rsa", "kor", "cze"],
      matches: [
        mk("A", 1, "mex", "rsa", "11 de jun"),
        mk("A", 2, "kor", "cze", "11 de jun"),
        mk("A", 3, "cze", "rsa", "18 de jun"),
        mk("A", 4, "mex", "kor", "18 de jun"),
        mk("A", 5, "cze", "mex", "24 de jun"),
        mk("A", 6, "rsa", "kor", "24 de jun"),
      ],
    },
    {
      letter: "B",
      teamIds: ["can", "bih", "qat", "sui"],
      matches: [
        mk("B", 1, "can", "bih", "12 de jun"),
        mk("B", 2, "qat", "sui", "13 de jun"),
        mk("B", 3, "sui", "bih", "18 de jun"),
        mk("B", 4, "can", "qat", "18 de jun"),
        mk("B", 5, "sui", "can", "24 de jun"),
        mk("B", 6, "bih", "qat", "24 de jun"),
      ],
    },
    {
      letter: "C",
      teamIds: ["bra", "mar", "hai", "sco"],
      matches: [
        mk("C", 1, "bra", "mar", "13 de jun"),
        mk("C", 2, "hai", "sco", "13 de jun"),
        mk("C", 3, "sco", "mar", "19 de jun"),
        mk("C", 4, "bra", "hai", "19 de jun"),
        mk("C", 5, "sco", "bra", "24 de jun"),
        mk("C", 6, "mar", "hai", "24 de jun"),
      ],
    },
    {
      letter: "D",
      teamIds: ["usa", "par", "aus", "tur"],
      matches: [
        mk("D", 1, "usa", "par", "12 de jun"),
        mk("D", 2, "aus", "tur", "14 de jun"),
        mk("D", 3, "usa", "aus", "19 de jun"),
        mk("D", 4, "tur", "par", "20 de jun"),
        mk("D", 5, "tur", "usa", "25 de jun"),
        mk("D", 6, "par", "aus", "25 de jun"),
      ],
    },
    {
      letter: "E",
      teamIds: ["ger", "cuw", "civ", "ecu"],
      matches: [
        mk("E", 1, "ger", "cuw", "14 de jun"),
        mk("E", 2, "civ", "ecu", "14 de jun"),
        mk("E", 3, "ger", "civ", "20 de jun"),
        mk("E", 4, "ecu", "cuw", "20 de jun"),
        mk("E", 5, "ecu", "ger", "25 de jun"),
        mk("E", 6, "cuw", "civ", "25 de jun"),
      ],
    },
    {
      letter: "F",
      teamIds: ["ned", "jpn", "swe", "tun"],
      matches: [
        mk("F", 1, "ned", "jpn", "14 de jun"),
        mk("F", 2, "swe", "tun", "14 de jun"),
        mk("F", 3, "ned", "swe", "20 de jun"),
        mk("F", 4, "tun", "jpn", "21 de jun"),
        mk("F", 5, "jpn", "swe", "25 de jun"),
        mk("F", 6, "tun", "ned", "25 de jun"),
      ],
    },
    {
      letter: "G",
      teamIds: ["bel", "egy", "irn", "nzl"],
      matches: [
        mk("G", 1, "bel", "egy", "15 de jun"),
        mk("G", 2, "irn", "nzl", "15 de jun"),
        mk("G", 3, "bel", "irn", "21 de jun"),
        mk("G", 4, "nzl", "egy", "21 de jun"),
        mk("G", 5, "egy", "irn", "27 de jun"),
        mk("G", 6, "nzl", "bel", "27 de jun"),
      ],
    },
    {
      letter: "H",
      teamIds: ["esp", "cpv", "ksa", "uru"],
      matches: [
        mk("H", 1, "esp", "cpv", "15 de jun"),
        mk("H", 2, "ksa", "uru", "15 de jun"),
        mk("H", 3, "esp", "ksa", "21 de jun"),
        mk("H", 4, "uru", "cpv", "21 de jun"),
        mk("H", 5, "cpv", "ksa", "27 de jun"),
        mk("H", 6, "uru", "esp", "27 de jun"),
      ],
    },
    {
      letter: "I",
      teamIds: ["fra", "sen", "irq", "nor"],
      matches: [
        mk("I", 1, "fra", "sen", "16 de jun"),
        mk("I", 2, "irq", "nor", "16 de jun"),
        mk("I", 3, "fra", "irq", "22 de jun"),
        mk("I", 4, "nor", "sen", "22 de jun"),
        mk("I", 5, "nor", "fra", "26 de jun"),
        mk("I", 6, "sen", "irq", "26 de jun"),
      ],
    },
    {
      letter: "J",
      teamIds: ["arg", "alg", "aut", "jor"],
      matches: [
        mk("J", 1, "arg", "alg", "16 de jun"),
        mk("J", 2, "aut", "jor", "17 de jun"),
        mk("J", 3, "arg", "aut", "22 de jun"),
        mk("J", 4, "jor", "alg", "23 de jun"),
        mk("J", 5, "alg", "aut", "27 de jun"),
        mk("J", 6, "jor", "arg", "27 de jun"),
      ],
    },
    {
      letter: "K",
      teamIds: ["por", "cod", "uzb", "col"],
      matches: [
        mk("K", 1, "por", "cod", "17 de jun"),
        mk("K", 2, "uzb", "col", "17 de jun"),
        mk("K", 3, "por", "uzb", "23 de jun"),
        mk("K", 4, "col", "cod", "23 de jun"),
        mk("K", 5, "col", "por", "27 de jun"),
        mk("K", 6, "cod", "uzb", "27 de jun"),
      ],
    },
    {
      letter: "L",
      teamIds: ["eng", "cro", "gha", "pan"],
      matches: [
        mk("L", 1, "eng", "cro", "17 de jun"),
        mk("L", 2, "gha", "pan", "17 de jun"),
        mk("L", 3, "eng", "gha", "23 de jun"),
        mk("L", 4, "pan", "cro", "23 de jun"),
        mk("L", 5, "pan", "eng", "27 de jun"),
        mk("L", 6, "cro", "gha", "27 de jun"),
      ],
    },
  ];

export const GROUPS: GroupData[] = GROUP_DEFS.map((g) => ({
  letter: g.letter,
  teams: g.teamIds.map((id) => TEAMS[id]),
  matches: g.matches,
}));

export const ALL_MATCHES: MatchDef[] = GROUPS.flatMap((g) => g.matches);
