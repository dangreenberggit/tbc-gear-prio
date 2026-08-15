# Wowsims tab — orchestration process state

> **New to this detour? Start with
> [`ORCHESTRATOR-HANDOFF.md`](ORCHESTRATOR-HANDOFF.md)** — it carries the next
> action, the two environment traps, and the standing constraints. This file is
> the per-slice detail behind it.

Live state of the detour so nothing is lost at a token wall. Per
`orchestration.md`: the orchestrator never backgrounds workers and ends a turn
without this file naming in-flight work and the exact next spawn.

Last updated: 2026-08-14, by the incoming orchestrator seat (slice 4 and the
slice-6 SME review dispatched).

## In flight right now (dispatched 2026-08-14 by this seat)

One background agent running: **`sme-rank-review` (Opus) on the REAL
ret-p3 ranking** (`ret-p3-ranking/slamaltman-p3.*` in the worktree, tip
`2b3bf56`). This is the review the user chose to close plan §9.6's
done-when — the earlier candidate-list verdict does not. When it
reports: verify its evidence, record the verdict, and **stop before any
merge or push ask** — both require the user's word.

## Tickets 158+159 + real p3 ranking — DONE, orchestrator-verified

Worker commits on `feat/ret-p3-data`: `dade219` (158: `epWeights`
{path, pin} stamped into universe + report artifacts, byte-compare regen,
determinism double-run), `23153d2` (159: mapping extracted to
`data/presets/ep-weights-by-phase.json` read as a *value* by both Python
and new pure `packages/core/src/ep-weights.ts`, 5 unit tests — the
detour's one deliberate core edit), `2b3bf56` (the ranking).
Orchestrator re-derived: the p4 universe carries the stamp with the
correct nuanced pin note; the ranking PROVENANCE records p3 weights,
seeds `[11,22,33,44,55]`, 3000 iterations. Worker's `pnpm verify` exit 0
(764 tests) accepted; worktree clean.

**Ranking headline:** baseline 2003.51 DPS (slamaltman fixture, offline);
top-3 Belt of One-Hundred Deaths +47.75, Torch of the Damned +43.61,
Cataclysm's Edge +26.22; 393 scored, 44 above cutoff. One candidate
dropped on an upstream sim panic (Beast-tamer's Shoulders,
hunter/paladin type assertion — upstream bug, not this branch).

**Note carried:** feral-p2 pre-existing drift (ticket 154) was NOT
absorbed — the worker hand-patched only the new field into those two
files and confirmed the drift reproduces with HEAD's unmodified script.

## Slice 5 — DONE: E-W4 PASSED, importer built, orchestrator-verified

Fork tip `adb0d1353` (two commits over `e1fbf0e2d`), lockfile bumped,
outer commit `005b5b8` with `e-w4-result.md` + captured before/after JSON
+ the diff script, and [`slice-5/HANDOFF.md`](slice-5/HANDOFF.md).

- **E-W4 verdict PASS, reproduced by the orchestrator** from the
  committed artifacts: `node e-w4-diff.mjs e-w4-before.json
  e-w4-after.json` → `PASS: empty diff outside player.equipment`,
  exit 0. Application call is `player.setGear` only, per the method doc.
- Importer: modal beside Run — report URL → fight list → roster →
  `Database.loadLeftoversIfNecessary` + `lookupItemSpec` → `setGear`.
  `upgrades/engine/` untouched; fork dependency-free.
- **Untested, honestly flagged:** live WCL fetch (no creds in the worker
  env; `local.wcl-credentials.ts` committed gitignored with blanks),
  modal click-through, unresolved-item reporting path. First live use
  needs the user's WCL creds in that file.

## Decision (user, 2026-08-14): WCL credentials for prod

The personal `.env` WCL creds are **development-only**. A production /
published build must use the **same accessing method as the rest of the
wowsims app** — upstream's existing credential path, as
`raid_wcl_importer.tsx` does — not the personal creds and not a new
mechanism. This resolves plan §6's "PR-time question" in the direction it
predicted. **Plan §6 still needs a one-sentence amendment recording
this** — ~~deferred~~ applied as `fc6a70a` once the plan.md writer landed.

## User-set EP weights — RESOLVED as plan §12 + ticket 162 (2026-08-14)

Opus design investigation, commit `acd8dd5` (plan §12 appended; ticket
`162-upgrades-tab-ignores-user-set-ep-weights.md`). Key results, both
falsifying premises of the original framing:

- Page weights are **never observably zero** — seeded from the spec
  default at init (`individual_sim_ui.tsx:589`, `:737-739`); the real
  hazard is stale/degenerate, not empty. `hasCustomEPWeights()`
  (`player.tsx:531-533`) detects user modification.
- The user's "await an in-flight computation" idea **cannot be built
  from outside** — the stat-weights promise is closure-local with no
  pending state or completion event; it needs a small fork patch
  (`getPendingStatWeights()` shim, designed in the ticket, hypothesis).
- v1 decision: committed weights + assumptions-drawer disclosure of the
  weights file and pin. v2 (ticket 162): opt-in toggle following
  upstream's own reforge-suggester precedent
  (`suggest_reforges_action.tsx:321-372`).
- The v1 disclosure line in the assumptions drawer is **not yet
  implemented** in the fork — small tab edit, no engine files; fold into
  the next fork-touching slice rather than a dedicated dispatch.

## Slice 6 `pre-merge-review` — DONE: gate green, two user decisions open

Review at `docs/reviews/feat-ret-p3-data.md` on the branch (commits
`0998200` + `73e919a`; orchestrator confirmed both exist with the stated
contents). `pnpm merge-to-dev --check-only` → `merge-ready: ok`. Tickets
158–161 filed on the branch and mirrored to this branch as `fd87b8b`
(`pnpm issues:open` sees them).

**Two decisions the review explicitly leaves to the user — surface them
in the next user-facing summary; do not resolve them yourself:**

1. **A1 (high, disclosure):** p4/p5 universes were rescored with p3 EP
   weights and no artifact records which weights produced which scores
   (423 of 534 p5 scores changed, report files absent from the diff).
   Filed as ticket 158 rather than fixed — the data regenerates
   byte-exact as-is. Merge now and fix provenance later, or fix first?
2. **SP1 (high, completion claim):** plan §9.6's done-when says the SME
   review passes on a *ranking*; the filed verdict judged a candidate
   universe + EP preset (no ranked list exists yet) and its quality gate
   answered "not yet" (findings in ticket 157). The branch's code and
   data are fine; the *claim* "slice 6 done per §9.6" is not available.

Other findings: medium test-cover and provenance gaps (tickets 158–160),
ticket 161 for the stale PLAN.md §16 item 3 + slice-6 handoff line. The
review independently re-verified the vendored gear hash, tag membership
(15/16, zero spurious), pin discipline, and byte-identical regeneration.

## 3+4 fix-up — DONE, orchestrator-verified

Fork tip `e1fbf0e2d` (parent `6cf6dc28a`), lockfile bumped in outer commit
`4645495`, "Fix-up after review" appended to `slice-4/HANDOFF.md`. F1/F2/
F3/F5 all fixed; F4 accepted as inherent. Orchestrator re-derivation:

- Fork diff limited to `upgrades_tab.tsx` + one translation key; `engine/`
  untouched; the `as SimOrderName` cast is gone and all three sites route
  through `effectiveSlot()` (imports the engine's real
  `simSlotsForPoolSlot`).
- Independent bucket count using the fork's **real** `pool.ts` (the
  worker's harness had reimplemented it): ret-p2 12, ret-p3 18, feral-p2
  57 weapon rows all resolve to `mainhand`, zero left as `weapon`.
- Worker-run `pnpm verify` exit 0 (760 tests) and drift 30/30 accepted —
  same commands the orchestrator ran minutes earlier on the parent tip.

Still unverified live (stated, not glossed): F2's tab-restore and F5's
control feeding a completed ranking — blocked by ticket 156, judged by
typecheck and reading only.

## Combined slices 3+4 review — DONE: pass with findings

Opus review lane, filed at
[`slice-3-4-review.md`](slice-3-4-review.md), commit `547c5a7`. No finding
blocks the fork-integration gate. Orchestrator verified F1's mechanism
directly against `upgrades_tab.tsx`/`pool.ts`/`rank.ts` before dispatching
the fix — it is real (`weapon` → single-element `["mainhand"]`, so
`slotChoice` stays unset and the `SIM_ORDER` filter drops every weapon
row; feral-p2's 57 weapon entries are its largest slot).

- **F1 (medium):** weapon rows in no sub-tab — being fixed now.
- **F2/F3/F5 (low):** sub-tab selection not restored; dead `hideOwned`;
  D7's visible iteration control absent and unowned — all in the fix-up.
- **F4 (low):** `ENGINE_FORK_COMMIT` names the parent commit — inherent to
  a hand-maintained constant, disclosed, accepted.
- Review re-ran drift gate (30/30) and E-W3 (passed, 2.5 s) itself; D5/[R6]
  confirmed satisfied by construction via upstream's `makeRaidSimRequest`.

**Watch item (hypothesis, untested — reviewer's caveat, no ticket yet):**
`readGear` indexes `Gear.getEquippedItems()` positionally against
`SIM_ORDER`, but that getter is `Object.values` over a partial record — an
empty *middle* gear slot may shift every later index; the existing guard
only covers a trailing gap. Needs a targeted check on a partially-geared
character before slice 5/any real-user exposure.

## Slice 4 — UI completion: DONE, orchestrator-verified

Worker report: [`slice-4/HANDOFF.md`](slice-4/HANDOFF.md), committed
`5aa72c1` with the lockfile bumped to fork tip `6cf6dc28a`. Orchestrator
re-derived rather than accepted:

- Fork diff `f7146dd69..6cf6dc28a` touches only `upgrades_tab.tsx`,
  a new `engine_provenance.ts`, and translation strings — the
  `upgrades/engine/` diff is **empty**, so no E-W3/hash obligation arose.
- `pnpm verify` exit 0 (drift gate 30/30 inside it) and E-W3 passed,
  both run independently by the orchestrator.
- `packages/core/src` clean.

What the worker built: BiS/Alt tags, source labels, owned rows greyed,
below-cutoff rows behind an expand toggle, per-slot sub-tabs
(DetailedResults nav-tabs idiom), staleness banner, assumptions drawer,
hand-maintained fork-commit provenance constant. Verified sim-free via a
16-assertion harness over the fork's real `view.ts`/`slots.ts` plus a
served-page render check.

**Honestly flagged gaps:** live click-through of the sub-tab strip and the
below-cutoff toggle were not exercised (no completed `Ranking` reachable
without a sim — ticket 156). The 3+4 review was asked to judge those code
paths statically. Untracked `.ew1-scratch/` sits in the fork tree
(E-W1 harness leftovers, harmless, not committed).

## Phase 0 — done

User created the personal fork and supplied the URL:
`https://github.com/dangreenberggit/tbc-new`. Verified via `gh repo view`:
`isFork: true`, parent `wowsims/tbc-new`, default branch `master`.

## Slice 1 — fork scaffold: DONE (plan §9.1 done-when met)

The Upgrades tab is registered and renders after "Batch (New)", verified in a
browser at `http://localhost:5173/tbc/paladin/retribution/`. Fork commit
`5590dee70` on `feat/upgrades-tab`. `data/wowsims-fork.lock.json` is committed
here. `pnpm verify` green in this repo; `npx tsc --noEmit` exit 0 in the fork.

Two environment steps are **not** captured by any committed file, because the
Makefile paths they replace need `air`: copying `assets/` into `dist/tbc/` and
generating the per-spec `index.html` from `ui/index_template.html`. Both are in
slice 1's handoff. Without the second one, vite serves the landing page for the
spec URL — which reads as a routing bug and is not one.

## Slice 1 — original scaffold notes

Details in [`slice-1/HANDOFF.md`](slice-1/HANDOFF.md). Summary:

- Nested clone at `vendor/tbc-new-fork/`, branch `feat/upgrades-tab` cut from
  the pin `8aa378b3` (decision D2). Clone confirms the plan's "112 commits
  ahead" arithmetic exactly.
- Toolchain installed and **proven by building**: Go 1.25.4, protoc 35.1,
  GNU Make 3.81, plus `protoc-gen-go` (a fourth dependency plan §9.1 omits).
- Both proto generators run, `sim/core` compiles, `npx tsc --noEmit` is
  **exit 0**, and `dist/tbc/lib.wasm` builds at 20,293,865 bytes.
- Clone's `git status` is clean after all builds — upstream gitignores the
  generated artifacts.

**Open:** the site has not been *served* in a browser, and the Upgrades tab is
not registered yet. `make devmode` needs `air`, which `make setup` installs by
piping a remote script to `sh` — deliberately not run. `data/wowsims-fork.lock.json`
is not written yet (orchestrator's file, due at fan-in).

**E-W1 note:** the wasm binary it needs now exists for the first time. The
experiment itself is **still unrun** and belongs to slice 3 — do not record it
as done anywhere.

## Slice 6 — ret p3 data: partially done

Worker report + provenance in [`slice-6/HANDOFF.md`](slice-6/HANDOFF.md).
Branch `feat/ret-p3-data`, worktree
`C:\Users\dgree\Code\lulz\tbc-gear-prio-wt-ret-p3-data`.

- **Done:** `data/presets/ret/p3.ep-weights.json`, values verified key-by-key
  against upstream's `P3_EP_PRESET` and the `Stat` enum at the pin.
- **Already done before the slice:** the `PseudoStatMainHandDps` item
  (PLAN.md §16 item 3) was fixed on 2026-08-02 by `2fdad02`. **PLAN.md §16
  still lists it as outstanding and should be corrected.**
- **The finding:** upstream shipped a real ret P3 curated gear set on
  2026-08-13, which tickets 121 and 153 both documented as non-existent. That
  makes ticket 121's Option 1 ("wait for upstream") live.
- **Orchestrator correction:** the worker named `ac0ed034b` as the source
  commit. That commit carries `P3_EP_PRESET` but **not** the gear JSONs — those
  landed 26 minutes later in `5c7491899` ("missed jsons"). A pin bump aimed at
  the curated set must reach `5c7491899` or later. Committed as `90cd3d8`.

## Slice 6b — p3 pin bump + regen: DONE, orchestrator-verified

Dispatched on explicit user approval ("fast-follow now, as its own slice").
Same worktree and branch as slice 6.

- `621b8af` Vendor ret P3 gear set without moving the main pin
- `7aaff35` Wire ret P3 gear set into bisTags, regen p3-p5
- `896c6d8` Score ret p3+ universes with p3 EP weights, not p2's
- `d96c044` Guard curated-item membership by the item's own phase
- `cd20471` Record slice 6b handoff
- `9004654` Correct the feral arithmetic in the 6b handoff (orchestrator)

**The earlier feral watch item is resolved.** The final diff does not touch any
committed feral artifact; the worker reverted its exploratory regen. Verified
by the orchestrator rather than accepted on the worker's word:

| Check | Method | Result |
| --- | --- | --- |
| Tags actually moved | count `bisSets` per universe | ret-p3/p4/p5 now `["p3"]`×15; ret-p2 stays `["p2"]`×15 |
| Tags match upstream | diff tagged ids against `5c7491899`'s set | 15/16 match, **0** spurious; the gap (`27484`) is absent from the pool at p2 *and* p3, so it is a pool-membership question, not a tagging bug |
| Phase-guard fix is real | look up `32574` per universe | absent from ret-p2, present at ret-p3 (phase 3); phase-1 `33122` correctly still at p2 |
| Artifact reproducible | regen ret-p3, compare to committed | **byte-identical** |
| `pnpm verify` | run independently in the worktree | **exit 0** |
| Pin discipline (D2) | read the lockfile diff | per-file `PER_FILE_PIN` override; main pin unmoved |
| p3 vs p3Bulwark | upstream `presets.ts` build wiring | `P3_GEAR_PRESET` is in `P3_PRESET_BUILD_RET`; Bulwark has no `PresetBuild`. Settled by upstream, not inferred |

**One correction made.** The worker's handoff implied the phase guard moves
feral-p2 from 256 to 253 entries. It does not: the committed file already holds
253, and regenerating at the **base** commit reproduces the same 256-vs-253 gap
and the same five differing entries. That drift is pre-existing staleness in
`curatedSets` values (not membership) and predates this branch. The deferral
decision was right; only the arithmetic was wrong. Corrected in `9004654`.

**Carried forward (needs a feral-owning session):** `feral-p2.json` is stale
against its own generator — five entries differ, e.g. `29994` regen
`['p2_6p','p3_6p']` vs committed `['p2_6p']`. Unrelated to this detour.

## Slice 6 — SME review DONE: trust-with-caveats (2026-08-14)

Opus review lane, verdict filed at
`.scratch/handoffs/sme-rank-judgment-ret-p3-refresh.md` in the ret-p3-data
worktree, commit `859eab5` on `feat/ret-p3-data`. Orchestrator spot-checked
the evidence against `data/universes/ret-p3.report.json` (18 missed items,
17 `d7Eligible`, the named librams and trinkets all present) — it matches.

- **Verdict: trust-with-caveats.** EP preset passes two independent
  consistency checks; all 15 tags paladin-equippable; raid/arena separation
  holds; phase guard confirmed in-game terms.
- **Finding 1 (medium):** the relic slot is half-empty — 3 eligible librams
  missing from the pool, including `27484` Libram of Avengement (upstream's
  16th curated slot). The 15/16 gap **does matter**; one apparent cause for
  all three. Predates this refresh (p2's relic slot is thinner still).
- **Finding 2 (medium):** real TBC ret trinkets missing from the pool:
  Darkmoon Card: Crusade (31856), Hourglass of the Unraveller (28034),
  Abacus of Violent Odds (28288).
- **Finding 3 (informational):** zero plate/tier tagged at p3 — judged
  genuine TBC ret reality, not a bug; consequence is no curated tier anchor
  for set-bonus valuation at p3.
- **Scope limit:** the artifacts are a universe + tags + EP preset, not a
  ranked list — the skill's ordering/delta checks could not run. Findings
  1–2 block the "would a ret trust this?" gate, **not the branch**.

Findings 1–2 are pool-membership work — likely a follow-on ticket, not a fix
on this branch. Next gate for slice 6 remains `pre-merge-review` on
`feat/ret-p3-data`, then stop for a separate merge ask.

## Slice 6 — PARKED at "data done, review pending" (user decision, 2026-08-14)

The data work is complete and verified; the branch `feat/ret-p3-data` is
green and sits unmerged. **What remains before slice 6 can be called done per
plan §9.6:**

1. `sme-rank-review` (review lane, **Opus** — never substitute a workhorse)
   on the refreshed ret-p3 ranking. Not run.
2. `pre-merge-review` on `feat/ret-p3-data` → `docs/reviews/feat-ret-p3-data.md`.
3. Then, and only as a **separate ask**, the merge-to-dev question.

Parked deliberately: the fork chain (slices 1→2→3→4) is the critical path and
none of it depends on this review. The user chose this ordering explicitly.

## Slice 2 — engine port: DONE, orchestrator mutation-tested

**Verified by breaking the fork's engine on purpose**, not by reading the
report. Full table in [`slice-2/HANDOFF.md`](slice-2/HANDOFF.md) under
"Orchestrator verification":

- Perturbing `cutoff.ts`'s `meetsCutoff` → **E-W3 fails** with a precise
  `belowCutoff` diff. The test is not tuned-until-green.
- Perturbing `se.ts`'s `pairedReplicateSe` → **E-W3 passes** (blind: the test
  runs one seed; that function needs ≥2 deltas) but **the drift gate catches
  it**, by filename and hash.
- `packages/core/src/` untouched, confirmed by diff.
- Everything restored afterwards: fork clean, E-W3 green, gate 30/30,
  `pnpm verify` exit 0 (760 tests).

The two gates compose as designed. Coverage gap filed as **ticket 155** — E-W3
covers one socketless candidate at one seed, so paired replication, meta
repair, set-bonus packages and `applyView` are unverified by it.

## Slice 2 — worker's own summary

Dispatched 2026-08-14 to a Sonnet workhorse. Full report:
[`slice-2/HANDOFF.md`](slice-2/HANDOFF.md).

**E-W3 passes** — both this repo's `rankUpgrades` and the fork's ported copy
(imported by file path from `packages/core/test/wowsims-fork-parity.test.ts`)
produce identical deltas from the same slamaltman fixture and the same
recorded observations. Actual output: `deltaDps: 50, rank: 1` on both sides,
plus matching `se`/`seMethod`/`belowCutoff`.

30 files ported into `vendor/tbc-new-fork/ui/core/components/
individual_sim_ui/upgrades/engine/` (fork commit `e49dcf23c`, **not pushed**
— plan §1 lock). `items.ts`/`gems.ts` read the fork's own `Database`
instead of a JSON snapshot; `enchants.ts` and `meta.ts` reuse the fork's own
upstream utilities rather than re-deriving them a second time — a deliberate
call beyond what plan §2.1 specified, reducing drift surface rather than
adding it. `rank.ts` drops the spec-mismatch check (`spec.ts` not ported:
the page already knows its own spec) and uses D4's crypto-free cache key.

The drift gate (`scripts/check_engine_port_drift.py`, wired into
`pnpm verify`) is live and was verified both ways: passes at 30/30 today,
and was confirmed to fail loudly on a deliberately corrupted hash before
being restored. Its limitation is stated in its own docstring and repeated
in the handoff: a hash match proves nothing about behaviour, only that
bytes have not changed — only E-W3 proves behaviour.

`pnpm verify` is green in this repo (commit `d8e915b`); `npx tsc --noEmit`
is exit 0 in the fork. `packages/core/` is untouched, confirmed by
`git status` before every commit in this repo.

**Known gap, not blocking:** `pool.ts`'s `ItemSlot`/`ITEM_SOURCE_KINDS` and
`slots.ts`'s `SIM_ORDER` are hand-copied literals (the fork has no
`pnpm codegen:json-types` equivalent), kept in sync with packages/core's
generated files by inspection only — nothing catches the two drifting apart
if a union grows in this repo. Recorded in the handoff's "Untested" section.

## Slice 3 — adapters + first ranking: DONE except E-W2

Adapters built and wired; a ret run composes a correct request and reaches
`Simming 0/277`. **`packages/core/src/` untouched; drift gate 30/30;
`pnpm verify` exit 0.**

### E-W1 — PASSED, and independently reproduced

The gate that had never been run since compute-topology was written.

```
WASM   2042.3926145882178
native 2042.3926145882197   → delta 1.8e-12 DPS, 1.87e12× under the 3.4 cutoff
```

Smaller than native's own 20-vs-4-thread spread (6.8e-13), so this is
float-ordering noise, not disagreement. **The orchestrator reproduced it from
the handoff's method with a separately written harness** and got a bit-identical
number. Plan §8 and §10's risk row are updated; the risk is closed.

Two gotchas now recorded, both absent from the original plan: the WASM build has
no `with_db` embedding (a `SimDatabase` must be injected per player), and
`wasmready` must exist as a global *before* `go.run` or `sim/wasm/main.go:40`
panics.

### E-W2 — still blocked; the slice's stated cause was wrong

Filed as **ticket 156**. Two separate things:

- **A real bug, fixed:** `dist/tbc/` held no JavaScript — `vite.build-workers.mts`
  had never run, so `sim_worker.js` 404'd and `wasm_exec.js` returned vite's
  HTML fallback. **It needs `go` on `PATH`.** This belongs in the serving recipe.
- **The stated cause is refuted.** Worker throttling was proposed from
  `document.hidden === true`; a busy-loop measured **5.49M (main) vs 5.09M
  (Worker)** — ratio 1.1×. Compilation (22 ms) and core count (20) are out too.
  After fixing the bundles, upstream's own Simulate still ran **93 s without
  finishing**. The slowness is real and **unexplained**; untested candidates are
  in ticket 156.

The worker was right that E-W2 is blocked and right not to fabricate numbers.
Only its mechanism was wrong.

## Slice 3 — original dispatch notes

Dispatched 2026-08-14 to a Sonnet workhorse. Builds `PlayerGearSource`,
skeleton serialization (D5), and `WasmSimRunner`, then wires them into
`upgrades_tab.tsx` behind a Run button. **This is where E-W1 and E-W2 run.**

**E-W1 matters more than the rest of the slice.** It has never been run —
compute-topology named it the gate on every number, and it stayed unrun for
want of a wasm build. That build now exists (`dist/tbc/lib.wasm`, 20 MB), the
fixture is `test/fixtures/slamaltman.raid-sim-request.json`, seed 42, and the
native reference is `2042.3926145882197`. Gate: delta inside the 3.4 DPS
cutoff.

**When it reports, check for these specifically:**

1. **An actual observed number for E-W1**, not a claim that it passed. A
   disagreement is a *more* valuable result than a pass and must not be tuned
   away. If the worker could not run it, the handoff must say so plainly.
2. **Real E-W2 timings** written into plan §5's budget comment, with worker
   count and machine — not estimates.
3. **`talentPointsByTree`** — plan §2.2 calls it untested; the brief asked for
   it to be resolved or explained.
4. **Ported files unchanged** unless E-W3 was re-run *and* PROVENANCE.md hashes
   updated. `pnpm engine-port-drift:check` catches this; run it during review.
5. **`packages/core/src/` untouched.**

## Not started

Slice 3 (adapters + first ranking, where E-W1/E-W2 run), 4 (UI completion),
5 (WCL importer). Slice 7 is explicitly out of scope.

## Standing constraints

- **Nothing has been pushed to the fork.** Plan §1 keeps any push behind a
  separate explicit ask.
- **No merge to `dev`.** AGENTS.md loop step 5: `pre-merge-review` first, then
  a *separate* merge ask.
- Fork workers must receive the fnm recipe from slice 1's handoff, or they
  will read the shim's error as a build failure.

## Exact next steps

1. Slice 6 review is still parked per the section above — resolve when
   convenient, independent of the fork chain.
2. Slice 3 (adapters + first ranking) is next on the fork chain: build
   `PlayerGearSource`, the page-settings skeleton serializer, and
   `WasmSimRunner` against slice 2's ported `engine/`. E-W1 (WASM vs native)
   and E-W2 (wall-clock budget) run here — both still unrun.
3. Copy universe/EP-weight data into the fork (plan §2.5) — noted as not yet
   done in slice 2's `PROVENANCE.md`, deferred there because slice 2's scope
   was the `engine/` code surface, not the data the adapters will consume.
