import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GROUPS } from "../data/groupStage";
import { GroupSection } from "../components/GroupSection";
import { MatchRow } from "../components/MatchRow";
import {
  getLeague,
  getParticipant,
  getOfficialResults,
  updateParticipantScores,
  isSubmissionDeadlinePassed,
  getExpiryDate,
  getLeagueMatches,
  isFirebaseConfigured,
  getStartDate,
  type League,
  type Participant,
  type OfficialResults,
} from "../lib/firebaseService";
import { hashPassword } from "../lib/hash";
import { calculateParticipantTotalScore, parseMatchDate } from "../lib/scoring";
import type { ScoreInput } from "../lib/standings";
import { resolveKnockoutMatches } from "../data/knockoutStage";

export default function ParticipantDetail() {
  const { leagueId, participantId } = useParams<{ leagueId: string; participantId: string }>();

  const [league, setLeague] = useState<League | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [officialResults, setOfficialResults] = useState<OfficialResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Controle de edição
  const [isEditing, setIsEditing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, ScoreInput>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [startSemiDate, setStartSemiDate] = useState<Date | null>(null);
  const [startFinalDate, setStartFinalDate] = useState<Date | null>(null);

  const isOitavasPreStart = useMemo(() => {
    return league?.phase === "oitavas" && !deadlinePassed;
  }, [league, deadlinePassed]);

  const formattedDeadline = useMemo(() => {
    if (!deadlineDate) return "";
    return deadlineDate.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [deadlineDate]);

  const activeSubPhase = useMemo(() => {
    if (league?.phase !== "fase-final" || !officialResults) return null;
    const officialScores = officialResults.scores || {};
    const qfIds = ["QUARTAS-1", "QUARTAS-2", "QUARTAS-3", "QUARTAS-4"];
    const sfIds = ["SEMI-1", "SEMI-2"];
    
    const allQfFinished = qfIds.every(id => {
      const s = officialScores[id];
      return s && s.home.trim() !== "" && s.away.trim() !== "";
    });
    if (!allQfFinished) return "quartas";

    const allSfFinished = sfIds.every(id => {
      const s = officialScores[id];
      return s && s.home.trim() !== "" && s.away.trim() !== "";
    });
    if (!allSfFinished) return "semi";

    return "final";
  }, [league, officialResults]);

  const loadData = async () => {
    if (!leagueId || !participantId) return;
    try {
      const leagueData = await getLeague(leagueId);
      const [pData, results, isPassed, limitDate, semiStart, finalStart] = await Promise.all([
        getParticipant(leagueId, participantId),
        getOfficialResults(),
        isSubmissionDeadlinePassed(leagueData.isKnockout, leagueData.phase),
        getExpiryDate(leagueData.isKnockout, leagueData.phase),
        getStartDate("semi"),
        getStartDate("final"),
      ]);
      setLeague(leagueData);
      setParticipant(pData);
      setScores(pData.scores);
      setOfficialResults(results);
      setDeadlinePassed(isPassed);
      setDeadlineDate(limitDate);
      setStartSemiDate(semiStart);
      setStartFinalDate(finalStart);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar os palpites.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [leagueId, participantId]);

  useEffect(() => {
    if (league?.name && participant?.name) {
      document.title = `${participant.name} em ${league.name} — Bolão Copa 2026`;
    }
  }, [league, participant]);

  // Calcula pontuação total do participante
  const totalPoints = useMemo(() => {
    if (!participant || !officialResults || !league) return 0;
    return calculateParticipantTotalScore(participant, officialResults.scores, league.rules);
  }, [participant, officialResults, league]);

  const onScoreChange = useCallback(
    (matchId: string, field: "home" | "away" | "qualified", value: string) => {
      const next = field === "qualified" ? value : value.replace(/\D/g, "");
      setScores((prev) => ({
        ...prev,
        [matchId]: {
          ...(prev[matchId] ?? { home: "", away: "", qualified: "" }),
          [field]: next,
        },
      }));
    },
    [],
  );

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!participant) return;

    try {
      const hashed = await hashPassword(passwordInput);
      if (hashed === participant.passwordHash) {
        setIsEditing(true);
        setIsAuthorized(true);
        setShowAuthForm(false);
        setPasswordInput(""); // Limpa o campo
      } else {
        setAuthError("Senha incorreta. Tente novamente.");
      }
    } catch (err) {
      setAuthError("Erro ao processar a validação.");
    }
  };

  const handleSaveEdits = async () => {
    if (!leagueId || !participantId || !participant) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Como já validamos a senha, podemos enviar o passwordHash do participante cadastrado
      await updateParticipantScores(
        leagueId,
        participantId,
        participant.passwordHash,
        scores,
      );

      setSuccessMsg("Palpites atualizados com sucesso!");
      setIsEditing(false);

      // Recarrega os dados atualizados
      await loadData();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao atualizar os palpites.");
    } finally {
      setSubmitting(false);
    }
  };

  const leagueMatches = useMemo(() => {
    let list = getLeagueMatches(league?.phase) || [];
    if (league?.phase === "fase-final" && officialResults) {
      list = resolveKnockoutMatches(list, officialResults.scores || {});
    }
    return [...list].sort((a, b) => {
      const ta = a.scheduled ? parseMatchDate(a.scheduled) : 0;
      const tb = b.scheduled ? parseMatchDate(b.scheduled) : 0;
      return ta - tb;
    });
  }, [league, officialResults]);

  const filledCount = useMemo(() => {
    let n = 0;
    for (const m of leagueMatches) {
      if (league?.phase === "fase-final" && activeSubPhase) {
        const matchSubPhase = m.id.startsWith("QUARTAS-") ? "quartas" : m.id.startsWith("SEMI-") ? "semi" : "final";
        if (matchSubPhase !== activeSubPhase) continue;
      }
      const s = scores[m.id];
      if (s?.home.trim() !== "" && s?.away.trim() !== "") n += 1;
    }
    return n;
  }, [scores, leagueMatches, league, activeSubPhase]);

  if (loading) {
    return (
      <div className="main" style={{ textAlign: "center", padding: "4rem 0" }}>
        <p>Carregando palpites do participante...</p>
      </div>
    );
  }

  if (error && !participant) {
    return (
      <div className="main">
        <div className="alert-box alert-box--error" style={{ margin: "2rem auto", maxWidth: "600px" }}>
          <strong>Erro:</strong>
          <p>{error}</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <Link to="/" className="btn btn-ghost">
            Voltar para a Página Inicial
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="participant-page-wrap">
      <header className="hero">
        <div className="hero-inner">
          <p className="hero-kicker">Liga: {league?.name}</p>
          <h1 className="hero-title">Palpites de {participant?.nickname}</h1>
          <p className="hero-sub" style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "1.1rem" }}>
            <span>Nome: <strong>{participant?.name}</strong></span>
            <span>Pontuação Total: <strong style={{ color: "var(--accent)" }}>{totalPoints} pts</strong></span>
          </p>
          <div className="hero-actions">
            <Link to={`/league/${leagueId}`} className="btn btn-ghost">
              Voltar para a Liga
            </Link>

            {deadlinePassed ? (
              <span className="badge" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                🔒 Edição Encerrada (Prazo expirado)
              </span>
            ) : isEditing ? (
              <button type="button" className="btn btn-primary" onClick={handleSaveEdits} disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar Alterações"}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAuthForm(!showAuthForm)}
              >
                {showAuthForm ? "Cancelar Edição" : "Editar Meus Palpites"}
              </button>
            )}
          </div>
        </div>
      </header>

      {isEditing && (
        <div
          className="sticky-progress"
          role="status"
          aria-live="polite"
          aria-label={`${filledCount} de ${leagueMatches.length} jogos preenchidos`}
          style={{ display: "block" }}
        >
          <div className="sticky-progress-inner">
            <span className="sticky-progress-count">
              {filledCount}/{leagueMatches.length}
            </span>
            <span className="sticky-progress-label">palpites preenchidos (Modo Edição)</span>
            <div
              className="sticky-progress-bar"
              aria-hidden
              style={{
                ["--progress" as string]: `${(filledCount / leagueMatches.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="main" style={{ paddingTop: "1.5rem" }}>
        {!isFirebaseConfigured && (
          <div className="alert-box alert-box--warning">
            <strong>ℹ️ Modo de Teste Local Ativo:</strong>
            <p>Os dados estão sendo editados apenas localmente (LocalStorage).</p>
          </div>
        )}

        {successMsg && (
          <div className="alert-box alert-box--success">
            <strong>Sucesso:</strong>
            <p>{successMsg}</p>
          </div>
        )}

        {/* Formulário de Autenticação com Senha */}
        {showAuthForm && (
          <div className="form-card" style={{ margin: "0 0 2rem 0", maxWidth: "450px" }}>
            <form onSubmit={handleAuthSubmit}>
              <h3 style={{ margin: "0 0 0.5rem 0" }}>Autenticação de Escrita</h3>
              <p className="form-helper" style={{ marginBottom: "1rem" }}>
                Insira a Senha de Edição definida no momento do cadastro para habilitar as alterações.
              </p>

              {authError && (
                <div className="alert-box alert-box--error" style={{ padding: "0.5rem", fontSize: "0.8rem" }}>
                  <p>{authError}</p>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="edit-password">Senha de Edição</label>
                <input
                  id="edit-password"
                  type="password"
                  placeholder="Sua senha secreta"
                  className="form-input"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Liberar Edição
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAuthForm(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Informações de Edição */}
        {isEditing && (
          <div className="alert-box alert-box--warning" style={{ marginBottom: "2rem" }}>
            <strong>✍️ Modo de Edição Ativo:</strong>
            <p>Você pode alterar os placares nos grupos abaixo. Clique em "Salvar Alterações" no topo ou na barra móvel ao finalizar.</p>
          </div>
        )}

        {/* Grid de Palpites do Participante */}
        {isOitavasPreStart && !isAuthorized ? (
          <div className="form-card" style={{ textAlign: "center", padding: "3rem 1.5rem", maxWidth: "600px", margin: "0 auto 2.5rem auto" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Palpites Ocultos</h3>
            <p style={{ color: "var(--muted)", margin: "0.5rem 0 1.5rem 0" }}>
              Os palpites deste participante estão ocultos até o encerramento do prazo de envio e edição da fase de Oitavas de Final ({formattedDeadline} BRT).
            </p>
            {!deadlinePassed && (
              <p style={{ fontSize: "0.9rem", color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "1rem" }}>
                Se esta página é sua, clique no botão <strong>"Editar Meus Palpites"</strong> acima e digite sua senha para visualizar e editar seus palpites.
              </p>
            )}
          </div>
        ) : (
          league?.isKnockout ? (
            <div className="form-card" style={{ maxWidth: "100%", margin: "0 0 2.5rem 0", padding: "1.5rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0" }}>Jogos de Mata-Mata</h3>
              {league.phase === "fase-final" && activeSubPhase && (
                <div className="alert-box alert-box--info" style={{ marginBottom: "1.5rem", padding: "0.75rem 1rem", fontSize: "0.9rem" }}>
                  <strong>Fase Ativa de Palpites: {activeSubPhase.toUpperCase()}</strong>
                  <p style={{ margin: "0.25rem 0 0" }}>Seus palpites podem ser alterados apenas para as {activeSubPhase === "quartas" ? "Quartas de Final" : activeSubPhase === "semi" ? "Semifinais" : "Finais"}. As outras fases estão travadas temporariamente.</p>
                </div>
              )}
              <ul className="match-list">
                {leagueMatches.map((m) => {
                  const matchSubPhase = m.id.startsWith("QUARTAS-") ? "quartas" : m.id.startsWith("SEMI-") ? "semi" : "final";
                  const now = new Date();
                  
                  let isInactive = false;
                  let lockReason = "";
                  
                  if (league?.phase === "fase-final") {
                    if (activeSubPhase && matchSubPhase !== activeSubPhase) {
                      isInactive = true;
                      lockReason = `Aguardando resultados oficiais da fase de ${matchSubPhase === "semi" ? "Quartas" : "Semifinais"}`;
                    }
                    
                    if (matchSubPhase === "semi" && startSemiDate && now < startSemiDate) {
                      isInactive = true;
                      lockReason = `Palpites das Semifinais abrem apenas em ${startSemiDate.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} BRT`;
                    } else if (matchSubPhase === "final" && startFinalDate && now < startFinalDate) {
                      isInactive = true;
                      lockReason = `Palpites da Final abrem apenas em ${startFinalDate.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} BRT (Bloqueado para preenchimento antecipado)`;
                    }
                  }
                  
                  return (
                    <li key={m.id}>
                      <MatchRow
                        match={m}
                        score={scores[m.id] ?? { home: "", away: "", qualified: "" }}
                        onChange={onScoreChange}
                        disabled={!isEditing || isInactive}
                        officialScore={officialResults?.scores?.[m.id]}
                        rules={league?.rules}
                        lockReason={lockReason}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="groups-stack">
              {GROUPS.map((g) => {
                // Se o admin lançou resultados oficiais, podemos exibir o feedback de pontos de cada jogo!
                // Para isso, vamos passar a classificação do grupo normalmente, mas mostrar no layout
                return (
                  <div key={g.letter} style={{ position: "relative" }}>
                    <GroupSection
                      group={g}
                      scores={scores}
                      onScoreChange={onScoreChange}
                      disabled={!isEditing}
                      officialScores={officialResults?.scores}
                      rules={league?.rules}
                    />
                    
                    {/* Overlay de pontos obtidos em cada jogo se houver resultado oficial */}
                    {officialResults && Object.keys(officialResults.scores).length > 0 && (
                      <div
                        style={{
                          padding: "0.5rem 1rem",
                          background: "rgba(20, 28, 40, 0.95)",
                          borderTop: "1px solid var(--border)",
                          borderBottomLeftRadius: "var(--radius)",
                          borderBottomRightRadius: "var(--radius)",
                          fontSize: "0.8rem",
                          color: "var(--muted)",
                          marginTop: "-1px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          zIndex: 2,
                        }}
                      >
                        <span>Palpites salvos para o Grupo {g.letter}</span>
                        <span style={{ color: "var(--accent)", fontWeight: "bold" }}>
                          Pontos Calculados
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {isEditing && (
        <aside className="mobile-dock" aria-label="Atalhos">
          <div className="mobile-dock-progress">
            <strong>{filledCount}/{leagueMatches.length}</strong>
            <span>preenchidos</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-dock"
            onClick={handleSaveEdits}
            disabled={submitting}
          >
            Salvar
          </button>
        </aside>
      )}
    </div>
  );
}
