Status: closed
Verified by: `pnpm run fork-lint:check` and `pnpm run fork-tests:check` (74 files, 907 tests passed), `pnpm exec vitest run packages/core/test/fork-set-net.test.ts packages/core/test/fork-set-fixtures.test.ts packages/core/test/fork-meta-repair.test.ts packages/core/test/wowsims-fork-parity.test.ts` (189 passed) on tbc-new-fork@57035ec239b65eea2788add01f80f2e194258e3f (review rewording in tbc-new-fork@6ca79f308bf44d2f7f079a84ecc197a24c64b757); review in docs/reviews/fix-886-887-set-screen-and-tidy.md
Type: task
Origin: .scratch/agent-reports/2026-11-18-general-task-naming-review-decisions.md
Blocked by: none

# Set-aside code-tidy items from the Upgrades-tab naming review

The naming review (decisions doc above, part D) set these aside: each is a
code change beyond a rename, so the rename batches left them. Closed
2026-11-20; see Resolution.
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

- **Unused `needed` and `pool` in the set screen's estimate call.**
  `estimatedDeltaAt` in `model/engine/rank.ts` passes `needed: rest.length`
  (`:1854`) and `pool: []` (`:1855`) to `estimateCombinedDelta`, which never
  reads either field (`model/engine/partner-choice.ts`, `estimateCombinedDelta`
  reads only `row`, `brokenBy` and `breakDps` from the query). They are there
  because it takes a whole `PartnerQuery`. Narrowing its parameter to
  `Pick<PartnerQuery, 'row' | 'brokenBy' | 'breakDps'>` would drop them; that
  is a type change, not a rename. Found by the 2026-11-19 sum-of-singles
  reread (`.scratch/agent-reports/2026-11-19-general-task-sum-of-singles-reread.md`
  in the main checkout, item 7). Lines are at the reader-fixes fork commit.

- **"package" left in developer log text.** The renames left the coined word
  in three `console.warn` lines in `model/engine/rank.ts`: "bonus package not
  measured" (`:1951`, `:2091`) and "the package's gem repair failed" (about
  `:3488`; `packages/core/test/fork-set-net.test.ts` matches this one). Say
  "added pieces" and update the test's match. The unused
  `setPotentialDisclosureLine` (`model/engine/disclosure.ts:110-112`, see D2
  above) also says "completion-package". Lines are at fork `33e84fabc`.

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

## Resolution (2026-11-20, fork `57035ec23`)

Each claim was checked again against the fork before the change.

- **D1:** done. Deleted `model/engine/fixtures/`; its two
  `docs/fork-provenance/engine.md` rows are gone, and
  `docs/fork-upstream-touchpoints.md` no longer says the files stay. The
  owner's 2026-10-08 "Unused dev features: ignore them" left them in place;
  this ticket's ask is read as overriding that for these two files.
- **D2:** done. Every listed symbol was used only in its own file, mostly not
  at all, so each is deleted rather than un-exported (an unused private would
  fail the fork lint). `hideWorn` went from `view.ts` and from
  `packages/core/test/fork-set-fixtures.test.ts`. `poolFromUniverse`'s main-repo
  hits are core's own copy, which stays. `slamaltmanOfflineRecordings` went
  with D1.
- **D3:** done. `SimSlotName` is now `SimOrderName` (the two unions were the
  same 17 names). The name `SimSlotName` stays as an alias: about 30 uses
  across the engine and the tab's results view, and core's own copy, use it,
  so renaming them all is churn with no second copy left to drift.
- **D5:** done. Nothing read `GemRecolor.cost`, and no recording stores it;
  the field and both writers are gone. `Move.cost` stays.
- **D6:** done, by deleting `DeadSlot.poolSize`: nothing read it. (At the two
  `slotRows.length` sites the slot has no worn row, so all three counts meant
  the candidates.)
- **D7:** done. `set-bonus.ts` imports `setCounts` and `setNameOf` from
  `set-value.ts`.
- **D9:** done. The messages say "limit for a believable set bonus",
  "suspected measurement problem", "which worn bonuses the added pieces
  break", "loses a <set> bonus" and "Check that this lost bonus is real"; the
  cause `set-break-toll` is `set-break-cost`. The five feral recordings were updated in place (text
  only) and their README says so. Core's own copy keeps the old text.
- **D11:** no change. `'split'` and `'full-path'` are never chosen by the tab
  (`set_bonus_popover.ts` asks for `'full'` and the default rule), but about
  26 assertions in `packages/core/test/fork-set-net.test.ts` and
  `fork-set-fixtures.test.ts` use them, and `view.ts` calls the credit view
  "a player's choice, not a game rule". Removing them is a product decision,
  so it is left to the owner.
- **Unused `needed` and `pool`:** done. `estimateCombinedDelta` takes
  `Pick<PartnerQuery, 'row' | 'brokenBy' | 'breakDps'>`.
- **"package" in log text:** done. The three `rank.ts` lines say "added
  pieces", and the test match in `fork-set-net.test.ts` follows.
  `setPotentialDisclosureLine` went with D2.
