# Pre-merge review — phase-2/disclosure-and-caps

Diffed against: phase-2/trust...phase-2/disclosure-and-caps (e6db4c8)

Merge base is `phase-2/trust` (9bd1664), not `dev` — per
`.scratch/phase-2/spec.md`, the five Phase 2 subplans land on the integration
branch and only the closed gate goes to `dev`.

**Dispatch.** `codex exec` is not on `PATH`, so all four axes ran as fresh
subagents on the sharp lane (Opus, effort `medium`), in one parallel batch: the
adversarial and domain briefs from `.agents/reviews/`, and Standards + Spec
through the `code-review` skill. No reviewer had access to the authoring
session. No wall or ceiling was hit.

The 522k-line regenerated `data/items/index.json` was excluded from the diff
handed to reviewers, with the generator itself (`scripts/generate_item_gem_index.py`)
kept in scope. The regeneration was verified separately: same 8253 ids, every
one gaining exactly one `stats` key, nothing removed or altered, and
`data/gems/palette.json` / `data/enchants/index.json` byte-identical.

## Adversarial

Two confirmed bugs, both reproduced locally before being fixed.

**A1 — `caps.ts` `sumStat` keyed gems by item id; duplicate ids corrupted the
sum.** `socketed` is positional, index-aligned to `SIM_ORDER` — which is how
`applyRepairedGems` (`rank.ts:699`) reads it. Collapsing it into a
`Map<itemId, gems>` means two identical rings share one entry, the last wins,
and it is then applied to both slots. Reproduced with two Bands of Accuria
(20 hit each) and one +8 gem, ground truth 48:

| `socketed` order | result                  |
| ---------------- | ----------------------- |
| gem on slot A    | 40 — gem dropped        |
| gem on slot B    | 56 — gem double-counted |

Identical gear, answer swinging on array order, no error raised. Duplicate
rings and trinkets are routine and this feeds the banner directly. **Fixed** —
indexed positionally, with a regression test asserting both orders give 48.

