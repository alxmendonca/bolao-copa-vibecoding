import { useRef } from "react";
import type { MatchDef } from "../data/groupStage";
import type { ScoreInput } from "../lib/standings";
import { validateScoreField } from "../lib/standings";

type Props = {
  match: MatchDef;
  score: ScoreInput;
  onChange: (matchId: string, field: "home" | "away", value: string) => void;
};

function focusNextInput(current: HTMLInputElement): void {
  const inputs = document.querySelectorAll<HTMLInputElement>(".score-input");
  for (let i = 0; i < inputs.length - 1; i++) {
    if (inputs[i] === current) {
      inputs[i + 1].focus();
      return;
    }
  }
}

export function MatchRow({ match, score, onChange }: Props) {
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

  return (
    <div className="match-row">
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
          />
        </div>
        <span className="team-name away">{match.away.name}</span>
      </div>
    </div>
  );
}
