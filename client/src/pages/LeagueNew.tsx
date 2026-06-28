import { useState } from "react";
import { Link } from "react-router-dom";
import { createLeague, isFirebaseConfigured } from "../lib/firebaseService";

export default function LeagueNew() {
  const [name, setName] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [creatorEmail, setCreatorEmail] = useState("");
  const [exact, setExact] = useState(25);
  const [result, setResult] = useState(10);
  const [creatorCode, setCreatorCode] = useState("");
  const [phase, setPhase] = useState("16-avos");
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        alert("A imagem selecionada é muito grande! Escolha uma imagem de até 500KB.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoBase64(base64String);
        setLogoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!name.trim() || !creatorName.trim() || !creatorEmail.trim() || !creatorCode.trim()) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      setLoading(false);
      return;
    }

    if (exact <= 0 || result <= 0) {
      setError("As pontuações configuradas devem ser maiores que zero.");
      setLoading(false);
      return;
    }

    if (exact <= result) {
      setError("A pontuação de Acertar o Placar deve ser maior que a de Acertar o Resultado.");
      setLoading(false);
      return;
    }

    try {
      const rules = { exact, result };
      const leagueId = await createLeague(
        name,
        creatorName,
        creatorEmail,
        rules,
        creatorCode,
        phase,
        logoBase64 || undefined,
      );

      const path = `/league/${leagueId}`;
      const fullUrl = `${window.location.origin}${path}`;
      setSuccessLink(fullUrl);
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao criar a liga.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (successLink) {
      navigator.clipboard.writeText(successLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="main">
      <div className="form-card">
        {!isFirebaseConfigured && (
          <div className="alert-box alert-box--warning">
            <strong>ℹ️ Modo de Teste Local Ativo:</strong>
            <p>
              O Firebase não está configurado nas variáveis de ambiente. A liga será criada localmente e persistida no seu navegador.
            </p>
          </div>
        )}

        {successLink ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div className="alert-box alert-box--success" style={{ marginBottom: "1.5rem" }}>
              <strong>🎉 Liga Criada com Sucesso!</strong>
              <p>Sua liga online e persistente está pronta. Compartilhe o link abaixo com os participantes para receber os palpites.</p>
            </div>

            <div className="form-group" style={{ marginTop: "1.5rem" }}>
              <label className="form-label">Link Público da Liga</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  readOnly
                  value={successLink}
                  className="form-input"
                  style={{ flex: 1, textOverflow: "ellipsis" }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button type="button" className="btn btn-primary" onClick={handleCopy}>
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>

            <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center", gap: "1rem" }}>
              <Link to={successLink.replace(window.location.origin, "")} className="btn btn-primary">
                Acessar Dashboard da Liga
              </Link>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSuccessLink(null);
                  setName("");
                  setCreatorCode("");
                }}
              >
                Criar Outra Liga
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="form-card-title">Criar Nova Liga</h1>
            <p className="form-card-sub">
              Crie uma liga isolada para juntar os amigos e calcular a pontuação automaticamente.
            </p>

            {error && (
              <div className="alert-box alert-box--error">
                <strong>Erro:</strong>
                <p>{error}</p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="league-name">
                Nome da Liga *
              </label>
              <input
                id="league-name"
                type="text"
                placeholder="Ex: Bolão da Firma 2026"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="league-phase">
                Fase do Bolão *
              </label>
              <select
                id="league-phase"
                className="form-input"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                required
              >
                <option value="grupos" disabled>Fase de Grupos (Já passou)</option>
                <option value="16-avos">16-avos de Final (Disponível)</option>
                <option value="oitavas" disabled>Oitavas de Final (Ainda sem times definidos)</option>
                <option value="quartas" disabled>Quartas de Final (Ainda sem times definidos)</option>
                <option value="semi" disabled>Semifinais (Ainda sem times definidos)</option>
                <option value="final" disabled>Final (Ainda sem times definidos)</option>
              </select>
              <p className="form-helper" style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                Cada liga serve apenas para uma única fase. No momento, apenas os 16-avos estão disponíveis.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="league-logo">
                Logo/Imagem da Liga (Opcional)
              </label>
              <input
                id="league-logo"
                type="file"
                accept="image/*"
                className="form-input"
                onChange={handleImageChange}
                style={{ padding: "0.5rem" }}
              />
              <p className="form-helper" style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                Escolha uma imagem para personalizar o cabeçalho da sua liga.
              </p>
              {logoPreview && (
                <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <img
                    src={logoPreview}
                    alt="Pré-visualização"
                    style={{
                      maxHeight: "140px",
                      maxWidth: "200px",
                      width: "auto",
                      height: "auto",
                      objectFit: "contain",
                      borderRadius: "8px",
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: "0.4rem 0.8rem", height: "auto", fontSize: "0.8rem" }}
                    onClick={() => {
                      setLogoBase64(null);
                      setLogoPreview(null);
                      const fileInput = document.getElementById("league-logo") as HTMLInputElement;
                      if (fileInput) fileInput.value = "";
                    }}
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="creator-name">
                Nome do Criador/Organizador *
              </label>
              <input
                id="creator-name"
                type="text"
                placeholder="Seu nome"
                className="form-input"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="creator-email">
                E-mail do Criador *
              </label>
              <input
                id="creator-email"
                type="email"
                placeholder="seuemail@exemplo.com"
                className="form-input"
                value={creatorEmail}
                onChange={(e) => setCreatorEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Regras de Pontuação *</label>
              <p className="form-helper" style={{ margin: "0 0 0.5rem" }}>
                Defina o peso em pontos para cada nível de acerto nos placares.
              </p>
              <div className="form-rules-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label
                    className="form-label"
                    style={{ fontSize: "0.75rem" }}
                    data-tooltip="Acertou o número exato de gols da partida (ex: palpite 2x1, placar oficial 2x1)."
                  >
                    Acertar o Placar (Exato) <span>ℹ️</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={exact}
                    onChange={(e) => setExact(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label
                    className="form-label"
                    style={{ fontSize: "0.75rem" }}
                    data-tooltip="Errou o placar exato, mas acertou o vencedor ou o empate (ex: palpite 3x1, placar oficial 1x0)."
                  >
                    Acertar o Resultado (Vencedor/Empate) <span>ℹ️</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={result}
                    onChange={(e) => setResult(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="creator-code">
                Código de Criador *
              </label>
              <input
                id="creator-code"
                type="password"
                placeholder="Código de segurança para criar ligas"
                className="form-input"
                value={creatorCode}
                onChange={(e) => setCreatorCode(e.target.value)}
                required
              />
              <span className="form-helper">
                Insira o código definido em VITE_CREATOR_CODE para permitir a criação.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block-mobile"
              style={{ marginTop: "1.5rem", width: "100%", height: "3rem" }}
              disabled={loading}
            >
              {loading ? "Criando Liga..." : "Criar Liga Online"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
