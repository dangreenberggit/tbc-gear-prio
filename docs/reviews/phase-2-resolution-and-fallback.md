# Pre-merge review — phase-2/resolution-and-fallback

Diffed against: `13a8df9...HEAD` (18a7c4d at time of writing)

Scope note: the branch sits on `phase-2/trust`, so `dev...HEAD` spans tickets
01–03 as well, each already reviewed on its own branch. This review is pinned to
`13a8df9`, the tip before ticket 04's first commit, so it covers ticket 04 only.

**Dispatch.** `codex` is not on `PATH`, so all three axes ran as fresh subagents
on the sharp lane (Opus, effort `medium`), per `docs/agents/model-policy.md`.
The first adversarial and domain dispatches died on a session limit before
producing findings; both were retried once on the same sharp class and
completed, which is the wall procedure rather than a downgrade.

---

## Adversarial

Six findings, two of them blocking and linked.

**A1 — `deltaDps` and `se` came from different measurements. CONFIRMED.**
`deltaDps` was fixed at the `seeds[0]` run while `se` was `sd/√n` over deltas
from all five seeds. The reported point estimate was one draw and its error bar
described the spread of five, whose mean was never used — a plausible-looking
DPS with a confidence interval centred somewhere else. The test fixture hid it:
gains of 40/44/36/50/30 average to exactly 40, which is also seed 11's draw, so
`deltaDps: firstSeedDraw` and `deltaDps: mean(deltas)` were numerically
identical and the assertion passed either way.

**A2 — ranks were assigned before replication and never re-sorted. CONFIRMED.**
`ranked.sort(...)` then rank numbers then `replicateTopItems`. Ordering survived
only because A1 left `deltaDps` untouched; fixing A1 alone would have left rows
printing out of order with stale `rank` values. One linked fix with A1.

**A3 — below-cutoff rows could consume top-8 slots. CONFIRMED.**
`ranked.slice(0, 8)` was positional over the whole sorted list. A character
whose best upgrade is under the 3.4 DPS cutoff spent the entire 5× budget on
rows that print as `(below cutoff)` and are hidden by the new default CLI
output — 45 sims for numbers nobody sees, against §10's stated purpose of
separating the contested top of the _shortlist_.

**A4 — replication sims were invisible to progress. CONFIRMED.**
`totalSims = 1 + candidates.length` ignored up to 45 further sims, so a progress
bar reached "done" and then stalled. `contentHash` does cover `seeds`, so
caching was sound; the accounting was not.

**A5 — test theatre in the pairing test. CONFIRMED.**
"sims each replicated candidate against a baseline sharing its seed" identified
the baseline as `neckId !== 29381`, which also matches the eight other pool
candidates. The assertion would have passed if the baseline were never re-simmed
at all, so long as some other candidate ran. The property the test named was not
the property it checked.

**A6 — `pairedReplicateSe` throws a bare `Error`.** Currently unreachable
(guarded by `usesPairedReplication`), and the catch-all files it as `internal`
anyway — right by luck rather than design. Left as is.

**Checked and cleared, not defects:** the `winningRequests` Map keyed by
`itemId` (zero duplicate itemIds across all four universes; paired slots
collapse to one entry per pool row), `contentHash` covering `seeds`, and
`resolveFight` labelling a caller-named unknown fight `report-events` rather
than `ranked`.

---

## Domain

Four findings. The first two are the same defect and were gate-blocking.

**D1 + D2 — the fixture was a protection paladin set, labelled ret. CONFIRMED.**
The captured report `mKTA9V7Lx4Ck2DXf` (Magtheridon) is slamaltman's one
**protection** night: talents `0/44/17`, 17,192 armour, 176 strength, and a
shield (`28606`) in the off-hand where the ranked ret fixture has `id: 0`. Every
downstream number was ret EP weights and the ret P2 preset applied to a tank
set, and the gate box was closed against it.

Nothing objected because `report-events-offline.ts` hardcoded ret's `[5, 11, 45]`
on the stated claim that `wcl_probe.py --raw-out` does not persist tree points.
It does — the raw payload carries `talents` verbatim — so the claim in the
comment was false and the fixture asserted a build its own payload contradicted.
The only visible symptom was a 758.98 baseline against the ranked fixture's
2003.26, which reads as "different report, different gear" until the items are
resolved.

Re-captured from `VGjFb3mtX9xHgyav` (Hydross, a ret fight: `5/11/45`, no
off-hand, Lionheart Executioner). The fallback baseline is now **2003.26**,
identical to the ranked fixture, which is the right answer for the same
character's same gear. Checking all eight recent reports, Magtheridon was the
only non-ret one — the first capture drew the single bad report by chance.

**D3 — `probe_ranked_route.py` overclaimed. CONFIRMED.**
Parts 1 and 2 do not join: a report's fight carries `encounterID` in a prefixed
namespace (Hydross is `100623` in the committed fixtures) while
`encounterRankings` takes the unprefixed `623`. "Ten kills on encounters with
zero ranks" is a conclusion the reader draws across both, not one the script
establishes. The control in part 3 is what carries it, so the verification log's
finding stands; the docstring now states the scope limit.

**D4 — `killedAt: ""` was a fabricated absence. CONFIRMED, minor.**
Nothing consumes it today, but an empty string is indistinguishable from a real
value that failed to format.

**Checked and cleared:** the ranked-vs-report-events reading of "no ranked
kills" (sound, and the controlled probe design is the right shape); a
`kill: true` fight as a report-events fixture (coherent — the route is about how
the fight was reached, not whether the boss died); R17's 19→17 reconciliation on
the new capture (holds; indices 3 and 18 are the shirt and tabard as predicted);
`confidence: 0.5` as a §5.4 extension (defensible, currently decorative);
and sample `n-1` sd for §10 (correct — five seeds are a sample of the seed
space). One caveat recorded rather than fixed: an SE from five points is itself
noisy, so the reported figure should not be over-read as a tight interval.

