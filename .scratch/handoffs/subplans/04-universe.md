# Sub-phase 4 plan: universe assembly and the recall measurement

**Status:** Plan. Not implemented. Do not touch `packages/`, `scripts/`, or `data/`.
**Date:** 2026-07-28
**Parent:** `.scratch/handoffs/raid-scoped-pool-plan.md`, sub-phase 4 (§8).
**Depends on:** sub-phase 1 (AtlasLoot parse), sub-phase 2 (tier tokens and
crafted-recipe zones), sub-phase 3 (Wowhead ret lists). None of those
deliverables exist yet at the time this plan is written — see "Sequencing"
below for what that means for scheduling this sub-phase.

---

## 0. What this sub-phase is for

Every recall number produced so far — in
`.scratch/handoffs/raid-scoped-pool-spike.md` §2 and §5 — was measured against
a 191-item set. That set is the union of the current EP-based pool and
wowsims' own best-in-slot gear lists. It cannot contain an item that neither
of those two sources ever included, so no rule has ever been tested against an
item it would be genuinely blind to. The spike's own §5 correction makes this
concrete: the caster-stat-reject rule looked 100% safe only because the test
character, slamaltman, already wore the best libram in the game. Give that
rule a character with a worse libram and it deletes a real upgrade, and the
191-item set has no way to show that, because it contains no libram upgrade to
lose.

This sub-phase builds the first candidate set large enough to close that gap:
the full raid-scoped, list-scoped, two-hop-scoped universe for one phase,
simulated in full. Then it checks every proposed narrowing rule against that
result, instead of against the old 191-item set.

If the assembled universe turns out to be small enough to simulate directly —
the spike's own numbers suggest it will be, at roughly 200 to 310 items — then
the correct outcome of this sub-phase is: **no narrowing rule ships**. That is
stated as a possible, and preferred, result in §5.

---

## 1. Assembly

### 1.1 Inputs

Three sources, each already scoped by an earlier sub-phase:

| Source | Sub-phase | What it contributes |
|---|---|---|
| Raid loot tables | 1 (AtlasLoot parse) | item IDs with a resolved `{zone, boss}` for a given phase's raids |
| Wowhead ret lists | 3 | item IDs Wowhead calls out for a phase, with the list section they came from |
| Tier tokens and raid-recipe crafts | 2 | item IDs reached through a token or a crafted recipe, each carrying the zone of the intermediate object |

A fourth source is already available and does not need a new sub-phase:
`db.json`'s own `sources[]` field, which the spike's Task 1 script already
reads. It resolves 1443 of 4212 ret-eligible items (34%) on its own and is the
base the other three sources extend.

### 1.2 Merge procedure

1. Start from the D7-eligible universe (4212 items — see §2 below for the
   exact rule). This is the maximum any assembled universe can be; nothing
   outside D7 eligibility is admitted regardless of source.
2. For each eligible item, collect every source that names it: `db.json`
   direct, AtlasLoot loot-table entry, Wowhead list entry, token mapping,
   crafted-recipe mapping. An item can have more than one.
3. Filter to the target phase using the phase-to-zone map already built for
   the spike (`.scratch/loot-universe-spike/phase_zones.json`), union
   carryover policy — all raids at or below `maxPhase`. This is the policy the
   spike recommends in its §1 and the parent plan's sub-phase 0 asks to be
   decided; if sub-phase 0's decision differs, use that decision instead and
   note the discrepancy in this sub-phase's output.
4. An item with no zone under any of the four sources is **out of the
   phase-scoped universe** for this pass. It is still in the D7-eligible
   4212, just not simulated this phase. Track the count so the "how many
   items are we still blind to" number stays visible run over run.

### 1.3 Merged record shape

One row per item per phase-scoped universe, minimally:

```
{
  itemId: number,
  name: string,
  slot: string,          // ret pool slot, 17-slot mapping per PLAN.md §8.4
  armorType: number | null,
  handType: number | null,
  quality: number | null,
  phase: number,          // item's own phase field from db.json
  sources: ItemSource[],  // PLAN.md §8.3.2 discriminated union, one entry per contributing source, non-empty
  ep: number,              // carried through for rule evaluation only, never for membership (D1/D2)
}
```

`ItemSource` is the type already specified in PLAN.md §8.3.2 — do not invent a
second source shape for this sub-phase. A token-sourced item's `ItemSource`
carries the **token's** drop zone, matching PLAN.md §8.3.2's explicit
instruction; a crafted item's carries the recipe's drop zone. Both are
two-hop cases and both are handled by sub-phase 2, not here — this sub-phase
consumes whatever mapping sub-phase 2 produces and treats a token/crafted item
exactly like a direct-drop item once its zone is resolved.

