import { db, isFirebaseConfigured } from "../config/firebase";
import {
  ref,
  set,
  get,
  update,
} from "firebase/database";
import type { ScoreInput } from "./standings";
import { ALL_MATCHES } from "../data/groupStage";
import {
  KNOCKOUT_MATCHES,
  OITAVAS_MATCHES,
  QUARTAS_MATCHES,
  SEMI_MATCHES,
  FINAL_MATCHES,
} from "../data/knockoutStage";
import { parseMatchDate } from "./scoring";

export { isFirebaseConfigured };

export interface LeagueRules {
  exact: number; // Acertar o Placar (Gols e Vencedor exatos)
  result: number; // Acertar o Resultado (Vencedor ou Empate, mas com placar diferente)
}

export interface League {
  id: string; // league_hash
  name: string;
  creatorName: string;
  creatorEmail: string;
  rules: LeagueRules;
  createdAt: string;
  isKnockout?: boolean;
  phase?: "grupos" | "16-avos" | "oitavas" | "quartas" | "semi" | "final" | "fase-final";
  logo?: string; // base64 encoded image data url
}

export function getLeagueMatches(phase: string | undefined): typeof ALL_MATCHES {
  switch (phase) {
    case "16-avos":
      return KNOCKOUT_MATCHES;
    case "oitavas":
      return OITAVAS_MATCHES;
    case "quartas":
      return QUARTAS_MATCHES;
    case "semi":
      return SEMI_MATCHES;
    case "final":
      return FINAL_MATCHES;
    case "fase-final":
      return [...QUARTAS_MATCHES, ...SEMI_MATCHES, ...FINAL_MATCHES];
    case "grupos":
    default:
      return ALL_MATCHES;
  }
}

export interface Participant {
  id: string; // participant_hash
  name: string;
  nickname: string;
  passwordHash: string;
  scores: Record<string, ScoreInput>;
  createdAt: string;
  updatedAt: string;
}

export interface OfficialResults {
  scores: Record<string, ScoreInput>;
  updatedAt: string;
}

