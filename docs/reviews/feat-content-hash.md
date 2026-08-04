# Pre-merge review — feat/content-hash

Diffed against: `dev...feat/content-hash` (4b93c52 at dispatch; fixes landed at
a04b091 and after)

**Scope note.** This branch sits on top of `feat/p5-heroic-sources`, which
never had a review file of its own. Rather than review only the three
`contentHash` commits and leave fifteen ungated, all 18 commits
(50 files, ~3000 insertions) went to the reviewers as one diff. This file is
therefore the pre-merge gate for **both** branches.

**Dispatch.** `codex` was not on `PATH`, so all four axes ran as fresh
subagents on the sharp lane (Opus), each with the diff and its own brief and no
access to the authoring session. Adversarial and Domain used
`.agents/reviews/*.md`; Standards and Spec came from the `code-review` skill.

---

## Adversarial

Two confirmed silent-failure bugs, both reproduced with runnable probes, and
both in the new `contentHash` work. The reviewer's framing of the shared root
cause is the useful part: **the hash covered item _identity_ but not the
_configuration and mapping_ that turn identity into a number.**

**A1 — the sim skeleton was not hashed.** `contentHashOf` received the module
constant `PRESET_ID = "ret/p2.raid-sim-skeleton"` instead of
`deps.raidSimSkeleton`, the caller-supplied `RaidSimRequest` that feeds every
`compose()` call. Editing the skeleton — buffs, debuffs, talents, encounter
duration, APL — left the hash unchanged, so every delta came back from cache.
Reproduced: mutating `encounter.duration` to 999 between two `rankUpgrades`
calls sharing one `MemoryStore` produced an identical `contentHash` and **zero**
additional sim runs. Severity is set by this repo's own measurement —
`docs/verification-log.md` records `prepullActions` stripped moving DPS from
2042.85 to 789.02, a 61% swing under an unchanged `presetId`. This is precisely
PLAN.md's stated worst case: plausible numbers, wrong answer, no error.

**A2 — only `itemId` was hashed from each candidate, not `slot`.** `slot` flows
through `simSlotsForPoolSlot` to pick `slotIndex`, so it decides `deltaDps` and
`slotChoice` — `finger` runs two comparisons, `neck` one. Reproduced: the same
pool row with `slot: "neck"` changed to `slot: "finger"` hashed identically and
ran zero sims. A pool regeneration that corrects a mis-slotted item would
silently serve the old, wrong deltas.

**A3 — a `meta-unsolvable` throw strands its job row `running`.** The throw
happens inside the candidate loop, after `job.create`, with no `job.update`.
Minor today (nothing consumes job rows yet); a hang once the Phase 2 job API
attaches to running rows.

Checked and clean: `canonicalJson` (key sorting, `undefined`-as-absent,
`undefined`→`null` in arrays, non-finite refusal, plus record-vs-array
`epWeights`, duplicate ids and gem _order_ within an item); the job lifecycle on
the success and sim-failure paths; purity (no `console`/`process`/`fs` outside
`seams/` and `cli.ts`); the codegen's `Assert<Extends<…>>` helper, independently
confirmed to raise TS2344 on a false premise; the rank-report split as a pure
move; and the heroic/p5 data. Tests judged not tautological — the cache tests
count real sim invocations rather than asserting on internals.

## Domain

**D1 — the same skeleton finding, reached independently** from the game-facts
side. The reviewer enumerated what the unhashed skeleton carries that is a live
TBC DPS input: `encounter.duration: 180 / durationVariation: 5`, target
`level: 73` and armor, `raid.buffs` (bloodlust, arcane brilliance, tristate
Fortitude/GotW/Thorns), `talentsString`, `profession1/2`, `consumables`,
`itemSwap`, `bonusStats`, and `rotation`. Also noted that `ENGINE_VERSION` does
not cover it — ADR-0019 scopes that to "our own arithmetic", and a preset edit
is data, not code.

Verified correct against the pinned `vendor/wowsims/db.json` rather than
inferred: `DROP_DIFFICULTY_HEROIC = 2` (exactly `{1: 2349, 2: 472}`, all 472 in
16 five-man zones, zero in any raid); Magisters' Terrace at phase 5 and 34472
Shard of Contempt via npc 24560; the Sunmote entries' zone/boss attribution;
34679 / 30834 / 29119 faction sources; the strict superset chain
p2 ⊆ p3 ⊆ p4 ⊆ p5 (230/356/403/484). Meta repair correctly **not** separately
hashed — it is a pure function of logged gems, palette and `epWeights`, all
three already hashed. `race` handling consistent with R8 (standing assumption,
never inferred from WCL). No new WCL field usage anywhere in the diff.

Unverified (flagged as such, not contradictions): the claim that the other 15
heroics drop phase-1 items only (the 16-zone/472-drop half checks out; the 284
was not re-measured); and `ep_score` still blind to weapon damage (ticket 27 —
untouched by this diff but `curationHint` now ships on p4/p5 where two-handers
matter more).

## Standards + Spec

**Standards.** No hard violations. Called out as clean on the two rules this
branch was aimed at: the JSON-widening trap is genuinely closed (the
`Assert<Extends<…>>` pair in `pool.ts` is a real check now that
`ItemSourceKindName` comes from generated `as const` code, gated by
`codegen:json-types:check`), and tests sit at the sanctioned homes — module
interface via recorded adapters, pure functions directly, no stage-internal
assertions. Comment policy judged consistently _why_-not-_what_.

