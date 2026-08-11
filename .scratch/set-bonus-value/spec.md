# Set-bonus prospective value — design + implementation spec

**Branch:** `feat/set-bonus-value` (off `dev`)
**Origin:** PLAN.md §14 Phase 3 flag — *"simulate set bonuses gained, not just broken … mechanism not decided"*. This spec decides the mechanism and scopes the implementation.
**Audience:** the orchestrator agent and its workhorse subagents. Every task below names its files, its tests, and its done-condition. Read `AGENTS.md` first; `pnpm verify` gates every commit.
**Companion:** `.scratch/set-bonus-value/research.md` — domain research (set list, whether each bonus is implemented in the pinned sim). If a claim there is marked unverified, treat it as a hypothesis.

---

## 1. What is already true (do not rebuild it)

- Every candidate is simmed as a **single swap on the player's full equipment** (`rank.ts` candidate loop), and the wowsims Go engine applies set bonuses from equipped item IDs. So `deltaDps` **already includes** a bonus gained when the swap itself crosses a threshold, and a bonus lost when it breaks one. The default ranking number is already correct as "value tonight" and **must not change**.
- `set-bonus.ts` detects the break case and emits the qualitative `setBonusNote`. Keep it.
- `data/items/index.json` carries `setId` / `setName` per item (`items.ts:76`).

**The gap:** a tier piece that does *not* cross a threshold by itself (e.g. the player's first Crystalforge piece) shows only its stat value. The player cannot see that it is a step toward a bonus, or what that bonus is worth. That prospective value is what this feature measures and records.

## 2. Measurement design (decided)

### 2.1 Do not split the bonus across pieces

A set bonus is gained and lost **atomically at a threshold** — the break case already proves this (breaking a 2pc loses the whole bonus, not half). Splitting its value per piece invents a fiction: no single below-threshold piece delivers any of it. So:

- The bonus's value is measured **once per (set, threshold)** and attached whole, with the context "you'd need N more pieces".
- A candidate whose swap crosses a threshold gets `crossesThreshold: true` and **no** prospective add-on — the value is already inside its `deltaDps`.

**Amendment, 2026-08-10 (owner decision).** The opt-in view may *organize member
rows by the whole-package figure*, and this does not reopen the rule above. The
distinction is exact: a split would give each of four pieces a different
quarter-share, inventing a per-piece value no piece delivers. Package mode gives
every member row of one package the **same** whole-package number, labelled as
the package's, precisely because it is not divisible. It is one measured figure
shown against several rows, not one figure cut into several.

The figure is `SetBonusValue.packageDeltaDps` — one sim of the assembled package
against the baseline — never the derived `bonusDps`. `bonusDps` is
`packageDelta − Σ singles`, which is the quantity ticket 90's `(k−1)·B` inflation
lands on; its suppression from sort keys stands unchanged. `packageDeltaDps`
carries the broken set's cost inside the measurement rather than derived back out
of it, so the confound never reaches it.

### 2.2 The measurement: completion-package synergy

For each relevant set `S` and threshold `t` (2 or 4, only thresholds with a DPS-relevant bonus per research.md, and only `t >` pieces currently worn):

1. **Completion package `P(S,t)`** — the player's equipment with enough additional pieces of `S` equipped to reach `t` pieces. Pieces already worn count. Missing pieces are chosen from **pool candidates of that set**, one per canonical slot, picking the piece with the highest individual `deltaDps` (already simmed in the main loop) per slot; ties break by item id. Each piece is applied with the **same per-slot swap helper the single-candidate path uses** (`equipmentForCandidateSwap`, applied sequentially per slot), so gem/enchant policy is byte-identical to single swaps — PLAN.md §9's symmetry invariant holds by construction.
   Note on naming: `data/pools/*.json` no longer exists — candidate membership lives in `data/universes/<spec>-p<N>.json` (research.md §1); "pool candidates" here means the engine's `PoolEntry` list as `rankUpgrades` already receives it.
2. **One extra sim** of `P(S,t)` (same seeds/iterations/skeleton as every other candidate; cached through the existing sim cache).
3. **Synergy** — the value the package delivers beyond its members' individual values:

   ```
   packageDelta(S,t)   = D(P(S,t)) − D(baseline)
   bonus(S,2)          = packageDelta(S,2) − Σ deltaDps(piece i, single swap) for the ≤2 added pieces
   bonus(S,4)          = packageDelta(S,4) − Σ deltaDps(all added pieces) − bonus(S,2)
   ```

   `bonus` is the set bonus plus residual stat interaction, measured together — label it "measured with the completion package", never as the bonus's isolated tooltip value. With the shared seed set the noise floor is well under the cutoff (PLAN.md §10), but report an `se` computed conservatively as `sqrt(Σ se_i²)` over the sims involved.

### 2.3 When it cannot be measured, say so

`bonus` is **absent with a machine-readable reason**, never zero. The reasons are the `unmeasured` union in §3:
- `not-implemented-in-sim` — research.md/V1 found no registration in the pinned Go source (simming it would measure 0 and present that as truth). Known case: **Nordrassil (641) 2pc** — the `Bonuses` map has no `2:` key (research.md §2.1);
- `insufficient-pieces` — the universe lacks enough pieces of `S` to build the package;
- `sim-failed` — the package sim failed; recorded like existing `simSkips`.

Distinct from unmeasured: a bonus that is implemented but moves no DPS (Crystalforge 2pc/4pc are mana/heal effects, Lightbringer 2pc is a mana proc — research.md summary table) will **measure ≈0 synergy. Report that number** — a measured ≈0 is a true answer about a DPS ranking, not a failure. The nearest-measurable rule below keeps it from burying a real later bonus.

**Nearest-measurable threshold.** A candidate's `nextThreshold` / `prospectiveBonusDps` point at the smallest threshold above `piecesAfterSwap` whose bonus is *implemented* in the sim (per V1's table); thresholds skipped over are still listed in `Ranking.setBonuses` with their `unmeasured` reason. Example: a first Nordrassil piece shows the 4pc Shred bonus ("needs 3 more pieces") because 2pc is `not-implemented-in-sim`.