---

## Standards + Spec

Run through the `code-review` skill, both axes in parallel.

### Standards

**S1 — comment policy, the dominant issue.** AGENTS.md § Comment policy is
"load-bearing comments only". The "an SE built from five deltas describes the
mean of those five" argument appeared in **three** places (`se.ts`,
`replicateTopItems`, and the test's describe block). Two further comments were
changelog rather than constraint: why `BestSwap` was extracted, and why `fight`
is not called `source`.

**S2 — durable claims.** `assertUsableSeeds` asserted the 0.00 shared-seed
spread with no re-run pointer and no hedge; `rankAfterJobCreated` claimed
"replication is a third of the wall time" as an unqualified measurement.

**S3 — Feature Envy in `cli.ts`.** Grouped output rebuilt shortlist membership
from an id set (`shown.has(r.itemId)`) when `applyView` already puts
`belowCutoffInView` on every group row — a second implementation of the cutoff
to keep in step. Also raised independently by the spec axis.

**Cleared:** testing rules (module-interface tests through recorded adapters,
pure functions unit-tested directly, no stage-internal assertions) and the
types-from-JSON rule (`ReportEventsRawFixture` is hand-declared, not derived).

### Spec

**P1 — the CLI observable had no test.** The ticket asks that below-cutoff rows
be "absent from the default run and present under the flag, with the row count
identical across both". `applyView` was well covered; nothing exercised
`cli.ts`, because it ran `main()` at import and could not be imported.

**P2 — the top-8 deviation was unrecorded.** The code takes the top 8 from
above-cutoff rows rather than the ticket's "exactly the top 8 rows". Defensible
under §10, but the ticket and the code disagreed and the closing edit did not
say so.

**P3 — `resolveFight` minted `encounterName: ""`** for a caller-named fight the
source never described — the same fabricated-absence the `killedAt` comment
argues against, one field over.

**Judgement calls left alone, with reasons:** `--report-events` is how the
fallback is reachable at all from the CLI, and `probe_ranked_route.py` is what
makes the verification log's claim re-runnable from a fresh worktree, which
AGENTS.md § Durable claims requires.

**Gate box tick — earned.** The spec axis checked it independently: the probe
establishes zero `encounterRankings` against a working control, the fixture is a
committed live capture with its cost recorded, the test drives `rankUpgrades`
end-to-end through the recorded `GearSource`, and `ranking.fight.route` reads
`report-events`.

---

## Summary

Twelve findings across three axes; three were gate-blocking and all three are
fixed. The adversarial axis caught a statistical inconsistency (A1/A2) that
would have shipped a point estimate and an error bar describing different
things, and the domain axis caught a fixture that closed the gate box on a
protection paladin (D1/D2).

Both blocking defects share a shape worth naming: **the test passed because the
fixture was degenerate**. A1 hid behind gains averaging to exactly the first
seed's draw; D1 hid behind a hardcoded talent split that stopped the pipeline
from reading what the payload actually said. Neither was a logic error a
reviewer could see by reading the diff alone — both needed someone to check the
fixture against the claim. Ten of the twelve findings came from the two axes
that read data rather than code.

`pnpm verify` green; 335 tests.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                     |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | Replication writes back the mean of the paired deltas; `deltaPct` and `belowCutoff` recomputed from it (216f60b)                  |
| A2  | Adversarial | fixed       | Sort and rank assignment moved after replication (216f60b)                                                                        |
| A3  | Adversarial | fixed       | Top N taken from above-cutoff rows, not a positional slice (216f60b)                                                              |
| A4  | Adversarial | fixed       | Replication counted in `totalSims` and emits progress (216f60b)                                                                   |
| A5  | Adversarial | fixed       | Baseline identified by pool membership; two fixture bugs fixed with it (216f60b)                                                  |
| A6  | Adversarial | wontfix     | Unreachable behind `usesPairedReplication`, and the catch-all files it `internal` correctly. Revisit only if the guard is removed |
| D1  | Domain      | fixed       | Re-captured from a ret fight; baseline now matches the ranked fixture at 2003.26 (f22b868)                                        |
| D2  | Domain      | fixed       | `talentPointsByTree` read from the capture and throws when unusable; three tests guard the class of bug (f22b868)                 |
| D3  | Domain      | fixed       | Probe docstring states the encounter-ID namespace scope limit (f22b868)                                                           |
| D4  | Domain      | fixed       | `killedAt` optional on `FightSummary` and `ResolvedFight` (f22b868)                                                               |
| S1  | Standards   | fixed       | SE rationale kept in `se.ts` only; two changelog comments dropped (18a7c4d)                                                       |
| S2  | Standards   | fixed       | Spread claim cites the verification log; wall-time claim removed (18a7c4d)                                                        |
| S3  | Standards   | fixed       | Grouped output filters on `belowCutoffInView` (18a7c4d)                                                                           |
| S4  | Standards   | defer       | `.scratch/carry-forward/issues/38-two-offline-recording-builders-diverge.md`                                                      |
| S5  | Standards   | defer       | `.scratch/carry-forward/issues/39-belowcutoff-derived-twice-untested.md`                                                          |
| P1  | Spec        | fixed       | CLI entry guarded on `argv[1]`; `packages/core/test/cli-shortlist.test.ts` pins the counting identity (18a7c4d)                   |
| P2  | Spec        | fixed       | Deviation recorded in the ticket's "Done when" (18a7c4d)                                                                          |
| P3  | Spec        | fixed       | `encounterName` optional (18a7c4d)                                                                                                |
