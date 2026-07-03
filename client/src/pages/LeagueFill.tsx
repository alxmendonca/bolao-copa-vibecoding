import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { GROUPS } from "../data/groupStage";
import { GroupSection } from "../components/GroupSection";
import { MatchRow } from "../components/MatchRow";
import {
  getLeague,
  joinLeague,
  isSubmissionDeadlinePassed,
  getExpiryDate,
  getLeagueMatches,
  isFirebaseConfigured,
  type League,
} from "../lib/firebaseService";
import { hashPassword } from "../lib/hash";
import type { ScoreInput } from "../lib/standings";



function sanitizeScoreInput(value: string): string {
  return value.replace(/\D/g, "");
}

export default function LeagueFill() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();

  const [league, setLeague] = useState<League | null>(null);
  const [loadingLeague, setLoadingLeague] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Campos de Inscrição
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [scores, setScores] = useState<Record<string, ScoreInput>>({});

  const [submitting, setSubmitting] = useState(false);

  const [deadlinePassed, setDeadlinePassed] = useState(false);

  useEffect(() => {
    if (!leagueId) return;

    const loadLeague = async () => {
      try {
        const l = await getLeague(leagueId);
        const isPassed = await isSubmissionDeadlinePassed(l.isKnockout, l.phase);
        setLeague(l);
        setDeadlinePassed(isPassed);

        // Inicializa placares vazios baseados na fase da liga
        const matches = getLeagueMatches(l.phase);
        const initialScores: Record<string, ScoreInput> = {};
        for (const m of matches) {
          initialScores[m.id] = { home: "", away: "" };
        }
        setScores(initialScores);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar dados da liga.");
      } finally {
        setLoadingLeague(false);
      }
    };

    loadLeague();
  }, [leagueId]);

  useEffect(() => {
    if (league?.name) {
      document.title = `Palpites: ${league.name} — Bolão Copa 2026`;
    }
  }, [league]);

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

  const leagueMatches = useMemo(() => {
    return getLeagueMatches(league?.phase);
  }, [league]);

  const filledCount = useMemo(() => {
    let n = 0;
    for (const m of leagueMatches) {
      const s = scores[m.id];
      if (s?.home.trim() !== "" && s?.away.trim() !== "") n += 1;
    }
    return n;
  }, [scores, leagueMatches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (deadlinePassed) {
      const deadline = await getExpiryDate(league?.isKnockout, league?.phase);
      const formatted = deadline.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      setError(`O prazo de inscrições para esta liga expirou (${formatted} BRT).`);
      return;
    }

    if (!fullName.trim() || !nickname.trim() || !password.trim()) {
      setError("Por favor, preencha todos os dados cadastrais (Nome, Apelido e Senha).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (filledCount < leagueMatches.length) {
      if (
        !window.confirm(
          `Você preencheu ${filledCount} de ${leagueMatches.length} palpites. Deseja salvar mesmo assim? Poderá editar os palpites restantes depois (antes do prazo).`,
        )
      ) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const hashed = await hashPassword(password);
      const participantId = await joinLeague(
        leagueId!,
        fullName,
        nickname,
        hashed,
        scores,
      );
      // Redireciona para a tela do participante
      navigate(`/league/${leagueId}/${participantId}`);
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao enviar os palpites.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingLeague) {
    return (
      <div className="main" style={{ textAlign: "center", padding: "4rem 0" }}>
        <p>Carregando dados da liga...</p>
      </div>
    );
  }

  if (error && !league) {
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
    <div className="fill-page-wrap">
      <header className="hero">
        <div className="hero-inner">
          <p className="hero-kicker">Participar da Liga: {league?.name}</p>
          <h1 className="hero-title">Cadastrar Palpites</h1>
          <p className="hero-sub">
            Preencha seus dados de participante e insira os placares desejados abaixo. Você pode editar seus palpites usando sua senha até o início da Copa.
          </p>
          <div className="hero-actions">
            <Link to={`/league/${leagueId}`} className="btn btn-ghost">
              Voltar para a Liga
            </Link>
            <span className="hero-meta">
              {filledCount}/{leagueMatches.length} jogos preenchidos
            </span>
          </div>
        </div>
      </header>

      {/* Barra de Progresso Sticky */}
      <div
        className="sticky-progress"
        role="status"
        aria-live="polite"
        aria-label={`${filledCount} de ${leagueMatches.length} jogos preenchidos`}
      >
        <div className="sticky-progress-inner">
          <span className="sticky-progress-count">
            {filledCount}/{leagueMatches.length}
          </span>
          <span className="sticky-progress-label">jogos preenchidos</span>
          <div
            className="sticky-progress-bar"
            aria-hidden
            style={{
              ["--progress" as string]: `${(filledCount / leagueMatches.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="main" style={{ paddingTop: "1.5rem" }}>
        {!isFirebaseConfigured && (
          <div className="alert-box alert-box--warning">
            <strong>ℹ️ Modo de Teste Local Ativo:</strong>
            <p>O Firebase não está configurado. Seus palpites serão salvos apenas localmente (LocalStorage).</p>
          </div>
        )}

        {deadlinePassed ? (
          <div className="alert-box alert-box--error" style={{ marginBottom: "2rem" }}>
            <strong>🔒 Inscrições Encerradas:</strong>
            <p>
              O prazo para envio de novos palpites foi encerrado em{" "}
              {league?.isKnockout ? "28 de Junho às 16:00 BRT" : "11 de Junho às 14:00 BRT"}.
            </p>
            <Link to={`/league/${leagueId}`} className="btn btn-primary" style={{ marginTop: "1rem", alignSelf: "flex-start", textDecoration: "none" }}>
              Ver Classificação da Liga
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert-box alert-box--error" style={{ marginBottom: "2rem" }}>
                <strong>Erro:</strong>
                <p>{error}</p>
              </div>
            )}

            {/* Painel do Participante */}
            <div className="form-card" style={{ maxWidth: "100%", margin: "0 0 2.5rem 0", padding: "1.5rem" }}>
              <h3 style={{ margin: "0 0 1rem 0" }}>Dados de Inscrição</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="full-name">Nome Completo *</label>
                  <input
                    id="full-name"
                    type="text"
                    placeholder="Seu nome completo"
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="nickname">Apelido (Classificação) *</label>
                  <input
                    id="nickname"
                    type="text"
                    placeholder="Como aparecerá na tabela"
                    className="form-input"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="pass">Senha de Edição *</label>
                  <input
                    id="pass"
                    type="password"
                    placeholder="Senha secreta para alterar depois"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <p className="form-helper" style={{ marginTop: "0.5rem" }}>
                Guarde sua senha! Ela será exigida caso você decida editar seus palpites antes do fechamento do bolão.
              </p>
            </div>

            {/* Grid de Palpites */}
            {league?.isKnockout ? (
              <div className="form-card" style={{ maxWidth: "100%", margin: "0 0 2.5rem 0", padding: "1.5rem" }}>
                <h3 style={{ margin: "0 0 1.5rem 0" }}>Jogos de Mata-Mata</h3>
                <ul className="match-list">
                  {leagueMatches.map((m) => (
                    <li key={m.id}>
                      <MatchRow
                        match={m}
                        score={scores[m.id] ?? { home: "", away: "" }}
                        onChange={onScoreChange}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
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
            )}

            <div
              style={{
                marginTop: "2.5rem",
                padding: "2rem 1.5rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                textAlign: "center",
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem" }}>Tudo Pronto?</h3>
              <p style={{ color: "var(--muted)", margin: "0 0 1.5rem" }}>
                Você preencheu <strong>{filledCount} de {leagueMatches.length}</strong> palpites.
              </p>
              <button
                type="submit"
                className="btn btn-primary btn-block-mobile"
                style={{ height: "3rem", minWidth: "200px" }}
                disabled={submitting}
              >
                {submitting ? "Enviando Palpites..." : "Salvar Inscrição e Palpites"}
              </button>
            </div>
          </form>
        )}
      </div>

      <aside className="mobile-dock" aria-label="Atalhos">
        <div className="mobile-dock-progress">
          <strong>{filledCount}/{leagueMatches.length}</strong>
          <span>jogos</span>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-dock"
          onClick={handleSubmit}
          disabled={submitting}
        >
          Salvar
        </button>
      </aside>
    </div>
  );
}