### 2.4 Cost

≤ 2 thresholds × ~2 sets per spec/tier → **at most ~4 extra sims per run**, each cacheable. Negligible against the ~80-candidate budget.

## 3. Recording (type changes)

All new fields are additive. Bump `engineVersion` in `content-hash.ts` (output shape changed; cached rankings must invalidate). **No new `contentHash` input**: the feature always computes, and display is a view toggle.

```ts
// Ranking gains:
setBonuses?: SetBonusValue[];

export type SetBonusValue = {
  setId: number;
  setName: string;               // items.ts setName, falling back to `set ${setId}`
  threshold: 2 | 4;
  piecesWorn: number;            // in the logged baseline
  packageItemIds: number[];      // the added pieces, canonical-slot order
  packageDeltaDps: number;
  bonusDps?: number;             // §2.2 synergy; absent when unmeasured
  se?: number;
  unmeasured?: "not-implemented-in-sim" | "insufficient-pieces" | "sim-failed";
};

// RankedItem gains:
setContext?: {
  setId: number;
  setName: string;
  piecesWornBefore: number;
  piecesAfterSwap: number;       // ≥ before when the candidate joins the set
  nextThreshold: 2 | 4 | null;   // null when already at/above the top DPS threshold
  crossesThreshold: boolean;     // true ⇒ the bonus is already in deltaDps
  prospectiveBonusDps?: number;  // = matching SetBonusValue.bonusDps when below threshold
};
```

`setContext` is set on every candidate whose item has a `setId` in a set with any measured/attempted `SetBonusValue` — including the crossing case, so a renderer can say "completes 2pc (included in delta)".

## 4. Display (view + CLI + report)

- `ViewOptions` gains `withSetPotential?: boolean` (default off). It is **pure**: sort key becomes `deltaDps + (setContext?.prospectiveBonusDps ?? 0)` when on; `rank` stays the absolute default-order rank, never renumbered (PLAN.md §12 rule). No `contentHash` involvement — assert this in the existing view-gate test pattern.
- CLI: `--with-set-potential` flag; when a ranking has `setBonuses`, print a short block (set, threshold, pieces worn, measured bonus or the unmeasured reason). Per-item line shows `+X set potential (needs N more pieces)` under the flag.
- HTML report (`rank-report.ts`): a "with set" column/badge under the toggle semantics the report already uses for other optional facts; unmeasured states render their reason, not a blank.
- Disclosure: one standing-assumption line naming how the number was measured ("completion-package synergy, shared seeds") — the drawer's honesty rule (PLAN.md §9 R7).

### 4.1 Package mode (amendment, 2026-08-10 — owner decision)

The owner's rationale, in their words: the point is to show "yeah, this piece in
particular isn't worth breaking the T4 set bonus, but it's ultimately worth it",
and to let the reader **opt in** to letting that organize the shortlist, so they
can decide to start collecting tier without waiting to own three other pieces.

