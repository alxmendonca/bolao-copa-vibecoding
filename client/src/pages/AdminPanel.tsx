import { useCallback, useEffect, useMemo, useState } from "react";
import { ALL_MATCHES, GROUPS } from "../data/groupStage";
import {
  KNOCKOUT_MATCHES,
  OITAVAS_MATCHES,
  QUARTAS_MATCHES,
  SEMI_MATCHES,
  FINAL_MATCHES,
} from "../data/knockoutStage";
import { GroupSection } from "../components/GroupSection";
import { MatchRow } from "../components/MatchRow";
import {
  getOfficialResults,
  updateOfficialResults,
  isFirebaseConfigured,
} from "../lib/firebaseService";
import type { ScoreInput } from "../lib/standings";

const SESSION_KEY = "bolao_admin_session_key";

const TOTAL_MATCHES = [
  ...ALL_MATCHES,
  ...KNOCKOUT_MATCHES,
  ...OITAVAS_MATCHES,
  ...QUARTAS_MATCHES,
  ...SEMI_MATCHES,
  ...FINAL_MATCHES,
];

function emptyScores(): Record<string, ScoreInput> {
  const o: Record<string, ScoreInput> = {};
  for (const m of TOTAL_MATCHES) {
    o[m.id] = { home: "", away: "" };
  }
  return o;
}

function mergeStoredScores(
  stored: Record<string, ScoreInput> | undefined,
): Record<string, ScoreInput> {
  const base = emptyScores();
  if (!stored) return base;
  for (const m of TOTAL_MATCHES) {
    const s = stored[m.id];
    if (s && typeof s.home === "string" && typeof s.away === "string") {
      base[m.id] = { home: s.home, away: s.away };
    }
  }
  return base;
}

