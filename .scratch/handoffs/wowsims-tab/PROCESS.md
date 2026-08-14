# Wowsims tab — orchestration process state

Live state of the detour so nothing is lost at a token wall. Per
`orchestration.md`: the orchestrator never backgrounds workers and ends a turn
without this file naming in-flight work and the exact next spawn.

Last updated: 2026-08-14, by the slice-2 worker seat (engine port complete).

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

## Slice 3 — adapters + first ranking: IN FLIGHT

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
