Status: open
Type: task
Origin: `phase-2/resolution-and-fallback` review fallout (domain D1), and user direction 2026-08-06
Blocks: none
Blocked by: `LoggedGear` carries no class name — WCL `actors[].subType` has it (PLAN.md §5.1), unthreaded through the gear-source seam
Progress: `spec.ts` piece landed (see `## Progress 2026-08-06` below); resolution-path wiring in `rank.ts` / `seams/gear-source.ts` / fixtures is still open and out of this dispatch's file scope.

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

## Progress 2026-08-06

Reproduced the ticket's core claim before building on it:

```bash
grep -rn "classifySpec" --include=*.ts packages/core/src | grep -v dist
```

returned only the `index.ts` re-export and the definition in `spec.ts` —
confirmed, nothing on the resolution path called it. That claim survived.

This dispatch's slice was scoped to `packages/core/src/spec.ts` only (see
`.scratch/carry-forward/DELEGATION.md` and `DELEGATION-STATE.md` — wave 1,
file-disjoint fan-out; `rank.ts`, `seams/gear-source.ts` and the fixture
builders were other workers' files in the same working tree). What actually
shipped in this slice:

- `matchesRequestedSpec(classification: SpecClassification, requested: SpecId): SpecMatch`
  in `spec.ts`, exported from `index.ts`. It compares a `classifySpec` result
  against the spec a caller asked for and reports `{ matches: true, detected }`
  only when `classifySpec` landed on a *confirmed* spec equal to what was
  asked. `ambiguous`, `needs-form-uptime`, and `unsupported-spec` (the
  ticket's own protection-paladin case, talents `0/44/17`) all report
  `matches: false`, and `detected` is only ever populated with a spec
  `classifySpec` actually named — never inferred.
- Tests in `packages/core/test/spec.test.ts`, driven red-first against the
  pre-fix tree (the function did not exist; all five new cases failed with
  `matchesRequestedSpec is not a function`), including a case named directly
  after the ticket's report (`0/44/17` against a `ret` ask), and the
  needs-form-uptime / ambiguous / unsupported-spec non-match cases.
- `pnpm verify` was run from the shared working tree. `spec.ts`, `index.ts`,
  and `spec.test.ts` are lint-clean, format-clean, and their tests pass
  (`npx vitest run test/spec.test.ts` — 14/14). The full-repo `pnpm verify`
  run in this same tree also failed on `packages/core/scratch-repro.mjs`
  (untracked lint failure, not authored by this slice) and on
  `caps.test.ts` (`talentHitRatingFromString is not a function`, ticket 33's
  in-progress `caps.ts` work in the same shared tree) — neither touches
  `spec.ts` and neither is fixed here per the standing instruction not to
  edit another worker's file.

What did **not** ship, and is why this ticket stays open rather than closing:
the "Done when" list needs something on the *resolution path* — inside
`rankUpgrades`/`resolveFight` in `rank.ts` — to actually call
`matchesRequestedSpec`, plus a `RankErrorKind` member for the mismatch case,
plus `resolveFight` preferring a spec-matching fight, plus the integration
test that drives report `mKTA9V7Lx4Ck2DXf` through `rankUpgrades` asking for
`ret` and asserts no ret-scored ranking comes back. None of that is reachable
from `spec.ts` alone: `LoggedGear` (`seams/gear-source.ts`) does not carry a
class name today (WCL's `actors[].subType` has it; nothing threads it through
yet), so `rank.ts` cannot even call `classifySpec` without that plumbing
first. That's a real, separate gap, out of this slice's file scope — flagging
it rather than reaching into `gear-source.ts`/`rank.ts`/the fixture builders,
which other workers had open in this same tree.

The "no matching fight" product decision (§ "Decide what happens next") is
still unwritten — it needs the wiring above to exist before it's meaningfully
answerable, and it wasn't this slice's job to decide it unasked.