export default function AdminPanel() {
  const [adminKey, setAdminKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [scores, setScores] = useState<Record<string, ScoreInput>>(emptyScores);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Painel do Administrador — Bolão Copa 2026";
  }, []);

  // Verifica se já existe chave na sessão ao carregar
  useEffect(() => {
    const storedKey = sessionStorage.getItem(SESSION_KEY);
    const expectedKey = import.meta.env.VITE_ADMIN_KEY || "admin12345admin12345admin";

    if (storedKey && storedKey.trim() === expectedKey.trim()) {
      setAdminKey(storedKey);
      setIsAuthenticated(true);
      loadOfficialScores();
    }
  }, []);

  const loadOfficialScores = async () => {
    setLoading(true);
    try {
      const results = await getOfficialResults();
      setScores(mergeStoredScores(results.scores));
    } catch (err: any) {
      setError(err.message || "Erro ao carregar os resultados oficiais.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const expectedKey = import.meta.env.VITE_ADMIN_KEY || "admin12345admin12345admin";
    if (adminKey.trim() === expectedKey.trim()) {
      sessionStorage.setItem(SESSION_KEY, adminKey.trim());
      setIsAuthenticated(true);
      loadOfficialScores();
    } else {
      setAuthError("Chave administrativa incorreta!");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setAdminKey("");
    setScores(emptyScores());
  };

  const onScoreChange = useCallback(
    (matchId: string, field: "home" | "away", value: string) => {
      const next = value.replace(/\D/g, "");
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateOfficialResults(adminKey, scores);
      setSuccess("Resultados oficiais salvos com sucesso! As classificações foram recalculadas.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Erro ao salvar os resultados oficiais.");
    } finally {
      setSaving(false);
    }
  };

  const filledCount = useMemo(() => {
    let n = 0;
    for (const m of TOTAL_MATCHES) {
      const s = scores[m.id];
      if (s?.home.trim() !== "" && s?.away.trim() !== "") n += 1;
    }
    return n;
  }, [scores]);

  // Se não estiver autenticado, exibe formulário de Login
  if (!isAuthenticated) {
    return (
      <div className="main">
        <div className="form-card" style={{ maxWidth: "450px", marginTop: "4rem" }}>
          <form onSubmit={handleLogin}>
            <h1 className="form-card-title" style={{ textAlign: "center" }}>Painel de Administração</h1>
            <p className="form-card-sub" style={{ textAlign: "center" }}>
              Área administrativa para lançamento dos resultados oficiais da Copa do Mundo.
            </p>

            {authError && (
              <div className="alert-box alert-box--error">
                <p>{authError}</p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="admin-key">Chave de Admin (25 caracteres)</label>
              <input
                id="admin-key"
                type="password"
                placeholder="Insira a chave administrativa"
                className="form-input"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", height: "3rem", marginTop: "1rem" }}
            >
              Acessar Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-wrap">
      <header className="hero">
        <div className="hero-inner">
          <p className="hero-kicker">Administração de Resultados Oficiais</p>
          <h1 className="hero-title">Resultados da Copa 2026</h1>
          <p className="hero-sub">
            Insira os placares oficiais das partidas à medida que forem jogadas. A tabela de pontuação e ranking de todas as ligas atualizará instantaneamente.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar Resultados"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              Sair do Painel
            </button>
            <span className="hero-meta">
              {filledCount}/{TOTAL_MATCHES.length} jogos com resultado oficial
            </span>
          </div>
        </div>
      </header>

      {/* Barra de Progresso Sticky */}
      <div
        className="sticky-progress"
        role="status"
        aria-live="polite"
        aria-label={`${filledCount} de ${TOTAL_MATCHES.length} jogos preenchidos`}
        style={{ display: "block" }}
      >
        <div className="sticky-progress-inner">
          <span className="sticky-progress-count">
            {filledCount}/{TOTAL_MATCHES.length}
          </span>
          <span className="sticky-progress-label">resultados oficiais lançados</span>
          <div
            className="sticky-progress-bar"
            aria-hidden
            style={{
              ["--progress" as string]: `${(filledCount / TOTAL_MATCHES.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="main" style={{ paddingTop: "1.5rem" }}>
        {!isFirebaseConfigured && (
          <div className="alert-box alert-box--warning">
            <strong>ℹ️ Modo de Teste Local Ativo:</strong>
            <p>Seus resultados serão salvos localmente e afetarão apenas as ligas salvas localmente neste navegador.</p>
          </div>
        )}

        {success && (
          <div className="alert-box alert-box--success">
            <strong>Sucesso:</strong>
            <p>{success}</p>
          </div>
        )}

        {error && (
          <div className="alert-box alert-box--error">
            <strong>Erro:</strong>
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            Carregando resultados oficiais salvos...
          </div>
        ) : (
          <div className="groups-stack">
            {/* Seção Mata-Mata */}
            <div className="form-card" style={{ maxWidth: "100%", margin: "0 0 2.5rem 0", padding: "1.5rem" }}>
              <h2 style={{ margin: "0 0 1.5rem 0" }}>Mata-Mata (16-avos de final)</h2>
              <ul className="match-list">
                {KNOCKOUT_MATCHES.map((m) => (
                  <li key={m.id}>
                    <MatchRow
                      match={m}
                      score={scores[m.id] ?? { home: "", away: "" }}
                      onChange={onScoreChange}
                      isAdmin={true}
                    />
                  </li>
                ))}
              </ul>

              <h2 style={{ margin: "2.5rem 0 1.5rem 0" }}>Mata-Mata (Oitavas de final)</h2>
              <ul className="match-list">
                {OITAVAS_MATCHES.map((m) => (
                  <li key={m.id}>
                    <MatchRow
                      match={m}
                      score={scores[m.id] ?? { home: "", away: "" }}
                      onChange={onScoreChange}
                      isAdmin={true}
                    />
                  </li>
                ))}
              </ul>

              <h2 style={{ margin: "2.5rem 0 1.5rem 0" }}>Mata-Mata (Quartas de final)</h2>
              <ul className="match-list">
                {QUARTAS_MATCHES.map((m) => (
                  <li key={m.id}>
                    <MatchRow
                      match={m}
                      score={scores[m.id] ?? { home: "", away: "" }}
                      onChange={onScoreChange}
                      isAdmin={true}
                    />
                  </li>
                ))}
              </ul>

              <h2 style={{ margin: "2.5rem 0 1.5rem 0" }}>Mata-Mata (Semifinais)</h2>
              <ul className="match-list">
                {SEMI_MATCHES.map((m) => (
                  <li key={m.id}>
                    <MatchRow
                      match={m}
                      score={scores[m.id] ?? { home: "", away: "" }}
                      onChange={onScoreChange}
                      isAdmin={true}
                    />
                  </li>
                ))}
              </ul>

              <h2 style={{ margin: "2.5rem 0 1.5rem 0" }}>Mata-Mata (Final e 3º Lugar)</h2>
              <ul className="match-list">
                {FINAL_MATCHES.map((m) => (
                  <li key={m.id}>
                    <MatchRow
                      match={m}
                      score={scores[m.id] ?? { home: "", away: "" }}
                      onChange={onScoreChange}
                      isAdmin={true}
                    />
                  </li>
                ))}
              </ul>
            </div>

            {/* Seção Fase de Grupos */}
            <h2 style={{ margin: "2rem 0 1rem 0" }}>Fase de Grupos (Fase Encerrada - Travado)</h2>
            {GROUPS.map((g) => (
              <GroupSection
                key={g.letter}
                group={g}
                scores={scores}
                onScoreChange={onScoreChange}
                isAdmin={true}
                disabled={true}
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
          <h3 style={{ margin: "0 0 0.5rem" }}>Confirmar Resultados?</h3>
          <p style={{ color: "var(--muted)", margin: "0 0 1.5rem" }}>
            Você preencheu <strong>{filledCount} de {TOTAL_MATCHES.length}</strong> resultados.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block-mobile"
            style={{ height: "3rem", minWidth: "200px" }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Confirmar Resultados"}
          </button>
        </div>
      </div>

      <aside className="mobile-dock" aria-label="Atalhos">
        <div className="mobile-dock-progress">
          <strong>{filledCount}/{TOTAL_MATCHES.length}</strong>
          <span>oficiais</span>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-dock"
          onClick={handleSave}
          disabled={saving}
        >
          Confirmar
        </button>
      </aside>
    </div>
  );
}
