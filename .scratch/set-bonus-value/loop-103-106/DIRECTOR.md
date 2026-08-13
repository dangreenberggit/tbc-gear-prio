# DIRECTOR log — combined loop for tickets 103 and 106

Branch: `feat/set-bonus-value`. Started 2026-08-10. Director maintains this file
only; each subagent writes its own `NN-<label>.md` in this directory.

## The question

Two symptoms, one prime suspect.

- **103**: `packageDeltaDps` for the four-piece T6 swap = **+64.07**; the owner's
  wowsims run of the same swap **with the same gems** = **+97**. Re-gemming is
  falsified as the explanation. Gap unexplained.
- **106**: Vengeful Gladiator's Dragonhide Helm sims ~equal to Cursed Vision of
  Sargeras in our report; owner's manual wowsims run (same gems both arms, meta
  active in both) puts Cursed Vision ~**+10** ahead.
- **Prime suspect**: the swap builder's gem handling —
  `migrateGemsToItem` → `fillEmptyCandidateGems` → `repairMeta`
  (`packages/core/src/rank.ts` ~1376-1452, entry point
  `equipmentForCandidateSwap` at :1424), applied **sequentially** for packages
  (`rank.ts:1066-1074`).

## Plan

Phase 1 (shared): dump the exact equipment payload production builds for (a) the
T6 package arm and (b) each helm's single-swap arm — item ids, gems per socket,
enchants, and meta activation state (gem colour counts vs the meta's condition).
Diff against the owner's arms. Then price any difference found by simming our
payload against the corrected payload.

Decision point: payload defect explaining both → one fix, checked against spec
§2.2's byte-identical gem policy symmetry invariant (amendment needed → propose,
do not implement). Payloads clean → fork: 103 to sim-request diffs, 106 to item
variant then noise (cross-ref ticket 105).

## Iterations

### Iteration 1 — dispatched

- **Hypothesis**: production's swap builder produces an equipment payload that
  differs from the owner's arm — a dropped gem, an unfilled socket, or a
  deactivated meta — on the T6 package arm and/or one of the two helm arms.
- **Subagent**: `01-payload-dump` (read-only measurement; log
  `.scratch/set-bonus-value/loop-103-106/01-payload-dump.md`).
- **Command(s)**: a throwaway tsx script calling the **real** exported
  `equipmentForCandidateSwap`; commands recorded verbatim in
  `01-payload-dump.md`.
- **Result**:
  - T6 package arm: **no empty sockets, no dropped gems** beyond what socket
    capacity mechanically forces (11→10 gems: legs 31044 has 1 socket vs worn
    Skulker's Greaves' 3; hands 31034 has 1 vs worn 0). Every socket present is
    filled.
  - Helm arms: Cursed Vision **32235** and Vengeful Gladiator's Dragonhide Helm
    **33672** — payloads **identical apart from the item id**. Same 2 sockets,
    same gems (meta 32409 + red 32194), same enchant, identical whole-equipment
    gem multiset (13 gems).
  - Meta: **ACTIVE on both helm arms** per the real `metaStatus`
    (`packages/core/src/meta.ts`): `{red:12, yellow:2, blue:2}` vs
    `minRed:2 minYellow:2 minBlue:2` (condition from
    `data/gems/meta-conditions.json`). Baseline Wolfshead Helm has no sockets,
    so no meta comparison applies there.
  - Both helm ids confirmed as the only db matches, and as the ids
    `.scratch/rank-reports/shredzepelin-p3.json` actually uses.
- **Verdict**: **Prime suspect FALSIFIED.** No payload defect in any arm. For
  106 this is decisive: identical inputs reach the sim, so an ~equal measured
  delta is not a gem-handling artefact. For 103 it confirms the socket-capacity
  shift by direct inspection but prices nothing.
