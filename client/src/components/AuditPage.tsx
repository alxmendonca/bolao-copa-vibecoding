import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALL_MATCHES, GROUPS } from "../data/groupStage";
import { MatchRow } from "./MatchRow";
import { importParticipantFromExcel } from "../lib/importExcel";
import { downloadRankingExcel } from "../lib/exportRanking";
import { computeRanking } from "../lib/scoring";
import { loadAuditState, saveAuditState } from "../lib/storage";
import type { ScoreInput } from "../lib/standings";
import type { ParticipantGuess, ParticipantResult } from "../lib/scoring";

function emptyScores(): Record<string, ScoreInput> {
  const o: Record<string, ScoreInput> = {};
  for (const m of ALL_MATCHES) {
    o[m.id] = { home: "", away: "" };
  }
  return o;
}

function countPlayed(resultados: Record<string, ScoreInput>): number {
  let n = 0;
  for (const s of Object.values(resultados)) {
    if (s.home.trim() !== "" && s.away.trim() !== "") n++;
  }
  return n;
}

const MEDAL = ["🥇", "🥈", "🥉"] as const;

function PosDisplay({ i }: { i: number }) {
  if (i < 3) {
    return <span className="audit-rank-medal">{MEDAL[i]}</span>;
  }
  return <span className="audit-rank-number">{i + 1}</span>;
}

function PointsBar({ pts, maxPts }: { pts: number; maxPts: number }) {
  const pct = maxPts > 0 ? (pts / maxPts) * 100 : 0;
  return (
    <span className="audit-bar-wrap">
      <span className="audit-bar" style={{ width: `${pct}%` }} />
    </span>
  );
}

function Aproveitamento({ r }: { r: ParticipantResult }) {
  if (r.filledCount === 0) return <span className="audit-apr">—</span>;
  const pct = Math.round((r.totalPoints / (r.filledCount * 3)) * 100);
  return <span className={`audit-apr${pct >= 50 ? " audit-apr--ok" : pct >= 30 ? " audit-apr--mid" : ""}`}>{pct}%</span>;
}

type Props = {
  onBack: () => void;
};

