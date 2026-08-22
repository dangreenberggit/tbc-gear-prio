/**
 * The assumptions drawer (PLAN.md §12): one click away, never in the way.
 *
 * Everything a reader needs to audit the number — which fight answered and by
 * which route, the preset, seeds, iterations, sim version, content hash, and
 * every substitution the run had to make.
 */
import type { Ranking } from "@tbc-gear-prio/core";

function wclUrl(reportCode: string, fightId: number): string {
  return `https://www.warcraftlogs.com/reports/${reportCode}#fight=${String(fightId)}`;
}

export function AssumptionsDrawer({
  ranking,
  simVersion,
}: {
  ranking: Ranking;
  simVersion: string;
}) {
  const { fight, assumptions, substitutions, contentHash } = ranking;

  return (
    <details className="drawer">
      <summary>Assumptions</summary>
      <dl>
        <dt>Fight</dt>
        <dd>
          {fight.encounterName ?? "unnamed encounter"} &middot; resolved by{" "}
          {fight.route}
          {fight.killedAt !== undefined && ` · ${fight.killedAt}`}
          {" · "}
          <a
            href={wclUrl(fight.reportCode, fight.fightId)}
            target="_blank"
            rel="noreferrer noopener"
          >
            WCL report
          </a>
        </dd>

        <dt>Preset</dt>
        <dd>
          {assumptions.presetId} &middot; phase {assumptions.maxPhase} &middot;{" "}
          {assumptions.race}
        </dd>

        <dt>Seeds</dt>
        <dd>{assumptions.seeds.join(", ")}</dd>

        <dt>Iterations</dt>
        <dd>{assumptions.iterations.toLocaleString()}</dd>

        <dt>Sim version</dt>
        <dd>{simVersion}</dd>

        <dt>Content hash</dt>
        <dd>
          <code>{contentHash}</code>
        </dd>

        <dt>Standing</dt>
        <dd>
          <ul>
            {assumptions.standing.map((s) => (
              <li key={s.id}>{s.detail}</li>
            ))}
          </ul>
        </dd>

        <dt>Substitutions</dt>
        <dd>
          {substitutions.length === 0 ? (
            <span className="muted">none</span>
          ) : (
            <ul>
              {substitutions.map((s) => (
                <li key={`${s.field}:${s.detail}`}>
                  <strong>{s.field}</strong> — {s.detail}
                </li>
              ))}
            </ul>
          )}
        </dd>
      </dl>
    </details>
  );
}
