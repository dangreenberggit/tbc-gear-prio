/**
 * The hit-cap banner (PLAN.md §12, §4 `CapState`) — above the list, never in
 * it. The cheapest guard against acting wrongly on a ranking that is entirely
 * correct: several hit-driven rows fill the same gap, and taking one shrinks
 * the others.
 *
 * The cap is stated as both a percentage and a rating because that is what
 * PLAN.md §12 asks for ("under the 9% hit cap") and because the two are not
 * interchangeable to a reader — 9% is the mechanic, the rating is what gear
 * is denominated in.
 *
 * `assumedRace` and `talentHitAssumed` are surfaced rather than left in the
 * assumptions drawer (verification-log R8): both are figures this app supplied
 * because a log does not carry them, and a reader who disagrees can only
 * override what they can see. The talent line especially — that hit is folded
 * in from the *preset's* build, not the logged character's (carry-forward 60)
 * — changes the gap the banner is quoting.
 */
import { HIT_CAP_PERCENT, type Ranking } from "@tbc-gear-prio/core";

/**
 * `Race` is the sim's own enum spelling (`RaceBloodElf`), which reads as a
 * type name in the middle of a sentence. Only the prefix is dropped — the
 * spelling is otherwise left alone so it still matches the assumptions drawer
 * and anything a reader greps for.
 */
function raceLabel(race: string): string {
  return race.replace(/^Race/, "");
}

export function HitCapBanner({ caps }: { caps: Ranking["caps"] }) {
  const { gap, capRating, rating, capUncertainty, assumedRace } = caps.hit;
  const talent = caps.hit.talentHitAssumed;

  // Over or at the cap is not a warning; the banner exists for the under case.
  if (gap <= 0) return null;

  const assumed = [
    assumedRace === undefined ? undefined : `you are ${raceLabel(assumedRace)}`,
    talent === undefined
      ? undefined
      : `${String(talent.points)}/${String(talent.maxPoints)} ${talent.talent}`,
  ].filter((part): part is string => part !== undefined);

  return (
    <div className="banner" role="note">
      You are {Math.round(gap)} rating under the {HIT_CAP_PERCENT}% hit cap (
      {Math.round(capRating)} rating; you have {Math.round(rating)}). Several of
      these fill the same gap — taking one will shrink the others.
      {assumed.length > 0 && (
        <span className="muted">
          {" "}
          Assumes {assumed.join(" and ")} — override either if that is wrong.
        </span>
      )}
      {capUncertainty > 0 && (
        <span className="muted">
          {" "}
          Cap is ±{Math.round(capUncertainty)} depending on assumptions.
        </span>
      )}
    </div>
  );
}
