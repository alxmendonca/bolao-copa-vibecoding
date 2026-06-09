import type { ScoreInput } from "./standings";
import type { ParticipantGuess } from "./scoring";

const STORAGE_KEY = "worldcup-bolao-v1";
const AUDIT_KEY = "worldcup-bolao-audit-v1";

export type BolaoStoredState = {
  participantName: string;
  scores: Record<string, ScoreInput>;
};

export type AuditStoredState = {
  resultados: Record<string, ScoreInput>;
  participants: ParticipantGuess[];
};

export function loadBolaoState(): BolaoStoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as BolaoStoredState;
    if (!data || typeof data !== "object") return null;
    return {
      participantName:
        typeof data.participantName === "string" ? data.participantName : "",
      scores:
        data.scores && typeof data.scores === "object" ? data.scores : {},
    };
  } catch {
    return null;
  }
}

export function saveBolaoState(state: BolaoStoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota ou modo privado — ignora */
  }
}

export function clearBolaoState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignora */
  }
}

export function loadAuditState(): AuditStoredState | null {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AuditStoredState;
    if (!data || typeof data !== "object") return null;
    return {
      resultados:
        data.resultados && typeof data.resultados === "object"
          ? data.resultados
          : {},
      participants: Array.isArray(data.participants) ? data.participants : [],
    };
  } catch {
    return null;
  }
}

export function saveAuditState(state: AuditStoredState): void {
  try {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(state));
  } catch {
    /* ignora */
  }
}

export function clearAuditState(): void {
  try {
    localStorage.removeItem(AUDIT_KEY);
  } catch {
    /* ignora */
  }
}
