Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: task
Origin: docs/reviews/feat-flat-cutoff.md (findings A4, A6, S4)
Blocks: none
Blocked by: none
Related: 615
Verified by: tbc-new-fork@6d0f15a88 (all three fixed in one commit; the
  dead test is deleted), pinned by `data/wowsims-fork.lock.json` at
  08afcdcce on `feat/bis-rows`; re-run with
  `git -C vendor/tbc-new-fork grep -n -e upgrades-cutoff-arm -e "PORTED verbatim" -e "PORTED unchanged" -- ui/features/upgrades/model/engine/cutoff.ts ui/features/upgrades/model/engine/content-hash.ts ui/features/upgrades/components`
  (prints nothing) and `pnpm verify`. The file header of `content-hash.ts`
  still said "ported unchanged" in lower case, which that grep misses;
  tbc-new-fork@3393bcb19 fixed it (docs/reviews/feat-bis-rows.md, S7),
  pinned at 176268e7c: `git -C vendor/tbc-new-fork grep -n -i "ENGINE_VERSION. are ported"
  -- ui/features/upgrades/model/engine/content-hash.ts` prints nothing.

# Two fork comments misstate their port, and one tab test cannot fail

All three are in the fork's Upgrades tab code (`vendor/tbc-new-fork`, fork
commit `c4696b091`). Each fix is a fork commit, so it needs the usual re-pin
(`data/wowsims-fork.lock.json`, `pnpm sim-implemented-effects:generate`,
`pnpm verify`). That is why the pre-merge review of `feat/flat-cutoff` did not
fix them inline.

1. **`ENGINE_VERSION` comment (A4, before `feat/flat-cutoff`).**
   `ui/features/upgrades/model/engine/content-hash.ts:49-53` says the value is
   "PORTED unchanged from packages/core/src/content-hash.ts". The fork value is
   6 and core is 9 (`packages/core/src/content-hash.ts`). The fork keeps its
   own number on purpose; ADR-0037 records why it stayed 6. The comment should
   say the fork's value is its own and why it can differ.
   `docs/reviews/feat-upstream-react-port.md:41` noted the same gap earlier.
2. **`cutoff.ts` port header (S4, before `feat/flat-cutoff`).**
   `ui/features/upgrades/model/engine/cutoff.ts:1-4` says "PORTED verbatim
   from packages/core/src/cutoff.ts", but its doc comment names
   `futureBonuses` where core names `prospectiveBonusDps`.
   `docs/fork-provenance/engine.md` (the `cutoff.ts` row) already calls the
   file "adapted — comment-only". Make the header agree with the provenance
   doc.
3. **Dead absence test (A6, added on `feat/flat-cutoff`).**
   `ui/features/upgrades/components/ResultsTable/ResultRow.test.tsx:127`
   checks that no `upgrades-cutoff-arm` test id renders. No code renders that
   id any more (`git -C vendor/tbc-new-fork grep -n upgrades-cutoff-arm -- ui`
   finds only this test), so the test cannot fail. Delete it, or replace it
   with a check of what the row does show for a below-bar figure.

Done when all three are fixed in one fork commit and the lock names it.
