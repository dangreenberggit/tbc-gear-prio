# Wowsims tab — orchestration process state

Live state of the detour so nothing is lost at a token wall. Per
`orchestration.md`: the orchestrator never backgrounds workers and ends a turn
without this file naming in-flight work and the exact next spawn.

Last updated: 2026-08-14, by the orchestrator seat.

## Phase 0 — done

User created the personal fork and supplied the URL:
`https://github.com/dangreenberggit/tbc-new`. Verified via `gh repo view`:
`isFork: true`, parent `wowsims/tbc-new`, default branch `master`.

## Slice 1 — fork scaffold: mostly done, one gate open

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

## Slice 6b — p3 pin bump + regen: IN FLIGHT

Dispatched on explicit user approval ("fast-follow now, as its own slice").
Same worktree and branch as slice 6. Commits so far:

- `621b8af` Vendor ret P3 gear set without moving the main pin
- `7aaff35` Wire ret P3 gear set into bisTags, regen p3-p5

**Watch item for whoever reviews this:** at last check the worker's working
tree also showed `data/universes/feral-p2.json`, `feral-p2.report.json` and
`scripts/assemble_universe.py` modified. Its brief said to do the EP wiring
**only** if feral's output stays byte-identical, and to report rather than
regress it. Feral universe files changing is exactly the condition that brief
called out. **Do not accept the slice without checking whether that change is
intentional and justified**; a feral regression is worse than a deferred
improvement.

## Not started

Slices 2 (engine port), 3 (adapters + first ranking, where E-W1/E-W2 run),
4 (UI completion), 5 (WCL importer). Slice 7 is explicitly out of scope.

## Standing constraints

- **Nothing has been pushed to the fork.** Plan §1 keeps any push behind a
  separate explicit ask.
- **No merge to `dev`.** AGENTS.md loop step 5: `pre-merge-review` first, then
  a *separate* merge ask.
- Fork workers must receive the fnm recipe from slice 1's handoff, or they
  will read the shim's error as a build failure.

## Exact next steps

1. Read slice 6b's report; resolve the feral question above before anything else.
2. Then either close slice 6 (`sme-rank-review` on the refreshed ranking, per
   plan §9.6) or send 6b back.
3. Slice 1's remaining gate: register the empty Upgrades tab at
   `ui/core/individual_sim_ui.tsx:354` (immediately after `this.bt = this.addBulkTab();`)
   and get the site serving. Then the orchestrator writes
   `data/wowsims-fork.lock.json`.
4. Slice 2 (engine port) is the head of the remaining fork chain and can start
   once slice 1's tab registration lands.
