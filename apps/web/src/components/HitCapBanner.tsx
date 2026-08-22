/**
 * The hit-cap banner (PLAN.md §12, §4 `CapState`) — above the list, never in
 * it. The cheapest guard against acting wrongly on a ranking that is entirely
 * correct: several hit-driven rows fill the same gap, and taking one shrinks
 * the others.
 */
import type { Ranking } from "@tbc-gear-prio/core";

export function HitCapBanner({ caps }: { caps: Ranking["caps"] }) {
  const { gap, capRating, rating, capUncertainty } = caps.hit;

  // Over or at the cap is not a warning; the banner exists for the under case.
  if (gap <= 0) return null;

  return (
    <div className="banner" role="note">
      You are {gap} rating under the {capRating} hit cap ({rating} now). Several
      of these fill the same gap — taking one will shrink the others.
      {capUncertainty > 0 && (
        <span className="muted">
          {" "}
          Cap is ±{capUncertainty} depending on assumptions.
        </span>
      )}
    </div>
  );
}