export default function AuditPage({ onBack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [resultados, setResultados] = useState<Record<string, ScoreInput>>(
    () => {
      const stored = loadAuditState();
      return stored?.resultados ?? emptyScores();
    },
  );
  const [participants, setParticipants] = useState<ParticipantGuess[]>(() => {
    const stored = loadAuditState();
    return stored?.participants ?? [];
  });
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  useEffect(() => {
    saveAuditState({ resultados, participants });
  }, [resultados, participants]);

  const playedCount = useMemo(() => countPlayed(resultados), [resultados]);

  const onResultadoChange = useCallback(
    (matchId: string, field: "home" | "away", value: string) => {
      const sanitized = value.replace(/\D/g, "");
      setResultados((prev) => ({
        ...prev,
        [matchId]: {
          ...(prev[matchId] ?? { home: "", away: "" }),
          [field]: sanitized,
        },
      }));
    },
    [],
  );

  const ranking = useMemo(
    () => computeRanking(participants, resultados),
    [participants, resultados],
  );

  const maxPoints = ranking.length > 0 ? ranking[0].totalPoints : 0;

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFeedback(null);

    const buffer = await file.arrayBuffer();
    const participant = importParticipantFromExcel(buffer);

    if (!participant) {
      setFeedback({
        ok: false,
        msg: "Não foi possível ler o arquivo. Verifique se é um export válido do bolão.",
      });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setParticipants((prev) => {
      const exists = prev.findIndex((p) => p.name === participant.name);
      if (exists >= 0) {
        const next = [...prev];
        next[exists] = participant;
        return next;
      }
      return [...prev, participant];
    });

    setFeedback({
      ok: true,
      msg: `Palpites de "${participant.name}" importados com sucesso!`,
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemove = (name: string) => {
    setParticipants((prev) => prev.filter((p) => p.name !== name));
  };

  const handleClearParticipants = () => {
    setParticipants([]);
  };

  const handleClearResults = () => {
    setResultados(emptyScores());
  };

  const handleExport = () => {
    if (ranking.length === 0) return;
    downloadRankingExcel(ranking);
  };

  return (
    <div className="audit-page">
      <header className="audit-header">
        <div className="audit-header-inner">
          <button className="btn btn-ghost" onClick={onBack}>
            ← Voltar aos palpites
          </button>
          <div>
            <h1 className="audit-title">Auditoria do Bolão</h1>
          </div>
        </div>
      </header>

      <main className="audit-main">
        <div className="audit-summary">
          <div className="audit-summary-item">
            <span className="audit-summary-value">{playedCount}</span>
            <span className="audit-summary-label">de {ALL_MATCHES.length} jogos realizados</span>
          </div>
          <div className="audit-summary-item">
            <span className="audit-summary-value">{participants.length}</span>
            <span className="audit-summary-label">participantes</span>
          </div>
        </div>

        <div className="audit-layout">
          <section className="audit-section audit-resultados">
            <div className="audit-section-header">
              <h2>Resultados Reais</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleClearResults}
              >
                Limpar
              </button>
            </div>
            <p className="audit-desc">
              Preencha o placar real de cada jogo. Os participantes serão
              pontuados automaticamente.
            </p>

            <div className="audit-groups">
              {GROUPS.map((group) => (
                <div key={group.letter} className="audit-group">
                  <h3 className="audit-group-title">Grupo {group.letter}</h3>
                  <ul className="match-list">
                    {group.matches.map((m) => (
                      <li key={m.id}>
                        <MatchRow
                          match={m}
                          score={
                            resultados[m.id] ?? { home: "", away: "" }
                          }
                          onChange={onResultadoChange}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="audit-section audit-panel">
            <h2>Painel de Auditoria</h2>

            <div className="audit-card">
              <h3>Importar Palpites</h3>
              <p className="audit-desc">
                Selecione o arquivo .xlsx exportado por cada participante.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx"
                onChange={handleImport}
                className="audit-file-input"
              />
              {feedback && (
                <p
                  className={`audit-feedback ${feedback.ok ? "audit-feedback--ok" : "audit-feedback--err"}`}
                >
                  {feedback.msg}
                </p>
              )}
            </div>

            <div className="audit-card">
              <div className="audit-section-header">
                <h3>Participantes ({participants.length})</h3>
                {participants.length > 0 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleClearParticipants}
                  >
                    Limpar
                  </button>
                )}
              </div>
              {participants.length === 0 ? (
                <p className="audit-desc">Nenhum participante importado ainda.</p>
              ) : (
                <ul className="audit-participant-list">
                  {participants.map((p) => (
                    <li key={p.name} className="audit-participant-item">
                      <span>{p.name}</span>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleRemove(p.name)}
                        aria-label={`Remover ${p.name}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {ranking.length > 0 && (
              <div className="audit-card">
                <h3>Ranking</h3>
                <div className="audit-ranking-wrap">
                  <table className="audit-ranking-table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Participante</th>
                        <th>Pontos</th>
                        <th>Aproveit.</th>
                        <th>Acertos</th>
                        <th>Exatos</th>
                        <th>Jogos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((r, i) => (
                        <tr
                          key={r.participant.name}
                          className={
                            i === 0
                              ? "audit-rank-podium audit-rank-gold"
                              : i === 1
                                ? "audit-rank-podium audit-rank-silver"
                                : i === 2
                                  ? "audit-rank-podium audit-rank-bronze"
                                  : ""
                          }
                        >
                          <td className="audit-rank-pos">
                            <PosDisplay i={i} />
                          </td>
                          <td className="audit-rank-name">
                            {r.participant.name}
                          </td>
                          <td className="audit-rank-pts">
                            <div className="audit-rank-pts-inner">
                              <span className="audit-rank-pts-value">{r.totalPoints}</span>
                              <PointsBar pts={r.totalPoints} maxPts={maxPoints} />
                            </div>
                          </td>
                          <td><Aproveitamento r={r} /></td>
                          <td>{r.resultOnly}</td>
                          <td>{r.exactMatches}</td>
                          <td>{r.filledCount}/{playedCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  className="btn btn-primary audit-export-btn"
                  onClick={handleExport}
                >
                  Exportar Ranking (.xlsx)
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
