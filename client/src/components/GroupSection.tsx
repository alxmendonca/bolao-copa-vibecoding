import type { GroupData } from "../data/groupStage";
import type { ScoreInput } from "../lib/standings";
import { computeGroupStandings } from "../lib/standings";
import { MatchRow } from "./MatchRow";
import { StandingsTable } from "./StandingsTable";

type Props = {
  group: GroupData;
  scores: Record<string, ScoreInput>;
  onScoreChange: (
    matchId: string,
    field: "home" | "away",
    value: string,
  ) => void;
};

export function GroupSection({ group, scores, onScoreChange }: Props) {
  const standings = computeGroupStandings(group.teams, group.matches, scores);

  return (
    <section className="group-section" aria-labelledby={`group-${group.letter}-title`}>
      <header className="group-header">
        <h2 id={`group-${group.letter}-title`} className="group-title">
          Grupo {group.letter}
        </h2>
      </header>

      <div className="group-grid">
        <div className="group-matches">
          <h3 className="subheading">Jogos</h3>
          <ul className="match-list">
            {group.matches.map((m) => (
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
        <div className="group-standings">
          <h3 className="subheading">Classificação</h3>
          <StandingsTable rows={standings} />
        </div>
      </div>
    </section>
  );
}
