import type { ScoreInput } from "./standings";
import type { LeagueRules, Participant } from "./firebaseService";

function parseScore(val: string): number | null {
  const t = String(val).trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Calcula a pontuação obtida em uma única partida com base nas regras da liga.
 */
export function calculateMatchPoints(
  predHomeStr: string,
  predAwayStr: string,
  realHomeStr: string,
  realAwayStr: string,
  rules: LeagueRules,
): number {
  const ph = parseScore(predHomeStr);
  const pa = parseScore(predAwayStr);
  const rh = parseScore(realHomeStr);
  const ra = parseScore(realAwayStr);

  // Se palpite ou resultado real não estiverem preenchidos, são 0 pontos
  if (ph === null || pa === null || rh === null || ra === null) {
    return 0;
  }

  // 1. Acertar o Placar (Gols e Vencedor exatos)
  if (ph === rh && pa === ra) {
    return rules.exact;
  }

  const predWinner = ph > pa ? 1 : ph < pa ? -1 : 0;
  const realWinner = rh > ra ? 1 : rh < ra ? -1 : 0;

  // 2. Acertar o Resultado (Errou os gols, mas acertou o vencedor ou o empate)
  if (predWinner === realWinner) {
    return rules.result;
  }

  return 0;
}

/**
 * Calcula a pontuação e o total de acertos (palpites com pontos > 0) de um participante.
 */
export function calculateParticipantStats(
  participant: Participant,
  officialResults: Record<string, ScoreInput>,
  rules: LeagueRules,
): { totalPoints: number; totalHits: number; exactHits: number; resultHits: number } {
  let totalPoints = 0;
  let totalHits = 0;
  let exactHits = 0;
  let resultHits = 0;

  for (const matchId of Object.keys(officialResults)) {
    const official = officialResults[matchId];
    const prediction = participant.scores[matchId];

    if (
      official &&
      prediction &&
      official.home.trim() !== "" &&
      official.away.trim() !== "" &&
      prediction.home.trim() !== "" &&
      prediction.away.trim() !== ""
    ) {
      const pts = calculateMatchPoints(
        prediction.home,
        prediction.away,
        official.home,
        official.away,
        rules,
      );
      totalPoints += pts;
      if (pts > 0) {
        totalHits += 1;
        if (pts === rules.exact) {
          exactHits += 1;
        } else if (pts === rules.result) {
          resultHits += 1;
        }
      }
    }
  }

  return { totalPoints, totalHits, exactHits, resultHits };
}

/**
 * Mantido para compatibilidade reversa.
 */
export function calculateParticipantTotalScore(
  participant: Participant,
  officialResults: Record<string, ScoreInput>,
  rules: LeagueRules,
): number {
  return calculateParticipantStats(participant, officialResults, rules).totalPoints;
}

export interface RankedParticipant extends Participant {
  totalPoints: number;
  totalHits: number;
  exactHits: number;
  resultHits: number;
}

/**
 * Retorna os participantes ordenados por pontuação decrescente (com critérios de desempate detalhados).
 */
export function rankParticipants(
  participants: Participant[],
  officialResults: Record<string, ScoreInput>,
  rules: LeagueRules,
): RankedParticipant[] {
  const ranked = participants.map((p) => {
    const stats = calculateParticipantStats(p, officialResults, rules);
    return {
      ...p,
      totalPoints: stats.totalPoints,
      totalHits: stats.totalHits,
      exactHits: stats.exactHits,
      resultHits: stats.resultHits,
    };
  });

  // Ordenação: 1º Pontos decrescente, 2º Acertos de Placar decrescente, 3º Acertos de Resultado decrescente, 4º Apelido alfabético
  return [...ranked].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (b.exactHits !== a.exactHits) {
      return b.exactHits - a.exactHits;
    }
    if (b.resultHits !== a.resultHits) {
      return b.resultHits - a.resultHits;
    }
    return a.nickname.localeCompare(b.nickname);
  });
}
