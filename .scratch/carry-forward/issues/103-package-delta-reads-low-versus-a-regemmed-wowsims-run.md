Status: closed
Type: disclosure
Origin: diagnostic loop, 2026-08-10 (`.scratch/set-bonus-value/loop-log-t6-shoulders.md`, iterations 3–4)
Blocks: none
Blocked by: none

# packageDeltaDps reads systematically low against a re-gemmed wowsims run

`formatPackageDelta` now shows `packageDeltaDps` in the Set potential panel
(commit `ed58c79`), which is the right figure to show. But that figure is
systematically **more conservative** than what a player will see in wowsims
after re-gemming the same package, and nothing on the surface says so.

## The measurement

For the four Thunderheart (T6) pieces on shredzepelin's actual gear, three
figures exist for one and the same swap:

| figure | source | value |
|---|---|---|
| `packageDeltaDps` | our pipeline, `.scratch/rank-reports/shredzepelin-p3.json` | **+64.07** |
| direct sim, flat filler gems | `python .scratch/set-bonus-value/measure_shredzepelin_t6.py` | **+80.80** |
| user's wowsims web UI run | reported 2026-08-10 | **+97** |

The repro is trustworthy on its own terms: its baseline arm simmed 2152.13 DPS
against the artifact's stored `ranking.baseline.dps` of 2152.0998 — a 0.03 DPS
guard — with per-seed spread under 1 DPS across seeds `[11,22,33,44,55]` at 3000
iterations on wowsimcli v0.0.101. The four single-swap arms reproduce the
artifact's singles to within a few DPS (shoulder −106.16 / −100.23, chest
−100.16 / −95.81, hands 21.75 / 21.24, legs 23.29 / 26.47). Only the **package**
diverges, by 16.72 DPS — an order of magnitude above the noise, so this is
structural, not statistical.

## Why (hypothesis, mechanism identified but not isolated by experiment)

Production assembles the package by applying `equipmentForCandidateSwap`
**sequentially, one piece at a time** (`packages/core/src/rank.ts:1037-1045`).
That helper runs `migrateGemsToItem` → `fillEmptyCandidateGems` → `repairMeta`
(`rank.ts:1376-1430`), and `fillOptsForSwap` (`rank.ts:1432-1452`) passes a
`usedUnique` exclusion computed over the rest of the equipment. Applied
sequentially, each successive package piece is therefore denied any unique gem
an earlier piece already consumed, and meta requirements are repaired against a
partially-assembled set. Socket capacity also shifts per slot (legs 28741 has 3
sockets against T6 31044's 1; hands 29947 has 0 against 31034's 1).

This is **not a bug** — spec §2.2 step 1 requires byte-identical gem policy
between package and single swaps so PLAN.md §9's symmetry invariant holds by
construction. The conservatism is the price of that invariant.

**Untested:** the sequential-exclusion mechanism is read from the source and is
directionally consistent with the 16.72 DPS gap, but no experiment has isolated
its contribution from the socket-count differences. Simming the package with
production's gem assignment against the same package with a freely re-optimised
gem set would separate them.

## Why it matters

A player who reads "whole package +64.07 DPS vs current gear", equips the four
pieces, re-gems them the way the wowsims UI would, and re-sims will see a
larger number. Being wrong in the conservative direction is the right way round,
but the panel currently states the figure without qualification, and the gap is
~30 DPS on a ~2150 DPS baseline.

## Options

1. **Disclosure line only.** Extend the panel's existing standing-assumption
   line (`set-potential-assumption`, already rendered) to say package figures
   hold the player's current gem policy fixed and re-gemming can only improve
   them. Cheapest; no number moves; consistent with PLAN.md:272 disclosure-over-
   correction.
2. **Measure and state the spread.** Sim the re-gemmed package and report the
   package figure as a range. More honest, costs one sim per package, and
   invites the question of which end belongs in the panel.
3. **Do nothing.** Defensible if the conservative direction is considered
   self-evidently safe, but the ~30 DPS gap is large enough that a reader
   comparing our panel against their own wowsims run will think one of them is
   broken.

Option 1 is the recommendation. Do **not** change how the package is gemmed —
that would break the spec §2.2 symmetry invariant to chase a display problem.

## Update, 2026-08-10 — option 1 partially shipped, ticket stays open

`packageDeltaDps` now also drives the report's opt-in **package** display mode
(ADR-0024), so the figure reaches member rows and not only the panel. Option 1's
disclosure ships with it, in two places:

- every package-member row's line ends "holds your current gems fixed, so
  re-gemming can only improve it" (`formatPackageMembershipLine`,
  `packages/core/src/rank-report-rules.ts`);
- the set-weight control's note repeats it for the mode as a whole.

