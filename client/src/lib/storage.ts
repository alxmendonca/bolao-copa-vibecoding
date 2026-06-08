import type { ScoreInput } from "./standings";

const STORAGE_KEY = "worldcup-bolao-v1";

export type BolaoStoredState = {
  participantName: string;
  scores: Record<string, ScoreInput>;
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