- **Next step**: the loop forks, exactly as the decision point specified.
  - 106 tail: item-variant check is already done (both ids confirmed, single
    match each) → so 106 goes straight to **noise**: what are the error bars on
    the two helm deltas, and does a clean direct A/B sim of the two helms on
    identical payloads reproduce the owner's ~+10? This is the measurement that
    decides whether the owner's expectation or our report is wrong.
  - 103 tail: **sim-request diffs** (fight/buffs/consumables between our
    skeleton and the owner's web run), plus pricing the socket-capacity loss —
    the package arm carries one fewer gem than baseline, which is a real stat
    loss our figure eats and the owner's arm may not have.

### Iteration 2 — dispatched (two read-only measurement agents, provably disjoint)

Disjointness check: separate log files (`02-*`, `03-*`), separate sim output
directories (`sims-106-helms/`, `sims-103-request/`), both read-only on
production source, no shared writes. Parallel is safe here.

- **Hypothesis 2a (106)**: with identical payloads confirmed, the two helms
  genuinely sim within noise of each other on our skeleton — i.e. the owner's
  ~+10 expectation is either not reproducible on this gear or is smaller than
  our error bars.
- **Subagent**: `02-helm-ab` → `02-helm-ab.md`.
- **Hypothesis 2b (103)**: the +64.07 vs +97 gap comes from the package arm
  losing socket capacity (11→10 gems) and/or from sim-request settings
  (fight/buffs/consumables) differing from the owner's web run.
- **Subagent**: `03-package-gap` → `03-package-gap.md`.
- **Result 2a (`02-helm-ab.md`)** — direct A/B on identical payloads:

  | | 3000 iters | 20000 iters |
  |---|---|---|
  | CURSED (32235) delta vs BASE | −185.46 | — |
  | VENG (33672) delta vs BASE | −188.30 | — |
  | **CURSED − VENG** | **+2.84** | **+4.97** |

  The gap is *real and resolvable* (CURSED beats VENG on every matched seed at
  both iteration counts) but is roughly **half** the owner's expected +10.

  Report's stored figures (`.scratch/rank-reports/shredzepelin-p3.json`):
  VENG `deltaDps −202.0497` (SE 3.455), CURSED `deltaDps −202.1336` (SE 3.615),
  so the report's CURSED − VENG = **−0.084** — flat, and the wrong sign.

  **New, unpredicted symptom**: each helm's *stored* delta (~−202) disagrees
  with the direct sim of the *same production payload* (−185 / −188) by
  **~15 DPS**, well outside SE. Both helms are shifted by about the same
  amount, which is why the difference between them collapses.

- **Result 2b (`03-package-gap.md`)** — pricing and request diff:

  | arm | delta vs BASE |
  |---|---|
  | `PKG_PROD` (real production payload) | **+64.48** |
  | `PKG_FILLER` (flat filler gem 32194) | **+80.80** (reproduces the prior run) |
  | `PKG_BESTGEMS` (T6 sockets filled with 24028, the gem the baseline already uses) | **+64.43** |

  `PKG_BESTGEMS` lands on `PKG_PROD` (0.05 apart, vs ~2.7 SE), not on
  `PKG_FILLER`. So **socket-capacity loss explains ~0** of the 32.93 gap, and
  ticket 103's original "sequential-exclusion / socket-capacity" attribution for
  the ~16.72 DPS `PKG_PROD` vs `PKG_FILLER` split is **wrong on this data** —
  that split is gem *choice* (24028 vs 32194), not socket *count*.

  Request diff: the `p2` skeleton filename is **deliberate**, not a mismatch
  (`--maxPhase` only moves the candidate pool; the skeleton is phase-agnostic
  and gated by `pnpm sim-defaults:check`). No divergence in fight duration
  (180s), target count (1), armor/level, or buff/debuff composition. Two
  **untested** leads: `exposeWeaknessHunterAgility: 1080` (upstream's Phase-1
  value hardcoded regardless of phase; P2's would be 1150) and the talent preset
  ("StandardTalents", never verified against the owner's run).

- **Verdict**: the loop's centre of gravity has **moved**. The prime suspect
  (gem handling) is dead, and so is the socket-capacity story. What replaced it
  is a *shared* discrepancy: **our stored artifact figures do not match a direct
  sim of the very payload production says it built** — ~15 DPS on both helms
  (2a), and the package figure +64.07 stored vs +64.48 measured is fine, but the
  singles were never checked the same way. This is one candidate root cause for
  both tickets: if stored deltas are systematically displaced, 106's flat
  ordering and 103's low package figure could both be downstream of it.

- **Next step**: iteration 3, single serial agent, chasing the ~15 DPS
  artifact-vs-direct-sim discrepancy — the highest-value unexplained fact on the
  table and the only one implicating both tickets. Specifically: does production
  sim the *baseline* differently from our harness (a different baseline DPS
  reference), or does it sim the *candidate arm* differently? A 15 DPS shift on
  both helms with an unchanged baseline points at the baseline reference, not at
  the arms.

### Iteration 3 — dispatched

- **Hypothesis**: our pipeline's stored `deltaDps` is computed against a
  baseline (or through a request) that differs from the one our direct-sim
  harness uses, displacing every stored single-swap delta by a roughly constant
  ~15 DPS and thereby collapsing the CURSED−VENG ordering into noise.
- **Subagent**: `04-artifact-vs-direct` → `04-artifact-vs-direct.md`.
- **Result**: **hypothesis refuted, and the ~15 DPS was subagent 02's harness
  error, not a pipeline defect.** 02's script substituted only the head slot
  with hardcoded `HELM_GEMS = [32409, 32194]` and left every other slot at the
  baseline's `24028`. Production additionally runs `repairMeta`, which
  **rewrites four gems on shoulder 29100 and chest 29096** to satisfy the new
  meta's colour condition — trading four 8-agi `24028` for 5-agi
  `32220/32220/30549/32212`, a net **−12 agility**. That is the ~15 DPS.

  Two decisive experiments:
  - **Leaf-level request diff** (production request via the real
    `equipmentForCandidateSwap` + `compose` vs 02's `3k-CURSED-11.req.json`):
    the *entire* set of differing leaves was those four gems, the cosmetic
    player name, and runner-supplied `simOptions`. Nothing else differs.
  - **Simming the production requests byte-for-byte** (`sim_prod_requests.py`):

    | item | artifact `deltaDps` | seed 11 (what production stores) | 02 |
    |---|---|---|---|
    | CURSED 32235 | −202.13357 | **−202.13** | −185.46 |
    | VENG 33672 | −202.04970 | **−202.05** | −188.30 |

    Exact reproduction to two decimals, on both items independently.

  Ruled out en route: the artifact field is plain `deltaDps` (no adjusted
  variant); single-seed vs 5-seed is worth <0.2 DPS here, not 15. Production
  stores the single-seed figure for these rows because `replicateTopItems`
  (`rank.ts:889-891`) only replicates `!belowCutoff` rows and both helms are
  below cutoff. Baseline is not implicated (stored 2152.0998 vs simmed 2152.10).

- **Verdict**: **106 is explained, and the ticket needs reframing.** The
  report's CURSED−VENG = −0.084 is a *correct* measurement — 04's 5-seed run of
  the production requests gives +0.15, equally flat. The two helms genuinely sim
  within noise **once both pay the meta tax**. 02's +2.84/+4.97 gap was measured
  on arms where the meta is socketed but **dead**, which is why it looked like a
  real ordering.

  That surfaces the loop's actual root cause, and it is a genuine one:
  **`repairMeta` appears to activate the meta at a net DPS loss on this all-red
  gear**, recolouring four strong gems to satisfy a colour condition without
  checking whether activation is worth its cost. 02's meta-inactive arms scored
  ~15 DPS *higher* than production's meta-active ones. Untested as a controlled
  experiment — that is iteration 4.

  **103 is barely touched** by any of this: the T6 package arm never touches the
  head, introduces no meta socket, and `PKG_PROD` +64.48 already agrees with the
  stored +64.07. No displacement exists on that side. The +64 → +97 gap remains
  **unexplained**; the surviving leads are `exposeWeaknessHunterAgility` phase
  pinning, the talent preset, and (weak, untested) a baseline difference if the
  owner's run had an active meta in both arms.

- **Next step**: iteration 4 — controlled test of the meta-tax hypothesis, the
  one candidate root cause with a plausible fix behind it.

### Iteration 4 — dispatched

- **Hypothesis**: `repairMeta` activates the meta gem unconditionally when a
  swap introduces a meta socket, paying a recolouring cost (here −12 agility)
  that exceeds the meta's own benefit on agility-stacked feral gear — so
  production's candidate arms are systematically *worse* than the best
  configuration a wowsims user would reach, depressing helm deltas.
- **Subagent**: `05-meta-tax` → `05-meta-tax.md`.
- **Result**: **hypothesis refuted — the meta is a net GAIN of +22.40 DPS, and
  `repairMeta` is making the right call.**
  `python .scratch/set-bonus-value/loop-103-106/sim_meta_arms.py`, seeds
  [11,22,33,44,55] @ 3000 iters, every arm's status verified with the real
  `metaStatus`:

  | arm | delta vs BASE (5-seed) |
  |---|---|
  | `META_ACTIVE` | −201.98 (seed 11: −202.13, reproduces stored −202.13357 exactly) |
  | `META_DEAD` | −185.46 (reproduces 02's figure exactly) |
  | `NO_META` (32194 in the meta socket) | −224.38 |

  `META_ACTIVE − NO_META = +22.40`, winning on all five paired seeds. The
  overturning measurement: isolating the head socket gives
  `ISO_32194 − ISO_24028 = +3.66` for +2 agi (≈1.83 DPS/agi), but
  `ISO_META − ISO_32194 = +39.25` for +2 agi where the rate predicts ~+3.7. The
  extra **~35 DPS is 32409's +3% crit damage, which the Go sim applies
  unconditionally even with the colour condition unmet** (32409's db stat vector
  is agility 12 and nothing else). So `META_DEAD` is an **illegal comparator** —
  02's "15 DPS higher" arms were higher only because they collect the meta's
  headline effect for free, precisely the impossible-stats case PLAN.md §9
  exists to prevent.

  Does `repairMeta` weigh the trade? **No — `meta-repair.ts:67-70`**, whose only
  gate is `initial.kind !== "inactive"`. The `cost` at `:193-197` ranks
  recolours against *each other* at `:206`, never against "don't repair"
  (`bestRepairMove` returns `Move | null` and `null` throws at `:85-89`). It
  optimises EP loss against `data/presets/feral/p1.ep-weights.json`, and the EP
  model is **blind to the benefit side** — ticket 20 records this qualitatively;
  05 has now put a number on it (~35 DPS seen as 0). A naive "only repair if
  EP-positive" fix would therefore reach the **wrong** answer here.

  Anything mandating always-activate? **Yes, PLAN.md:37** ("Always kept active,
  via minimum-EP-loss repair — not re-optimization") and **§9 policy item 1**
  ("assume the player keeps the meta active"), with ticket 04 implementing it
  and ticket 20's resolution reading `activation deliberately not checked`.
  Changing it would need a **spec amendment**, and 05 recommends against it.

  Blast radius: **8 of 407 rows (2.0%)**, all head, all already below cutoff
  (baseline Wolfshead Helm 8345 has `sockets: []`). Since activation is a
  +22.40 gain, those rows are **not** undervalued — the "systematically
  undervalued" framing does not hold.

- **Verdict**: **106's gem/meta line is closed.** Both helms pay an identical
  and *correct* meta cost; the report's flat CURSED−VENG (−0.084 stored, +0.15
  on a 5-seed re-run) is a correct measurement. The owner's ~+10 must come from
  something other than gems or meta handling. Everything the ticket named as a
  suspect — gem mangling, meta activation, item variant, socket bonuses — is now
  eliminated by measurement.

  Two incidental findings worth their own tickets, both out of this loop's
  scope: (1) `substitutions: []` in the stored report while 8 candidate arms
  each silently recolour four gems — **PLAN.md §9 policy item 5 already
  requires that disclosure, so no amendment is needed**; (2) ticket 20 should
  record the measured ~35 DPS so the next agent does not re-derive it.

- **Next step**: no further sim iteration is warranted. Both tickets' original
  hypotheses are now falsified by measurement, and what remains in each is an
  **unreproduced owner figure**, not a defect we can localise from our side. The
  honest close is to write the findings into both tickets, file the two
  incidental tickets, and state precisely what evidence would be needed from the
  owner's runs to go further. See "Disposition" below.

## Disposition

**No fix implemented, and none is warranted from what was measured.** Every
mechanism this loop was dispatched to catch has been falsified by direct
experiment rather than argued away:

| suspect | status | killed by |
|---|---|---|
| swap builder mangles gems | **falsified** | 01 — payloads identical apart from item id |
| swap leaves a socket empty | **falsified** | 01 — every socket filled |
| swap breaks meta activation | **falsified** | 01, 05 — meta ACTIVE, and correctly so |
| wrong PvP item variant | **falsified** | 01 — both ids the only db matches, and the ones used |
| socket-capacity loss explains 103 | **falsified** | 03 — `PKG_BESTGEMS` +64.43 ≈ `PKG_PROD` +64.48 |
| artifact figures ≠ direct sim (~15 DPS) | **falsified** | 04 — harness error in 02; production reproduces to 2 dp |
| `repairMeta` activates at a net loss | **falsified** | 05 — +22.40 net gain, all five paired seeds |

What survives, in both tickets, is the same shape: **our pipeline reproduces its
own stored numbers exactly, and those numbers disagree with the owner's wowsims
web runs.** 103's +64.07 vs +97 and 106's flat ordering vs ~+10 are now
*unexplained from our side*, with the local explanations exhausted. The
remaining leads are all in the sim *request*, not the equipment payload:
`exposeWeaknessHunterAgility: 1080` (upstream's Phase-1 value, hardcoded
regardless of phase; P2's would be 1150) and the talent preset
("StandardTalents", never verified against the owner's run) — both **untested**.

The next decisive evidence is not another sim on our side but the owner's
exported wowsims settings for the two runs, which would let a request-level diff
finish the job the way 04's leaf diff finished the payload question.

## LOOP RESUMED — the blocking evidence arrived

The owner's full wowsims settings export landed at
`.scratch/set-bonus-value/loop-103-106/owner-settings-export.json` (apiVersion
14). The residue named above is now attackable directly: the disposition's
"blocked on owner evidence" no longer holds.

First read of the export (`python -c` key dump, recorded in iteration 5's log):
raid buffs, party buffs incl. `drums: LesserDrumsOfBattle` and
`totemTwisting: true`, debuffs incl. `exposeWeaknessUptime 0.9` and
`exposeWeaknessHunterAgility 1080`, consumables incl. super/goblin sappers and
agi/str scrolls, a talents string, a simple rotation with biteweave/mangleTrick,
encounter 180s ±5 with a level-73 Mechanical target and `parryHaste`, and the
full 17-slot equipment.

**`exposeWeaknessHunterAgility` is 1080 in BOTH** — confirmed by direct read of
the export above and by `03-package-gap.md`'s reading of our skeleton. That lead
from the disposition is **dead on arrival**; the surviving candidates are the
ones our earlier diff could not see because it only compared our skeleton
against upstream defaults, never against the owner's actual run.

### Iteration 5 — dispatched

- **Hypothesis**: the +64→+97 and flat-vs-+10 residues are driven by sim-request
  settings present in the owner's run and absent (or different) in our skeleton
  — with `totemTwisting`, drums, sappers/scrolls, the ±5 duration variation, the
  level-73 Mechanical target, `parryHaste`, and the rotation/talents as the
  named suspects.
- **Subagent**: `06-owner-settings-diff` → `06-owner-settings-diff.md`.
- **Method note**: arms must be built through `equipmentForCandidateSwap` (the
  `repairMeta` trap from iterations 2/4/5), and settings toggled **individually**
  rather than all-or-nothing so each difference gets a price.
- **Result**: **both residues explained — by two differences, neither of which
  was on the suspect list.** The settings themselves were almost a perfect match.

  **Byte-identical** between the owner's export and our skeleton: all 6 raid
  buffs, all 8 party buffs (including `totemTwisting` and
  `drums: LesserDrumsOfBattle`), all 12 debuffs, the talents string, race, both
  professions, `reactionTimeMs 250`, every consumable that is a sim input, and
  the **entire encounter block** (180s ±5, level-73 Mechanical, armor,
  `parryHaste`). `exposeWeaknessHunterAgility` is 1080 on both sides — that lead
  is **confirmed dead**.

  So every suspect the iteration named — totemTwisting, drums, sappers, scrolls,
  duration variation, Mechanical/73, parryHaste, talents — was *already
  identical*, and there was nothing to toggle. Only three real differences:

  | field | owner | ours | verdict |
  |---|---|---|---|
  | **equipment** | different character, 10/17 slots | shredzepelin fixture | **DIFF, priced** |
  | **rotation** | `TypeSimple` (biteweave/mangleTrick) | `TypeAPL` (upstream default) | **DIFF, priced** |
  | `consumables.drumsId` | absent | `GreaterDrumsOfBattle` atop the party-level Lesser | no counterpart, unpriced |
  | `target.canCrush` | absent | `true` | no counterpart (format gap), unpriced |

  **The owner's baseline gear is not ours.** 10 of 17 slots differ — neck, back,
  waist, legs, both rings, trinket1, weapon, relic, plus a shoulder enchant. They
  benchmarked on a **different, better-geared character** (baseline 2264 vs our
  2152). Their legs have no sockets where shredzepelin's have three, so the
  package arm's socket accounting *inverts* between the two characters.

  Measured (seeds [11,22,33,44,55] @ 3000 iters, pinned CLI v0.0.101, every arm
  built through the real `equipmentForCandidateSwap`):

  **103 — T6 four-piece delta** (ground truth +97):

  | | our APL | owner's TypeSimple |
  |---|---|---|
  | our gear | **+64.48** (= stored +64.07) | +113.73 |
  | owner gear | +56.55 | **+87.63** |

  **106 — CURSED − VENG** (ground truth ~+10):

  | | our APL | owner's TypeSimple |
  |---|---|---|
  | our gear | **+0.15** (= stored −0.084) | +6.75 |
  | owner gear | +4.64 | **+7.78** |

  Both ground truths substantially reproduce: **+87.63 vs +97** and **+7.78 vs
  ~+10**, resolvable on every paired seed. The single-digit residues are
  plausibly the owner's 25000 iterations, a different seed, and round numbers
  read off a UI — closing them needs exported *results*, not settings.

  The two differences **do not superpose**: the rotation is worth +49 on our
  gear but +31 on the owner's.

- **Verdict**: **Both tickets are resolved, and the answer is not a bug.** Our
  pipeline was measuring correctly the whole way down — the disagreement was two
  legitimate differences in what was being measured: a different character's
  gear, and a different rotation. The rotation is the dominant lever, and it is
  **our choice, not the owner's error**: our skeleton pins upstream's default APL
  while the owner plays the `TypeSimple` biteweave/mangleTrick preset.

  This retroactively vindicates the loop's discipline. The apparent bug was never
  in the code; every mechanism we were dispatched to catch was genuinely absent,
  and each falsification was correct.

- **Next step**: no further measurement. Write findings into 103/106, unblock
  both from ticket 72 (the export it was blocking on has arrived and done its
  job), and put the rotation question to the owner as a proposal — it is a
  `data/presets/feral/` change gated by `pnpm sim-defaults:check`, i.e. a
  `data-pipeline-work` job, and a judgment call about which rotation the tool
  should model. **Propose, do not implement.**

## Final disposition

The loop closes with **no production change and no spec amendment**, which is
the correct outcome: seven candidate mechanisms were falsified by experiment,
and the residue turned out to be a comparison mismatch rather than a defect.

Three items for the owner, none implemented:

1. **Rotation mismatch** (the big one). Our skeleton pins upstream's default APL;
   the owner's run uses `TypeSimple` biteweave/mangleTrick, worth +49 DPS on our
   gear. Which rotation should the tool model? A `data/presets/feral/` change
   gated by `pnpm sim-defaults:check`.
2. **Double drums** — our skeleton specifies `partyBuffs.drums` Lesser *and*
   `consumables.drumsId` Greater. Unexplained; **untested** whether additive,
   overriding, or ignored.
3. **Incidental smell, out of scope**: our shredzepelin baseline contains item
   ids **278827** and **278819**, outside the TBC range, resolving to non-TBC
   names in the pinned db. Possibly a fixture or id-mapping issue — filed as
   ticket 108.

Reverse-direction artifact produced for the owner to verify parity from their
side: `our-settings-for-web-import.json` plus `our-settings-for-web-import.md`,
the note stating which fields were constructed (`name`, empty slot 15) and which
could not be represented (`canCrush` has no field in the export format).

## CORRECTION — the v1 export carried the wrong gear

The owner reports the equipment in their first export was wrong. The corrected
export is `owner-settings-export-v2.json`. **This invalidates iteration 6's
headline conclusion**, which I had already reported as fact — recorded here in
full rather than quietly amended.

Verified directly (`python -c`, iteration 7's log carries the command verbatim):
v1 and v2 are **identical apart from equipment**
(`json.dumps(..., sort_keys=True)` equality with `equipment` nulled), and their
item ids differ in 8 slots.

### The true diff: same character, not a different one

Corrected owner gear vs our fixture-derived baseline — **15 of 17 slots carry
the identical item id**, and the two that differ are the *same two rings in
swapped slot order*:

| slot | owner v2 | fixture | |
|---|---|---|---|
| 10 | 30834 Shapeshifter's Signet | 30052 | swapped pair |
| 11 | 30052 Ring of Lethality | 30834 | swapped pair |

Set-wise the equipment is **identical**. Two same-item slots differ in trim:
slot 2 enchant `2986` vs `2983`, and slot 9 gems `[24028, 24058]` vs
`[24028, 24028]`.

So iteration 6's "the owner benchmarked a different, better-geared character
(10 of 17 slots, baseline 2264 vs 2152)" was computed against gear the owner
does not have, and is **withdrawn**. The +87.63 and +7.78 figures were measured
on that wrong gear and are withdrawn with it.

The corrected gear also **contains the two out-of-range Ahune ids** 278827 /
278819 that ticket 108 flagged in our fixture — they are the owner's real neck
and back. That makes 108 a live discrepancy channel rather than a fixture smell,
because wowsims web and our pinned db may resolve those ids differently, and
they now sit in the baseline arm of every comparison.

### Iteration 7 — dispatched

- **Hypothesis**: with the corrected gear ≈ our fixture, the "our gear under
  TypeSimple" figures from iteration 6 (**+113.73** package, **+6.75** helm gap)
  become the owner-gear figures, and the residue against the owner's +97 / ~+10
  is rotation + iterations + Ahune-id resolution rather than gear. **To be
  verified, not assumed** — iteration 6 is exactly why.
- **Subagent**: `07-corrected-gear` → `07-corrected-gear.md`.
- **Result**: the hypothesis was **half right, and the half that failed matters
  more.**

  **Baseline on corrected gear: 2219.82** (owner's TypeSimple) / **2170.01**
  (our APL). Our stored 2152.0998 reproduces exactly on the fixture; the
  corrected gear sits **+17.9** above it under the same rotation, all of it
  trim. Iteration 6's wrong-gear **2264** is withdrawn — the real owner baseline
  is ~94 DPS lower than that.

  **(a) T6 four-piece = +113.42** against the owner's **+97**. This matches
  iteration 6's "our gear" column (+113.73) within noise, confirming the
  gear-is-effectively-ours prediction — **but it overshoots the owner by 16.4
  DPS**. Iteration 6's +87.63 *undershoot* is withdrawn, and the residue has
  **inverted sign**.

  **(b) CURSED − VENG = +8.61** against the owner's **~+10**. This does *not*
  match iteration 6's +6.75; it is +1.86 higher, and 07 attributed the shift by
  isolated measurement rather than assumption: feet gem 24028→24058 accounts for
  +1.52, shoulder enchant +0.29, ring enchants ~0 (sum +1.78 vs measured +1.86).
  **(b) is essentially closed** — plausibly rounding.

  **A trim difference my own diff missed**: the owner's rings *both* carry
  `enchant: 2929` (Enchant Ring – Striking, Enchanting-only, which their export
  declares) where our fixture carries none — worth **+11.59 DPS** on the
  baseline. Slots 10/11 are not merely swapped order, and my correction section
  above understated the diff. Recorded rather than silently fixed.

  **Ticket 108's premise is falsified.** 278827 / 278819 resolve to `phase: 2`,
  ilvl-128 **epic TBC** items. All nine out-of-range ids form one coherent
  Ahune / Frost Lord block (including `Frostscythe of Lord Ahune`) — an upstream
  Midsummer re-release at TBC Phase-2 item levels, **not** a Wrath id collision.
  Each name is unique in the db, so 108's proposed remediation has nothing to map
  to. The sim pays their full stats: emptying both slots costs ~**+96 DPS**, so
  they are not silently zero.

  **Web-side resolution could not be determined locally, and 07 did not guess.**
  The vendored db *is* upstream's own `assets/database/db.json` at the pinned
  commit, and the owner's export carries bare ids with no embedded stats.
  Settling it needs the owner's tooltip stats, their web build string, or an
  exported result. **Sizing**: both ids sit in the baseline arm and neither the
  package nor either helm touches neck/back, so a mis-resolution shifts the
  absolute baseline but **nearly cancels in the deltas** — negligible for the
  +113 / +8.6 figures (hypothesis, bounded from structure plus the +96
  measurement).

- **Verdict**: **gear is no longer an explanation for anything**, and the loop
  is not finished. (b) is closed. **(a) is not**: the −16.42 residue is ~53× the
  seed spread (0.31 DPS at 3000 iters, ~0.1 at 25000), so **iteration count and
  seed cannot account for it** — it needs a mechanism.

  This is the second time a confident closing story has been overturned, so the
  correct posture is to reopen 103 rather than re-close it with a new narrative.
  The strongest untested lead, from 07: our package applies four *sequential*
  swaps through `equipmentForCandidateSwap`, re-gemming as it goes, where the
  owner clicking four items in the UI keeps their gems. Iteration 3 priced that
  at ~0 — **but only under the APL rotation**, and 07's own trim measurements
  prove the rotation changes what stat mixes are worth. That is a real gap in
  the earlier falsification, not a restatement of it.

- **Next step**: iteration 8 — re-price the sequential-swap gem mechanism under
  the **TypeSimple** rotation on corrected gear, the one lead that survives and
  the one place iteration 3's falsification was conditional.

### Iteration 8 — dispatched

- **Hypothesis**: the −16.42 package residue is the sequential re-gemming our
  builder performs across four swaps, which iteration 3 priced at ~0 under the
  APL rotation but which may be worth real DPS under TypeSimple.
- **Subagent**: `08-sequential-gems-typesimple` → `08-sequential-gems-typesimple.md`.
- **Result**: **a real defect in our code, worth 10.43 DPS — 64% of the
  residue.** On corrected owner gear under TypeSimple, seeds [11,22,33,44,55] @
  3000 iters, pinned CLI v0.0.101:

  | arm | delta | vs owner's +97 |
  |---|---|---|
  | `PKG_PROD` (production; byte-identical to 07's arm) | **+113.42** | −16.42 |
  | `PKG_FILL24028` (fill, using a gem the owner owns) | +111.72 | −14.72 |
  | `PKG_UIMIGRATE` (**true wowsims UI semantics**) | **+102.99** | **−5.99** |

  `PKG_PROD` reproduces 07's +113.42 and baseline 2219.82 to the digit.

  **The UI semantics were settled from upstream source, not inferred.** Upstream
  `ui/core/proto_utils/equipped_item.ts` at the pinned commit `8aa378b`:
  `EquippedItem.withItem` (:138-168) migrates gems colour-matched-then-eligible,
  drops overflow, and **leaves leftover sockets null — it never auto-fills**.
  Our `migrateGemsToItem` is a faithful port of exactly that. The divergence is
  the step we run *afterwards*: **`fillEmptyCandidateGems` has no upstream
  counterpart on the equip path.**

  **The mechanism is one gem in one slot**, not cross-slot re-gemming. The
  `PKG_UIONLY_*` intermediates put shoulder/chest/legs exactly on `PKG_PROD` and
  hands exactly on `PKG_UIMIGRATE`. The owner's worn gloves 29947 have **no
  sockets**, so migration leaves T6 gloves' single socket empty and production
  EP-fills it with 32194 — a phase-3 epic +10-agi gem **the owner wears
  nowhere**. No `repairMeta` rewrite occurs anywhere (no meta socket on any T6
  piece), so the "sequential swaps re-gem as they go" framing was wrong.

  **Correction to this log's own record**: I wrote above that iteration 3
  "priced that at ~0" and that its falsification was merely *conditional on the
  rotation*. That was too generous to it. **Iteration 3 never tested this at
  all** — all three of its arms (`PKG_PROD`, `PKG_FILLER`, `PKG_BESTGEMS`)
  *fill* the hands socket; it varied *which* gem, never *whether*. Measured
  properly the mechanism is worth **−7.76 under APL** and **−10.43 under
  TypeSimple**: the rotation-dependence is real (+2.67) but is a modifier, not
  the mechanism.

  Tested and cleared: set bonuses (identical set membership in both package arms
  — Malorne 2pc broken, Thunderheart 4pc gained), the T6 ids (all four are
  setId 676 Thunderheart Harness, no plausible alternate), and socket bonuses
  (every T6 socket yellow/blue, every migrated gem red, so unmet in *both* arms).

- **Verdict**: **the loop has found a genuine defect, and it is ours.**
  `fillEmptyCandidateGems` invents a gem the player does not own and would not
  receive by equipping the item, inflating package deltas by ~10 DPS on this
  swap. That is a real overstatement to the user, and unlike everything else this
  loop chased, it is grounded in upstream source rather than in a narrative.

  **−5.99 DPS remains open and is deliberately not attributed.** It is ~19× the
  seed spread, so iteration count and seed cannot cover it. Given this loop has
  twice reported confident closures that were overturned, the residue stays an
  open question rather than getting a third story.

  **The +97 itself is now a legitimate suspect, and this must be said plainly.**
  We have never seen that run. The v2 export is settings-only — no results, no
  iteration count (`bonusStats` all zero, `itemSwap` empty, so neither hides a
  confound). The +97 *predates* the export, and this loop was already burned once
  by an export carrying gear the owner did not have. "+97" is also a round
  number: if the true value is ≥100, the residue is inside reporting precision.

- **Next step**: no further measurement from our side can close −5.99. Write the
  defect into ticket 103, file the `fillEmptyCandidateGems` bug as its own
  ticket with a spec question attached, and ask the owner for the four artifacts
  below. **Do not implement the fix** — see the spec question.

## Final disposition (iteration 8)

**One real defect, one bounded open residue, no fix implemented.**

### The defect — for a new ticket, not implemented here

`fillEmptyCandidateGems` fills sockets that upstream's equip path leaves empty,
with gems the player may not own (here 32194, a phase-3 epic). Worth **−10.43
DPS** of overstatement on the T6 package under TypeSimple, **−7.76** under APL.

This is **not** a straightforward bug fix, because it collides with a settled
decision: spec §2.2 step 1 requires byte-identical gem policy between package
and single swaps, and the fill exists so candidate items are not penalised for
arriving with empty sockets. Removing it changes what every candidate delta
means. **This needs a spec decision from the owner before any code moves** —
propose, do not implement. Filed as ticket 111.

### What the owner can settle that we cannot

1. An exported sim **result** (not settings) for baseline and package at a
   stated iteration count — one artifact that would close or localise the whole
   −5.99.
2. Their **gloves socket state after equipping 31034** — directly tests the
   load-bearing premise of the 10.43.
3. Their web **build string** vs our pinned `v0.0.101`.
4. How precisely **"+97"** was read off the UI.

## ORACLE DATA ARRIVED — the owner ran the protocol on wowsims web

`owner-web-results-2026-08-11.md`. Two headline confirmations and one number
that does not reconcile.

**Ticket 111's premise is confirmed at the source.** The web's own export for the
package arm carries `{"id":31034,"enchant":2564,"gems":[0]}` — **the gloves
socket is empty**. wowsims left the migrated-in socket unfilled, exactly as
upstream `equipped_item.ts` said it would. Our `fillEmptyCandidateGems` fills a
socket the oracle leaves empty. This is no longer an inference from source; it is
observed behaviour of the tool we treat as ground truth.

**"+97" reproduced as +98.17** (2245.60 → 2343.77, ±73/±75, 12500 iters).

### Iteration 9 — reconciliation arithmetic (director, no subagent)

All figures below from `python -c` computations recorded in
`09-reconciliation.md`.

**Owner's package delta**: 98.17, SE 0.936 (SE(base) 0.653, SE(pkg) 0.671 from
per-iteration stdevs 73/75 at n=12500), 95% CI **96.34 … 100.00**.

**Our `PKG_UIMIGRATE`**: 102.99 (base 2219.82, arm 2322.81; seed spreads 0.187
and 0.231). Reported per-iteration stdev 126.4 at 3000×5 = 15000 effective
iterations gives SE per arm 1.032, SE(delta) 1.459.

| comparison | gap | combined SE | z | verdict |
|---|---|---|---|---|
| package: ours 102.99 vs owner 98.17 | **4.82** | 1.734 | **2.8** | **does NOT close** |
| helm A/B: ours 8.61 vs owner 10.69 | 2.08 | 1.616 | **1.3** | **closes** |

**Package: the 4.82 does not close statistically** (95% CI on the gap
1.43 … 8.22, excluding zero). Per the standing instruction, it is named as the
remaining open quantity at **4.82 ± 1.73 DPS** and given no new story.

**Helm A/B: closes at z = 1.3**, and the arms were not even like-for-like — the
owner's carry 24067 body gems ours do not. Owner's +10.69 (SE 0.693, 95% CI
9.33 … 12.05) against our +8.61. **106's residue is closed.**

### The absolute baseline offset is real and is *not* the package explanation

Web 2245.60 vs engine 2219.82 on identical v2 gear: **25.78 DPS, z = 21.1** —
overwhelmingly real, not noise.

Critically, it does **not** explain the package gap, and I tested this rather
than assuming: if the offset were *proportional*, scaling our delta to the
owner's baseline gives 104.19 against their 98.17 — a **worse** residual (6.02)
than the 4.82 we started with. Owner's package is +4.372% of baseline; ours is
+4.640%. So the two discrepancies are **distinct**, and a constant offset
cancels in deltas exactly as the coordinator noted.

### Iteration 10 — dispatched

- **Hypothesis**: the 25.78 DPS absolute offset is attributable to a concrete
  input difference — Ahune item stat resolution in our pinned db vs the live
  web, ring-enchant handling, or build drift (the web is an unversioned alpha,
  "tbc new").
- **Subagent**: `10-baseline-offset` → `10-baseline-offset.md`.
- **Result**: **the leading candidate died, and the loop's framing changed.**

  **Payload diff: byte-identical.** Our `PKG_UIMIGRATE` against the owner's
  exported package payload — **17/17 slots identical, same order**, every id,
  enchant and gem, including the empty gloves socket `[0]` on 31034 and the
  empty slot 15. Not "identical modulo ordering" — identical outright. **This
  localizes the 4.82 to the engine/build, not the inputs.**

  **Ahune stats match wowhead exactly**, killing my leading candidate. Wowhead's
  plain pages render via JS; the `?xml` and `nether.wowhead.com/tbc/tooltip/`
  endpoints work, and stat indices were anchored empirically off gems with known
  stats rather than assumed:

  | 278827 Amulet of Bitter Hatred | ours | wowhead |
  |---|---|---|
  | ilvl / quality | 128 / epic | 128 / epic |
  | agi / sta | 22 / 20 | 22 / 20 |
  | melee + ranged AP | 48 / 48 | 48 / 48 |
  | hit rating | 20 | 20 |

  | 278819 Frost Lord's War Cloak | ours | wowhead |
  |---|---|---|
  | ilvl / quality | 128 / epic | 128 / epic |
  | agi / sta | 25 / 24 | 25 / 24 |
  | melee + ranged AP | 56 / 56 | 56 / 56 |
  | armor | 108 | 108 |

  Ticket 108's falsification now rests on an external source too.

  **Attribution of the 25.78: only ~1.3 DPS (5%).** Ring enchants 2929 are
  present and honored (removing them costs −11.62, matching 07's +11.59 from the
  other side) but are **wrong-signed** to explain us being lower. The
  double-drums and `canCrush` leads, carried unpriced since iteration 6, are
  **+0.00, bit-identical per seed** — both closable. Iteration count to the
  owner's 12500 accounts for **+1.30**, the only attributed term. **~24.5 DPS
  (95%) is unattributed**, with build drift the residual by *elimination* and
  flagged as hypothesis, not measurement.

  **The headline — the two quantities are one:**

  | arm | owner | ours | offset | relative |
  |---|---|---|---|---|
  | baseline | 2245.60 | 2219.82 | **+25.78** | +1.161% |
  | package | 2343.77 | 2322.81 | **+20.96** | +0.902% |

  The offset is **neither constant nor proportional**, and the difference
  between those rows *is* the 4.82. So iteration 9's conclusion that the package
  gap and the baseline offset are "distinct" is **wrong**: they are **one
  arm-dependent offset sampled twice**. It therefore does **not** cleanly cancel
  in deltas — roughly 80% cancels, 20% does not — and any future candidate must
  explain an offset that is *smaller on the arm carrying T6 4pc*.

  **A correction to my own iteration 9**: I used a per-iteration stdev of 126.4;
  the actual `raidMetrics.dps.stdev` is **74.77** (verified directly — my loop
  took the first `stdev` it found, from another arm's file). Corrected, the
  package gap is **4.82 ± 1.27, z = 3.8** (95% CI 2.32 … 7.32), the offset
  **z = 28.8**, and the helm gap **z = 1.9**. Every verdict stands; the package
  residue *hardens*. Tightening the bars cut against my own conclusion, which is
  the honest direction.

- **Verdict**: **both tickets close on their own terms; one bounded quantity
  stays open and is now well-characterised.** 106 is fully resolved. 103's
  substantive defect is confirmed at the oracle. What remains is not a mystery
  about our gear or our inputs — those are proven identical — but a ~1% engine-
  or build-level offset against an unversioned web alpha, of which ~20% fails to
  cancel in deltas.

## FINAL DISPOSITION — the loop is closed

**What was actually wrong, after ten iterations:** one thing, in our code.
`fillEmptyCandidateGems` fills a socket that wowsims leaves empty. Everything
else the loop chased — gem mangling, dead metas, wrong item variants, socket
capacity, artifact displacement, meta tax, stale fixtures, out-of-range ids —
was falsified by experiment.

**Confirmed at the oracle**: the web's own export carries
`{"id":31034,...,"gems":[0]}`. Ticket 111's premise is no longer an inference.

**Numbers that reconcile:**

| comparison | ours | owner | verdict |
|---|---|---|---|
| helm A/B (106) | +8.61 | +10.69 | closes, z = 1.9 |
| package, UI semantics (103) | +102.99 | +98.17 | 4.82 ± 1.27 open, z = 3.8 |
| package, as shipped today | +113.42 | +98.17 | **the 10.43 defect** |

**Open and named, no story attached**: one arm-dependent offset — 25.78 DPS on
the baseline, 20.96 on the package, difference 4.82. ~1.3 attributed to
iteration count; ~24.5 unattributed, build drift the residual by elimination.

**The one artifact that would close it**: the web build string. It was a
nice-to-have when I first asked; it is now load-bearing, since inputs and item
stats are both proven identical. A cheap second ask, from iteration 10: one more
like-for-like web arm pair touching neither neck/back nor a set bonus, which
would test whether the coupling is about T6 4pc or simply about DPS level.

The offset is carried forward as **ticket 113**; ticket 103 closes.
