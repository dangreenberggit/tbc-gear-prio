# Pre-merge review — fix/892-suffix-candidates

Diffed against: our repo `ca62e8aa..HEAD` (`ca62e8aa` is the tip of
`fix/random-suffix`, which this branch builds on and which is not yet on
`dev`), and the fork `7c8059644..ae63bb593` on fork branch
`fix/892-suffix-candidates` (`7c8059644` is `fix/random-suffix`'s pin). The
fork diff touches only the tab's files under `ui/features/upgrades/`; none of
the 16 files exists on `upstream/master` (the whole `ui/features/upgrades`
folder is absent there), so no upstream wowsims file changed.

What the branch is for: ticket 892. The twelve Karazhan trash epics with a
random suffix (ids 30675-30687) were simmed with no suffix, so they ranked on
armor alone. The fix follows wowsims' gear-picker rule (`computeItemEP`,
`ui/sim/player/player.ts:1188-1203`): each such candidate is simmed with its
highest-EP suffix, or with the suffix the player wears on that item, and its
row is named as wowsims names a suffixed item, the item's name and then the
suffix's (`ItemDetailCell.tsx:111-112`).

Reports (gitignored, in the main checkout's `.scratch/agent-reports/`): the
review `2026-11-22-general-task-892-suffix-candidates-review.md` and this
branch's summary `2026-11-22-general-task-892-suffix-candidates.md`.

## What changed

- Fork `1676cdf81`, all under `ui/features/upgrades/`:
  - `model/engine/random-suffix.ts` (new): `withCandidateSuffixes` gives each
    pool entry with suffix options its suffix and the suffixed name.
  - `model/engine/pool.ts`, `rank-types.ts`: `PoolEntry` and `RankedItem`
    have `randomSuffix`.
  - `model/engine/rank-setup.ts`: `eligibleCandidates` applies the suffixes;
    the ranking key holds a worn or candidate suffix only when one is set
    (`content-hash.ts`: `HashedGearItem.randomSuffix`).
  - `model/engine/candidate-order.ts`, `gear-swap.ts`, `hit-budget.ts`,
    `rank-candidates.ts`: the EP order, the hit-read swap, the repair swap and
    both row builders take the entry's suffix.
  - `components/ResultsTable/ItemNameCell.tsx`, `ResultRow.tsx`,
    `components/RowToggles/BatchToggle.tsx`: the row's wowhead link and its
    Batch Sim entry carry the suffix.
  - Tests in `candidate-order.test.ts`, `ResultRow.test.tsx`,
    `RowToggles.test.tsx`.
- Fork `ae63bb593` (review D1): `random-suffix.ts` leaves an item bare when no
  option is worth more than 0 EP; new `random-suffix.test.ts`.
- Our repo: `packages/core/test/fork-random-suffix.test.ts` (RS-2 worn row
  name, RS-4, RS-5, RS-6), the lock re-pin, `sim-implemented-effects.json`
  regenerated, `docs/fork-provenance/engine.md` (nine hashes, the new
  `random-suffix.ts` row and § Random-suffix candidates), ticket 892 closed.

What the player sees (live ret run, P2 gear, tab phase 3): the suffix epics
now read, for example, "Glider's Greaves of the Tiger" at -3.8 DPS where
"Glider's Greaves" read -58.9, and "Ravager's Bracers of the Tiger" at -7.4
where it read -48.3. None is an upgrade on that gear.

## Check output

`node --version` printed v22.23.2 in every shell. Logs in the main checkout's
`.scratch/suffix-cand/` (gitignored).

- **Red** (tests added, fix not yet written): `red-core.log` — RS-2 got the
  worn row name "item 30687", RS-4 got no `randomSuffix`, RS-5 made 0 requests
  (served from the first run's saved ranking). `red-fork.log` — the three new
  fork tests failed (row link without `rand=-14`, Batch Sim without the
  suffix, order with the bracers last).
- **Green**: `green-core.log` 5 passed; fork suite 342 files, 2870 tests
  passed (`.scratch/rank-split/logs/sc-fix-fork-vitest.log`).
- **Unchanged rankings without a suffix item**: the five engine suites ran
  with the sim trace on before (`trace/sc-base`) and after (`trace/sc-fix`),
  246 tests each; `diff -r` printed nothing (0 bytes,
  `.scratch/rank-split/logs/sc-fix-k2.diff`).
- **Live**: `before-readback.json` (base code, the `random-suffix` pair) and
  `after-readback.json` (this pair), driver `drivers/sc.mjs`. Both: 1100 tab
  requests, 889 ranked rows, "Your current gear: 2,082.7 DPS". Before, the 12
  candidate requests holding a suffix epic sent no suffix and no
  `randomSuffixes` row. After, all 12 sent a suffix with its row (`-14` "of
  the Tiger" for nine, `-36` "of the Sorcerer" for the three cloth items), and
  requests without a suffix item carried no row. Screenshots:
  `after-row.png` (1280 px) and `after-row-phone.png` (390 px); the longest
  suffixed name is 42 characters, inside what `mock-long-names.json` already
  covers in the layout gate (61-80).
- **Review fixes, checked by a fresh agent** (`.scratch/suffix-cand/check/`):
  D1's test failed with `random-suffix.ts` as at `1676cdf81` and passed at
  `ae63bb593`; RS-6 failed with only the gear-key line removed from
  `rank-setup.ts` and passed with it.
- **`pnpm verify`** in the pair before the review: rc=0, "gates: 1755 ran, 0
  skipped" (`verify-2.log`). Run again after the review fixes; see the branch
  summary.

## Findings

One fresh reviewer ran the three axes. Standards and Spec: clean.

- **A1 (adversarial, low).** RS-5 would still pass with the gear half of the
  ranking-key change (`engine/rank-setup.ts`, `rankingContentHash`) removed:
  its pool holds the worn bracers, so the candidate half of the key changes
  too. When the worn suffix item is not in the pool (an excluded source,
  Prune, a later phase), only the gear half guards it.
- **D1 (domain, low).** When no suffix option is worth more than 0 EP to the
  spec, `bestSuffix` kept the first option (feral on the cloth items: "Lurker's
  Cord of the Eagle"). wowsims' picker lists no option worth 0 EP or less
  (`getRandomSuffixes`, `ui/sim/player/player.ts:509-513`). The DPS was the
  same; only the name was wrong.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                       |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | RS-6 in `fork-random-suffix.test.ts` leaves the bracers out of the pool; red with the gear-key line removed         |
| D1  | Domain      | fixed       | Fork `ae63bb593`; `random-suffix.test.ts` "leaves an item bare when no option is worth anything"; red at 1676cdf81  |
| N1  | Notes       | wontfix     | The tab picks with its bundled weights, copies of the wowsims presets the picker starts from; it reads no edits     |
| N2  | Notes       | wontfix     | On a tie the first option wins; the picker prices only the best EP and names no suffix, so there is no rule to copy |

## Notes

- **N1.** The tab picks the suffix with its bundled EP weights
  (`model/data/data.ts`, copies of wowsims presets), as it already orders
  candidates and fills gems with them. The picker uses the page's weights,
  so the two differ only when the player edits weights on the page.
- **N2.** Ties are real (ret on the cloth items: "of the Sorcerer" against
  "of the Invoker"). The first option in db.json order wins, so the result is
  the same on every run.
- **N3.** Suffix items a preset holds (shadow priest's "of Shadow Wrath"
  pieces) get the same rule; the provenance section says so.
- **N4.** RS-2, RS-4, RS-5 and RS-6 are fork-gated and skip in CI, like every
  fork suite; a local `pnpm verify` fails when they skip.
- The ranking key gains a field only when a suffix is present, so keys for
  gear and pools without a suffix item are unchanged; the tab's store is one
  `MemoryStore` per mounted tab (`model/run.ts`).
