# Slice note: tickets 162 (v2) and 168 — user-set EP weights + per-phase resolver

2026-08-15. Resolves both tickets together, per the user's explicit decision
in the same conversation that requested this work (quoted in full in each
ticket's own comment — see
`.scratch/carry-forward/issues/162-upgrades-tab-ignores-user-set-ep-weights.md`
and `168-tab-discloses-p2-weights-after-branch-b-merges.md` for the durable
record). This file is a short pointer for readers of this slice's HANDOFF,
not a duplicate of the ticket comments.

## What changed

1. **Ticket 162 v2 — page EP weights used by default when customized.** The
   tab now calls a new `resolvePageEpWeights(simUI)`
   (`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/page_ep_weights.ts`)
   at the top of `run()`. When `player.hasCustomEPWeights()` is true and the
   mapped vector passes three validity rules (non-zero, non-negative, has a
   weight on the spec's EP reference stat), the tab prefilters/gem-fills
   with the page's own weights instead of the committed file. On any
   failure it falls back to committed weights and the drawer says so via
   the failure's `reason` is available on the `PageEpWeightsResult` but not
   currently surfaced in the drawer itself — only the committed-vs-custom
   fact is disclosed, not *why* a custom vector was rejected. That's a gap
   worth flagging for a future pass, not built here (the ticket's "Done
   when" did not ask for it).

2. **Ticket 168 — committed weights resolved per spec AND phase.** The old
   `EP_WEIGHTS_SOURCE_BY_SPEC` fixed constant in `data.ts` (always named
   `ret-p2.ep-weights.json` regardless of phase) is replaced by
   `resolveEpWeightsFile`, reading a copied `ep-weights-by-phase.json` with
   the same "highest `byPhase` key `<= maxPhase`, else `fallback`" rule as
   `packages/core/src/ep-weights.ts`'s `resolveEpWeightsPath`. `ret-p3.ep-weights.json`
   was copied in alongside it (source: `feat/sweep-ret-tickets` commit
   `23153d27db20ef9bb2ea4a958470ff1cf963e5e0`, read via the sibling
   worktree `tbc-gear-prio-wt-sweep-ret`).

3. **Disclosure.** `EpWeightsSourceDisclosure` in `engine/disclosure.ts` is
   now a `{kind:"committed",file,pin} | {kind:"custom"}` union; the drawer
   line reads "your page weights (custom)" or "committed EP weights from
   `<file>` (pin `<pin>`)".

4. **Staleness.** `wireStalenessListeners()` now also listens on
   `player.epWeightsChangeEmitter`, marking an existing `'done'` result
   stale — same pattern as the gear/talents/sim-settings listeners already
   there, no new mechanism introduced.

5. **No await-in-flight-computation shim.** Confirmed unbuilt, as both
   tickets concluded it requires a fork-side `Player` patch not worth its
   drift cost for this slice.

## Files (fork, `vendor/tbc-new-fork`, branch `w/a2-162-v1`, commit
`3000b2f6b7178c2e98e994583f4e3300e0ceb269`)

- `ui/core/components/individual_sim_ui/upgrades/adapters/page_ep_weights.ts` (new)
- `ui/core/components/individual_sim_ui/upgrades/adapters/page_ep_weights.test.ts` (new)
- `ui/core/components/individual_sim_ui/upgrades/data/data.ts`
- `ui/core/components/individual_sim_ui/upgrades/data/ep-weights-by-phase.json` (new, copied+rewritten)
- `ui/core/components/individual_sim_ui/upgrades/data/ret-p3.ep-weights.json` (new, copied)
- `ui/core/components/individual_sim_ui/upgrades/data/PROVENANCE.md`
- `ui/core/components/individual_sim_ui/upgrades/engine/disclosure.ts` (engine/ — see below)
- `ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` (engine/ — see below)
- `ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md`
- `ui/core/components/individual_sim_ui/upgrades/engine/ep-weights-v1.test.ts` (rewritten)
- `ui/core/components/individual_sim_ui/upgrades_tab.tsx`

`rank.ts` and `disclosure.ts` are `engine/` files, edited because
`Deps.epWeightsSource`'s type had to change from an inline `{file,pin}`
shape to the new disclosure union. Per this slice's constraints: E-W3
(`packages/core/test/wowsims-fork-parity.test.ts`) was re-run in the outer
repo first and passed, then `engine/PROVENANCE.md`'s hashes for both files
were recomputed and `pnpm engine-port-drift:check` reported 30/30 (see below).

## Verification

- Fork `npx tsc --noEmit -p tsconfig.json`: **exit 0**.
- Outer repo `npx vitest run packages/core/test/wowsims-fork-parity.test.ts`
  (E-W3): **pass** (1 passed, 1 skipped — the skip is pre-existing, unrelated
  to this change).
- Outer repo `pnpm engine-port-drift:check`: **30/30 ported files match
  PROVENANCE.md**.
- Fork unit tests, run with `node --experimental-strip-types --test`:
  - `ui/core/components/individual_sim_ui/upgrades/adapters/page_ep_weights.test.ts`
    — **5/5 pass** (not-custom passthrough; custom+valid mapping with zeros
    dropped; each of the three validity-failure reasons).
  - `ui/core/components/individual_sim_ui/upgrades/engine/ep-weights-v1.test.ts`
    — **6/6 pass** (ret p2 vs p3 differ; p4/p5 fall back to p3; feral is
    phase-invariant; disclosure wording for both the committed and custom
    cases; the line is omitted when no source is passed at all).

## Explicitly not verified

- **No served-page render / live click-through.** `resolvePageEpWeights`'s
  wiring into an actual `Run` click against a real `Player`/`IndividualSimUI`
  was not exercised — the fork's dev server needs a full `make devmode`
  build, judged not cheap enough for this slice (browser sims themselves
  stay out of scope per ticket 156, independent of this judgment call). The
  unit tests above cover the mapping/validation logic and the
  resolver/disclosure logic each in isolation, not their end-to-end
  connection through `upgrades_tab.tsx`'s `run()`.
- **The `reason` on an `'invalid'` `PageEpWeightsResult` is computed but not
  surfaced in the drawer** — see item 1 above. Worth a follow-up if the
  disclosure requirement is read strictly as "why," not just "which."