One judgement call worth acting on: **duplicated palette expression** —
`deps.gemPalette ?? gemsForPhase(input.maxPhase)` evaluated three times in
`rank.ts`, the third introduced by this branch 30 lines below a `GemContext`
already holding the identical value, partly undoing commit `c644776`. Two
suppressed as deliberate: the pinned report digest (endorsed by its own
comment) and the `epWeights` union shape.

**Spec.** PLAN.md §4 and §7 amendments confirmed genuinely recorded in the
diff, ADR-0019's zero-occurrence table re-verified clean, and the gear-in-hash
regression properly mutation-tested. Three findings:

**S1 — ADR-0019 and ticket 24 closed on a false claim.** Both said
`deps.clock` had a production consumer. `grep -n clock packages/core/src/rank.ts`
returns exactly one hit — the type declaration. `MemoryStore` timestamps from
its **own** constructor-injected clock, and `cli.ts` built `new MemoryStore()`
with no argument, so the injected `deps.clock` was discarded. Removing
`void deps.clock` made the symptom go away without giving the port a consumer.

**S2 — a stale comment contradicted the amendment it implements.** The
cache-hit path still cited _"cache hits fire onProgress once and resolve"_ —
the exact sentence ADR-0019 amends away.

**S3 — ticket 24 overstated the dedupe.** §7's second payoff is _attaching_ to
a running job; `Store.job` has no `findByContentHash`, so two concurrent
identical calls still both sim. ADR-0019 said "handle" (honest); the ticket
read stronger.

**S4 — the §14 ViewOptions gate is pinned at the wrong altitude.** The test
asserts on `contentHashOf` with a synthetic object; nothing drives a real
`ViewOptions` through `applyView` on a `Ranking`, and nothing asserts the
"or trigger a sim" half.

**S5 — scope creep, disclosed.** The p5 data work (`3106bb5`) moves p3 and p4
membership too (354→356, 401→403) — a numbers-moving change to already-gated
tiers, bundled onto a branch whose headline is `contentHash`. Ticket 28
discloses it; the branch title does not.

---

## Summary

Four axes, eleven findings. **Two were silent-wrong-number bugs in the new
hash** — found independently by the Adversarial and Domain reviewers, and both
of the class PLAN.md names as the project's worst case. Both are fixed and
pinned by tests verified red against the pre-fix code. Three more findings were
false or overstated claims in my own ADR and ticket text, now corrected in
place. Two are deferred as tickets.

The review paid for itself twice over: the skeleton bug would have shipped a
cache that serves 61%-wrong deltas with no error anywhere.

`pnpm verify` green at the fixed tip — 196 tests, 23 files.

## Disposition

| ID      | Axis                 | Disposition       | Ticket / note                                                                                                                                                                                                                                                                                                                                                            |
| ------- | -------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1 / D1 | Adversarial + Domain | fixed             | Skeleton hashed by value (`skeleton: deps.raidSimSkeleton`); pinned in `content-hash.test.ts` and at the `rankUpgrades` seam, both verified red against pre-fix code                                                                                                                                                                                                     |
| A2      | Adversarial          | fixed             | `candidates` hashed as `{ itemId, slot }` pairs; same two-altitude pinning                                                                                                                                                                                                                                                                                               |
| A3      | Adversarial          | fixed (follow-up) | `.scratch/carry-forward/issues/29-job-row-stranded-on-meta-unsolvable.md` — **closed 2026-08-04** on `feat/phase-1-gate-close`: one catch around the whole post-create body, mutation-checked                                                                                                                                                                            |
| S1      | Spec                 | fixed             | `cli.ts` passes one `clock` to both engine and `MemoryStore`; the false claim corrected in ADR-0019 and ticket 24                                                                                                                                                                                                                                                        |
| S2      | Spec                 | fixed             | Stale `onProgress`-once comment replaced with the amended promise                                                                                                                                                                                                                                                                                                        |
| S3      | Spec                 | fixed             | Ticket 24 corrected — "handle, not the payoff", with the missing `findByContentHash` named                                                                                                                                                                                                                                                                               |
| S4      | Spec                 | defer             | `.scratch/carry-forward/issues/30-viewoptions-gate-not-pinned-through-applyview.md`. **Re-filed 2026-08-04 as `Blocks: phase-2`** — first filed `Blocks: phase-1`, which was wrong: the box is on the Phase 2 gate, Phase 1's nine boxes are all closed, and the real blocker is that `applyView` is unimplemented (a scheduled Phase 2 deliverable), not a missing test |
| S5      | Spec                 | wontfix           | Real and disclosed in ticket 28. Splitting the p5 data out now would mean unpicking a landed, tested, ADR-backed change to satisfy a naming preference                                                                                                                                                                                                                   |
| ST1     | Standards            | fixed             | Third palette recompute deleted; `gemPaletteIds` reads `gems.palette`                                                                                                                                                                                                                                                                                                    |
| ST2     | Standards            | wontfix           | `epWeights` union shape — reviewer's own confidence low, defensible as-is                                                                                                                                                                                                                                                                                                |
| ST3     | Standards            | wontfix           | Pinned report digest is deliberate and comment-endorsed; it is what made the CSS extraction provable                                                                                                                                                                                                                                                                     |
