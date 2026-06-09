import type { ScoreInput } from "./standings";

export type ParticipantGuess = {
  name: string;
  scores: Record<string, ScoreInput>;
};

export type ParticipantResult = {
  participant: ParticipantGuess;
  totalPoints: number;
  exactMatches: number;
  resultOnly: number;
  filledCount: number;
};

export function calcMatchScore(
  guess: ScoreInput,
  result: ScoreInput | undefined,
): { resultado: boolean; exato: boolean } {
  if (!result) return { resultado: false, exato: false };

  const gHome = guess.home.trim();
  const gAway = guess.away.trim();
  const rHome = result.home.trim();
  const rAway = result.away.trim();

  if (gHome === "" || gAway === "" || rHome === "" || rAway === "") {
    return { resultado: false, exato: false };
  }

  const gh = parseInt(gHome, 10);
  const ga = parseInt(gAway, 10);
  const rh = parseInt(rHome, 10);
  const ra = parseInt(rAway, 10);

  if (isNaN(gh) || isNaN(ga) || isNaN(rh) || isNaN(ra)) {
    return { resultado: false, exato: false };
  }

  const exato = gh === rh && ga === ra;
  const resultado = exato || Math.sign(gh - ga) === Math.sign(rh - ra);

  return { resultado, exato };
}

export function computeRanking(
  participants: ParticipantGuess[],
  resultados: Record<string, ScoreInput>,
): ParticipantResult[] {
  const matchIds = Object.keys(resultados);

  return participants
    .map((p) => {
      let totalPoints = 0;
      let exactMatches = 0;
      let resultOnly = 0;
      let filledCount = 0;

      for (const matchId of matchIds) {
        const guess = p.scores[matchId];
        if (!guess) continue;
        if (guess.home.trim() !== "" && guess.away.trim() !== "") {
          filledCount++;
        }
        const { resultado, exato } = calcMatchScore(guess, resultados[matchId]);
        if (exato) {
          totalPoints += 3;
          exactMatches++;
        } else if (resultado) {
          totalPoints += 1;
          resultOnly++;
        }
      }

      return {
        participant: p,
        totalPoints,
        exactMatches,
        resultOnly,
        filledCount,
      };
    })
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactMatches !== a.exactMatches) return b.exactMatches - a.exactMatches;
      return a.participant.name.localeCompare(b.participant.name);
    });
}