**What it does.** A row whose item id appears in a measured package's
`packageItemIds` carries `setContext.package`. Under package mode, such a row
sorts and displays by `package.deltaDps` instead of its own `deltaDps`, and
renders both: "this swap alone: −106.16 — part of 4pc package: +64.07 for the
whole package". Every member of one package shows the same figure (§2.1's
amendment). Only a **measured, positive** package is credited; a package that
measures ≤ 0 argues against itself and moves no row.

**Membership is keyed on `packageItemIds`, not `nextThreshold`.** The two
disagree exactly where this feature matters. At 0 pieces worn every single swap
lands at `piecesAfterSwap === 1`, so `nextThreshold` stops at an implemented 2pc
(ADR-0023's ticket-91 case) and a threshold-keyed lookup would reach two of the
four Thunderheart rows and miss the two the owner named.

**Delivery is an in-browser toggle, not a flag.** The report embeds both orders
at generation time — `data-delta` and `data-package` on every row and chip — and
a small inline `<script>` re-sorts the DOM it already has. `view.ts`'s comparator
and cutoff stay a build-time library; nothing reaches into them at request time.
The existing `--with-set-potential` CLI flag remains for the console printer, and
the HTML report carries the toggle regardless of the flag. This is the shape
`.scratch/handoffs/set-potential-weighted-toggle-scope-miss.md` §"What the
correct shape looks like" specifies, after a previous attempt shipped a CLI flag
and was reverted.

**Default order is untouched.** Toggle off is exactly today's view.

**Cutoff, and the ADR-0020 question.** The absolute cutoff does not move, and
`belowCutoff` is not recomputed from the package figure. ADR-0020 forbids a bar
that depends on the row set; that is not at issue here, but a second question is:
may a row that is below cutoff *on its own delta* appear in the opt-in shortlist
on its package figure?

**Decided: it may, and the shipped mechanism gets there without touching the bar
at all.** The report's package mode is a **re-sort of rows already rendered**,
not a re-partition — the shortlist chips are built from `belowCutoff` at
generation time and a below-cutoff member row keeps its `muted` class in every
mode. So the T6 shoulders rise to the top of their slot section under package
mode, showing +64.07 with their −106.16 beside it, while remaining marked as
below cutoff on their own delta. That satisfies the owner's intent (the rows
organize by the package figure and are impossible to miss) and ADR-0020's text
simultaneously: no threshold was moved, no row's `belowCutoff` was rewritten, and
the row's own sub-cutoff delta is displayed next to the figure that promoted it.
No conflict to flag.

**Ticket 103 qualifier.** `packageDeltaDps` holds the player's current gem policy
fixed (the package is assembled with the same sequential `equipmentForCandidateSwap`
single swaps use), so it reads conservative against a re-gemmed wowsims run —
+64.07 against a reported +97 on the shredzepelin P3 artifact. Disclosed on the
row line and in the control's note, per ticket 103's option 1. Not fixed here.

## 5. Verification tasks (do these FIRST, they gate the rest)

- **V0 (live binary, vendored `wowsimcli-v0.0.101-win32-x64`):** a manual run of §2.2's own formula, which also settles research.md's open `ExposeToAPL` question empirically. Use **Justicar 4pc** (Judgement of Command +10% — the one ret bonus certain to fire under the preset APL; Justicar 2pc buffs Judgement of the Crusader, which the APL may never cast, and Crystalforge is mana/heal, expected ≈0). On slamaltman fixture gear, with one shared seed, sim: `base`, `base+piece_i` for each of the four Justicar pieces filling head/shoulder/chest/hands (or legs), and `base+all four`. Compute `synergy = packageDelta − Σ singles` per §2.2. **Pass:** `synergy > 3 × √(Σse²)` and positive. If ≈0, first re-check the APL actually casts Judgement of Command before declaring failure. Record command lines + all numbers in `.scratch/set-bonus-value/verification.md`. **If V0 fails after that check, stop and report — the whole feature rests on it.**
- **V1:** cross-check research.md's "implemented in sim" table against the Go source at the pinned commit for every set shipped as measurable. Any bonus not found ⇒ `not-implemented-in-sim`.
- **V2 (after implementation):** same input, same seeds ⇒ identical `setBonuses` across two runs (determinism).

## 6. Implementation slices (sequential — each commits green before the next starts)

Slices 2–4 all touch `rank.ts`/`Ranking` consumers, so this is **not** a parallel fan-out.

