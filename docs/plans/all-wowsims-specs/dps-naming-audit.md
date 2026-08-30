# Audit: "dps" naming vs. "the objective"

**Status:** audit only. No code changed. Read-only survey of where the engine
baked the word `dps` into a name/type/field when the concept is really **the
ranking objective** — a value that a future non-DPS spec would fill with HPS
(healing) or TMI (tank survival).

**Why this exists:** the decision is DPS-only for now, but tanks came back
trustworthy ([`trustworthiness-probe.md`](trustworthiness-probe.md)), so a
"rank by any objective" refactor is a real future job. This is the map of what
it renames. Ground truth for the DPS-lock is [`foundation.md`](foundation.md) §3;
this goes broader than §3's headline list.

**Durable-claims discipline:** every row cites file:line. Counts say how they were
counted (a grep you can re-run). Verified against `packages/core/src` on
2026-08-30; the fork engine copy mirrors each symbol (see the two-copy note).

---

## 1. Summary

Three buckets:

- **Objective-in-disguise — 17 named symbols.** The debt: the name says `dps` but
  the concept is "the simmed objective / the ranked delta / the noise floor." A
  future refactor renames these to neutral vocabulary.
- **Genuinely DPS — 6 sites.** Correctly damage-specific; they would _not_ carry to
  a healing/tank objective. Listed so they are known to have been considered.
- **Display/copy — ~10 clusters.** User-facing "DPS" strings; change independently
  of the type refactor, and some legitimately stay "DPS" (a DPS spec's column
  really is DPS).

