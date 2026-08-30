# Phase seams in our fork code

The joints in **our added fork code** (`vendor/tbc-new-fork`, branch
`feat/upgrades-tab`) where content tier ("phase") is hardcoded, selected, or
assumed. This is the checklist to revisit when we upgrade the fork/tab from
Phase 2 to a later tier — it names where to look so the upgrade starts from a
map instead of re-discovering the code.

Companion to ticket
[`.scratch/carry-forward/issues/337-upstream-content-tier-2-to-3.md`](../.scratch/carry-forward/issues/337-upstream-content-tier-2-to-3.md),
which holds the _decision_ (stay Phase 2 until our PR target
`feature/backend-reforge` reaches Phase 3) and the _trigger_. 337 points back
here for the seam list; this file points to 337 for the why and when.

## How this was produced

Two read-only audits (2026-08-30, Opus review lane) over our fork diff
`cbf6b75...ea65fbf` (129 files) — base `cbf6b75` is upstream Phase 2. One agent
took code/logic, one took the per-phase data files. Every file:line below was
cited by those audits; re-run the diff to re-verify.

## Headline (as of Phase 2, 2026-08-30)

**Nothing here forces or stubs Phase 3 in a way that blocks a PR against a
Phase-2 reforge.** Every phase reference is a runtime selection clamped to the
sim's live phase. On a Phase-2 target, all p3/p4/p5 data is bundled but never
selected. Safe to leave in. The seams below are what _changes behavior_ when the
live phase moves — i.e. what to check when upgrading, not defects to fix now.

## The seams — what to check when upgrading

### 1. The phase source (upstream, we only read it)

- `ui/core/constants/other.ts:13` — `CURRENT_PHASE = Phase.Phase2`. **Not in our
  diff.** This is upstream's single declaration of the current tier and the
  default `getPhase()` returns. When reforge itself flips this to `Phase3`, our
  code follows automatically — that is the whole reason nothing here is
  hardcoded. Do **not** bump this in our fork; let the target branch own it.
- `ui/core/sim.ts` `getPhase()` (base `sim.ts:944`, default at `:105`) — returns
  the sim's live phase, defaulting to `CURRENT_PHASE`. Upstream. Our `sim.ts`
  change adds an optional `iterations?` param only — phase-neutral.

### 2. Where our tab reads the live phase (the selection entry points)

- `upgrades_tab.tsx:988` — `const maxPhase = this.simUI.sim.getPhase()`. The page's
  shared phase picker drives this. A live read, never a constant; no p3+ default.
- `upgrades_tab.tsx:9887`, `:10030` — same `getPhase()` read feeding
  `RankInput['maxPhase']`. These are the joints that carry the phase into the
  ranking; when upgrading, confirm the picker can reach the new phase and these
  still clamp correctly.

### 3. The clamps that gate data by phase (`<= maxPhase`)

These are the load-bearing filters. On Phase 2 they drop everything above p2; on
a higher phase they admit the new tier. Revisit each when upgrading to confirm
the new phase's data flows through:

- `data.ts:1969` (universe selector) — `if (phase <= maxPhase && phase > bestPhase)`
  picks the highest universe file `<= maxPhase`.
- `pool.ts:5524` `filterPoolByPhase` — cuts every pool to `entry.phase <= maxPhase`
  (so even the selected file's contents are re-cut to the live phase).
- `gems.ts:4482` `gemsForPhase` — `<= maxPhase` gem palette gate.

### 4. The per-phase data we ship (bundled, selected only when phase allows)

- `data.ts` static imports (~`:84-154`, `:1782-1824`) enumerate
  `*-p2/p3/p4/p5.universe.json` for all specs into `UNIVERSES_BY_SPEC_AND_PHASE`.
  Present in the build; only reachable through the `<= maxPhase` clamp above.
- Universe files under
  `ui/core/components/individual_sim_ui/upgrades/data/`: **p2, p3, p4, p5** for
  all 11 specs (ret, feral, balance, hunter, mage, shadow, rogue, ele, enh,
  warlock, warrior) — 44 `*-p{2..5}.universe.json`.
- The p3+ files are **materially future-tier content** (measured, ret spec):
  p2 = phase1:186 / phase2:102, **no phase-3+ ids**; p3 adds 173 phase-3 items;
  p5 adds 56 phase-4 + 94 phase-5. So when upgrading, the new tier's items are
  already collected here — the work is selecting them, not sourcing them (but
  re-verify freshness against the new pin).
- EP-weights: one per spec, wired one-per-spec regardless of phase
  (`data.ts:167-179`), mostly `*-fallback.ep-weights.json`. When upgrading,
  confirm the right per-phase weights are chosen for the new tier.

### 5. Structural (no runtime phase dependency)

- `types.ts:8299` — `ContentPhase = 1|2|3|4|5`, a type union, no runtime enum.
  Needs no change for a tier bump.

## Not phase seams (checked, carry no phase logic)

- `sim/hunter/item_sets.go` — item-set membership only; added lines contain no
  phase constant or gate.

## Gaps not chased (would matter at upgrade time)

- Whether any tab code can drive the shared page phase picker above the current
  phase (only the read at `upgrades_tab.tsx:988` was traced, not every writer of
  `setPhase`).
- `PROVENANCE.md` prose accuracy for the p3+ data (the loader was read, not the
  provenance claims).
- p3+ universe **id freshness** against a future pin — the counts above prove the
  data is future-tier, not that it matches whatever ref carries Phase 3 when the
  time comes.
