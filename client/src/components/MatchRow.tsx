import type { MatchDef } from "../data/groupStage";
import type { ScoreInput } from "../lib/standings";
import { validateScoreField } from "../lib/standings";

type Props = {
  match: MatchDef;
  score: ScoreInput;
  onChange: (matchId: string, field: "home" | "away", value: string) => void;
};

export function MatchRow({ match, score, onChange }: Props) {
  const homeOk = validateScoreField(score.home);
  const awayOk = validateScoreField(score.away);

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
            onChange={(e) => onChange(match.id, "home", e.target.value)}
            placeholder="—"
          />
          <span className="score-x">×</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className={`score-input${awayOk ? "" : " score-input--invalid"}`}
            aria-label={`Gols ${match.away.name}`}
            value={score.away}
            onChange={(e) => onChange(match.id, "away", e.target.value)}
            placeholder="—"
          />
        </div>
        <span className="team-name away">{match.away.name}</span>
      </div>
    </div>
  );
}
