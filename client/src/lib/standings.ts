import type { MatchDef, Team } from "../data/groupStage";

export type ScoreInput = { home: string; away: string };

export type StandingRow = {
  position: number;
  team: Team;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

function parseScore(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

export function computeGroupStandings(
  teams: Team[],
  matches: MatchDef[],
  scores: Record<string, ScoreInput>,
): StandingRow[] {
  const byId = new Map<string, StandingRow>();

  for (const t of teams) {
    byId.set(t.id, {
      position: 0,
      team: t,
      points: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
    });
  }

  for (const m of matches) {
    const sc = scores[m.id];
    if (!sc) continue;
    const h = parseScore(sc.home);
    const a = parseScore(sc.away);
    if (h === null || a === null) continue;

    const rowH = byId.get(m.home.id);
    const rowA = byId.get(m.away.id);
    if (!rowH || !rowA) continue;

    rowH.played += 1;
    rowA.played += 1;
    rowH.goalsFor += h;
    rowH.goalsAgainst += a;
    rowA.goalsFor += a;
    rowA.goalsAgainst += h;

    if (h > a) {
      rowH.wins += 1;
      rowH.points += 3;
      rowA.losses += 1;
    } else if (h < a) {
      rowA.wins += 1;
      rowA.points += 3;
      rowH.losses += 1;
    } else {
      rowH.draws += 1;
      rowA.draws += 1;
      rowH.points += 1;
      rowA.points += 1;
    }
  }

  const rows = [...byId.values()].map((r) => ({
    ...r,
    goalDifference: r.goalsFor - r.goalsAgainst,
  }));

  rows.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.goalDifference !== x.goalDifference)
      return y.goalDifference - x.goalDifference;
    return y.goalsFor - x.goalsFor;
  });

  rows.forEach((r, i) => {
    r.position = i + 1;
  });

  return rows;
}

export function validateScoreField(value: string): boolean {
  const t = value.trim();
  if (t === "") return true;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0;
}