**The two-copy multiplier.** Every objective-in-disguise symbol exists in **both**
`packages/core/src` and the fork engine copy under
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/`, so a
refactor pays each rename twice unless the two-copy question (foundation §5) is
resolved first. Resolve that before starting, or the audit's blast-radius doubles.

**Orientation greps** (re-runnable in `packages/core/src`):
`grep -rn "deltaDps" . --include=*.ts | grep -v /dist/ | wc -l` → **96 occurrences /
10 files**; `grep -rn "\bdps\b" …` (case-sensitive) → **45 / 12 files**. And the
tell that there is no neutral seam to extend:
`grep -rn "\.hps\b\|\.tmi\b" . --include=*.ts | grep -v proto | grep -v /dist/` →
**empty**. The engine reads its objective only through a DPS-named channel.

---

## 2. Objective-in-disguise (the debt), ranked by blast radius

| #   | Symbol                                                                              | file:line                                         | What it really means                                     | Rename note                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`SimObservation.dps`**                                                            | `seams/sim-runner.ts:21` (+ fork copy)            | The seam field the whole engine reads the objective from | The root. Every runner produces it — `CliSimRunner` (`cli-sim-runner.ts:73–82`), `WasmSimRunner` browser collapse point `raidMetrics?.dps` (`adapters/wasm_sim_runner.ts:122–128`). Rename here forces every consumer. |
| 2   | **`RankedItem.deltaDps`**                                                           | `rank.ts:246`                                     | The ranked per-row delta                                 | **Widest single rename — 96 `deltaDps` sites / 10 files.** Sort key (`view.ts`), cutoff input, report figure, tab column (`upgrades_tab.tsx:247,347,1753`) all hang off it.                                            |
| 3   | **`Ranking.baseline.dps`**                                                          | `rank.ts:448`                                     | The anchor every delta is measured against               | Read at `rank.ts:842,1058,1227,1310`, `view.ts:400`, `cli.ts:371`, `upgrades_tab.tsx:1309,1318`.                                                                                                                       |
| 4   | **`Cutoff.absDps` + `CUTOFF_BY_SPEC` + `cutoffForSpec`**                            | `cutoff.ts:14,16,67,99`                           | The noise floor, in DPS units                            | **Semantically hardest, not just a rename.** TMI is not a throughput unit (foundation §4), so a per-objective floor must be _re-derived_, not relabelled. `√2 × absDps` set-bonus bar (`cutoff.ts:43`) rides along.    |
| 5   | **`SetBonusValue.packageDeltaDps` / `bonusDps` / `SetContext.prospectiveBonusDps`** | `rank.ts:373,374,320`; `set-value.ts:339,367,372` | The set-bonus value vocabulary                           | Threaded rank → `view.ts` → `rank-report-rules.ts` → `upgrades_tab.tsx`.                                                                                                                                               |

**The remaining 12 objective-in-disguise symbols** (lower blast radius, same bucket):
`IndividualDelta.deltaDps`; **`DpsSample` + `combineSe`** (`set-value.ts:301,304` —
type is literally `{ dps: number; se: number }`); `AddedPieceSample.deltaDps`;
`BestSwap.deltaDps`; local `baselineDps` (`rank.ts` throughout);
`DeadSlotRow.deltaDps` + `UNIQUE_EFFECT_GAP_DPS` + `runnerUpGapDps` (`dead-slots.ts`);
plausibility `baselineDps` params (`plausibility.ts`); `view.ts` locals
`effectiveDps` / `noiseFloorDps` (+ ~15 `noiseFloorDps` sites in the tab);
`ReportItem.alternateSlot.deltaDps`; and the report-figure function names
`packageSetPotentialDps` / `weightedSetPotentialDps` (`rank-report-rules.ts:700,756`).

---

## 3. Genuinely DPS (considered, ruled out — leave as-is)

These are correctly damage-specific and would not carry to a healing/tank objective:

- **Weapon-DPS pseudo-stat** — `assemble_universe.py:1295–1578`, EP `pseudoWeights.MainHandDps`. A real weapon-damage term.
- **Hit / expertise caps** — `caps.ts`, `cap-profile.ts`. Offensive-miss concepts.
- **`CONTRIBUTES_TO_DAMAGE` / `SURVIVAL_STATS`** — `caps.ts:289–303`. **Flag:** a tank objective would _invert_ this partition (survival stats become the objective), so it is damage-correct today but is exactly the seam a tank objective touches.
- **Crit-damage-multiplier reasoning** — `candidate-gems.ts:106–112`.
- **`IMPLEMENTED_IN_SIM` "DPS-relevant effect body"** — `set-value.ts:37`.

---

## 4. Display / copy (change independently of the type refactor)

~10 clusters of user-facing "DPS" — report headers, the tab's delta column label,
CLI output strings, JSDoc that says "DPS" to the reader. Some legitimately stay
"DPS" even in a multi-objective world: a DPS spec's column _is_ DPS, so these are a
per-render label choice, not a type-level rename. Handle them after the type
refactor, not during.

---

## 5. What already got it right (extend these patterns)

The refactor is smaller than 96 sites suggests, because the math underneath is
already objective-agnostic — only the names are DPS:

- **`combineSe` / synergy math is objective-agnostic.** `DpsSample` is
  `{ dps: number; se: number }` (`set-value.ts:301`) and `combineSe`
  (`set-value.ts:304`) does pure SE arithmetic. Rename `DpsSample → MetricSample`
  and `.dps → .value` and the logic is untouched. **This is the natural anchor for
  the new neutral vocabulary** — the closest ready-made neutral seam.
- **`CapProfile` is per-spec _data_, not `if spec` branches** (`caps.ts:27–32`) —
  the exact pattern the objective abstraction should copy (a per-objective table,
  not a code path).
- **`CUTOFF_BY_SPEC` totality** forces every new spec to choose a floor — keep that
  discipline for a per-objective cutoff so a new objective cannot silently inherit
  DPS units.
- **The `spec-mismatch` guard** (`rank.ts:200–207`) already refuses off-objective
  ranking; the refactor turns that refusal into support.
- There is **no existing `epScore` / `metric` / `objective` / `throughput` symbol**
  to extend — the refactor coins new neutral vocabulary. Pick the word once (e.g.
  `objective` / `MetricSample` / `.value`) and apply it across §2.

---

## 6. How to use this

When the objective refactor is scheduled (it is shared by tanks and healers —
foundation §3), work §2 top-down: rename `SimObservation.dps` first (row 1, the
root), let the type errors surface every consumer, and neutralize the already-clean
math (§5) as the vocabulary anchor. Treat row 4 (`cutoff`) as its own sub-task —
it needs a re-derived floor per objective, not a rename. Do §4 (display) last, and
only where a label is genuinely wrong for the shown objective. Remember the
two-copy multiplier (§1): settle the fork-copy question before starting.
