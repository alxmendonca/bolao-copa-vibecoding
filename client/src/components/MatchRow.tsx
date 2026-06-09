import { useRef } from "react";
import type { MatchDef } from "../data/groupStage";
import type { ScoreInput } from "../lib/standings";
import { validateScoreField } from "../lib/standings";
import { calculateMatchPoints } from "../lib/scoring";

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

  return (
    <div className={`match-row${statusClass}`}>
      {match.scheduled ? (
        <div className="match-meta">{match.scheduled}</div>
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
            disabled={disabled}
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
            disabled={disabled}
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