### Slice A — pure set-value module
`packages/core/src/set-value.ts`: set counts over equipment (reuse/extend `set-bonus.ts` helpers), package selection given (pool entries, individual deltas, worn equipment), synergy arithmetic per §2.2 formulas, unmeasured reasons. Pure functions, no seams. Unit tests directly (allowed by AGENTS.md testing rules: intricate + independently valuable). Include: piece already worn counts toward `t`; ties by item id; insufficient pieces; 4pc formula subtracts 2pc bonus.

### Slice B — engine integration
`rank.ts`: after the candidate loop (individual deltas are inputs to package selection), build packages, sim them via the existing `readCachedSim`/`cacheSimResult` path, populate `Ranking.setBonuses` and per-item `setContext`. Package sim failures go to the substitutions/simSkips pattern, not silence. Bump `engineVersion` (the §3 bump — one edit, done in this slice). Interface tests with a synthetic responding sim that returns baseline+X DPS when equipment holds ≥2 items of a set id — synthetic sims are deterministic, so assert `bonusDps` equals X via `toBeCloseTo(X, 6)`, plus: crossing candidate gets no prospective; unmeasured on missing pieces; determinism (V2).

### Slice C — view + CLI + report
`view.ts` toggle + tests (sort changes, rank absolute, no hash/no sim — extend `view-gate.test.ts`); `cli.ts` flag + output block; `rank-report.ts` rendering. Follow §4.

### Slice D — docs
PLAN.md: replace the §14 "Flagged, not planned: simulate set bonuses gained" paragraph with a ≤6-line dated amendment stating the shipped mechanism (completion-package synergy, view toggle) and pointing at this spec. Done-condition: `.scratch/set-bonus-value/verification.md` exists containing V0 and V2 evidence, and PLAN.md no longer contains the phrase "mechanism not decided" for set bonuses. `docs/verification-log.md` is untouched (no phase gate box is involved).

## 7. Out of scope (do not build)

- Measuring the value of bonuses the player **already has** (the break case stays qualitative via `setBonusNote` — the loss is already in `deltaDps`).
- Multi-set interaction, cross-set packages, or ranking whole packages as recommendations.
- Any change to the default sort, the cutoff, or `contentHash` inputs.
- Web UI (Phase 3 owns it; the data + view layer land here so Phase 3 inherits them).

## 8. Acceptance (orchestrator's report must address each)

1. V0 evidence recorded; V1 table reconciled; V2 passes.
2. Default ranking output unchanged, shown by procedure: run the same fixture ranking on `dev` and on this branch; from the branch's `Ranking` JSON delete `setBonuses`, every `setContext`, and `contentHash`; from `dev`'s delete `contentHash`; the two objects deep-equal.
3. All slice tests green; `pnpm verify` green on the integrated branch tip.
4. CLI `--with-set-potential` demonstrated on a fixture universe run (paste output in the report).
5. Every unmeasured state reachable in tests renders a reason, never a silent blank or a zero.

---

## 9. Execution plan (for the orchestrator)

**Topology: sequential, not a fan-out.** Slices B–D all read or consume `rank.ts`/`Ranking`, so a `parallel-phase` worktree split fails its own disjointness check. One branch (`feat/set-bonus-value`, already created), one worker at a time, each slice committed green before the next starts. V0 runs before any code.

**Lanes (AGENTS.md model policy):**
- Orchestrator: Opus, effort medium. Owns sequencing, V0/V1, slice hand-offs, and the final report. Does not write slice code itself unless a worker stalls twice.
- Workers: one Sonnet-class subagent per slice (A, B, C, D). Each gets: this spec, its slice section, research.md, and the instruction to read AGENTS.md and run `pnpm verify` before committing.
- No sharp-lane review inside this execution — the delegating session runs `pre-merge-review` after the orchestrator reports. Do not run it yourself and do not land: never `pnpm land`, never merge to `dev`.

**Order:** V0+V1 (orchestrator, live binary at `vendor/wowsimcli-v0.0.101-win32-x64`, evidence to `verification.md`) → Slice A → Slice B (+V2) → Slice C → Slice D → final `pnpm verify` on the tip → report.

**Per-slice hand-off:** worker reports files touched, tests added, `pnpm verify` output tail, and any spec deviation. The orchestrator checks the slice's done-condition itself (not the worker's word) before dispatching the next.

**Stall rule:** a worker that cannot satisfy its done-condition after two attempts is stopped; the orchestrator records the blocker in its report rather than improvising a weaker substitute (AGENTS.md "Models and walls").

**Final report must address §8's five acceptance items, one by one, with evidence.**