Still open: the **Set potential panel's** own `formatPackageDelta` line carries
no such qualifier, which is the surface this ticket was originally filed
against. Nothing here measures the spread (option 2) or isolates the
sequential-gem mechanism from the socket-count differences — both remain
untested as written above.

## Closed, 2026-08-10 — option 1 complete

The panel's own `formatPackageDelta` line now carries the qualifier, so every
surface that states `packageDeltaDps` states it: the panel, the per-row package
line, and the set-weight control's note. The wording is one exported constant,
`GEM_POLICY_QUALIFIER` in `packages/core/src/rank-report-rules.ts`, rather than
three strings that could drift into three different claims about one number.
The CLI's set block picks it up for free — it renders through the same
`formatSetBonusLine`.

**Closing on disclosure, which was this ticket's full scope.** The title is a
statement about what the figure *reads like*, and the ticket's own
recommendation was option 1 with an explicit instruction not to change how the
package is gemmed. Options 2 (measure the spread) and 3 (do nothing) are not
carried forward as work: no number moved, and the mechanism hypothesis in "Why"
above stays **untested** exactly as written — nothing in this change isolated
the sequential-gem effect from the socket-count differences. If the spread is
ever wanted as a range, that is a new ticket with a sim budget, not this one.

## REOPENED, 2026-08-10 — the owner falsified the re-gemming diagnosis

The owner reports their +97 wowsims run used the **same gems** as the
baseline — no re-gemming happened, and for this gear the current gems are
already optimal, so re-gemming would only have made it worse. That removes
"the player would re-gem" as the explanation for the gap. Three figures for
the same swap still disagree (+64.07 pipeline, +80.80 filler-gem repro, +97
owner's run with unchanged gems), and the difference is now **unexplained**,
not conservatively explained.

The qualifier text was corrected accordingly (it previously said "re-gemming
can only improve it", which pointed readers at a mechanism the owner's own
run rules out as the story here). It now says only that gem handling differs
from a wowsims run and the figure may read low.

What this ticket now needs — a loop-style isolation, not disclosure:

1. Dump the exact equipment payload (items + gems + enchants) production
   builds for the package arm and diff it against the owner's wowsims arm.
   If our builder dropped a gem, left a socket empty, or broke the meta
   activation, that is the gap.
2. If the payloads match, diff the sim request settings (fight, buffs,
   consumables) between the two runs.
3. The sequential-gem mechanism hypothesis above stays untested; step 1
   tests it directly.

Related: ticket 106 investigates a helm comparison where the same gem
handling is the prime suspect — if step 1 finds the builder mangling gems,
check whether one fix covers both.

## Loop findings, 2026-08-10 — every local mechanism falsified, gap still unexplained

Ran as a combined loop with ticket 106 (shared prime suspect: the swap builder's
gem handling). Full director log:
`.scratch/set-bonus-value/loop-103-106/DIRECTOR.md`; per-agent logs `01`–`05` in
the same directory, with their measurement scripts committed alongside.

**The prime suspect is dead.** Dumping the payload production actually builds —
by calling the real exported `equipmentForCandidateSwap`, not a reimplementation
(`.scratch/set-bonus-value/loop-103-106/dump-payloads.ts`) — shows the T6
package arm has **no empty socket and no dropped gem** beyond what socket
capacity mechanically forces (11→10 gems: legs 31044 has 1 socket against worn
Skulker's Greaves' 3; hands 31034 has 1 against worn 0).

**The socket-capacity attribution in "Why" above is wrong on this data.**
`python .scratch/set-bonus-value/loop-103-106/measure_pkg_gap_line_a.py`
(seeds [11,22,33,44,55] @ 3000 iters, guard 2152.13 vs stored 2152.0998):

| arm | delta vs BASE |
|---|---|
| `PKG_PROD` (the real production payload) | **+64.48** |
| `PKG_FILLER` (flat filler gem 32194) | **+80.80** |
| `PKG_BESTGEMS` (T6 sockets filled with 24028, the gem the baseline already uses) | **+64.43** |

`PKG_BESTGEMS` lands on `PKG_PROD` (0.05 apart against a ~2.7 SE), not on
`PKG_FILLER`. So the ~16.72 DPS `PKG_PROD`/`PKG_FILLER` split is **gem choice**
(24028 vs 32194), not socket *count* and not sequential exclusion. Socket
capacity explains ~0 of the 32.93 DPS gap to the owner's +97. The "Untested"
paragraph above is now tested, and its mechanism is refuted.

**The stored figure is not displaced.** `PKG_PROD` +64.48 agrees with the stored
+64.07, so nothing in our own pipeline is losing DPS between payload and
artifact. (Ticket 106's apparent ~15 DPS artifact-vs-sim displacement turned out
to be a harness error in one measurement agent — see `04-artifact-vs-direct.md`
— and does not touch the package arm, which never introduces a meta socket.)

**Where the gap must now live: the sim request, not the equipment.** Diffing our
skeleton (`03-package-gap.md`) found no divergence in fight duration (180s),
target count (1), target armor/level, or buff/debuff composition, and confirmed
the `p2` skeleton filename is deliberate rather than a p2/p3 mismatch
(`--maxPhase` moves only the candidate pool; the skeleton is phase-agnostic and
gated by `pnpm sim-defaults:check`). Two leads survive, both **untested** for
DPS impact:

1. `exposeWeaknessHunterAgility: 1080` — upstream's Phase-1 value, hardcoded in
   feral's sim.ts regardless of actual phase; P2's correct value would be 1150.
2. The talent preset is "StandardTalents, the first one upstream lists" — a
   judgment call never verified against what the owner's run used.

**What this ticket needs next is evidence from outside our pipeline**: the
owner's exported wowsims settings for the +97 run (buffs, consumables, debuffs,
encounter, talents). A leaf-level diff of that against our composed request
would finish this the way `04-artifact-vs-direct.md`'s leaf diff finished the
payload question. Absent that, further sims on our side re-measure numbers we
have already reproduced exactly.