### 1.4 Deduplication and conflicting sources

An item named by more than one source is **not** a conflict — it is
corroboration, and the merge keeps every contributing `ItemSource` entry on
the one row (`sources: ItemSource[]`, not a single `source`). Two sources
naming the same item with different zones (for example, a badge vendor and a
raid drop for the same item ID, which does happen — see D9/badge-vendor
policy from sub-phase 0) is not an error either; both entries stay, and the
raid filter matches if any entry's zone matches.

The only real conflict case is stat or slot disagreement between `db.json`
and a hand-collected source (Wowhead list, AtlasLoot) for the same item ID —
for example, AtlasLoot recording an item at a slot position that does not
match `db.json`'s `armorType`/slot fields. This should be rare, because item
ID is the join key and stats come from `db.json` only; AtlasLoot and Wowhead
lists contribute zone/source metadata, never stats. Log any such mismatch by
item ID and name; do not silently prefer one side. If sub-phase 1 or 3
reports zero such mismatches when parsing, this sub-phase should still assert
on the join, not assume it.

### 1.5 Missing source is a build failure

This restates PLAN.md §8.3.1/§8.3.2 for the assembled universe specifically:
every row in the merged universe must carry at least one non-null
`ItemSource` entry, or assembly fails. This is stricter than the existing
pool generator's behavior today, which currently allows `source: null`
(§8.3.2) with a diff-mode warning. That leniency was designed for a
stats-first pool where a missing source only means "this filter tab is
degraded." A raid-scoped universe has no other membership mechanism —
`source` **is** how an item gets into the universe at all, so a null source
here is not a degraded filter, it is a missing candidate. Assembly must
reject, not warn.

---

## 2. Eligibility and the junk filter, restated precisely

### 2.1 D7 eligibility

From the parent plan's decision D7, exactly as decided, no changes:

- Body slots (chest, legs, head, hands, feet, wrist, waist, shoulder, back,
  neck, finger, trinket) accept armor type plate, leather, or mail.
  Cloth is excluded.
- Ranged slot accepts librams only.
- Weapons are two-handed, excluding staves and excluding polearms (D8 —
  polearms are a deliberate product-scope exclusion, not a rules
  misunderstanding; paladins can equip polearms in TBC).
- Kael'thas encounter-only legendaries are excluded. Twinblade of the Phoenix
  is kept (it is a normal boss drop, not an encounter-only item).
- Quality floor and other membership knobs (badge vendors, PvP gear) come
  from sub-phase 0's decisions, not from this document. If sub-phase 0's
  output is not yet written when this sub-phase starts, note that as a
  blocking dependency (§6) rather than guessing.

This is the rule that produces 4212 ret-eligible items, measured by
`.scratch/loot-universe-spike/size_universe.cjs` and reproducible by rerunning
`node .scratch/loot-universe-spike/size_universe.cjs`.

### 2.2 The junk filter

Exact definition, reproduced from the spike's §2.3 and §3.3, because both the
definition and its exemptions must ship together as one rule, not
separately:

An item is rejected if:

1. It carries no melee-relevant stat (strength, agility, attack power, melee
   hit, melee crit, melee haste, armor penetration, expertise) **and**
   carries at least one caster-only stat (intellect, healing power, spell
   damage or any school variant, spell hit, spell crit, spell haste, spell
   penetration, spirit). An item with no stat block at all — a pure
   equip-effect item — is not rejected by this clause; absence of a stat
   block is treated as "unknown," not "junk."
2. Separately, an EP floor (10th percentile within slot, from the exempted
   slot list only) applies, but **only** in weapon, feet, waist, hands, and
   wrist. These are the five slots where the earlier `ep-vs-sim-measurement.md`
   report showed a real, non-zero correlation between EP and simulated ΔDPS.

