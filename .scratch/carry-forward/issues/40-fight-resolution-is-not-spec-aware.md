Status: open
Type: task
Origin: `phase-2/resolution-and-fallback` review fallout (domain D1), and user direction 2026-08-06
Blocks: none

# Fight resolution is not spec-aware: we can pick a fight the character played in another spec

`rankUpgrades` resolves a fight, reads its gear, and sims it against the
requested spec's preset and EP weights. Nothing checks that the character was
**playing that spec in that fight**.

`classifySpec` (`packages/core/src/spec.ts`) already derives spec from
`talentPointsByTree` plurality per §5.4 level 1, and `LoggedGear` already
carries the tree points. But nothing calls it on the resolution path:

```bash
grep -rn "classifySpec" --include=*.ts packages/core/src | grep -v dist
```

Today that returns only the export in `index.ts` and the definition itself.

## This is not hypothetical

Ticket 04 captured a report-events fixture for `slamaltman` — a ret paladin —
and drew his one **protection** night: talents `0/44/17`, 17,192 armour, a
shield in the off-hand. The pipeline scored that tank set with ret EP weights
and the ret P2 preset and produced a confident-looking ranking. Nothing
objected. It was caught by a human-directed domain review, not by the engine.

The fixture was fixed on that branch (see `docs/verification-log.md`,
2026-08-05) and a test now guards *that fixture*. The engine gap is untouched:
any character who tanks, heals or off-specs on some nights can still resolve
to the wrong fight and be silently simmed as something they were not.

## What the behaviour should be

Two halves, and the second is the one that needs a product decision.

**1. Detect and refuse to guess silently.** Classify the resolved fight's gear
and compare it to `RankInput.spec`. On a mismatch the run must not proceed as
if nothing happened. `RankErrorKind` has no member for this; a new kind
(`spec-mismatch`, say) is the honest shape, since the existing kinds fault the
character, the log, the sim or us, and this is none of those — the log is fine
and the character really did play that fight.

**2. Decide what happens next.** Three options, and the user has indicated the
preferred direction is a *choice*, not an assumption:

- **Ask the caller to pick.** Surface the candidate fights with the spec each
  one classifies to, and let the user select the intended spec. Then find a
  fight matching it. This is the stated preference and needs UI, so the CLI
  gets the interim form (list fights and their specs; a flag to pick one) and
  Phase 3 gets the real control.
- **Prefer a fight matching the requested spec.** `resolveFight` already
  prefers `ranked` over `report-events`; matching spec is a second preference
  key, and it fixes the common case without any UI. Worth doing regardless,
  because it makes the ask-the-user path rare.
- **Assume the last fight is their spec.** The user's stated fallback when no
  matching fight exists. This is only acceptable **if the tool is spec-aware
  enough to act on it** — i.e. it would have to sim the protection paladin *as
  protection*, with a prot preset and prot EP weights. That capability does not
  exist today (ret is the only shipped spec; feral is ticket 05), so this
  option is blocked on there being more than one spec to switch to.

The third option is the one that reframes this ticket: without spec-aware
simming, "assume their last fight is their spec" silently produces a wrong
answer. With it, it produces a right answer for a spec the user did not ask
about, which is a different and better failure. Either way the tool must say
which spec it simmed.

## Interaction with §5.4

Level 1 (talent plurality) is all that is needed for the paladin case and it is
already built. Level 2 (behavioural disambiguation, bear vs cat) is feral's
problem and is ticket 05's business — but note the two compose: a druid can
fail level 1 (wrong tree) *or* level 2 (right tree, wrong form), and the
resolution layer should treat both as the same class of "this fight is not the
spec you asked for".

`FightSummary.confidence` is the field §5.4 already designates for this and it
is currently decorative — `reportEventsOfflineRecordings` sets `0.5` and nothing
reads it. A spec-aware `findFights` is where it should start meaning something.

## Done when

- Something on the resolution path calls `classifySpec` on the resolved fight's
  gear and compares it to `RankInput.spec`.
- A mismatch does not silently produce a ranking. It either selects a
  better-matching fight, or fails with a kind that names the problem, or
  returns an answer that states which spec it actually simmed.
- `resolveFight` prefers a spec-matching fight, alongside its existing
  ranked-over-report-events preference.
- A test drives the real protection capture (report `mKTA9V7Lx4Ck2DXf`, which
  is worth keeping as a fixture precisely because it is the wrong spec) through
  `rankUpgrades` asking for `ret`, and asserts the engine does not return a
  ret-scored ranking for it.
- Whatever is decided for the "no matching fight" case is written down here
  before it is built.
