import { useCallback, useEffect, useMemo, useState } from "react";
import { ALL_MATCHES, GROUPS } from "./data/groupStage";
import { ExportForm } from "./components/ExportForm";
import { GroupSection } from "./components/GroupSection";
import { BOLAO_CONFIG } from "./config/bolao";
import {
  clearBolaoState,
  loadBolaoState,
  saveBolaoState,
} from "./lib/storage";
import type { ScoreInput } from "./lib/standings";

function emptyScores(): Record<string, ScoreInput> {
  const o: Record<string, ScoreInput> = {};
  for (const m of ALL_MATCHES) {
    o[m.id] = { home: "", away: "" };
  }
  return o;
}

function mergeStoredScores(
  stored: Record<string, ScoreInput> | undefined,
): Record<string, ScoreInput> {
  const base = emptyScores();
  if (!stored) return base;
  for (const m of ALL_MATCHES) {
    const s = stored[m.id];
    if (s && typeof s.home === "string" && typeof s.away === "string") {
      base[m.id] = { home: s.home, away: s.away };
    }
  }
  return base;
}

function sanitizeScoreInput(value: string): string {
  return value.replace(/\D/g, "");
}

export default function App() {
  const [scores, setScores] = useState<Record<string, ScoreInput>>(emptyScores);
  const [participantName, setParticipantName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadBolaoState();
    if (stored) {
      setScores(mergeStoredScores(stored.scores));
      setParticipantName(stored.participantName);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveBolaoState({ participantName, scores });
  }, [hydrated, participantName, scores]);

  const onScoreChange = useCallback(
    (matchId: string, field: "home" | "away", value: string) => {
      const next = sanitizeScoreInput(value);
      setScores((prev) => ({
        ...prev,
        [matchId]: {
          ...(prev[matchId] ?? { home: "", away: "" }),
          [field]: next,
        },
      }));
    },
    [],
  );

  const resetAll = useCallback(() => {
    setScores(emptyScores());
    setParticipantName("");
    clearBolaoState();
  }, []);

  const filledCount = useMemo(() => {
    let n = 0;
    for (const m of ALL_MATCHES) {
      const s = scores[m.id];
      if (s?.home.trim() !== "" && s?.away.trim() !== "") n += 1;
    }
    return n;
  }, [scores]);

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-inner">
          <p className="hero-kicker">Bolão — Copa do Mundo 2026</p>
          <h1 className="hero-title">Fase de grupos</h1>
          <p className="hero-sub">
            48 seleções, 12 grupos (A–L), 72 jogos no calendário oficial. A
            classificação atualiza na hora: pontos, saldo e gols pró.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-ghost" onClick={resetAll}>
              Limpar todos os placares
            </button>
            <span className="hero-meta">
              {filledCount}/{ALL_MATCHES.length} jogos com placar completo
            </span>
          </div>
        </div>
      </header>

      <div
        className="sticky-progress"
        role="status"
        aria-live="polite"
        aria-label={`${filledCount} de ${ALL_MATCHES.length} jogos preenchidos`}
      >
        <div className="sticky-progress-inner">
          <span className="sticky-progress-count">
            {filledCount}/{ALL_MATCHES.length}
          </span>
          <span className="sticky-progress-label">jogos preenchidos</span>
          <div
            className="sticky-progress-bar"
            aria-hidden
            style={{
              ["--progress" as string]: `${(filledCount / ALL_MATCHES.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <main className="main">
        <div className="groups-stack">
          {GROUPS.map((g) => (
            <GroupSection
              key={g.letter}
              group={g}
              scores={scores}
              onScoreChange={onScoreChange}
            />
          ))}
        </div>

        <ExportForm
          matches={ALL_MATCHES}
          scores={scores}
          participantName={participantName}
          onParticipantNameChange={setParticipantName}
          filledCount={filledCount}
        />
      </main>

      <footer className="footer">
        <p>
          Seus palpites ficam salvos neste navegador. Baixe a planilha e envie
          no WhatsApp do bolão até {BOLAO_CONFIG.submissionDeadline}.
        </p>
      </footer>

      <aside className="mobile-dock" aria-label="Atalhos">
        <div className="mobile-dock-progress">
          <strong>{filledCount}/{ALL_MATCHES.length}</strong>
          <span>jogos</span>
        </div>
        <a href="#export-section" className="btn btn-primary btn-dock">
          Enviar
        </a>
      </aside>
    </div>
  );
}