// Auxiliar para gerar hash aleatório seguro de 16 caracteres
export function generateUniqueHash(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Retorna a data limite de inscrições/edições a partir do Firebase ou do localStorage (modo mock).
export async function getExpiryDate(isKnockout?: boolean, phase?: string): Promise<Date> {
  if (isFirebaseConfigured && db) {
    try {
      let path = "settings/expiryDate";
      if (phase === "oitavas") {
        path = "settings/expiryDateOitavas";
      } else if (phase === "quartas") {
        path = "settings/expiryDateQuartas";
      } else if (phase === "semi") {
        path = "settings/expiryDateSemi";
      } else if (phase === "final") {
        path = "settings/expiryDateFinal";
      } else if (phase === "fase-final") {
        // Dynamic detection of sub-phase for 'fase-final'
        let officialScores: Record<string, ScoreInput> = {};
        try {
          const resultsSnap = await get(ref(db, "admin/results"));
          if (resultsSnap.exists()) {
            officialScores = resultsSnap.val().scores || {};
          }
        } catch (e) {
          console.error("Erro ao obter resultados oficiais para prazo:", e);
        }
        
        const qfIds = ["QUARTAS-1", "QUARTAS-2", "QUARTAS-3", "QUARTAS-4"];
        const sfIds = ["SEMI-1", "SEMI-2"];
        
        const allQfFinished = qfIds.every(id => {
          const s = officialScores[id];
          return s && s.home.trim() !== "" && s.away.trim() !== "";
        });
        
        if (!allQfFinished) {
          path = "settings/expiryDateQuartas";
        } else {
          const allSfFinished = sfIds.every(id => {
            const s = officialScores[id];
            return s && s.home.trim() !== "" && s.away.trim() !== "";
          });
          if (!allSfFinished) {
            path = "settings/expiryDateSemi";
          } else {
            path = "settings/expiryDateFinal";
          }
        }
      } else if (isKnockout) {
        path = "settings/expiryDateKnockout";
      }
      const snap = await get(ref(db, path));
      if (snap.exists()) {
        const val = snap.val();
        if (val) {
          return new Date(val);
        }
      }
    } catch (e) {
      console.error("Erro ao obter prazo de expiração do Firebase:", e);
    }
  } else {
    let key = "bolao_mock_expiry_date";
    if (phase === "oitavas") {
      key = "bolao_mock_expiry_date_oitavas";
    } else if (phase === "quartas") {
      key = "bolao_mock_expiry_date_quartas";
    } else if (phase === "semi") {
      key = "bolao_mock_expiry_date_semi";
    } else if (phase === "final") {
      key = "bolao_mock_expiry_date_final";
    } else if (phase === "fase-final") {
      // Dynamic detection of sub-phase for mock 'fase-final'
      let officialScores: Record<string, ScoreInput> = {};
      try {
        const stored = localStorage.getItem("bolao_mock_official_results");
        if (stored) {
          officialScores = JSON.parse(stored).scores || {};
        }
      } catch (e) {}
      
      const qfIds = ["QUARTAS-1", "QUARTAS-2", "QUARTAS-3", "QUARTAS-4"];
      const sfIds = ["SEMI-1", "SEMI-2"];
      
      const allQfFinished = qfIds.every(id => {
        const s = officialScores[id];
        return s && s.home.trim() !== "" && s.away.trim() !== "";
      });
      
      if (!allQfFinished) {
        key = "bolao_mock_expiry_date_quartas";
      } else {
        const allSfFinished = sfIds.every(id => {
          const s = officialScores[id];
          return s && s.home.trim() !== "" && s.away.trim() !== "";
        });
        if (!allSfFinished) {
          key = "bolao_mock_expiry_date_semi";
        } else {
          key = "bolao_mock_expiry_date_final";
        }
      }
    } else if (isKnockout) {
      key = "bolao_mock_expiry_date_knockout";
    }
    const mockVal = localStorage.getItem(key);
    if (mockVal) return new Date(mockVal);
  }
  // Default fallbacks
  if (phase === "oitavas") {
    return new Date("2026-07-04T14:00:00-03:00");
  }
  if (phase === "quartas") {
    return new Date("2026-07-09T17:00:00-03:00");
  }
  if (phase === "semi") {
    return new Date("2026-07-14T20:00:00-03:00");
  }
  if (phase === "final") {
    return new Date("2026-07-18T16:00:00-03:00");
  }
  if (phase === "fase-final") {
    let officialScores: Record<string, ScoreInput> = {};
    if (isFirebaseConfigured && db) {
      try {
        // Dynamic fetch of results for fallback calculation
        const resultsSnap = await get(ref(db, "admin/results"));
        if (resultsSnap.exists()) {
          officialScores = resultsSnap.val().scores || {};
        }
      } catch (e) {}
    } else {
      try {
        const stored = localStorage.getItem("bolao_mock_official_results");
        if (stored) officialScores = JSON.parse(stored).scores || {};
      } catch (e) {}
    }
    
    const qfIds = ["QUARTAS-1", "QUARTAS-2", "QUARTAS-3", "QUARTAS-4"];
    const sfIds = ["SEMI-1", "SEMI-2"];
    
    const allQfFinished = qfIds.every(id => {
      const s = officialScores[id];
      return s && s.home.trim() !== "" && s.away.trim() !== "";
    });
    
    if (!allQfFinished) {
      return new Date("2026-07-09T17:00:00-03:00"); // Quartas deadline (9 Jul às 17h BRT)
    }
    const allSfFinished = sfIds.every(id => {
      const s = officialScores[id];
      return s && s.home.trim() !== "" && s.away.trim() !== "";
    });
    if (!allSfFinished) {
      return new Date("2026-07-14T16:00:00-03:00"); // Semi deadline (14 Jul às 16h BRT)
    }
    return new Date("2026-07-18T16:00:00-03:00"); // Final deadline (18 Jul às 16h BRT)
  }
  if (isKnockout) {
    return new Date("2026-06-28T16:00:00-03:00");
  }
  return new Date("2026-06-11T16:00:00-03:00");
}

// Verifica se o prazo limite de inscrições/edições expirou.
export async function isSubmissionDeadlinePassed(isKnockout?: boolean, phase?: string): Promise<boolean> {
  const deadline = await getExpiryDate(isKnockout, phase);
  const now = new Date();
  return now.getTime() > deadline.getTime();
}

// Retorna as datas de início de palpites para Semis e Finais
export async function getStartDate(phase: "semi" | "final"): Promise<Date> {
  if (isFirebaseConfigured && db) {
    try {
      const path = phase === "semi" ? "settings/startSemi" : "settings/startFinal";
      const snap = await get(ref(db, path));
      if (snap.exists()) {
        const val = snap.val();
        if (val) {
          return new Date(val);
        }
      }
    } catch (e) {
      console.error("Erro ao obter data de início do Firebase:", e);
    }
  } else {
    const key = phase === "semi" ? "bolao_mock_start_semi" : "bolao_mock_start_final";
    const mockVal = localStorage.getItem(key);
    if (mockVal) return new Date(mockVal);
  }
  // Default fallbacks
  if (phase === "semi") {
    return new Date("2026-07-12T00:00:00-03:00"); // 12 de Julho à meia-noite BRT (após as quartas)
  }
  return new Date("2026-07-16T00:00:00-03:00"); // 16 de Julho à meia-noite BRT (após as semis)
}


/**
 * MOCK LOCALSTORAGE IMPLEMENTATION (Para rodar localmente sem Firebase configurado)
 */
const MOCK_LEAGUES_KEY = "bolao_mock_leagues";
const MOCK_PARTICIPANTS_KEY = "bolao_mock_participants"; // Salvo como: { [leagueId]: { [participantId]: Participant } }
const MOCK_OFFICIAL_RESULTS_KEY = "bolao_mock_official_results";

function getMockLeagues(): Record<string, League> {
  const data = localStorage.getItem(MOCK_LEAGUES_KEY);
  return data ? JSON.parse(data) : {};
}

function saveMockLeagues(leagues: Record<string, League>) {
  localStorage.setItem(MOCK_LEAGUES_KEY, JSON.stringify(leagues));
}

function getMockParticipants(leagueId: string): Record<string, Participant> {
  const data = localStorage.getItem(MOCK_PARTICIPANTS_KEY);
  if (!data) return {};
  const all = JSON.parse(data);
  return all[leagueId] || {};
}

function saveMockParticipant(leagueId: string, participant: Participant) {
  const data = localStorage.getItem(MOCK_PARTICIPANTS_KEY);
  const all = data ? JSON.parse(data) : {};
  if (!all[leagueId]) all[leagueId] = {};
  all[leagueId][participant.id] = participant;
  localStorage.setItem(MOCK_PARTICIPANTS_KEY, JSON.stringify(all));
}

function getMockOfficialResults(): OfficialResults {
  const data = localStorage.getItem(MOCK_OFFICIAL_RESULTS_KEY);
  return data
    ? JSON.parse(data)
    : { scores: {}, updatedAt: new Date().toISOString() };
}

function saveMockOfficialResults(results: OfficialResults) {
  localStorage.setItem(MOCK_OFFICIAL_RESULTS_KEY, JSON.stringify(results));
}

/**
 * SERVIÇOS DE LIGA (LEAGUE)
 */

// Cria uma nova Liga
export async function createLeague(
  name: string,
  creatorName: string,
  creatorEmail: string,
  rules: LeagueRules,
  creatorCode: string,
  phase: string,
  logo?: string,
): Promise<string> {
  // Validar código do criador
  const expectedCode = import.meta.env.VITE_CREATOR_CODE || "copa2026";
  if (creatorCode.trim() !== expectedCode) {
    throw new Error("Código de Criador inválido! (Não autorizado)");
  }

  if (phase !== "16-avos" && phase !== "oitavas" && phase !== "fase-final") {
    throw new Error("Somente as fases de 16-avos, oitavas de final e fase final estão disponíveis para criação de ligas no momento.");
  }

  const leagueId = generateUniqueHash();
  const createdDate = new Date();
  const cutoffDate = new Date("2026-06-28T00:00:00-03:00");
  const isKnockout = phase === "fase-final" || phase === "16-avos" || phase === "oitavas" || createdDate.getTime() >= cutoffDate.getTime();

  const newLeague: League = {
    id: leagueId,
    name: name.trim(),
    creatorName: creatorName.trim(),
    creatorEmail: creatorEmail.trim(),
    rules,
    createdAt: createdDate.toISOString(),
    isKnockout,
    phase: phase as League["phase"],
    logo,
  };

  if (isFirebaseConfigured && db) {
    await set(ref(db, `leagues/${leagueId}`), newLeague);
  } else {
    // Modo Mock
    const leagues = getMockLeagues();
    leagues[leagueId] = newLeague;
    saveMockLeagues(leagues);
  }

  return leagueId;
}

// Retorna metadados de uma liga específica
export async function getLeague(leagueId: string): Promise<League> {
  const cutoffDate = new Date("2026-06-28T00:00:00-03:00").getTime();

  if (isFirebaseConfigured && db) {
    const snap = await get(ref(db, `leagues/${leagueId}`));
    if (!snap.exists()) {
      throw new Error("Liga não encontrada.");
    }
    const val = snap.val();
    const isKnockout = val.isKnockout || (val.createdAt && new Date(val.createdAt).getTime() >= cutoffDate);
    // Exclui subnós de participantes para retornar apenas metadados da liga
    return {
      id: val.id,
      name: val.name,
      creatorName: val.creatorName,
      creatorEmail: val.creatorEmail,
      rules: val.rules,
      createdAt: val.createdAt,
      isKnockout: !!isKnockout,
      phase: val.phase || (isKnockout ? "16-avos" : "grupos"),
      logo: val.logo,
    } as League;
  } else {
    const leagues = getMockLeagues();
    const league = leagues[leagueId];
    if (!league) {
      throw new Error("Liga não encontrada.");
    }
    const isKnockout = league.isKnockout || (league.createdAt && new Date(league.createdAt).getTime() >= cutoffDate);
    const phase = league.phase || (isKnockout ? "16-avos" : "grupos");
    return {
      ...league,
      isKnockout: !!isKnockout,
      phase,
    };
  }
}

/**
 * SERVIÇOS DE PARTICIPANTE (PARTICIPANT)
 */

// Cria um participante e seus palpites em uma liga
export async function joinLeague(
  leagueId: string,
  name: string,
  nickname: string,
  passwordHash: string,
  scores: Record<string, ScoreInput>,
): Promise<string> {
  const league = await getLeague(leagueId);

  let isJoinBlocked = await isSubmissionDeadlinePassed(league.isKnockout, league.phase);
  let deadline = await getExpiryDate(league.isKnockout, league.phase);

  if (league.phase === "fase-final") {
    const quartasLimit = await getExpiryDate(league.isKnockout, "quartas");
    if (new Date().getTime() > quartasLimit.getTime()) {
      isJoinBlocked = true;
      deadline = quartasLimit;
    }
  }

  if (isJoinBlocked) {
    const formatted = deadline.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    throw new Error(`Inscrições encerradas para este bolão (${formatted} BRT).`);
  }

  // Validar se o apelido já existe na liga
  const participants = await getParticipants(leagueId);
  const nickLower = nickname.trim().toLowerCase();
  const exists = participants.some((p) => p.nickname.toLowerCase() === nickLower);
  if (exists) {
    throw new Error("Esse apelido já está cadastrado nesta liga. Escolha outro!");
  }

  // Desabilita palpites para jogos que já começaram
  const now = new Date().getTime();
  const sanitizedScores = { ...scores };
  const matches = getLeagueMatches(league.phase);
  for (const match of matches) {
    const matchDate = match.scheduled ? parseMatchDate(match.scheduled) : 0;
    if (matchDate > 0 && matchDate < now) {
      sanitizedScores[match.id] = { home: "", away: "" };
    }
  }

  const participantId = generateUniqueHash();
  const newParticipant: Participant = {
    id: participantId,
    name: name.trim(),
    nickname: nickname.trim(),
    passwordHash,
    scores: sanitizedScores,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    await set(ref(db, `leagues/${leagueId}/participants/${participantId}`), newParticipant);
  } else {
    saveMockParticipant(leagueId, newParticipant);
  }

  return participantId;
}

// Retorna todos os participantes de uma liga
export async function getParticipants(leagueId: string): Promise<Participant[]> {
  if (isFirebaseConfigured && db) {
    const snap = await get(ref(db, `leagues/${leagueId}/participants`));
    if (!snap.exists()) {
      return [];
    }
    return Object.values(snap.val()) as Participant[];
  } else {
    const listMap = getMockParticipants(leagueId);
    return Object.values(listMap);
  }
}

// Retorna detalhes de um participante específico
export async function getParticipant(
  leagueId: string,
  participantId: string,
): Promise<Participant> {
  if (isFirebaseConfigured && db) {
    const snap = await get(ref(db, `leagues/${leagueId}/participants/${participantId}`));
    if (!snap.exists()) {
      throw new Error("Participante não encontrado.");
    }
    return snap.val() as Participant;
  } else {
    const all = getMockParticipants(leagueId);
    const p = all[participantId];
    if (!p) {
      throw new Error("Participante não encontrado.");
    }
    return p;
  }
}

// Atualiza palpites de um participante (exige senha)
export async function updateParticipantScores(
  leagueId: string,
  participantId: string,
  passwordHashInput: string,
  scores: Record<string, ScoreInput>,
): Promise<void> {
  const league = await getLeague(leagueId);

  if (await isSubmissionDeadlinePassed(league.isKnockout, league.phase)) {
    const deadline = await getExpiryDate(league.isKnockout, league.phase);
    const formatted = deadline.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    throw new Error(`Prazo de edição de palpites encerrado (${formatted} BRT).`);
  }

  const p = await getParticipant(leagueId, participantId);
  if (p.passwordHash !== passwordHashInput) {
    throw new Error("Senha de Edição incorreta!");
  }

  // Restaura os palpites originais para jogos que já começaram
  const now = new Date().getTime();
  const sanitizedScores = { ...scores };
  const matches = getLeagueMatches(league.phase);
  for (const match of matches) {
    const matchDate = match.scheduled ? parseMatchDate(match.scheduled) : 0;
    if (matchDate > 0 && matchDate < now) {
      sanitizedScores[match.id] = p.scores[match.id] || { home: "", away: "" };
    }
  }

  if (isFirebaseConfigured && db) {
    await update(ref(db, `leagues/${leagueId}/participants/${participantId}`), {
      scores: sanitizedScores,
      updatedAt: new Date().toISOString(),
    });
  } else {
    const updatedParticipant = {
      ...p,
      scores: sanitizedScores,
      updatedAt: new Date().toISOString(),
    };
    saveMockParticipant(leagueId, updatedParticipant);
  }
}

/**
 * SERVIÇOS DE ADMINISTRAÇÃO (ADMIN)
 */

// Retorna os placares oficiais lançados pelo Admin
export async function getOfficialResults(): Promise<OfficialResults> {
  if (isFirebaseConfigured && db) {
    const snap = await get(ref(db, "admin/results"));
    if (!snap.exists()) {
      return { scores: {}, updatedAt: new Date().toISOString() };
    }
    return snap.val() as OfficialResults;
  } else {
    return getMockOfficialResults();
  }
}

// Atualiza os placares oficiais (exige a chave estática do admin)
export async function updateOfficialResults(
  adminKey: string,
  scores: Record<string, ScoreInput>,
): Promise<void> {
  const expectedKey = import.meta.env.VITE_ADMIN_KEY || "admin12345admin12345admin";
  if (adminKey.trim() !== expectedKey) {
    throw new Error("Chave Administrativa inválida! Acesso negado.");
  }

  const results: OfficialResults = {
    scores,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    await set(ref(db, "admin/results"), results);
  } else {
    saveMockOfficialResults(results);
  }
}