**A2 — `isHitDriven` summed incommensurable units, so armour swamped the
share.** Crystalforge Breastplate's delta is `{str 56, sta 40, int 20, hit 23,
crit 21, armor 1668}` — armour is 1668 of 1828, putting hit at 1.3%. The flag
could not fire on any armour-bearing slot. The one integration fixture that
exercised it, Romulo's Poison Vial, is a zero-armour single-stat trinket, so
the test passed while the feature was broken everywhere else — test theatre,
found as such. **Fixed** — survival stats excluded; the same chest now reads
14%, and a test pins both the negative and positive armoured cases.

**A4 / A5 — two tests were vacuous.** An invalid `Race` literal (`"BloodElf"`
against a `"RaceBloodElf"` union) typechecked, ran, and asserted the same wrong
string back. Separately, a test named "reports a negative gap once over the
cap" passed _empty gear_ and asserted the gap was **positive**. **Both fixed**;
the over-cap branch now has real computation-level coverage. The reason the
first could happen at all is filed as ticket 34.

**A6 — `expertise: { capRating: 0, gap: 0 }` reads as "at cap".** `gap: 0` is
exactly what a satisfied cap looks like, so `gap <= 0 ? "capped" : "under"`
reports a player with zero expertise as capped. Latent (nothing consumes it
yet) but wrong on the wire. **Fixed** — both fields are now `null`, with
`HitCapEntry` narrowing them back out since hit always has a known cap.

**A7 — `stat_array_len()` regex required a literal tab.** Fails loudly rather
than silently, so brittleness not a bug. **Fixed** anyway (`^\s+`); generator
output re-verified byte-identical.

No high-severity findings in `renderDisclosure`.

## Domain

**D1 — `PLAN.md §4.3` does not exist.** Five citations across code and tickets
pointed at it; the rule lives in **§4 (R8)**. A dangling pointer in committed
artifacts. **Fixed** everywhere.

**D2 — the talent claim was wrong, and measuring it changed the output.** The
blocker ticket asserted "for ret, Precision-style talent hit" explains the
gear-only gap, labelled _untested hypothesis_. Precision is a **Protection**
talent (`paladin.proto:33`, inside the Protection block at 30–52); the
Retribution tree (43–64) has **no hit talent at all**.

The reviewer concluded the caveat should therefore be stripped. Checked
directly, and that is not right either: the pinned preset cross-specs into
Protection and takes **3/3 Precision**. Talent string `5-053201-…`, Protection
block `053201`, Precision at local index 2 → 3 points → 3% hit ≈ **47 rating**.
The same string is in the simmed request, so the sim applies it.

So the fixture character sits near **119 of ~142**, not the 72 gear reports —
the banner understated the shortfall by ~2.5×. Both the ticket's reasoning and
the reviewer's conclusion were wrong; the measurement settled it. Recorded in
the ticket and filed as **ticket 33**.

**D5 — the uncertainty is one-sided, and `±16` misrepresented it.** Heroic
Presence only ever _lowers_ the cap; uncounted talent hit only ever _adds_.
Both errors run the same direction, so a symmetric band dressed a one-sided
overstatement up as noise. **Fixed** — the banner now names the direction:

> ~70 rating under the hit cap counting gear alone — talents and raid buffs are
> not counted and only ever add hit, and Heroic Presence in your party would
> lower the cap by ~16. The real shortfall is smaller than this, likely much
> smaller.

**D4 — `PHYSICAL_HIT_RATING_PER_HIT_PERCENT = 15.769233` confirmed correct**
against the pinned vendor source, as is 9% yellow-miss vs a level-73 boss and
the ~142 rating cap. Physical is right for ret (Judgement, Crusader Strike,
Seal of Command all use the physical table). No finding.

**D6 — expertise: declining to state a cap upheld**, but the reasoning was thin.
The dodge cap is knowable in principle (~410 rating), yet the requirement moves
with weapon skill and racial weapon bonuses that are not readable from a log.
The anchor and that reason are now recorded in the code rather than a bare "no
honest cap exists".

**D3 — the 9% cap is yellow-only** and white swings keep missing past it. The
headline choice is correct for a 2H ret, but a reader could take 142 to mean
"no more melee misses". Noted in the constant's comment.

## Standards + Spec

**Standards 1 (hard) — `STAT_COUNT = 42` re-hardcoded on the TS side.** The
generator was changed _in this same diff_ to stop hardcoding the width — it
parses `NextIndex` from `common.proto` and refuses to run if the enum grew —
and then the consumer reintroduced exactly that drift, with a comment pointing
at the script it was undermining. A grown enum would fail loudly in Python and
silently truncate `statDeltaBetween`. **Fixed** — derived from the generated
`Stat` enum, with a test pinning it against real generated arrays.

**Standards 2 — `statFrom` duplicated `statAt`** (`stats.ts:14`), already
imported in the same file. **Fixed** — folded into the existing helper.

**Standards 3 — comment-policy nits.** Comments restating the code on
`HIT_DRIVEN_SHARE` and `HIT_CAP_RATING`, and a `hitDriven` doc duplicated
between `rank.ts` and `caps.ts`. **Fixed**; the load-bearing ones (the
PHYSICAL-vs-SPELL warning, the positional-indexing note) kept.

**Standards — testing rules and durable claims: clean.** Primary assertions go
through `rankUpgrades` with recorded adapters; the pure modules are unit-tested
directly, which AGENTS.md § Testing permits. No assertions on stage internals.

**Spec — both owned gate boxes close.**

| Gate box                                                                   | Verdict                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| inactive-meta baseline auto-repaired and disclosed                         | **Closed by this branch.** `rank.test.ts` forces an inactive meta, drives the full `rankUpgrades` path, and asserts `metaAdjusted` plus the `gems.meta-repair` substitution in the run tier. Mutation-checked.                           |
| a meta repair that would break a socket bonus picks the other move (§9 R4) | **Closed, but by pre-existing work.** Independently confirmed: both `meta-repair.ts:195-197` and the constructed fixture at `meta-repair.test.ts:94` predate this branch. The ticket's amendment crediting it as already-done is honest. |

**Spec — scope clean.** No file under `data/universes/` changed, so
`.scratch/phase-2/spec.md`'s ret-universe boundary and ticket 17 are untouched.
Regenerating `data/items/index.json` is a different artifact and was done from
committed source with the pinned toolchain. `--assumptions` is not named in the
ticket, but §9 R7's "collapsed by default" is unimplementable in a
non-interactive CLI without an expand affordance.

**Spec (a)1 — `assumedRace` is optional where §4 shows it required.** A
type-level hole only: `rank.ts` always passes it. Left as-is; making it
required would force every pure-function test to supply a race it does not use.

## Summary

Four axes, **11 findings**. Nine fixed on the branch, two filed as
carry-forward. Two were genuine correctness bugs that a passing test suite had
concealed — the duplicate-item-id sum and the armour-swamped `hitDriven` flag,
the latter being a case where the only fixture exercising the feature was the
one item class where the bug could not show.

The most valuable finding was not a bug: the domain axis forced a measurement
the blocker ticket had told itself to do and skipped. It disproved the ticket's
stated reasoning _and_ the reviewer's proposed fix, and left the banner
understating its own error by ~2.5×. That is now a filed ticket rather than a
sentence nobody checked.

`pnpm verify` green: **261 passed**, up from 231 at branch point.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                       |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `sumStat` indexed positionally; regression test asserts both orders give 48                                                         |
| A2  | Adversarial | fixed       | Survival stats excluded from the `hitDriven` share; armoured cases tested both ways                                                 |
| A4  | Adversarial | fixed       | Invalid `Race` literal corrected; root cause filed as 34                                                                            |
| A5  | Adversarial | fixed       | Over-cap test now asserts over-cap gear, not empty gear                                                                             |
| A6  | Adversarial | fixed       | `expertise.capRating` / `.gap` are `null`, not `0`                                                                                  |
| A7  | Adversarial | fixed       | `NextIndex` regex relaxed off a literal tab; output byte-identical                                                                  |
| D1  | Domain      | fixed       | Five `§4.3` citations corrected to `§4 (R8)`                                                                                        |
| D2  | Domain      | defer       | `.scratch/carry-forward/issues/33-caps-blind-to-talent-hit.md` — measured (~47 rating), ticket's wrong reasoning corrected in place |
| D5  | Domain      | fixed       | Banner states the direction of the error instead of a symmetric `±`                                                                 |
| S1  | Standards   | fixed       | `STAT_COUNT` derived from the generated `Stat` enum                                                                                 |
| S2  | Standards   | fixed       | `statFrom` folded into the existing `statAt`                                                                                        |
| —   | Adversarial | defer       | `.scratch/carry-forward/issues/34-tests-are-never-typechecked.md` — 18 pre-existing errors in 3 files; out of scope here            |
| Sp1 | Spec        | wontfix     | `assumedRace` optional: type-level only, `rank.ts` always passes it; requiring it would burden pure-function tests                  |
