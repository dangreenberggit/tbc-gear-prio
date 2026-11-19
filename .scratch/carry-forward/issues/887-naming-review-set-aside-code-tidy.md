Status: open
Type: task
Origin: .scratch/agent-reports/2026-11-18-general-task-naming-review-decisions.md
Blocked by: none

# Set-aside code-tidy items from the Upgrades-tab naming review

The naming review (decisions doc above, part D) set these aside: each is a
code change beyond a rename, so the rename batches left them. Not started.
None blocks the upstream PR; they are tidy and small-design items to look at
when convenient.

Paths are relative to `vendor/tbc-new-fork/ui/features/upgrades/` unless they
start with `packages/`. Line numbers were re-checked against the fork at
`2ab306bcc` on 2026-11-19 (they moved during the rename pass).

## Items

- **D1 — `model/engine/fixtures/` is unused.** `fixtures/slamaltman-offline.ts`
  imports `fixtures/report-events-offline.ts`, and nothing else in the fork or
  the main repo imports the folder. Deleting it means removing its two
  `docs/fork-provenance/engine.md` rows (`fixtures/report-events-offline.ts`,
  `fixtures/slamaltman-offline.ts`). Re-checked 2026-11-19:
  `git -C vendor/tbc-new-fork grep -n "engine/fixtures\|/slamaltman-offline\|/report-events-offline" -- ui`
  hits only `fixtures/slamaltman-offline.ts:5`; `git grep -n "engine/fixtures" -- packages scripts`
  in the main repo gives 0.

- **D2 — exports used only in their own file (fork `ui/`).** Over-exported
  symbols: `setPotentialDisclosureLine`, `fightProvenanceLines` (the only user
  of `CONFIDENT_PARSE`), `renderDisclosure`, `poolFromUniverse`,
  `poolEntryFromUniverse`, `filterPoolByZone`, `zonesInPool`, `bossesInPool`,
  `validateViewFilter`, `viewFilterValue`, `VIEW_ALL`, `CachingGearSource`,
  `gearCacheKey`, `slamaltmanOfflineRecordings`, `isEnchantable`,
  `UniverseEntry`, `curationHint`; and `ViewOptions.hideWorn` (was `hideOwned`;
  read only by `model/engine/view.ts` and one fork test). The rename pass may
  have changed some of these identifiers; re-check each with
  `git -C vendor/tbc-new-fork grep -lw <name> -- ui` before acting.
  `poolFromUniverse` had 8 main-repo hits, likely core's copy (unverified).

- **D3 — one union written out twice.** `SimOrderName` (`model/engine/slots.ts:27`)
  and `SimSlotName` (`model/engine/pool.ts:179`, comment at `:178`) are two
  hand-written copies of the same union. Merging them is a type change.
  (This is where part X34 moved.)

- **D5 — `GemRecolor.cost` filled two ways, read by nothing.** The `cost`
  field on `GemRecolor` (`model/engine/meta-repair.ts:27`, was
  `MetaRepairSwap.cost`) is set differently at `meta-repair.ts:176`
  (`cost: move.cost`) and `:547` (`cost: model.gem(c.from) - model.gem(c.to)`).
  Confirm nothing reads `GemRecolor.cost` before deciding to drop it. (The
  local `cost` in `dropUnneededRecolors`, `meta-repair.ts:624` onward, is a
  different value.)

- **D6 — `DeadSlot.poolSize` counts differently at its sites.**
  `model/engine/dead-slots.ts:43` declares it; it is `slotRows.length` at `:92`
  and `:113` but `candidates.length` at `:156`.

- **D7 — `set-bonus.ts` repeats `setCounts` from `set-value.ts`.**
  `model/engine/set-bonus.ts:8` defines a private `setCounts` that duplicates
  `model/engine/set-value.ts:65`'s exported `setCounts`. (The review also named
  `setLabel`; no `setLabel` is present in either file at `2ab306bcc`, so only
  the `setCounts` duplication stands.)

- **D9 — saved plausibility message text uses coined words.**
  `model/engine/plausibility.ts` message strings use "plausibility band"
  (`:51`, `:55`), "suspected confound" (`:52`), "package" (`:52`,
  "check what the package breaks"), and "toll" (`:11` `set-break-toll`, `:94`,
  `:97`). This text is stored in recordings (`plausibilityWarnings`, 6 files),
  so changing it changes stored output — it needs a fixture update, not a plain
  rename, which is why the review set it aside.

- **D11 — `ViewOptions.setCredit` values read only in `view.ts`.**
  `SetCreditView = 'full' | 'split'` (`model/engine/view.ts:22`) on
  `setCredit?` (`:85`), and the related `SetCreditRule = 'highest-credit' | 'full-path'`
  (`:31`; `'highest-credit'` was `'best-stop'` before the rename pass), are read
  only in `view.ts`.

## Resolved during the rename pass (no action)

- **D4 — `GemColour` alias.** Resolved. Batch 4 deleted the `GemColour = number`
  alias; `model/engine/gems.ts:3,8` now imports and uses the generated
  `GemColor` enum (`color: GemColor`). Evidence: `tbc-new-fork@2ab306bcc`,
  `grep -nE "GemColour|GemColor" gems.ts` shows no `GemColour`.

## Not included here

- **D8** (comments wrong about behaviour) and **D10** (log text "set step gear
  not measured" / "set step break not split") are handled with the comment and
  step-word work, not filed here.
- **D12** is ticket 886 (set-screen may count a set's own bonus two or three
  times); already filed.
