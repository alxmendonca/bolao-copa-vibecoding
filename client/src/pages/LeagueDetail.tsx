import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getLeague,
  getParticipants,
  getOfficialResults,
  isSubmissionDeadlinePassed,
  getExpiryDate,
  getLeagueMatches,
  isFirebaseConfigured,
  type League,
  type Participant,
  type OfficialResults,
} from "../lib/firebaseService";
import { rankParticipants, calculateMatchPoints, parseMatchDate } from "../lib/scoring";
import { downloadLeagueExcel } from "../lib/exportExcel";
import html2canvas from "html2canvas";
import { resolveKnockoutMatches } from "../data/knockoutStage";

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

// Helper para verificar se a partida é amanhã
const isMatchTomorrow = (scheduledStr: string, currentTimestamp: number): boolean => {
  const d = new Date(currentTimestamp + 24 * 60 * 60 * 1000);
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
  const [joinDeadlinePassed, setJoinDeadlinePassed] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [expiryQuartas, setExpiryQuartas] = useState<Date | null>(null);
  const [expirySemi, setExpirySemi] = useState<Date | null>(null);
  const [expiryFinal, setExpiryFinal] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date().getTime());
  const [matchViewMode, setMatchViewMode] = useState<"next3" | "today">("next3");

  const [upcomingIndex, setUpcomingIndex] = useState(0);
  const [pastIndex, setPastIndex] = useState(0);

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

  const [hiddenLineIds, setHiddenLineIds] = useState<Record<string, boolean>>({});
  const [hoveredPoint, setHoveredPoint] = useState<{
    nickname: string;
    val: number;
    label: string;
    x: number;
    y: number;
    color: string;
    idx: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!leagueId) return;
    try {
      const leagueData = await getLeague(leagueId);
      const [participantsList, results, isPassed, limitDate, qfLimit, sfLimit, fnLimit] = await Promise.all([
        getParticipants(leagueId),
        getOfficialResults(),
        isSubmissionDeadlinePassed(leagueData.isKnockout, leagueData.phase),
        getExpiryDate(leagueData.isKnockout, leagueData.phase),
        getExpiryDate(leagueData.isKnockout, "quartas"),
        getExpiryDate(leagueData.isKnockout, "semi"),
        getExpiryDate(leagueData.isKnockout, "final"),
      ]);
      setLeague(leagueData);
      setParticipants(participantsList);
      setOfficialResults(results);
      setDeadlinePassed(isPassed);
      setDeadlineDate(limitDate);
      setExpiryQuartas(qfLimit);
      setExpirySemi(sfLimit);
      setExpiryFinal(fnLimit);
      
      setJoinDeadlinePassed(true);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados da liga.");
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (league?.name) {
      document.title = `${league.name} — Bolão Copa 2026`;
    }
  }, [league]);

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
    if (isOitavasPreStart) {
      alert("A exportação da liga para Excel está desativada até o início da primeira partida de Oitavas de Final, para manter os palpites ocultos.");
      return;
    }
    try {
      downloadLeagueExcel(league, participants, {
        quartas: expiryQuartas || new Date(),
        semi: expirySemi || new Date(),
        final: expiryFinal || new Date(),
      });
    } catch (err) {
      alert("Erro ao exportar planilha da liga.");
    }
  };

  const shouldHideMatchPrediction = useCallback((matchId: string) => {
    if (league?.phase !== "fase-final") return false;
    const matchSubPhase = matchId.startsWith("QUARTAS-") ? "quartas" : matchId.startsWith("SEMI-") ? "semi" : "final";
    const now = new Date().getTime();
    if (matchSubPhase === "quartas" && expiryQuartas && now < expiryQuartas.getTime()) return true;
    if (matchSubPhase === "semi" && expirySemi && now < expirySemi.getTime()) return true;
    if (matchSubPhase === "final" && expiryFinal && now < expiryFinal.getTime()) return true;
    return false;
  }, [league, expiryQuartas, expirySemi, expiryFinal]);

  // Obter a lista de partidas correspondente à fase da liga
  const leagueMatches = useMemo(() => {
    let list = getLeagueMatches(league?.phase) || [];
    if (league?.phase === "fase-final" && officialResults) {
      list = resolveKnockoutMatches(list, officialResults.scores || {});
    }
    return list;
  }, [league, officialResults]);

  // Calcula classificação geral dos participantes
  const rankedParticipants = useMemo(() => {
    if (!league || !officialResults) return [];
    return rankParticipants(participants, officialResults.scores, league.rules);
  }, [league, participants, officialResults]);

  // Próximos 3 jogos (mostra os próximos 3 jogos futuros e mantém os jogos em andamento)
  const next3Matches = useMemo(() => {
    // 1. Jogos em andamento (iniciados nos últimos 2h20m e sem resultado oficial)
    const live = leagueMatches.filter((match) => {
      const res = officialResults?.scores[match.id];
      const hasOfficial = res && res.home.trim() !== "" && res.away.trim() !== "";
      if (hasOfficial) return false;
      const matchDate = parseMatchDate(match.scheduled || "");
      return matchDate < currentTime && matchDate >= currentTime - (2 * 60 + 20) * 60 * 1000;
    });

    // 2. Jogos futuros (sem resultado oficial e após o horário atual)
    const future = leagueMatches.filter((match) => {
      const res = officialResults?.scores[match.id];
      const hasOfficial = res && res.home.trim() !== "" && res.away.trim() !== "";
      if (hasOfficial) return false;
      const matchDate = parseMatchDate(match.scheduled || "");
      return matchDate >= currentTime;
    });

    // Ordena cronologicamente os futuros e pega os 3 primeiros
    const sortedFuture = [...future].sort((a, b) => {
      return parseMatchDate(a.scheduled || "") - parseMatchDate(b.scheduled || "");
    });
    const next3Future = sortedFuture.slice(0, 3);

    // Ordena cronologicamente os em andamento
    const sortedLive = [...live].sort((a, b) => {
      return parseMatchDate(a.scheduled || "") - parseMatchDate(b.scheduled || "");
    });

    return [...sortedLive, ...next3Future];
  }, [currentTime, officialResults, leagueMatches]);

  // Filtro de jogos de hoje (não iniciados ou que não estão acontecendo/passaram de 2h20)
  const todayMatchesList = useMemo(() => {
    return leagueMatches.filter((match) => {
      const isToday = isMatchToday(match.scheduled || "", currentTime);
      if (!isToday) return false;

      const res = officialResults?.scores[match.id];
      const hasOfficial = res && res.home.trim() !== "" && res.away.trim() !== "";
      if (hasOfficial) return false;

      const matchDate = parseMatchDate(match.scheduled || "");
      
      // não foram iniciados (futuros)
      const notStarted = matchDate >= currentTime;
      
      // não estão acontecendo (2h20 após o início)
      const finished = matchDate < currentTime - (2 * 60 + 20) * 60 * 1000;

      return notStarted || finished;
    }).sort((a, b) => {
      return parseMatchDate(a.scheduled || "") - parseMatchDate(b.scheduled || "");
    });
  }, [currentTime, officialResults, leagueMatches]);

  // Filtro de jogos de amanhã (caso os de hoje tenham acabado ou não existam)
  const tomorrowMatchesList = useMemo(() => {
    return leagueMatches.filter((match) => {
      const isTomorrow = isMatchTomorrow(match.scheduled || "", currentTime);
      if (!isTomorrow) return false;

      const res = officialResults?.scores[match.id];
      const hasOfficial = res && res.home.trim() !== "" && res.away.trim() !== "";
      if (hasOfficial) return false;

      return true;
    }).sort((a, b) => {
      return parseMatchDate(a.scheduled || "") - parseMatchDate(b.scheduled || "");
    });
  }, [currentTime, officialResults, leagueMatches]);

  // Jogos selecionados com base no toggle (Próximos 3 ou Jogos de Hoje / Amanhã)
  const selectedMatches = useMemo(() => {
    if (matchViewMode === "next3") {
      return next3Matches;
    } else {
      if (todayMatchesList.length > 0) {
        return todayMatchesList;
      } else {
        return tomorrowMatchesList;
      }
    }
  }, [matchViewMode, next3Matches, todayMatchesList, tomorrowMatchesList]);

  const isShowingTomorrow = matchViewMode === "today" && todayMatchesList.length === 0;

  // Jogos que já passaram (possuem resultado oficial lançados) ordenados por data + horário
  const playedMatches = useMemo(() => {
    if (!officialResults) return [];

    const played = leagueMatches.filter((match) => {
      const res = officialResults.scores[match.id];
      return res && res.home.trim() !== "" && res.away.trim() !== "";
    });

    // Ordena cronologicamente decrescente por data + horário (mais recentes primeiro)
    return [...played].sort((a, b) => {
      return parseMatchDate(b.scheduled || "") - parseMatchDate(a.scheduled || "");
    });
  }, [officialResults, leagueMatches]);

  // Classificação dos participantes antes da última partida finalizada
  const previousRankedParticipants = useMemo(() => {
    if (!league || !officialResults || playedMatches.length === 0) return [];

    // Clona e remove a última partida
    const previousScores = { ...officialResults.scores };
    delete previousScores[playedMatches[0].id];

    return rankParticipants(participants, previousScores, league.rules);
  }, [league, participants, officialResults, playedMatches]);

  const chronologicalPlayedMatches = useMemo(() => {
    return [...playedMatches].reverse();
  }, [playedMatches]);

  const chartData = useMemo(() => {
    if (!league || !officialResults || chronologicalPlayedMatches.length === 0 || participants.length === 0) {
      return { labels: [], lines: [], matches: [] };
    }

    const participantPointsHistory = participants.map((p) => {
      const history = [0];
      let currentPoints = 0;

      chronologicalPlayedMatches.forEach((match) => {
        const pred = p.scores[match.id];
        const official = officialResults.scores[match.id];
        
        let pts = 0;
        if (pred && pred.home.trim() !== "" && pred.away.trim() !== "") {
          pts = calculateMatchPoints(
            pred.home,
            pred.away,
            official.home,
            official.away,
            league.rules
          );
        }
        currentPoints += pts;
        history.push(currentPoints);
      });

      return {
        id: p.id,
        nickname: p.nickname,
        history,
        finalPoints: currentPoints
      };
    });

    const sortedParticipantsForColors = [...participantPointsHistory].sort((a, b) => b.finalPoints - a.finalPoints);

    const colors = [
      "#22c55e", // Emerald
      "#60a5fa", // Blue
      "#eab308", // Yellow / Gold
      "#ec4899", // Pink
      "#a855f7", // Purple
      "#f97316", // Orange
      "#14b8a6", // Teal
      "#f43f5e", // Rose
      "#3b82f6", // Indigo
      "#84cc16", // Lime
    ];

    const lines = sortedParticipantsForColors.map((p, idx) => {
      return {
        ...p,
        color: colors[idx % colors.length]
      };
    });

    const labels = ["Início", ...chronologicalPlayedMatches.map((m) => `${m.home.name.substring(0, 3)} x ${m.away.name.substring(0, 3)}`)];

    return {
      labels,
      lines,
      matches: chronologicalPlayedMatches
    };
  }, [league, officialResults, chronologicalPlayedMatches, participants]);

  const maxPoints = useMemo(() => {
    let maxVal = 5;
    chartData.lines.forEach((line) => {
      const lineMax = Math.max(...line.history);
      if (lineMax > maxVal) {
        maxVal = lineMax;
      }
    });
    return Math.ceil(maxVal * 1.1);
  }, [chartData]);

  const toggleLineVisibility = (id: string) => {
    setHiddenLineIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isAllVisible = useMemo(() => {
    if (chartData.lines.length === 0) return true;
    return chartData.lines.every((line) => !hiddenLineIds[line.id]);
  }, [chartData.lines, hiddenLineIds]);

  const isNoneVisible = useMemo(() => {
    if (chartData.lines.length === 0) return true;
    return chartData.lines.every((line) => hiddenLineIds[line.id]);
  }, [chartData.lines, hiddenLineIds]);

  const addAllLines = () => {
    setHiddenLineIds({});
  };

  const removeAllLines = () => {
    const nextHidden: Record<string, boolean> = {};
    chartData.lines.forEach((line) => {
      nextHidden[line.id] = true;
    });
    setHiddenLineIds(nextHidden);
  };

  // Garantir limites de índices válidos
  useEffect(() => {
    if (selectedMatches.length > 0 && upcomingIndex >= selectedMatches.length) {
      setUpcomingIndex(selectedMatches.length - 1);
    }
  }, [selectedMatches.length, upcomingIndex]);

  useEffect(() => {
    if (playedMatches.length > 0 && pastIndex >= playedMatches.length) {
      setPastIndex(playedMatches.length - 1);
    }
  }, [playedMatches.length, pastIndex]);

  const handleDownloadImage = async () => {
    const element = document.getElementById("matrix-capture-area");
    if (!element || selectedMatches.length === 0) return;

    const activeMatch = selectedMatches[upcomingIndex];
    const matchLabel = `${activeMatch.home.name}-x-${activeMatch.away.name}`.toLowerCase().replace(/\s+/g, "-");

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#141c28", // Fundo correspondente
        scale: 2, // Resolução duplicada para melhor legibilidade ao compartilhar
        logging: false,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (el) => el.classList.contains("no-capture"),
      });

      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const titleClean = (league?.name || "bolao").trim().toLowerCase().replace(/\s+/g, "-");
      link.download = `palpites-${titleClean}-${matchLabel}.png`;
      link.href = imgData;
      link.click();
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      alert("Erro ao gerar imagem para download.");
    }
  };

  const handleDownloadStandingsImage = async () => {
    const element = document.getElementById("standings-capture-area");
    if (!element) return;

    // Buscar células "sticky" para desativar temporariamente o sticky
    const stickyCells = element.querySelectorAll(".col-pos, .col-team") as NodeListOf<HTMLElement>;

    // Guardar scroll e estilos originais do wrapper da tabela de classificação
    const standingsWrap = element.querySelector(".standings-wrap") as HTMLElement;
    const originalScrollLeft = standingsWrap ? standingsWrap.scrollLeft : 0;
    const originalOverflow = standingsWrap ? standingsWrap.style.overflow : "";
    const originalWidth = standingsWrap ? standingsWrap.style.width : "";
    const originalMaxWidth = standingsWrap ? standingsWrap.style.maxWidth : "";

    const table = element.querySelector(".standings-table") as HTMLElement;
    const fullWidth = table ? table.scrollWidth : element.scrollWidth;

    try {
      // Forçar scrollLeft = 0 e desativar overflow hidden temporariamente
      if (standingsWrap) {
        standingsWrap.scrollLeft = 0;
        standingsWrap.style.width = `${fullWidth + 24}px`;
        standingsWrap.style.maxWidth = "none";
        standingsWrap.style.overflow = "visible";
      }

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
        ignoreElements: (el) => el.classList.contains("no-capture"),
      });

      // Restaurar
      if (standingsWrap) {
        standingsWrap.scrollLeft = originalScrollLeft;
        standingsWrap.style.width = originalWidth;
        standingsWrap.style.maxWidth = originalMaxWidth;
        standingsWrap.style.overflow = originalOverflow;
      }

      stickyCells.forEach((cell) => {
        cell.style.position = "";
      });

      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const titleClean = (league?.name || "bolao").trim().toLowerCase().replace(/\s+/g, "-");
      link.download = `classificacao-${titleClean}.png`;
      link.href = imgData;
      link.click();
    } catch (err) {
      // Restaurar em caso de erro
      if (standingsWrap) {
        standingsWrap.scrollLeft = originalScrollLeft;
        standingsWrap.style.width = originalWidth;
        standingsWrap.style.maxWidth = originalMaxWidth;
        standingsWrap.style.overflow = originalOverflow;
      }

      stickyCells.forEach((cell) => {
        cell.style.position = "";
      });

      console.error("Erro ao gerar imagem da classificação:", err);
      alert("Erro ao gerar imagem para download.");
    }
  };

  const handleDownloadLastResultImage = async () => {
    const element = document.getElementById("last-result-capture-area");
    if (!element || playedMatches.length === 0) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#0f172a", // Fundo do card
        scale: 2, // Resolução duplicada para melhor legibilidade
        logging: false,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: 520,
        height: element.offsetHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const titleClean = (league?.name || "bolao").trim().toLowerCase().replace(/\s+/g, "-");
      const matchLabel = `${playedMatches[0].home.name}-x-${playedMatches[0].away.name}`.toLowerCase().replace(/\s+/g, "-");
      link.download = `resultado-${titleClean}-${matchLabel}.png`;
      link.href = imgData;
      link.click();
    } catch (err) {
      console.error("Erro ao gerar imagem do último resultado:", err);
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
      <div className="league-info-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1.5rem" }}>
        <div style={{ display: "flex", flex: 1, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
          <div className="league-info-details">
            <h2>{league.name}</h2>
            <div className="league-info-meta" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.25rem" }}>
              <span>Criador: <strong>{league.creatorName}</strong></span>
              {formattedDeadline && (
                <span className="deadline-indicator" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--muted)", fontSize: "0.9rem" }}>
                  <span>⏳</span> Prazo: <strong style={{ color: deadlinePassed ? "var(--danger)" : "var(--success)" }}>{formattedDeadline} BRT</strong>
                </span>
              )}
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
            {joinDeadlinePassed ? (
              <span
                style={{
                  background: "rgba(248, 113, 113, 0.15)",
                  color: "var(--danger)",
                  padding: "0.6rem 1rem",
                  border: "1px solid rgba(248, 113, 113, 0.3)",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
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

        {league.logo && (
          <div className="league-logo-container" style={{ flexShrink: 0 }}>
            <img
              src={league.logo}
              alt="Logo da Liga"
              style={{
                maxHeight: "180px",
                maxWidth: "280px",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
          </div>
        )}
      </div>
      <div className="dashboard-layout">
        {/* Próximos 3 Jogos e Matriz de Palpites */}
        <div className="dashboard-panel panel-upcoming" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "0.5rem" }}>
            <div>
              <h3 className="dashboard-panel-title" style={{ margin: 0 }}>
                {matchViewMode === "next3" 
                  ? "Próximos 3 Jogos & Palpites" 
                  : isShowingTomorrow 
                    ? "Jogos de Amanhã & Palpites" 
                    : "Jogos de Hoje & Palpites"}
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
                  {todayMatchesList.length > 0 ? "Jogos de Hoje" : "Jogos de Amanhã"}
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
              {matchViewMode === "today" 
                ? isShowingTomorrow 
                  ? "Nenhum jogo agendado para amanhã." 
                  : "Nenhum jogo agendado para hoje." 
                : "Nenhum jogo próximo encontrado."}
            </div>
          ) : (
            <>
              {/* Carousel Controls */}
              <div className="carousel-controls no-capture" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0", gap: "1rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setUpcomingIndex(prev => Math.max(0, prev - 1))}
                  disabled={upcomingIndex === 0}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    cursor: upcomingIndex === 0 ? "not-allowed" : "pointer",
                    opacity: upcomingIndex === 0 ? 0.4 : 1,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: "8px",
                    fontWeight: 600,
                    transition: "all 0.2s"
                  }}
                >
                  ← Anterior
                </button>
                <span style={{ fontWeight: 600, color: "var(--muted)", fontSize: "0.9rem" }}>
                  Jogo {upcomingIndex + 1} de {selectedMatches.length}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setUpcomingIndex(prev => Math.min(selectedMatches.length - 1, prev + 1))}
                  disabled={upcomingIndex === selectedMatches.length - 1}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    cursor: upcomingIndex === selectedMatches.length - 1 ? "not-allowed" : "pointer",
                    opacity: upcomingIndex === selectedMatches.length - 1 ? 0.4 : 1,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: "8px",
                    fontWeight: 600,
                    transition: "all 0.2s"
                  }}
                >
                  Próximo →
                </button>
              </div>

              {(() => {
                const activeMatch = selectedMatches[upcomingIndex] || selectedMatches[0];
                if (!activeMatch) return null;

                const matchDate = parseMatchDate(activeMatch.scheduled || "");
                const res = officialResults?.scores[activeMatch.id];
                const hasOfficial = res && res.home.trim() !== "" && res.away.trim() !== "";
                const isLive = matchDate < currentTime && matchDate >= currentTime - (2 * 60 + 20) * 60 * 1000 && !hasOfficial;

                return (
                  <div
                    id="matrix-capture-area"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: "1.25rem",
                      width: "100%",
                      boxShadow: "var(--shadow)"
                    }}
                  >
                    {/* Match Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", fontWeight: "bold" }}>
                        Fase de Grupos • {activeMatch.group}
                      </span>
                      {isLive ? (
                        <span
                          style={{
                            color: "var(--danger)",
                            fontWeight: "bold",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            background: "rgba(239, 68, 68, 0.1)",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "6px",
                            border: "1px solid rgba(239, 68, 68, 0.2)"
                          }}
                        >
                          <span className="live-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }}></span>
                          JOGO EM ANDAMENTO
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: "500" }}>
                          {activeMatch.scheduled}
                        </span>
                      )}
                    </div>

                    {/* Scoreboard style */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", marginBottom: "1.5rem", gap: "0.5rem" }}>
                      <div style={{ width: "42%", textAlign: "right", fontWeight: "700", fontSize: "1.05rem", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {activeMatch.home.name}
                      </div>
                      <div style={{ width: "16%", textAlign: "center", display: "flex", justifyContent: "center" }}>
                        <span style={{ background: "rgba(255, 255, 255, 0.05)", padding: "0.25rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", color: "var(--muted)", fontWeight: "bold", border: "1px solid var(--border)" }}>
                          VS
                        </span>
                      </div>
                      <div style={{ width: "42%", textAlign: "left", fontWeight: "700", fontSize: "1.05rem", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {activeMatch.away.name}
                      </div>
                    </div>

                    {/* Predictions Table */}
                    <div style={{ overflow: "visible", borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(0, 0, 0, 0.1)" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", tableLayout: "fixed" }}>
                        <thead>
                          <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--border)" }}>
                            <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", color: "var(--muted)", fontWeight: 600 }}>Participante</th>
                            <th style={{ padding: "0.6rem 0.75rem", textAlign: "center", color: "var(--muted)", fontWeight: 600, width: "100px" }}>Palpite</th>
                          </tr>
                        </thead>
                        <tbody>
                          {participants.map((p) => {
                            const pred = p.scores[activeMatch.id];
                            const displayScore = (isOitavasPreStart || shouldHideMatchPrediction(activeMatch.id))
                              ? <span title="Os palpites estão ocultos até o início dos jogos desta fase/sub-fase" style={{ cursor: "help" }}>🔒</span>
                              : (pred && pred.home !== "" && pred.away !== "" ? `${pred.home} x ${pred.away}` : "-");
                            return (
                              <tr key={p.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.02)" }}>
                                <td style={{ padding: "0.6rem 0.75rem", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  <Link to={`/league/${league.id}/${p.id}`} className="col-link" style={{ fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {p.nickname}
                                  </Link>
                                </td>
                                <td style={{ padding: "0.6rem 0.75rem", textAlign: "center", width: "100px", minWidth: "100px", whiteSpace: "nowrap" }}>
                                  <span className="matrix-score-cell" style={{ display: "inline-block", background: "rgba(255, 255, 255, 0.05)", borderRadius: "4px", padding: "0.2rem 0.5rem", fontWeight: "bold" }}>
                                    {displayScore}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </>)}
        </div>

        {/* Tabela de Classificação */}
        <div className="dashboard-panel panel-standings" id="standings-capture-area">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 className="dashboard-panel-title" style={{ margin: 0 }}>Tabela de Classificação</h3>
            {rankedParticipants.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadStandingsImage}
                className="btn btn-ghost no-capture"
                style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem", display: "flex", alignItems: "center", gap: "0.25rem", height: "fit-content" }}
              >
                📸 Exportar PNG
              </button>
            )}
          </div>

          {rankedParticipants.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
                Ainda não há nenhum participante cadastrado nesta liga.
              </p>
              {!joinDeadlinePassed && (
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
                    // Conta quantos palpites foram totalmente preenchidos na liga
                    const predictionsCount = leagueMatches.filter((m) => {
                      const s = p.scores[m.id];
                      return s && s.home.trim() !== "" && s.away.trim() !== "";
                    }).length;

                    // Cálculo do delta de posições
                    const currentRank = index + 1;
                    const previousIndex = previousRankedParticipants.findIndex(prev => prev.id === p.id);
                    const previousRank = previousIndex !== -1 ? previousIndex + 1 : currentRank;
                    const rankDelta = previousRank - currentRank;

                    let deltaText = "";
                    let deltaColor = "";
                    if (rankDelta > 0) {
                      deltaText = `▲ ${rankDelta}`;
                      deltaColor = "#22c55e"; // verde
                    } else if (rankDelta < 0) {
                      deltaText = `▼ ${Math.abs(rankDelta)}`;
                      deltaColor = "#ef4444"; // vermelho
                    } else {
                      deltaText = "="; // manteve
                      deltaColor = "#60a5fa"; // azul
                    }

                    return (
                      <tr key={p.id}>
                        <td className="col-pos">{index + 1}º</td>
                        <td className="col-team" style={{ paddingLeft: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: "bold",
                                color: deltaColor,
                                background: "rgba(255, 255, 255, 0.03)",
                                borderRadius: "4px",
                                padding: "0.05rem 0.25rem",
                                border: `1px solid rgba(255, 255, 255, 0.05)`,
                                minWidth: "24px",
                                display: "inline-block",
                                textAlign: "center"
                              }}
                            >
                              {deltaText}
                            </span>
                            <Link to={`/league/${league.id}/${p.id}`} className="col-link" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.nickname}
                            </Link>
                          </div>
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
                          {predictionsCount} / {leagueMatches.length}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h3 className="dashboard-panel-title" style={{ margin: 0 }}>Jogos Realizados & Histórico de Palpites</h3>
              {playedMatches.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadLastResultImage}
                  className="btn btn-ghost"
                  style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem", display: "flex", alignItems: "center", gap: "0.25rem", height: "fit-content" }}
                >
                  📸 Exportar Último Resultado (PNG)
                </button>
              )}
            </div>
            <p className="form-helper" style={{ marginBottom: "1rem" }}>
              Histórico de todos os jogos finalizados. As cores indicam: <span style={{ color: "var(--accent)", fontWeight: "bold" }}>Exato</span> (acertou o placar), <span style={{ color: "#60a5fa", fontWeight: "bold" }}>Resultado</span> (acertou o vencedor/empate) ou <span style={{ color: "var(--danger)", fontWeight: "bold" }}>Erro</span>.
            </p>

            {playedMatches.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--muted)" }}>
                Nenhum jogo finalizado com resultados oficiais cadastrados ainda.
              </div>
            ) : (
              <>
                {/* Carousel Controls */}
                <div className="carousel-controls no-capture" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0", gap: "1rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPastIndex(prev => Math.max(0, prev - 1))}
                    disabled={pastIndex === 0}
                    style={{
                      padding: "0.5rem 1rem",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      cursor: pastIndex === 0 ? "not-allowed" : "pointer",
                      opacity: pastIndex === 0 ? 0.4 : 1,
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      borderRadius: "8px",
                      fontWeight: 600,
                      transition: "all 0.2s"
                    }}
                  >
                    ← Anterior
                  </button>
                  <span style={{ fontWeight: 600, color: "var(--muted)", fontSize: "0.9rem" }}>
                    Jogo {pastIndex + 1} de {playedMatches.length}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPastIndex(prev => Math.min(playedMatches.length - 1, prev + 1))}
                    disabled={pastIndex === playedMatches.length - 1}
                    style={{
                      padding: "0.5rem 1rem",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      cursor: pastIndex === playedMatches.length - 1 ? "not-allowed" : "pointer",
                      opacity: pastIndex === playedMatches.length - 1 ? 0.4 : 1,
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      borderRadius: "8px",
                      fontWeight: 600,
                      transition: "all 0.2s"
                    }}
                  >
                    Próximo →
                  </button>
                </div>

                {(() => {
                  const activePastMatch = playedMatches[pastIndex] || playedMatches[0];
                  if (!activePastMatch) return null;

                  const official = officialResults!.scores[activePastMatch.id];

                  return (
                    <div
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        padding: "1.25rem",
                        width: "100%",
                        boxShadow: "var(--shadow)"
                      }}
                    >
                      {/* Match Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "0.75rem" }}>
                        <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", fontWeight: "bold" }}>
                          Fase de Grupos • {activePastMatch.group}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: "500" }}>
                          {activePastMatch.scheduled}
                        </span>
                      </div>

                      {/* Official Scoreboard */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", marginBottom: "1.5rem", gap: "0.5rem" }}>
                        <div style={{ width: "38%", textAlign: "right", fontWeight: "800", fontSize: "1.1rem", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {activePastMatch.home.name}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center", width: "24%" }}>
                          <span style={{ fontSize: "2rem", fontWeight: "900", color: "var(--accent)", lineHeight: 1 }}>
                            {official.home}
                          </span>
                          <span style={{ color: "var(--muted)", fontWeight: "bold", fontSize: "1.1rem" }}>x</span>
                          <span style={{ fontSize: "2rem", fontWeight: "900", color: "var(--accent)", lineHeight: 1 }}>
                            {official.away}
                          </span>
                        </div>
                        <div style={{ width: "38%", textAlign: "left", fontWeight: "800", fontSize: "1.1rem", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {activePastMatch.away.name}
                        </div>
                      </div>

                      {/* Predictions Table */}
                      <div style={{ overflow: "visible", borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(0, 0, 0, 0.1)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", tableLayout: "fixed" }}>
                          <thead>
                            <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--border)" }}>
                              <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", color: "var(--muted)", fontWeight: 600 }}>Participante</th>
                              <th style={{ padding: "0.6rem 0.75rem", textAlign: "center", color: "var(--muted)", fontWeight: 600, width: "100px" }}>Palpite</th>
                              <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "var(--muted)", fontWeight: 600, width: "90px" }}>Pontos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {participants.map((p) => {
                              const pred = p.scores[activePastMatch.id];
                              let displayScore = "-";
                              let pts = 0;
                              let cellStyle = {
                                background: "rgba(255, 255, 255, 0.05)",
                                color: "var(--text)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                              };

                              if (pred && pred.home.trim() !== "" && pred.away.trim() !== "") {
                                displayScore = `${pred.home} x ${pred.away}`;
                                pts = calculateMatchPoints(
                                  pred.home,
                                  pred.away,
                                  official.home,
                                  official.away,
                                  league.rules
                                );

                                if (pts === league.rules.exact) {
                                  cellStyle = {
                                    background: "rgba(34, 197, 94, 0.15)",
                                    color: "var(--accent)",
                                    border: "1px solid rgba(34, 197, 94, 0.35)",
                                  };
                                } else if (pts === league.rules.result) {
                                  cellStyle = {
                                    background: "rgba(59, 130, 246, 0.15)",
                                    color: "#60a5fa",
                                    border: "1px solid rgba(59, 130, 246, 0.35)",
                                  };
                                } else {
                                  cellStyle = {
                                    background: "rgba(239, 68, 68, 0.08)",
                                    color: "var(--danger)",
                                    border: "1px solid rgba(239, 68, 68, 0.25)",
                                  };
                                }
                              }

                              return (
                                <tr key={p.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.02)" }}>
                                  <td style={{ padding: "0.6rem 0.75rem", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    <Link to={`/league/${league.id}/${p.id}`} className="col-link" style={{ fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {p.nickname}
                                    </Link>
                                  </td>
                                  <td style={{ padding: "0.6rem 0.75rem", textAlign: "center", width: "100px", minWidth: "100px", whiteSpace: "nowrap" }}>
                                    <span className="matrix-score-cell" style={{ ...cellStyle, display: "inline-block", borderRadius: "4px", padding: "0.2rem 0.5rem", fontWeight: "bold" }}>
                                      {displayScore}
                                    </span>
                                  </td>
                                  <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: "bold", color: pts > 0 ? "var(--accent)" : "var(--muted)", width: "90px", minWidth: "90px", whiteSpace: "nowrap" }}>
                                    {pred && pred.home.trim() !== "" ? `+${pts} pts` : "0 pts"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* Gráfico de Evolução de Pontos */}
        {playedMatches.length > 0 && (() => {
          const svgWidth = 600;
          const svgHeight = 320;
          const paddingLeft = 40;
          const paddingRight = 30;
          const paddingTop = 30;
          const paddingBottom = 45;
          const netWidth = svgWidth - paddingLeft - paddingRight;
          const netHeight = svgHeight - paddingTop - paddingBottom;

          const gridLines: { val: number; y: number }[] = [];
          const step = maxPoints / 4;
          for (let i = 0; i <= 4; i++) {
            const val = Math.round(step * i);
            const y = paddingTop + netHeight - (val * (netHeight / maxPoints));
            gridLines.push({ val, y });
          }

          const xCoords: { label: string; x: number }[] = [];
          const count = chartData.labels.length;
          if (count > 0) {
            for (let j = 0; j < count; j++) {
              const x = paddingLeft + (j * (netWidth / (count - 1)));
              xCoords.push({ label: chartData.labels[j], x });
            }
          }

          return (
            <div className="dashboard-panel panel-chart" style={{ gridColumn: "1 / -1", width: "100%", overflow: "hidden", marginTop: "1.5rem" }}>
              <h3 className="dashboard-panel-title" style={{ marginBottom: "0.5rem" }}>
                Histórico de Evolução de Pontos
              </h3>
              <p className="form-helper" style={{ marginBottom: "1.5rem" }}>
                Acompanhe o ganho acumulado de pontos dos participantes rodada a rodada. Passe o mouse nos pontos para ver detalhes. Clique nos nomes da legenda para ocultar/exibir as linhas.
              </p>

              <div style={{ position: "relative", width: "100%", height: `${svgHeight}px`, background: "rgba(0, 0, 0, 0.15)", borderRadius: "8px", border: "1px solid var(--border)", padding: "10px" }}>
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" style={{ overflow: "visible" }}>
                  <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Grid horizontal */}
                  {gridLines.map((line, idx) => (
                    <g key={idx}>
                      <line
                        x1={paddingLeft}
                        y1={line.y}
                        x2={svgWidth - paddingRight}
                        y2={line.y}
                        stroke="var(--border)"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={line.y + 4}
                        fill="var(--muted)"
                        fontSize="0.75rem"
                        textAnchor="end"
                      >
                        {line.val}
                      </text>
                    </g>
                  ))}

                  {/* Grid vertical */}
                  {xCoords.map((coord, idx) => (
                    <g key={idx}>
                      <line
                        x1={coord.x}
                        y1={paddingTop}
                        x2={coord.x}
                        y2={paddingTop + netHeight}
                        stroke="rgba(255, 255, 255, 0.03)"
                        strokeWidth={1}
                      />
                      <text
                        x={coord.x}
                        y={paddingTop + netHeight + 16}
                        fill="var(--muted)"
                        fontSize="0.65rem"
                        textAnchor="middle"
                        transform={`rotate(-20 ${coord.x} ${paddingTop + netHeight + 16})`}
                      >
                        {coord.label}
                      </text>
                    </g>
                  ))}

                  {/* Linhas dos Participantes */}
                  {chartData.lines.map((line) => {
                    if (hiddenLineIds[line.id]) return null;

                    const points = line.history.map((val, idx) => {
                      const x = xCoords[idx]?.x || paddingLeft;
                      const y = paddingTop + netHeight - (val * (netHeight / maxPoints));
                      return { x, y, val, idx };
                    });

                    const d = points.reduce((acc, p, idx) => {
                      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                    }, "");

                    return (
                      <g key={line.id}>
                        {/* Glow path */}
                        <path
                          d={d}
                          fill="none"
                          stroke={line.color}
                          strokeWidth={6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.15}
                          style={{ filter: "url(#glow)" }}
                        />
                        {/* Active path */}
                        <path
                          d={d}
                          fill="none"
                          stroke={line.color}
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Dots */}
                        {points.map((p, pIdx) => (
                          <circle
                            key={pIdx}
                            cx={p.x}
                            cy={p.y}
                            r={hoveredPoint && hoveredPoint.nickname === line.nickname && hoveredPoint.idx === p.idx ? 6 : 3.5}
                            fill="#0c1118"
                            stroke={line.color}
                            strokeWidth={2}
                            style={{ transition: "all 0.1s ease" }}
                          />
                        ))}
                      </g>
                    );
                  })}

                  {/* Overlay interativo de Hover */}
                  {chartData.lines.map((line) => {
                    if (hiddenLineIds[line.id]) return null;

                    return line.history.map((val, idx) => {
                      const x = xCoords[idx]?.x || paddingLeft;
                      const y = paddingTop + netHeight - (val * (netHeight / maxPoints));

                      return (
                        <circle
                          key={`${line.id}-${idx}`}
                          cx={x}
                          cy={y}
                          r={12}
                          fill="transparent"
                          style={{ cursor: "pointer" }}
                          onMouseEnter={() => {
                            setHoveredPoint({
                              nickname: line.nickname,
                              val,
                              label: chartData.labels[idx],
                              x: (x / svgWidth) * 100,
                              y: (y / svgHeight) * 100,
                              color: line.color,
                              idx
                            });
                          }}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      );
                    });
                  })}
                </svg>

                {/* Tooltip render */}
                {hoveredPoint && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${hoveredPoint.x}%`,
                      top: `calc(${hoveredPoint.y}% - 35px)`,
                      transform: "translateX(-50%)",
                      background: "var(--bg-card)",
                      border: `1px solid ${hoveredPoint.color}`,
                      padding: "0.4rem 0.6rem",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      pointerEvents: "none",
                      zIndex: 20,
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.6)",
                      whiteSpace: "nowrap",
                      color: "var(--text)"
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#ffffff", marginBottom: "0.15rem" }}>{hoveredPoint.nickname}</div>
                    <div style={{ color: hoveredPoint.color, fontWeight: "700" }}>{hoveredPoint.val} pts</div>
                    <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{hoveredPoint.label}</div>
                  </div>
                )}
              </div>

              {/* Legenda do Gráfico */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginTop: "1.25rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={addAllLines}
                    disabled={isAllVisible}
                    className="btn"
                    style={{
                      padding: "0.35rem 0.75rem",
                      fontSize: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      color: isAllVisible ? "var(--muted)" : "var(--text)",
                      background: isAllVisible ? "rgba(255, 255, 255, 0.01)" : "rgba(255, 255, 255, 0.05)",
                      fontWeight: 600,
                      cursor: isAllVisible ? "not-allowed" : "pointer",
                      opacity: isAllVisible ? 0.4 : 1,
                      transition: "all 0.2s"
                    }}
                  >
                    👁️ Adicionar Todos
                  </button>
                  <button
                    type="button"
                    onClick={removeAllLines}
                    disabled={isNoneVisible}
                    className="btn"
                    style={{
                      padding: "0.35rem 0.75rem",
                      fontSize: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      color: isNoneVisible ? "var(--muted)" : "var(--text)",
                      background: isNoneVisible ? "rgba(255, 255, 255, 0.01)" : "rgba(255, 255, 255, 0.05)",
                      fontWeight: 600,
                      cursor: isNoneVisible ? "not-allowed" : "pointer",
                      opacity: isNoneVisible ? 0.4 : 1,
                      transition: "all 0.2s"
                    }}
                  >
                    🚫 Remover Todos
                  </button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1rem", justifyContent: "center" }}>
                  {chartData.lines.map((line) => {
                    const isVisible = !hiddenLineIds[line.id];
                    return (
                      <button
                        key={line.id}
                        type="button"
                        onClick={() => toggleLineVisibility(line.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          color: isVisible ? "var(--text)" : "var(--muted)",
                          opacity: isVisible ? 1 : 0.45,
                          textDecoration: isVisible ? "none" : "line-through",
                          padding: "0.2rem 0.4rem",
                          borderRadius: "4px",
                          transition: "all 0.2s"
                        }}
                      >
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: line.color, display: "inline-block" }}></span>
                        <span style={{ fontWeight: 600 }}>{line.nickname}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Componente Invisível para Captura do Último Resultado */}
        {playedMatches.length > 0 && league && (
          <div
            id="last-result-capture-area"
            style={{
              position: "absolute",
              left: "-9999px",
              top: "-9999px",
              width: "520px",
              padding: "2rem",
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              color: "#f8fafc",
              fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--accent)", fontWeight: "bold" }}>
                {league.name}
              </span>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Fase de Grupos • {playedMatches[0].group}
              </div>
            </div>

            {/* Placar Oficial em Destaque como Header Principal */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "linear-gradient(90deg, rgba(255, 255, 255, 0.01) 0%, rgba(255, 255, 255, 0.04) 50%, rgba(255, 255, 255, 0.01) 100%)",
                padding: "1.25rem 1rem",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ width: "35%", textAlign: "right", fontWeight: "800", fontSize: "1.25rem", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {playedMatches[0].home.name}
              </div>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", justifyContent: "center", width: "30%" }}>
                <span style={{ fontSize: "2.8rem", fontWeight: "900", color: "var(--accent)", lineHeight: 1 }}>
                  {officialResults!.scores[playedMatches[0].id].home}
                </span>
                <span style={{ color: "var(--muted)", fontWeight: "bold", fontSize: "1.2rem" }}>x</span>
                <span style={{ fontSize: "2.8rem", fontWeight: "900", color: "var(--accent)", lineHeight: 1 }}>
                  {officialResults!.scores[playedMatches[0].id].away}
                </span>
              </div>
              <div style={{ width: "35%", textAlign: "left", fontWeight: "800", fontSize: "1.25rem", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {playedMatches[0].away.name}
              </div>
            </div>

            {/* Cabeçalho de Colunas do Card */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.5rem 0.5rem",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--muted)",
                fontWeight: "bold",
                marginBottom: "0.25rem"
              }}
            >
              <div style={{ width: "42%" }}>Pos. & Participante</div>
              <div style={{ width: "33%" }}>Geral (Pts | P | R)</div>
              <div style={{ width: "25%", textAlign: "right" }}>Palpite / Pts</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {rankedParticipants.map((p, index) => {
                const pred = p.scores[playedMatches[0].id];
                const official = officialResults!.scores[playedMatches[0].id];
                let scoreText = "-";
                let pointsGained = 0;
                let badgeStyle = {
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "var(--muted)",
                  padding: "0.2rem 0.4rem",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: "bold" as const
                };

                if (pred && pred.home.trim() !== "" && pred.away.trim() !== "") {
                  scoreText = `${pred.home} x ${pred.away}`;
                  pointsGained = calculateMatchPoints(
                    pred.home,
                    pred.away,
                    official.home,
                    official.away,
                    league.rules
                  );

                  if (pointsGained === league.rules.exact) {
                    badgeStyle = {
                      background: "rgba(34, 197, 94, 0.15)",
                      color: "var(--accent)",
                      padding: "0.2rem 0.4rem",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "bold" as const
                    };
                  } else if (pointsGained === league.rules.result) {
                    badgeStyle = {
                      background: "rgba(59, 130, 246, 0.15)",
                      color: "#60a5fa",
                      padding: "0.25rem 0.4rem",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "bold" as const
                    };
                  } else {
                    badgeStyle = {
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "var(--danger)",
                      padding: "0.25rem 0.4rem",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "bold" as const
                    };
                  }
                }

                // Cálculo do delta de posições
                const currentRank = index + 1;
                const previousIndex = previousRankedParticipants.findIndex(prev => prev.id === p.id);
                const previousRank = previousIndex !== -1 ? previousIndex + 1 : currentRank;
                const rankDelta = previousRank - currentRank;

                let deltaText = "";
                let deltaColor = "";
                if (rankDelta > 0) {
                  deltaText = `▲ ${rankDelta}`;
                  deltaColor = "#22c55e"; // verde
                } else if (rankDelta < 0) {
                  deltaText = `▼ ${Math.abs(rankDelta)}`;
                  deltaColor = "#ef4444"; // vermelho
                } else {
                  deltaText = "="; // manteve
                  deltaColor = "#60a5fa"; // azul
                }

                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.4rem 0.5rem",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.02)"
                    }}
                  >
                    {/* Coluna 1: Posição, Variação e Nickname */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", width: "42%" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          color: deltaColor,
                          minWidth: "32px",
                          display: "inline-block",
                          textAlign: "center",
                          background: "rgba(255, 255, 255, 0.03)",
                          borderRadius: "4px",
                          padding: "0.1rem 0.25rem",
                          border: `1px solid rgba(255, 255, 255, 0.05)`
                        }}
                      >
                        {deltaText}
                      </span>
                      <span style={{ fontWeight: "600", color: "#f8fafc", fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {currentRank}º {p.nickname}
                      </span>
                    </div>

                    {/* Coluna 2: Tabela de classificação basica (Pontos, Placares, Resultados) */}
                    <div style={{ width: "33%", fontSize: "0.8rem", color: "#cbd5e1", textAlign: "left", whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: "700", color: "var(--accent)" }}>{p.totalPoints} pts</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "0.4rem" }}>
                        ({p.exactHits}P | {p.resultHits}R)
                      </span>
                    </div>

                    {/* Coluna 3: Palpite e Pontos Obtidos */}
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "flex-end", width: "25%" }}>
                      <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>{scoreText}</span>
                      <span style={badgeStyle}>
                        {pointsGained > 0 ? `+${pointsGained}` : "0"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