**The unblock already has a ticket.** Ticket 72 (import a user-supplied wowsims
setup) is exactly the capability needed here — its stage 1 accepts a pasted
`IndividualSimSettings` as the skeleton source, which is what turns "the owner's
run disagrees" into a leaf-level request diff. Its motivating case is recorded as
"an unexplained helm-ranking gap between our sim and wowsims", i.e. ticket 106.
Recommend treating 72 as the blocker for both 103 and 106 rather than opening a
third path.

## RESOLVED, 2026-08-10 — the owner's settings export arrived and closed it

The evidence this ticket was blocked on landed at
`.scratch/set-bonus-value/loop-103-106/owner-settings-export.json` (apiVersion
14). Full diff and measurements: `06-owner-settings-diff.md`.

**Our figure was never wrong. Two legitimate differences explain the gap, and
neither is a defect.**

**1. The settings are almost a perfect match.** Byte-identical between the
owner's export and our skeleton: all 6 raid buffs, all 8 party buffs (including
`totemTwisting` and `drums: LesserDrumsOfBattle`), all 12 debuffs, the talents
string, race, both professions, `reactionTimeMs 250`, every consumable that is a
sim input, and the entire encounter block (180s ±5, level-73 Mechanical, armor,
`parryHaste`). **`exposeWeaknessHunterAgility` is 1080 on both sides** — the
lead recorded in the previous section is dead, as is every other suspect it
named. There was nothing to toggle.

**2. The owner benchmarked a different character.** 10 of 17 slots differ —
neck, back, waist, legs, both rings, trinket1, weapon, relic, plus a shoulder
enchant — on better gear (baseline 2264 vs our 2152). Their legs have no sockets
where shredzepelin's have three, so the package arm's socket accounting inverts
between the two characters.

**3. The rotation differs, and that is the dominant lever.** Our skeleton pins
upstream's default APL (`TypeAPL`); the owner's run uses the `TypeSimple`
biteweave/mangleTrick preset.

Measured (seeds [11,22,33,44,55] @ 3000 iters, pinned CLI v0.0.101, every arm
built through the real `equipmentForCandidateSwap`):

| T6 four-piece delta | our APL | owner's TypeSimple |
|---|---|---|
| our gear | **+64.48** (= stored +64.07) | +113.73 |
| owner gear | +56.55 | **+87.63** |

**+87.63 against the owner's +97**, resolvable on every paired seed. The
remaining single-digit residue is plausibly their 25000 iterations, a different
seed, and a round number read off a UI — closing it would need exported
*results*, not settings. The two differences do not superpose: the rotation is
worth +49 on our gear but +31 on theirs.

**Disposition: close.** The three figures in "The measurement" at the top of this
ticket were each correct for what they measured; they disagreed because they
measured different characters under different rotations. Nothing in the gem
handling, the package assembly, or the artifact was ever at fault — see
`DIRECTOR.md` for the seven mechanisms falsified along the way.

**One question for the owner, not implemented:** should the tool model
upstream's default APL or the `TypeSimple` preset the owner actually plays? That
is a `data/presets/feral/` change gated by `pnpm sim-defaults:check` (a
`data-pipeline-work` job) and a judgment call about whose rotation the numbers
should represent — not a bug fix. A reverse-direction export of our settings is
at `.scratch/set-bonus-value/loop-103-106/our-settings-for-web-import.json` so
the owner can verify parity from the web side.
