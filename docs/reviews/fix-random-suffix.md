# Pre-merge review — fix/random-suffix

Diffed against: our repo `64e07bf0..HEAD` (`64e07bf0` is `dev` when the pair
was made; the branch re-pins the fork, adds a test, files ticket 892 and adds
this file), and the fork `82d0c5818..7c8059644` on fork branch
`fix/random-suffix` (`82d0c5818` is the pin on `dev`). The fork diff touches
only the tab's files under `ui/features/upgrades/model/`; none of the nine
files exists on `upstream/master`, so no upstream wowsims file changed.

What the branch is for: a live check of the draft PR text
(`.scratch/agent-reports/2026-11-22-general-task-pr-claims-check.md`,
"Untested gap, from code only") read that the tab carries only id, enchant
and gems for worn gear. The brief: check whether the tab drops a worn item's
random suffix ("...of the Bandit") when it builds sim requests, and fix it if
so, matching wowsims; rankings for gear without such items must not change.

Reports (gitignored, in the main checkout's `.scratch/agent-reports/`): the
review `2026-11-22-general-task-random-suffix-review.md` and this branch's
summary `2026-11-22-general-task-random-suffix.md`.

## What changed

- Fork `7c8059644`:
  - `adapters/player_gear_source.ts`: the page gear read keeps the equipped
    item's suffix id, as the page's own `EquippedItem.asSpec`
    (`ui/sim/proto/equipped_item.ts:274-280`) does.
  - `engine/seams/gear-source.ts`, `engine/slots.ts`: `LoggedItem` and
    `SimItemSpec` have `randomSuffix`.
  - `engine/logged-gear.ts`, `engine/compose.ts`: carry it into the request.
    The per-request database (`adapters/sim_database.ts`) then adds the
    suffix's `randomSuffixes` row through `Gear.toDatabase`
    (`ui/sim/proto/gear.ts:151`), unchanged.
  - `engine/gear-swap.ts`: the worn item put back in its own slot (its own
    worn row) keeps its suffix; a candidate gets none.
  - `engine/candidate-order.ts`, `model/item_ep.ts`: the candidate order
    scores the worn item with its suffix's stats, as bulk sim's `lookupItem`
    (`ui/features/bulk/model/items.ts:21`, `withDynamicStats`) prices a
    suffixed item.
  - Test added to `engine/candidate-order.test.ts`.
- Our repo: `packages/core/test/fork-random-suffix.test.ts` (RS-1 to RS-3),
  the lock re-pin, `sim-implemented-effects.json` regenerated,
  `docs/fork-provenance/engine.md` (six hashes and § Worn random suffix),
  ticket 892 (random-suffix candidates are simmed with no suffix).

What the player sees: with Ravager's Bracers of the Beast worn on ret (P2
gear, tab phase 3), the tab's "Your current gear" read 2,023.5 DPS before and
2,055.9 after, and the top rows were wrist upgrades worth +48 to +59 DPS
before (every bracer beat bracers simmed as armor only); after, the best
wrist row is +26.7.

## Check output

`node --version` printed v22.23.2 in every shell. Logs in the main checkout's
`.scratch/random-suffix/` (gitignored).

- **Red** (`red.log`, fork at `82d0c5818` with only the tests added): RS-1 got
  no `randomSuffix` from the gear read, RS-2 got `{ id: 30687, enchant: 2647 }`
  with no suffix, RS-3 got EP 0 where 21 is expected. The worn-row assertion
  of RS-2 and the new `candidate-order.test.ts` case each failed with only
  their own line reverted, and passed with it.
- **Green**: `fork-random-suffix.test.ts` 3 passed; the fork's
  `candidate-order.test.ts` 4 passed.
- **Unchanged rankings without a suffix**: the five engine suites ran with
  the sim trace on before (`trace/rs-base`) and after (`trace/rs-fix`), 246
  tests each; `diff -r` printed nothing (0 bytes,
  `.scratch/rank-split/logs/rs-fix-k2.diff`).
- **Live**: `.scratch/random-suffix/before-readback.json` and
  `after-readback.json` (driver `drivers/rs.mjs`). Before, the page's
  Simulate sent wrist `{ id: 30687, randomSuffix: -41 }` with a
  `randomSuffixes` row `-41`; all 1100 tab requests sent `{ id: 30687 }` and
  no row. After, all 999 tab requests holding the bracers sent
  `randomSuffix: -41` and the row.
- **`pnpm verify`** in the pair at `2be6a543`: rc=0, "gates: 1753 ran, 0
  skipped". Run again after the review fixes; see the branch summary.

## Findings

One fresh reviewer ran the three axes. No adversarial or domain findings.

- **S1 (standards, low).** `docs/fork-provenance/engine.md`: six rows got
  new hashes but kept adaptation text that is now false (`compose.ts`
  "none", `logged-gear.ts` "none (import paths only)", `gear-swap.ts` "no
  code changed", and the `slots.ts`, `candidate-order.ts` and
  `seams/gear-source.ts` rows), and no dated section said what changed.
- **S2 (standards, low).** `packages/core/test/fork-random-suffix.test.ts:157-158`
  said the no-suffix shape protects the ranking cache key; that key never
  reads the suffix (`engine/rank-setup.ts:326-332`).

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                                                                         |
| --- | --------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| S1  | Standards | fixed       | The six rows name fork `7c8059644`; § Worn random suffix added; `pnpm engine-port-drift:check` ok (51 files)          |
| S2  | Standards | fixed       | The comment now says the requests stay byte for byte the same, which the 0-byte trace diff shows                      |
| N1  | Notes     | wontfix     | The tab's copy does not send the page's `metaGemDisabled`: by design it recolors gems to turn the meta on and says so |

## Notes

- **N1.** In the live run the page sent `metaGemDisabled: true` on the head;
  the tab's baseline did not, because the tab's meta repair recolored one
  gem (feet 24027 to 24054) so the meta is active in its copy
  (`repairWornMeta`, `engine/rank-setup.ts`), and the notes tell the player.
  A meta the repair cannot turn on stops the run (`meta-unsolvable`). So the
  tab never sims an inactive meta, and the flag would be false. Not part of
  this branch.
- TBC's `ItemSpec` has no reforge or other field: `id`, `random_suffix`,
  `enchant`, `gems`, `meta_gem_disabled` (`proto/common.proto:730-739`).
- `caps.ts:17` (hit for the repair budget) still reads base item stats; no
  suffix in `db.json` has spell or melee hit (all 75 checked), so it cannot
  change a result.
- Candidates: ticket 892. The twelve suffix epics are in the pool and are
  simmed bare (11 such requests in the live run); the ticket gives wowsims'
  picker rule (best-EP suffix, `ui/sim/player/player.ts:1198-1203`) as the
  recommended fix.
- The suffix lookup in `item_ep.ts` reads the page's `Database` directly, so
  RS-3 runs in our repo against the real database, not in the fork's unit
  suite.
