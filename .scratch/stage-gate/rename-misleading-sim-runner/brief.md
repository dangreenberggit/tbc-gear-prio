# Brief — rename the misleading sim-runner class

Base SHA (core): `5f1bfbaf85ca781a6ccc319eec5ea656faab9bf5`
Branch: `feat/406-keep-bulk-dead-note`
Fork tip: `993320fab0d4dc57b1fb9742f0aa7b0b6095bc9c` (clean, queue free)
Opened: 2026-09-17

## Goal (what exists when this is done)

The upgrades tab's default sim runner is named for what it actually does, not for a
transport it does not always use. Today the class is `WasmSimRunner`
(`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/wasm_sim_runner.ts`),
but on the **desktop** build it does not run WebAssembly in the browser — the
packaged app rewrites the served worker from `sim_worker.js` to `net_worker.js`, so
each per-candidate call goes out as a real HTTP request to the local Go server
(confirmed in the 411 measurement: the loop arm's readback shows 87 `raidSimAsync`
HTTP calls to `localhost:3333` and zero WASM in the served worker). The name is
accurate for the web transport and a misnomer for desktop. After this change the
class (and its file, and every reference) carries a name that is true on both
transports, and nothing else about its behaviour changes.

## Scope

- **Fork edit** in `vendor/tbc-new-fork/ui/core/...`. `WasmSimRunner` appears in ~8
  files under `individual_sim_ui/`: the runner file itself, `bulk_wasm_sim_runner.ts`,
  `bulk_http_sim_runner.ts` (which extends it), `skeleton.ts`, `partition.ts`,
  `engine/seams/sim-runner.ts`, `engine_provenance.ts`, `upgrades_tab.tsx`. ~24
  references in the `upgrades/` dir alone. The planner must produce the full
  reference list (grep) before any edit — a missed reference is a broken build.
- This is a **rename / refactor only**. No behaviour change, no logic change. The
  desktop gate must stay green with no golden update.

## The two things the planner must settle (not mechanical)

1. **The new name.** The current name is not simply wrong — it is right for the
   web/WASM transport and wrong for desktop. So the fix is a naming decision, not a
   find-replace. The planner picks a name that is true on both transports and says
   why (e.g. names it for its role — the per-candidate / loop runner — rather than
   its transport; or names it for the RPC it issues). Consider the sibling names
   (`BulkHttpSimRunner`, `BulkWasmSimRunner`) so the whole set stays coherent after
   the rename. State the chosen name and the rejected alternative with the reason.
   Whether the FILE is also renamed (and any import paths) is part of this call.

2. **The fork-pin and PROVENANCE handling.** This is a fork edit and drags the
   re-pin cycle. Two PROVENANCE.md files under `upgrades/` mention these names
   (`upgrades/data/PROVENANCE.md`, and the runner files have PROVENANCE rows —
   `grep -c` returned 2 hits in `engine/PROVENANCE.md`). A rename that moves a
   ported-engine file or changes a name a PROVENANCE row tracks must be reconciled,
   or the fork-parity / drift checks break. The planner must: identify every
   PROVENANCE row and provenance-tracked name touched by the rename; decide how each
   is updated; and put the full re-pin cycle in the steps (PROVENANCE hash if a
   tracked file's content changes, fork commit, `data/wowsims-fork.lock.json`
   re-pin, `pnpm sim-implemented-effects:generate`, `pnpm verify`, desktop gate).
   Read `docs/agents/known-traps.md` (§ ported-engine edit, § moving the pin) and
   `docs/agents/upstream-catch-up.md` § 5. The planner may send a subagent to map
   the PROVENANCE impact precisely — the brief expects that mapping done, not
   guessed.

## Constraints

- Behaviour-preserving rename only. If the rename would change any runtime
  behaviour, that is out of scope and a stop-and-report.
- Do not touch upstream code or comments beyond what the rename strictly requires;
  keep the fork divergence minimal.
- Do not push the fork, do not merge to dev.
- Serial fork queue: one executor, no second fork agent at once.

## Done when

The class (and file, if renamed) carries a transport-accurate name; every reference
across the ~8 files is updated; PROVENANCE rows reconciled; fork re-pinned;
`pnpm verify` green; desktop gate (a)-(h) pass with no golden update; both trees
clean. The naming decision and its rejected alternative are recorded.
