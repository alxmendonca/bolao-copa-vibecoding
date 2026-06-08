import type { StandingRow } from "../lib/standings";

type Props = {
  rows: StandingRow[];
};

export function StandingsTable({ rows }: Props) {
  return (
    <div className="standings-wrap">
      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Seleção</th>
            <th>Pts</th>
            <th className="col-hide-mobile">J</th>
            <th className="col-hide-mobile">V</th>
            <th className="col-hide-mobile">E</th>
            <th className="col-hide-mobile">D</th>
            <th className="col-hide-mobile">GP</th>
            <th className="col-hide-mobile">GC</th>
            <th>SG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.team.id}
              className={
                r.position <= 2 ? "standings-row--qualified" : undefined
              }
            >
              <td className="col-pos">{r.position}</td>
              <td className="col-team">{r.team.name}</td>
              <td className="col-pts">{r.points}</td>
              <td className="col-hide-mobile">{r.played}</td>
              <td className="col-hide-mobile">{r.wins}</td>
              <td className="col-hide-mobile">{r.draws}</td>
              <td className="col-hide-mobile">{r.losses}</td>
              <td className="col-hide-mobile">{r.goalsFor}</td>
              <td className="col-hide-mobile">{r.goalsAgainst}</td>
              <td className="col-sg">
                {r.goalDifference > 0 ? "+" : ""}
                {r.goalDifference}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="standings-legend">
        <span className="legend-dot" aria-hidden /> Destaque: as duas
        primeiras posições (na Copa 2026 também classificam 8 terceiros
        lugares — aqui o bolão só simula a tabela do grupo).
      </p>
    </div>
  );
}
