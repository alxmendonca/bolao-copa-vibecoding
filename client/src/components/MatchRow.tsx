import { useRef } from "react";
import type { MatchDef } from "../data/groupStage";
import type { ScoreInput } from "../lib/standings";
import { validateScoreField } from "../lib/standings";
import { calculateMatchPoints, parseMatchDate } from "../lib/scoring";

type Props = {
  match: MatchDef;
  score: ScoreInput;
  onChange: (matchId: string, field: "home" | "away", value: string) => void;
  disabled?: boolean;
  officialScore?: ScoreInput;
  rules?: { exact: number; result: number };
};

function focusNextInput(current: HTMLInputElement): void {
  const inputs = document.querySelectorAll<HTMLInputElement>(".score-input:not(:disabled)");
  for (let i = 0; i < inputs.length - 1; i++) {
    if (inputs[i] === current) {
      inputs[i + 1].focus();
      return;
    }
  }
}

export function MatchRow({ match, score, onChange, disabled, officialScore, rules }: Props) {
  const awayRef = useRef<HTMLInputElement>(null);

  const homeOk = validateScoreField(score.home);
  const awayOk = validateScoreField(score.away);

  const handleHomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(match.id, "home", e.target.value);
    if (e.target.value.replace(/\D/g, "") && awayRef.current) {
      awayRef.current.focus();
    }
  };

  const handleAwayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(match.id, "away", e.target.value);
    if (e.target.value.replace(/\D/g, "")) {
      focusNextInput(e.currentTarget);
    }
  };

  // Calcula o status do palpite se houver resultado oficial e ambos os palpites estiverem preenchidos
  const hasOfficial = !!(
    officialScore &&
    officialScore.home.trim() !== "" &&
    officialScore.away.trim() !== ""
  );
  const hasPrediction = !!(
    score.home.trim() !== "" &&
    score.away.trim() !== ""
  );

  const now = new Date().getTime();
  const matchDate = match.scheduled ? parseMatchDate(match.scheduled) : 0;
  const isLive = match.scheduled
    ? matchDate < now && matchDate >= now - (2 * 60 + 20) * 60 * 1000 && !hasOfficial
    : false;

  let statusClass = "";
  let pointsLabel = "";

  if (hasOfficial && rules) {
    if (hasPrediction) {
      const points = calculateMatchPoints(
        score.home,
        score.away,
        officialScore.home,
        officialScore.away,
        rules,
      );

      if (points === rules.exact) {
        statusClass = " match-row--exact";
        pointsLabel = `+${points} pts (Acertou o Placar)`;
      } else if (points === rules.result) {
        statusClass = " match-row--difference";
        pointsLabel = `+${points} pts (Acertou o Resultado)`;
      } else {
        statusClass = " match-row--wrong";
        pointsLabel = "0 pts (Não Acertou)";
      }
    } else {
      statusClass = " match-row--wrong";
      pointsLabel = "0 pts (Sem Palpite)";
    }
  }

  const isStarted = match.scheduled ? matchDate < now : false;

  return (
    <div className={`match-row${statusClass}`}>
      {match.scheduled ? (
        <div className="match-meta" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>{match.scheduled}</span>
          {isLive ? (
            <span
              className="badge-live"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                color: "#f87171",
                padding: "0.1rem 0.4rem",
                borderRadius: "4px",
                fontSize: "0.65rem",
                fontWeight: "bold",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.2rem",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                textTransform: "none"
              }}
            >
              <span className="live-dot" style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }}></span>
              EM ANDAMENTO
            </span>
          ) : isStarted ? (
            <span
              className="badge-started"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--muted)",
                padding: "0.1rem 0.4rem",
                borderRadius: "4px",
                fontSize: "0.65rem",
                fontWeight: "bold",
                display: "inline-flex",
                alignItems: "center",
                border: "1px solid var(--border)",
                textTransform: "none"
              }}
            >
              🔒 Iniciado
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="match-teams">
        <span className="team-name home">{match.home.name}</span>
        <div className="score-inputs">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className={`score-input${homeOk ? "" : " score-input--invalid"}`}
            aria-label={`Gols ${match.home.name}`}
            value={score.home}
            onChange={handleHomeChange}
            placeholder="—"
            disabled={disabled || isStarted}
          />
          <span className="score-x">×</span>
          <input
            ref={awayRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className={`score-input${awayOk ? "" : " score-input--invalid"}`}
            aria-label={`Gols ${match.away.name}`}
            value={score.away}
            onChange={handleAwayChange}
            placeholder="—"
            disabled={disabled || isStarted}
          />
        </div>
        <span className="team-name away">{match.away.name}</span>
      </div>

      {hasOfficial && (
        <div className="match-official-result">
          <span className="official-badge">
            Placar Oficial: <strong>{officialScore!.home} × {officialScore!.away}</strong>
          </span>
          {pointsLabel && <span className="points-label">{pointsLabel}</span>}
        </div>
      )}
    </div>
  );
}
