import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getLeague,
  getParticipants,
  getOfficialResults,
  isSubmissionDeadlinePassed,
  isFirebaseConfigured,
  type League,
  type Participant,
  type OfficialResults,
} from "../lib/firebaseService";
import { rankParticipants, calculateMatchPoints, parseMatchDate } from "../lib/scoring";
import { ALL_MATCHES } from "../data/groupStage";
import { downloadLeagueExcel } from "../lib/exportExcel";
import html2canvas from "html2canvas";

// Helper para verificar se a partida é hoje
const isMatchToday = (scheduledStr: string, currentTimestamp: number): boolean => {
  const d = new Date(currentTimestamp);
  const day = d.getDate();
  const month = d.getMonth(); // 5 = Jun, 6 = Jul
  
  const cleaned = (scheduledStr || "").trim().toLowerCase();
  const match = cleaned.match(/(\d+)\s+de\s+(\w+)/);
  if (!match) return false;
  
  const matchDay = parseInt(match[1], 10);
  const matchMonthStr = match[2];
  const matchMonth = matchMonthStr.startsWith("jun") ? 5 : 6;
  
  return day === matchDay && month === matchMonth;
};

export default function LeagueDetail() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [officialResults, setOfficialResults] = useState<OfficialResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date().getTime());
  const [matchViewMode, setMatchViewMode] = useState<"next3" | "today">("next3");

  const loadData = useCallback(async () => {
    if (!leagueId) return;
    try {
      const [leagueData, participantsList, results, isPassed] = await Promise.all([
        getLeague(leagueId),
        getParticipants(leagueId),
        getOfficialResults(),
        isSubmissionDeadlinePassed(),
      ]);
      setLeague(leagueData);
      setParticipants(participantsList);
      setOfficialResults(results);
      setDeadlinePassed(isPassed);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados da liga.");
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Atualiza o relógio interno a cada 15 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().getTime());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Atualização em segundo plano dos resultados e palpites a cada 30 segundos
  useEffect(() => {
    if (!leagueId) return;

    const pollInterval = setInterval(async () => {
      try {
        const [results, participantsList] = await Promise.all([
          getOfficialResults(),
          getParticipants(leagueId),
        ]);
        setOfficialResults(results);
        setParticipants(participantsList);
      } catch (err) {
        console.error("Erro na atualização em segundo plano:", err);
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [leagueId]);

  const handleExportLeague = () => {
    if (!league || participants.length === 0) return;
    try {
      downloadLeagueExcel(league, participants);
    } catch (err) {
      alert("Erro ao exportar planilha da liga.");
    }
  };

  // Calcula classificação geral dos participantes
  const rankedParticipants = useMemo(() => {
    if (!league || !officialResults) return [];
    return rankParticipants(participants, officialResults.scores, league.rules);
  }, [league, participants, officialResults]);

  // Próximos 3 jogos (considerando a data em relação ao momento atual e o delay de 2:20)
  const next3Matches = useMemo(() => {
    const limitTime = currentTime - (2 * 60 + 20) * 60 * 1000; // 2 horas e 20 minutos de tolerância
    const upcoming = ALL_MATCHES.filter((match) => {
      // Se já tiver placar oficial cadastrado, considera finalizado (remove de next3Matches)
      const res = officialResults?.scores[match.id];
      const hasOfficial = res && res.home.trim() !== "" && res.away.trim() !== "";
      if (hasOfficial) return false;

      return parseMatchDate(match.scheduled || "") >= limitTime;
    });

    // Ordena cronologicamente por data + horário
    const sorted = [...upcoming].sort((a, b) => {
      return parseMatchDate(a.scheduled || "") - parseMatchDate(b.scheduled || "");
    });

    return sorted.slice(0, 3);
  }, [currentTime, officialResults]);

  // Jogos selecionados com base no toggle (Próximos 3 ou Jogos de Hoje)
  const selectedMatches = useMemo(() => {
    if (matchViewMode === "next3") {
      return next3Matches;
    } else {
      const todayMatches = ALL_MATCHES.filter((match) => {
        return isMatchToday(match.scheduled || "", currentTime);
      });
      return [...todayMatches].sort((a, b) => {
        return parseMatchDate(a.scheduled || "") - parseMatchDate(b.scheduled || "");
      });
    }
  }, [matchViewMode, next3Matches, currentTime]);

  // Jogos que já passaram (possuem resultado oficial lançados) ordenados por data + horário
  const playedMatches = useMemo(() => {
    if (!officialResults) return [];

    const played = ALL_MATCHES.filter((match) => {
      const res = officialResults.scores[match.id];
      return res && res.home.trim() !== "" && res.away.trim() !== "";
    });

    // Ordena cronologicamente por data + horário
    return [...played].sort((a, b) => {
      return parseMatchDate(a.scheduled || "") - parseMatchDate(b.scheduled || "");
    });
  }, [officialResults]);

  const handleDownloadImage = async () => {
    const element = document.getElementById("matrix-capture-area");
    if (!element) return;

    // Guardar estilos originais do wrapper
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    const originalOverflow = element.style.overflow;
    const originalOverflowX = element.style.overflowX;

    // Buscar células "sticky" para desativar temporariamente o sticky (evita bugs no html2canvas)
    const stickyCells = element.querySelectorAll(".col-name") as NodeListOf<HTMLElement>;

    try {
      const table = element.querySelector(".matrix-table") as HTMLElement;
      const fullWidth = table ? table.scrollWidth : element.scrollWidth;

      // Ajustar estilos temporariamente para renderizar toda a largura
      element.style.width = `${fullWidth + 24}px`; // Largura total da tabela + margens do wrapper
      element.style.maxWidth = "none";
      element.style.overflow = "visible";
      element.style.overflowX = "visible";

      // Desativar posição sticky temporariamente
      stickyCells.forEach((cell) => {
        cell.style.position = "static";
      });

      const canvas = await html2canvas(element, {
        backgroundColor: "#141c28", // Fundo correspondente
        scale: 2, // Resolução duplicada para melhor legibilidade ao compartilhar
        logging: false,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: fullWidth + 100, // Força janela virtual mais larga
      });

      // Restaurar estilos originais do wrapper
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
      element.style.overflow = originalOverflow;
      element.style.overflowX = originalOverflowX;

      // Restaurar células sticky
      stickyCells.forEach((cell) => {
        cell.style.position = "";
      });

      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const titleClean = (league?.name || "bolao").trim().toLowerCase().replace(/\s+/g, "-");
      const modeClean = matchViewMode === "next3" ? "proximos-jogos" : "jogos-de-hoje";
      link.download = `palpites-${titleClean}-${modeClean}.png`;
      link.href = imgData;
      link.click();
    } catch (err) {
      // Garantir restauração mesmo em caso de erro
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
      element.style.overflow = originalOverflow;
      element.style.overflowX = originalOverflowX;
      stickyCells.forEach((cell) => {
        cell.style.position = "";
      });

      console.error("Erro ao gerar imagem:", err);
      alert("Erro ao gerar imagem para download.");
    }
  };

  if (loading) {
    return (
      <div className="main" style={{ textAlign: "center", padding: "4rem 0" }}>
        <p>Carregando dados da liga...</p>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="main">
        <div className="alert-box alert-box--error" style={{ margin: "2rem auto", maxWidth: "600px" }}>
          <strong>Erro:</strong>
          <p>{error || "Liga não encontrada no sistema."}</p>
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
    <div className="main">
      {!isFirebaseConfigured && (
        <div className="alert-box alert-box--warning">
          <strong>ℹ️ Modo de Teste Local Ativo:</strong>
          <p>Esta liga está rodando em modo mock (LocalStorage). Para salvar no banco em nuvem, configure o Firebase.</p>
        </div>
      )}

      {/* Info Bar da Liga */}
      <div className="league-info-bar">
        <div className="league-info-details">
          <h2>{league.name}</h2>
          <div className="league-info-meta">
            <span>Criador: <strong>{league.creatorName}</strong></span>
          </div>
          <div className="rules-list">
            <span
              className="rules-badge"
              data-tooltip="Acertou o placar exato da partida (ex: palpite 2x1, placar oficial 2x1)."
            >
              Acertar Placar: <strong>+{league.rules.exact} pts</strong> <span>ℹ️</span>
            </span>
            <span
              className="rules-badge"
              data-tooltip="Errou o placar exato, mas acertou o vencedor ou o empate (ex: palpite 3x1, placar oficial 1x0)."
            >
              Acertar Resultado: <strong>+{league.rules.result} pts</strong> <span>ℹ️</span>
            </span>
          </div>
        </div>

        <div className="league-info-action" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          {deadlinePassed ? (
            <span
              className="badge"
              style={{
                background: "rgba(248, 113, 113, 0.15)",
                color: "var(--danger)",
                padding: "0.6rem 1rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "1px solid rgba(248, 113, 113, 0.3)",
                display: "inline-block",
                textAlign: "center"
              }}
            >
              🔒 Inscrições Encerradas
            </span>
          ) : (
            <Link to={`/league/${league.id}/fill`} className="btn btn-primary" style={{ padding: "0.75rem 1.5rem" }}>
              Participar do Bolão / Inserir Palpites
            </Link>
          )}

          <button
            onClick={handleExportLeague}
            className="btn btn-ghost"
            style={{
              padding: "0.75rem 1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            📊 Exportar Liga (Excel)
          </button>
        </div>
      </div>
      <div className="dashboard-layout">
        {/* Próximos 3 Jogos e Matriz de Palpites */}
        <div className="dashboard-panel panel-upcoming" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "0.5rem" }}>
            <div>
              <h3 className="dashboard-panel-title" style={{ margin: 0 }}>
                {matchViewMode === "next3" ? "Próximos 3 Jogos & Palpites" : "Jogos de Hoje & Palpites"}
              </h3>
              <p className="form-helper" style={{ margin: "0.25rem 0 0" }}>
                Acompanhe o palpite de cada participante para as partidas da Copa.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", background: "var(--bg-elevated)", padding: "0.25rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setMatchViewMode("next3")}
                  style={{
                    padding: "0.4rem 0.85rem",
                    fontSize: "0.8rem",
                    borderRadius: "6px",
                    height: "auto",
                    border: "none",
                    background: matchViewMode === "next3" ? "var(--accent)" : "transparent",
                    color: matchViewMode === "next3" ? "#000" : "var(--text)",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  Próximos 3 Jogos
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setMatchViewMode("today")}
                  style={{
                    padding: "0.4rem 0.85rem",
                    fontSize: "0.8rem",
                    borderRadius: "6px",
                    height: "auto",
                    border: "none",
                    background: matchViewMode === "today" ? "var(--accent)" : "transparent",
                    color: matchViewMode === "today" ? "#000" : "var(--text)",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  Jogos de Hoje
                </button>
              </div>

              {selectedMatches.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleDownloadImage}
                  style={{
                    padding: "0.4rem 0.85rem",
                    fontSize: "0.8rem",
                    borderRadius: "8px",
                    height: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    borderColor: "var(--border)",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: "rgba(255, 255, 255, 0.03)",
                  }}
                >
                  📸 Baixar Palpites (Imagem)
                </button>
              )}
            </div>
          </div>

          {participants.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--muted)" }}>
              Nenhum palpite enviado ainda nesta liga.
            </div>
          ) : selectedMatches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: "8px", marginTop: "1rem" }}>
              {matchViewMode === "today" ? "Nenhum jogo agendado para hoje." : "Nenhum jogo próximo encontrado."}
            </div>
          ) : (
            <div id="matrix-capture-area" className="matrix-table-wrapper" style={{ marginTop: "1rem", padding: "0.75rem", borderRadius: "8px", background: "var(--bg-elevated)" }}>
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th className="col-name">Participante</th>
                    {selectedMatches.map((match) => {
                      const matchDate = parseMatchDate(match.scheduled || "");
                      const res = officialResults?.scores[match.id];
                      const hasOfficial = res && res.home.trim() !== "" && res.away.trim() !== "";
                      const isLive = matchDate < currentTime && matchDate >= currentTime - (2 * 60 + 20) * 60 * 1000 && !hasOfficial;

                      return (
                        <th key={match.id} className="matrix-match-header" style={isLive ? { border: "1px solid rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.05)" } : {}}>
                          <div>{match.home.name} x {match.away.name}</div>
                          {isLive ? (
                            <span
                              className="matrix-match-flag"
                              style={{
                                color: "var(--danger)",
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.25rem",
                                marginTop: "0.2rem"
                              }}
                            >
                              <span className="live-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }}></span>
                              JOGO EM ANDAMENTO
                            </span>
                          ) : (
                            <span className="matrix-match-flag">{match.group} • {match.scheduled}</span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p.id}>
                      <td className="col-name">
                        <Link to={`/league/${league.id}/${p.id}`} className="col-link">
                          {p.nickname}
                        </Link>
                      </td>
                      {selectedMatches.map((match) => {
                        const pred = p.scores[match.id];
                        const displayScore =
                          pred && pred.home !== "" && pred.away !== ""
                            ? `${pred.home} x ${pred.away}`
                            : "-";
                        return (
                          <td key={match.id}>
                            <span className="matrix-score-cell">{displayScore}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tabela de Classificação */}
        <div className="dashboard-panel panel-standings">
          <h3 className="dashboard-panel-title">Tabela de Classificação</h3>

          {rankedParticipants.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
                Ainda não há nenhum participante cadastrado nesta liga.
              </p>
              {!deadlinePassed && (
                <Link to={`/league/${league.id}/fill`} className="btn btn-primary">
                  Ser o Primeiro a Participar!
                </Link>
              )}
            </div>
          ) : (
            <div className="standings-wrap">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th className="col-pos">Pos</th>
                    <th className="col-team" style={{ paddingLeft: "1rem" }}>Apelido</th>
                    <th>Pontos</th>
                    <th>Placar</th>
                    <th>Resultado</th>
                    <th>Palpites</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedParticipants.map((p, index) => {
                    // Conta quantos palpites foram totalmente preenchidos
                    const predictionsCount = Object.values(p.scores).filter(
                      (s) => s.home.trim() !== "" && s.away.trim() !== "",
                    ).length;

                    return (
                      <tr key={p.id}>
                        <td className="col-pos">{index + 1}º</td>
                        <td className="col-team" style={{ paddingLeft: "1rem" }}>
                          <Link to={`/league/${league.id}/${p.id}`} className="col-link">
                            {p.nickname}
                          </Link>
                        </td>
                        <td className="col-pts" style={{ fontSize: "1rem", color: "var(--accent)" }}>
                          {p.totalPoints} pts
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--accent)", fontSize: "0.9rem" }}>
                          {p.exactHits}
                        </td>
                        <td style={{ fontWeight: 600, color: "#60a5fa", fontSize: "0.9rem" }}>
                          {p.resultHits}
                        </td>
                        <td style={{ color: "var(--muted)" }}>
                          {predictionsCount} / {ALL_MATCHES.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Jogos Realizados & Histórico de Palpites */}
        {participants.length > 0 && (
          <div className="dashboard-panel panel-past" style={{ overflow: "hidden" }}>
            <h3 className="dashboard-panel-title">Jogos Realizados & Histórico de Palpites</h3>
            <p className="form-helper" style={{ marginBottom: "1rem" }}>
              Histórico de todos os jogos finalizados. As cores indicam: <span style={{ color: "var(--accent)", fontWeight: "bold" }}>Exato</span> (acertou o placar), <span style={{ color: "#60a5fa", fontWeight: "bold" }}>Resultado</span> (acertou o vencedor/empate) ou <span style={{ color: "var(--danger)", fontWeight: "bold" }}>Erro</span>.
            </p>

            {playedMatches.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--muted)" }}>
                Nenhum jogo finalizado com resultados oficiais cadastrados ainda.
              </div>
            ) : (
              <div className="matrix-table-wrapper">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th className="col-name">Participante</th>
                      {playedMatches.map((match) => {
                        const official = officialResults!.scores[match.id];
                        return (
                          <th key={match.id} className="matrix-match-header">
                            {match.home.name} x {match.away.name}
                            <span className="matrix-match-flag" style={{ color: "var(--accent)", fontWeight: "bold" }}>
                              Oficial: {official.home} x {official.away}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => (
                      <tr key={p.id}>
                        <td className="col-name">
                          <Link to={`/league/${league.id}/${p.id}`} className="col-link">
                            {p.nickname}
                          </Link>
                        </td>
                        {playedMatches.map((match) => {
                          const pred = p.scores[match.id];
                          const official = officialResults!.scores[match.id];

                          // Sem palpite
                          if (!pred || pred.home.trim() === "" || pred.away.trim() === "") {
                            return (
                              <td key={match.id}>
                                <span className="matrix-score-cell" style={{ opacity: 0.4 }}>-</span>
                              </td>
                            );
                          }

                          // Calcula pontuação
                          const pts = calculateMatchPoints(
                            pred.home,
                            pred.away,
                            official.home,
                            official.away,
                            league.rules,
                          );

                          let cellStyle = {};
                          if (pts === league.rules.exact) {
                            cellStyle = {
                              background: "rgba(34, 197, 94, 0.15)",
                              color: "var(--accent)",
                              border: "1px solid rgba(34, 197, 94, 0.35)",
                              fontWeight: "bold",
                            };
                          } else if (pts === league.rules.result) {
                            cellStyle = {
                              background: "rgba(59, 130, 246, 0.15)",
                              color: "#60a5fa",
                              border: "1px solid rgba(59, 130, 246, 0.35)",
                              fontWeight: "bold",
                            };
                          } else {
                            cellStyle = {
                              background: "rgba(239, 68, 68, 0.08)",
                              color: "var(--danger)",
                              border: "1px solid rgba(239, 68, 68, 0.25)",
                            };
                          }

                          return (
                            <td key={match.id}>
                              <span className="matrix-score-cell" style={cellStyle}>
                                {pred.home} x {pred.away}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