**Mandatory exemption, part of the rule's definition, not an optional
refinement:** ranged (libram) and trinket slots are excluded from both
clauses entirely. No EP floor, no caster-stat reject, applies to either slot.
The spike's §3.1 and §3.2 show why: every libram in the 191-item set scores
EP exactly 0 regardless of quality, because a libram's value is an effect,
not a stat line — an EP-based rule with no exemption deletes every libram,
good or bad. Trinkets show no EP-to-ΔDPS correlation at all (the earlier
report's ρ = -0.247, an anti-signal) — an EP-based rule on trinkets is not
conservative, it is arbitrary.

### 2.3 How much the filter removes, and what does the real work

Measured on the full 4212-item D7-eligible universe, with the exemptions
applied (spike §5, "Correction to the headline cut number"):

```
universe 4212 eligible -> caster-only rejects 500 (11.9%), keeps 3712
```

This is a real cleanup step, but it is not what makes the pool simulation-
sized. **Zone scoping does that work.** The spike's §1 measures roughly 201
items at maxPhase 2 (union carryover) and roughly 310 at maxPhase 3, both
already two orders of magnitude below the 4212-item eligible universe, before
the junk filter is even applied. State this order explicitly in any output
document from this sub-phase: zone scoping first, junk filter second, and the
junk filter's contribution is roughly a further 12% off whatever zone scoping
already produced — not the mechanism that makes 4212 tractable.

An earlier figure claiming the caster-stat rule removes about 32% was
measured without the mandatory ranged/trinket exemptions and must not be
reused (spike §2.4 and §5).

---

## 3. The recall measurement

### 3.1 What gets simulated

The full assembled, phase-scoped universe from §1, for **one phase** — recommend
maxPhase 2, because it is the smaller of the two spike-measured sizes (~201
items under union carryover) and because sub-phase 5 (rank wiring) will need
a working phase to wire against first. Do not simulate all five phases in
this pass; one phase, done rigorously, is the deliverable. A second phase can
follow the same method later if the exit criteria are not met.

No pre-narrowing before this run. Every item that survives §1 assembly and
§2.1 eligibility goes into the sim queue. The junk filter from §2.2 is **not**
applied before this run — it is one of the rules being evaluated against the
run's own results, alongside any EP-percentile cut and the plain "keep all"
baseline. Applying it first would make it untestable by the same method that
caught the libram problem.

### 3.2 Method

Reuse the existing harness at `.scratch/ep-vs-sim/measure.ts` rather than
writing a new one — it already implements single-slot swap-and-sim against a
fixed fixture character, gem-filling via `fillCandidateGems`, best-of-two
handling for the dual finger/trinket slots, and `setBreakNote` flagging. The
only change needed is `candidates.json`: point `CANDIDATES_FILE` at the
sub-phase 1 assembled universe instead of the current curated-pool-plus-BiS
list. The candidate shape `measure.ts` expects (`itemId`, `name`, `slot`,
`ep`, `quality`, `armorType`, `handType`, `phase`, `origin`,
`passesGenerator`) should be produced directly by the §1 assembly step so no
adapter script is needed between assembly output and the sim harness.

Fixed parameters, matching every prior measurement in this project so results
stay comparable:

- Seed 42.
- 3000 iterations.
- The pinned `wowsimcli` binary from `data/wowsims.lock.json` — do not sim
  against an unpinned or newer binary; a version drift would make this run's
  numbers incomparable to the 191-item baseline.
- Baseline character equipment from the existing fixture recording, per §4
  for why more than one fixture is needed this time.

Output: a results file in the same shape as `.scratch/ep-vs-sim/results.json`
(itemId, name, slot, ep, deltaDps, plus the metadata fields `measure.ts`
already writes), one file per fixture character used.

### 3.3 Evaluating narrowing rules against the run

Once the full-universe sim completes, run each candidate narrowing rule
against the *pre-sim* candidate list (exactly as `evaluate_rules.cjs` already
does for the 191-item set) and compare its keep/reject decision to what the
simulation actually measured:

- "Keep all" (no narrowing) — the baseline every other rule is judged against.
- The junk filter from §2.2, with its exemptions.
- Any EP-percentile cut proposed elsewhere in this project (10/25/50%, per
  the spike's §2), reported again on this larger, unbiased set even though
  the spike already found it unsafe on the smaller set — the point of this
  measurement is that a rule that looked bad on 191 items might look
  differently-bad, or a rule that looked safe might not be, on a set that
  actually contains items neither prior source held.

For each rule, report:

- Items it would have kept vs. rejected, as counts and as a percentage cut.
- Every item it rejects that the simulation shows as `deltaDps > 0` (loose
  upgrade) and every one it rejects at `deltaDps > +5` (strict upgrade),
  named individually — not just counted. The spike's tables in §2 are the
  format to match: name, ΔDPS, slot.
- Recall at both tiers, using the same denominator definition the spike uses
  (upgrades among the full simulated set, not among some other subset).

This reuses `evaluate_rules.cjs`'s method directly; only the ground-truth
file changes, from the 191-item `results.json` to this sub-phase's new
results file(s).

### 3.4 Wall-clock cost estimate

The 191-item run took 191 single-slot sims plus one baseline sim, each at
3000 iterations, all on the pinned CLI binary. The project has a timing probe
for exactly this number: `.scratch/ep-vs-sim/timing_probe.ts` runs one 3000-
iteration sim and prints elapsed milliseconds. That number has not been
captured in any committed artifact reviewed for this plan — rerun it before
committing to a schedule:

```
npx tsx .scratch/ep-vs-sim/timing_probe.ts
```

Given a per-sim time `t` from that probe, a run of `n` items costs
approximately `(n + 1) * t` wall-clock seconds if run serially (the existing
`measure.ts` loop is serial, one sim at a time, no parallelism). For a
~201-item universe (maxPhase 2, union carryover) that is roughly the same
order of magnitude as the 191-item run already completed — call it
comparable cost, since 201 is within 5% of 191 — say **untested** for the
exact minutes until the probe is rerun, rather than asserting a number. For a
~310-item universe (maxPhase 3), scale linearly from whatever the probe
reports: roughly 1.6x the maxPhase-2 cost, since sim count scales with item
count and iteration count and seed are fixed.

If more than one fixture character is used (§4), multiply again by the
fixture count — each fixture needs its own full pass, because a different
starting gear set changes which items are marginal.

This is affordable in the sense the parent plan already asserts: hundreds of
sims at 3000 iterations, not thousands. It is not free, and running it twice
by accident (once per fixture, unintentionally re-running the same fixture)
is the most likely way to overspend the budget — track which fixture/phase
combinations have already been run.

---

## 4. Fixture coverage

### 4.1 The problem, restated precisely

The 191-item measurement used exactly one character: `slamaltman`, recorded
in `test/fixtures/slamaltman.raw.json`. That character already wears the best
libram in the game. The spike's §5 shows this made the caster-stat-reject
rule look 100% safe purely by accident — the rule's only rejections were
librams, and slamaltman had no libram upgrade available for the rule to
delete. A different starting libram would have exposed the bug immediately.

This is not limited to librams. Any rule that interacts with what a
character already has equipped — a set-bonus-aware rule, an EP floor whose
"floor" is measured relative to that character's stat weights, a hit-cap-
aware rule — can look safe purely because one character's gear happened not
to expose the failure case. PLAN.md §8.3.3 already names hit cap as exactly
this kind of player-specific variable that a static, single-reference pool
cannot see.

### 4.2 Recommendation

At minimum, three fixture characters, chosen to differ on the axes a
narrowing rule is most likely to be sensitive to:

1. **A character with a weak libram equipped** (the direct fix for the
   confirmed bug in §5's spike correction) — this exposes whether a
   caster-stat-reject rule, or any rule touching the ranged slot, would
   delete a real libram upgrade.
2. **A character below the hit cap**, since PLAN.md §8.3.3 identifies hit
   cap as the dominant reason a static pool can misjudge an item for one
   player and not another. This tests whether an EP-floor rule's "floor,"
   calibrated on a capped or near-capped reference character, wrongly
   rejects an item that is actually valuable to a hit-starved character.
3. **A character with a different starting weapon tier** than slamaltman's
   recorded gear, since the weapon slot showed the single strongest EP-to-
   ΔDPS correlation (ρ = 0.85) of any slot in the earlier report — a rule
   that is safe at one weapon tier is not automatically safe at another, and
   this is the slot where being wrong is most visible.

Building these fixtures follows whatever process produced `slamaltman.raw.json`
already (a recorded gear log, per `slamaltmanOfflineRecordings` in
`packages/core/src/fixtures/`) — this plan does not prescribe a new recording
mechanism, only that at least three distinct starting-gear states are needed,
not one.

If building three full new fixture characters is judged too expensive for
this sub-phase's budget, the minimum acceptable substitute is: keep
slamaltman, but synthetically swap one slot (the ranged libram) to a weaker
libram before running the full-universe sim a second time. That is cheaper
than a new fixture and directly tests the confirmed failure mode from §5,
even though it does not cover the hit-cap or weapon-tier axes. State clearly
in this sub-phase's output which of the two options was actually done —
three fixtures is the target, one fixture plus one synthetic libram swap is
the documented fallback, and "one fixture, no swap" repeats the exact mistake
this sub-phase exists to fix.

### 4.3 What "coverage" means for the exit criteria

A narrowing rule is not validated by one fixture's 100% recall number. It is
validated by 100% recall (or a stated, accepted false-negative rate) across
every fixture actually run. If two of three fixtures show 100% recall and one
shows a dropped upgrade, the rule is not safe — report the failing fixture
and the item it drops, the same way §5's spike correction reports the libram
case, rather than averaging the three into one misleading number.

---

## 5. Exit criteria

1. **A per-phase universe of workable size.** For maxPhase 2, this means the
   assembled-and-eligible universe from §1 is fully simulated (§3), and its
   size is reported as a hard count, not the spike's lower-bound estimate —
   sub-phases 1 through 3 should have closed some of the zone-resolution gap
   the spike flagged, so this sub-phase's count should be equal to or larger
   than the spike's ~201, and that difference should be called out.
2. **A measured false-negative rate for any narrowing rule that ships**,
   against the full-universe simulation from §3, across every fixture used
   (§4), not against the old 191-item set. "Measured" means a rerunnable
   command and a results file, per this project's durable-claims rule — not
   a restatement of the spike's numbers.
3. **If the full assembled universe is already small enough to simulate
   directly in acceptable wall-clock time** — and the spike's sizing of about
   201 to 310 items suggests it will be — **the preferred outcome is that no
   narrowing rule ships at all.** Note that no wall-clock target has been set
   for this project. Measure the actual run time first, then ask the owner what
   is acceptable. Do not assume a budget exists. In that case this sub-phase's
   output should say so plainly: the junk filter from §2.2 may still be
   applied as a genuine cleanup step (it removes real junk, not marginal
   upgrades, per §2.3), but no EP-percentile or top-N style cut is needed if
   the unfiltered universe already sims in reasonable time. Do not invent a
   narrowing rule to ship if the measurement shows none is needed — that
   would repeat the exact mistake (D1) this whole redesign exists to
   correct.
4. Every claim in this sub-phase's own output document must point at a
   rerunnable command (the sim harness invocation, the rule-evaluation
   script, the timing probe) or say **untested**. No number from the spike
   should be restated as this sub-phase's own result without rerunning it
   against the newly assembled universe — the spike's numbers are about the
   old 191-item set and the 4212-item eligibility count, not about the
   universe this sub-phase builds.

---

## 6. Sequencing note

This plan is written before sub-phases 1, 2, and 3 have produced their
deliverables. Section 1's assembly procedure depends on all three. If this
sub-phase is picked up before those are done, the first action is to check
whether `.scratch/handoffs/subplans/01-atlasloot.md`,
`02-two-hop.md`, and `03-wowhead-lists.md` exist and have exit criteria met
(each sub-phase document states its own exit criteria in the parent plan
§8). If sub-phase 0's decisions document
(`.scratch/handoffs/subplans/00-decisions.md`) does not exist either, stop
and report that as the blocking gap rather than guessing carryover policy,
badge-vendor inclusion, or the quality floor — those decisions change §1.2's
merge procedure and §2.1's eligibility rule directly.

---

## 7. Out of scope for this sub-phase

- Landing to `dev` or merging.
- Simulating more than one phase in this pass.
- Building a new sim harness from scratch — reuse `measure.ts` and
  `evaluate_rules.cjs`, adapted for the new candidate source and, if needed,
  multiple fixture characters.
- Deciding sub-phase 0's open questions (carryover, badge vendors, PvP gear,
  quality floor) — this document assumes union carryover as the spike
  recommends, but defers to sub-phase 0's actual written decision if it
  differs.
- Wiring the assembled universe into `packages/core` or `scripts/` — that is
  sub-phase 5.

---

## What this document did not measure

Added after the writing review. Everything below is unverified and must not be
treated as established.

- **The size of the assembled universe.** The 201 and 310 item figures come from
  zone-scoped counts in the earlier spike, and they only cover items whose zone
  can already be resolved in `db.json` — 1,443 of 4,212. Once AtlasLoot fills the
  source gap, and once Wowhead list items are merged in, the universe will be
  larger. How much larger is unknown. Re-measure before treating the size target
  as met.
- **Wall-clock time for any universe size.** No per-simulation timing figure
  exists in this repo. The command to produce one is given in section 4, but it
  has not been run.
- **Recall of any narrowing rule at universe scale.** Every recall figure quoted
  here was measured on the 191-item set, which came from the current EP-based
  pool plus wowsims best-in-slot sets. Producing a real figure is the point of
  this sub-phase and has not been done.
- **Whether three fixture characters is enough.** Three is a judgment about
  covering distinct cases, not a measured sufficiency threshold.
