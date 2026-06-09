import { db, isFirebaseConfigured } from "../config/firebase";
import {
  ref,
  set,
  get,
  update,
} from "firebase/database";
import type { ScoreInput } from "./standings";

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

// Verifica se o prazo limite de inscrições/edições (11 de junho às 14:00 Horário de Brasília) expirou.
// 14:00 BRT (UTC-3) é exatamente 17:00 UTC.
export function isSubmissionDeadlinePassed(): boolean {
  const deadline = new Date(Date.UTC(2026, 5, 11, 17, 0, 0)); // Meses em JS são 0-indexed (5 = Junho)
  const now = new Date();
  return now.getTime() > deadline.getTime();
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
): Promise<string> {
  // Validar código do criador
  const expectedCode = import.meta.env.VITE_CREATOR_CODE || "copa2026";
  if (creatorCode.trim() !== expectedCode) {
    throw new Error("Código de Criador inválido! (Não autorizado)");
  }

  const leagueId = generateUniqueHash();
  const newLeague: League = {
    id: leagueId,
    name: name.trim(),
    creatorName: creatorName.trim(),
    creatorEmail: creatorEmail.trim(),
    rules,
    createdAt: new Date().toISOString(),
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
  if (isFirebaseConfigured && db) {
    const snap = await get(ref(db, `leagues/${leagueId}`));
    if (!snap.exists()) {
      throw new Error("Liga não encontrada.");
    }
    const val = snap.val();
    // Exclui subnós de participantes para retornar apenas metadados da liga
    return {
      id: val.id,
      name: val.name,
      creatorName: val.creatorName,
      creatorEmail: val.creatorEmail,
      rules: val.rules,
      createdAt: val.createdAt,
    } as League;
  } else {
    const leagues = getMockLeagues();
    const league = leagues[leagueId];
    if (!league) {
      throw new Error("Liga não encontrada.");
    }
    return league;
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
  if (isSubmissionDeadlinePassed()) {
    throw new Error("Prazo de envio de palpites encerrado (11 de Junho às 14h BRT).");
  }

  // Validar se o apelido já existe na liga
  const participants = await getParticipants(leagueId);
  const nickLower = nickname.trim().toLowerCase();
  const exists = participants.some((p) => p.nickname.toLowerCase() === nickLower);
  if (exists) {
    throw new Error("Esse apelido já está cadastrado nesta liga. Escolha outro!");
  }

  const participantId = generateUniqueHash();
  const newParticipant: Participant = {
    id: participantId,
    name: name.trim(),
    nickname: nickname.trim(),
    passwordHash,
    scores,
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
  if (isSubmissionDeadlinePassed()) {
    throw new Error("Prazo de edição de palpites encerrado (11 de Junho às 14h BRT).");
  }

  const p = await getParticipant(leagueId, participantId);
  if (p.passwordHash !== passwordHashInput) {
    throw new Error("Senha de Edição incorreta!");
  }

  if (isFirebaseConfigured && db) {
    await update(ref(db, `leagues/${leagueId}/participants/${participantId}`), {
      scores,
      updatedAt: new Date().toISOString(),
    });
  } else {
    const updatedParticipant = {
      ...p,
      scores,
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
