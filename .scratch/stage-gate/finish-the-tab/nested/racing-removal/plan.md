# Plan: delete racing in place from the fork's ported engine (parent Step 6)

## Mismatches between the sub-brief and the code (read these first)

1. **The core-commit lookup command returns the wrong commit.** `git log -1 --format=%H -- docs/adr/0026-*.md` gives `ae32a92a4ad6a5d8a407248e8cb7836c029441c8` ("Renumber tickets 232/233 to 236/237"), a later touch of the ADR file. The commit that recorded the ADR is `66dab1988d2c1036d585f696d5decf16ec52e79c`, and the commit that actually deleted racing from core is `28b00f9` ("Remove racing; full-sweep every eligible candidate", 2026-08-19). The PROVENANCE header note must name `28b00f9` as the ported source, with `66dab19` as the ADR commit. (Claim C1.)
2. **`disclosure.ts` and `types.ts` do not mention screening.** Only `content-hash.ts` does (its doc comment, lines 17–23). Those two files are not touched and their PROVENANCE rows stay as-is. (C2.)
3. **The parity-test comment is lines 354–366, not 359–363**, and it documents the `extraInput?: Record<string, unknown>` field at line 367, which is spread at line 499. Once the only caller (line 899–900) goes, the field and the spread are dead; repo commit 3 removes all four pieces. (C3.)
4. **`view.ts`'s tie-group code is shaped differently from core.** The fork has `assignTieGroupsWithinPartition(rows, sortKey, groupIdRef)` (lines 93–126) called twice from `assignTieGroups` (lines 128–144). Core has one `assignTieGroups` with the body inlined and a local `groupIdRef`. "Remove the screened partition" means folding the helper back into `assignTieGroups` in core's shape. (C4.)
5. **`rank.ts` has racing touchpoints the brief does not list** and that must also go for the file to compile and match core: the `screeningSkips` sort (1150–1156), the `screeningSkips` spread into `substitutions` (1283–1295), `ranked.push(...screenedRows)` (1187–1192), the rank-loop early return (1219–1224), and the M2 paragraph in the file doc comment (28–41). All are covered in Step 2. (C5.)
6. **PROVENANCE.md's CRLF section is stale for this clone**: `git -C <fork> config core.autocrlf` now prints `false`, and every `.ts` file touched here is LF on disk (0 CRLF lines). `PROVENANCE.md` itself is CRLF (153 of 153 lines). Edit it in place and preserve its CRLF endings; do not rewrite the CRLF section (out of scope). The drift check passes today: `engine port drift check ok: 33 ported files match PROVENANCE.md`. (C6.)
7. **Ticket 217 is already `Status: resolved`.** Commit 1 retires the test that was its fork-only closing route; it does not reopen the ticket. (C7.)
8. `test:locales` is JSON-schema validation only (`test-locales.mjs` + `schemas/translation.schema.json`, which has no `upgrades_tab` entry), so removing keys cannot fail it; it is a sanity check, not a gate on key usage. (C8.)

## Paths manifest

Repo (`C:/Users/dgree/Code/lulz/tbc-gear-prio`, branch `feat/finish-the-tab`):
- `packages/core/test/wowsims-fork-parity.test.ts`
- `.scratch/carry-forward/issues/217-fork-screening-compose-site-not-gated-by-e-w3.md` (one appended note)

Fork (`C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork`, branch `feat/upgrades-tab`, tip `e5d8741`); `<E>` = `ui/core/components/individual_sim_ui/upgrades/engine`:
- `<E>/rank.ts`, `<E>/view.ts`, `<E>/content-hash.ts` (doc comment only), `<E>/promotion.ts` (deleted), `<E>/PROVENANCE.md`
- `ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts`
- `ui/core/components/individual_sim_ui/upgrades_tab.tsx`
- `assets/locales/en/translation.json`

Not touched: `<E>/disclosure.ts`, `<E>/types.ts`, any Go file, any other locale (only `en/` exists).

Pre-existing untracked file in the repo, not ours: `.scratch/stage-gate/finish-the-tab/measurements.md`. Leave it alone.

## Shell recipe (every Bash call)

```
eval "$(fnm env --shell bash)"; fnm use 22.17.1
R=C:/Users/dgree/Code/lulz/tbc-gear-prio
F=$R/vendor/tbc-new-fork
E=$F/ui/core/components/individual_sim_ui/upgrades/engine
TAB=$F/ui/core/components/individual_sim_ui/upgrades_tab.tsx
```
Never `cd` into the fork. Fork checks, run after every fork edit:
```
node $F/node_modules/typescript/bin/tsc --noEmit -p $F/tsconfig.json   # expect no output, exit 0
npm --prefix $F run lint:css                                             # exit 0
npm --prefix $F run test:locales                                         # exit 0
npx --prefix $F oxlint $E/rank.ts $E/view.ts $E/content-hash.ts $TAB $F/ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts
```
oxlint baseline (C9): 5 warnings, all `simple-import-sort(imports)` or `import(no-duplicates)` at `disclosure.ts:9`, `view.ts:21`, `upgrades_tab.tsx:15`, `upgrades_tab.tsx:1`, `rank.ts:46`. Acceptance after edits: no warning of any other rule, count ≤ 5. Do not run `npm run format` in the fork.

E-W3 command (repo): `pnpm -C $R vitest run packages/core/test/wowsims-fork-parity.test.ts`. The fork side runs only when `vendor/tbc-new-fork/ui/core/proto/common.ts` exists (it does, C10); the output must show the `wowsims-fork-parity (E-W3)` describe with passing tests, not the `skipIf` placeholder.

## Steps

### Step 1 — Repo commit 1: delete the racing parity case (depends on C3, C7, C10)

1. In `$R/packages/core/test/wowsims-fork-parity.test.ts` delete the block from the `/** Ticket 217: the fork's SCREENING compose site …` doc comment (starts line 1006) through the end of `it("gives the fork's screening requests their own database", …, 30000);` (ends line 1122). Keep the closing `});` of the outer `describe` on line 1123. Leave the `extraInput` field, its comment, the spread, and the `extraInput: { fullPool: true }` call site in place for now.
2. Append to `$R/.scratch/carry-forward/issues/217-fork-screening-compose-site-not-gated-by-e-w3.md`:
   `2026-08-22: the fork-only closing route (the "gives the fork's screening requests their own database" case in wowsims-fork-parity.test.ts) is deleted because the fork's screening compose site itself is deleted (ADR-0026 ported to the fork). The ticket stays resolved; there is no screening site left to gate.`
3. `pnpm -C $R verify` — green.
4. Commit (repo only): subject `Retire the fork screening parity case`; body says the screening compose site the case covered is being deleted from the fork, that this retires ticket 217's fork-only closing route (review finding G1), and that the remaining E-W3 case still passes `fullPool: true` until the fork commit lands.

Acceptance: `grep -c "gives the fork's screening requests" $R/packages/core/test/wowsims-fork-parity.test.ts` → 0; `pnpm -C $R verify` exit 0; `git -C $R status --porcelain` shows only the pre-existing `measurements.md`.

### Step 2 — Fork commit A: delete racing from `rank.ts` (depends on C5, C11, C12)

Line numbers are from tip `e5d8741`; re-grep before each edit. Edit in this order (bottom-up keeps earlier numbers valid):

1. `replicateTopItems` (line ~1342): drop `item.screened === undefined &&` so the filter reads `!item.belowCutoff && item.simmed !== false` (core line 1330).
2. `substitutions` (lines ~1283–1295): delete the comment and the `...screeningSkips.map(...)` spread.
3. Rank loop (lines ~1219–1224): delete the `if (item.screened !== undefined) { item.rank = null; continue; }` block and its comment.
4. Comparator (lines ~1195–1209): replace the comment and `bySimmedThenDelta` with core's (core rank.ts 1169–1179): two `simmed === false` checks, then `b.deltaDps - a.deltaDps`. Drop the "Screened rows sort after…" sentences.
5. Lines ~1187–1192: delete the comment and `ranked.push(...screenedRows);`.
6. Lines ~1150–1156: delete the comment and the `screeningSkips.sort(...)`.
7. Lines ~1061–1064: replace the comment with core's `// Counted here, after the cap decides the full-iteration set.`
8. Lines ~914–1058: replace the whole `let simCandidates …` / `screenedRows` / `if (racing) { … } else { … }` region with core's lines 1032–1037:
   ```ts
   // Every eligible candidate gets a full-iteration sim; the cap keeps the
   // first N of the EP order plus every owned row regardless of N (§5.1.1).
   const cap = input.candidateCap ?? ordered.length;
   const simCandidates = ordered.filter(
     (e, i) => i < cap || equippedIds.has(e.itemId)
   );
   ```
9. Lines ~693–771: delete `screenCandidate` and its doc comment. `runCandidate` (line ~785) keeps using `promisePool`, `readCachedSim`, `PoolEntry`, `composeFor` — do not remove those imports.
10. Lines ~673–683: delete the `screeningSkips` declaration and its doc comment.
11. Cache payload (lines ~612–614) — BINDING per parent claim C37: replace the three computed fields with the frozen literals and a why-comment:
    ```ts
    // Frozen at the values the tab has written since the fork's `fullPool: true`
    // commit (41e2260). Racing is gone and these describe nothing the engine does,
    // but they are part of every cache key already written: dropping them would
    // rehash every stored ranking and silently re-sim it. Three fields, not core's
    // four — the fork never hashed `promoteTopJ`, and adding it would change every
    // key (deliberate divergence). Delete only alongside an ENGINE_VERSION bump.
    fullPool: true,
    screenIterations: null,
    promoteTopK: null,
    ```
    Do NOT add `promoteTopJ`. Keep `candidateCap: input.candidateCap ?? ordered.length` exactly as it is (the fork's existing normalization; core differs and that is not this step's concern).
12. Lines ~560–568 comment: replace with core's wording (core 727–734), dropping "post-promotion", "racing knobs", "screening".
13. Lines ~554–556: delete `racing`, `screenIterations`, `promoteTopK` consts.
14. Lines ~544–547 comment: cut to `// Ordering runs before any sim, from raw stats only, so it cannot fail on a candidate the sim itself would later reject. This order also decides which N the cap keeps (§5.1.1).`
15. `RankedItem.screened` (lines ~309–327): delete the field and doc comment.
16. `Progress` (lines ~234–241): delete the `screening` variant and its doc comment.
17. `RankInput` (lines ~155–188): replace the `candidateCap` doc with core's (core 116–121); delete `screenIterations`, `promoteTopK`, `fullPool` and their comments.
18. Imports (lines ~57–62): delete the whole `from "./promotion.js"` import.
19. File doc comment (lines ~28–41): delete the M2 paragraph; keep "Everything else — …" (line 42).
20. `git -C $F rm $E/promotion.ts`.

Acceptance (all must hold before Step 3):
- `grep -c 'screenCandidate\|promotionRule\|stage: "screening"\|\.screened' $E/rank.ts` → 0
- `grep -n 'screen\|racing\|promot\|fullPool' $E/rank.ts` → exactly the frozen-literal block from item 11 (the comment lines plus `fullPool: true,`, `screenIterations: null,`, `promoteTopK: null,`) and nothing else
- `ls $E/promotion.ts` → No such file
- `grep -rn 'promotion.js\|screenIterations\|promoteTopK' $F/ui --include=*.ts --include=*.tsx` → only the rank.ts literal block

### Step 3 — Fork commit A (cont.): `view.ts`, `content-hash.ts` (depends on C4, C2)

`view.ts`:
1. Delete the M2 paragraph in the file doc comment (lines 15–20).
2. Replace `assignTieGroupsWithinPartition` + its doc comment (93–126) and `assignTieGroups` + its doc comment (128–144) with core's single `assignTieGroups` (core view.ts 200–227 verbatim: local `const groupIdRef = { next: 1 };`, then the helper's body).
3. `belowCutoffUnderView`: delete the comment and `if (item.screened !== undefined) return true;` (lines 151–157).
4. `compareRows`: delete the comment and the `aScreened`/`bScreened` lines (180–191).

`content-hash.ts`: replace the doc-comment paragraph at lines 17–23 with: `candidate-pool.md M2 once added racing fields to rank.ts's inline canonicalJson(...) call site rather than here; racing is gone (ADR-0026) and rank.ts now freezes those fields as literals to keep existing cache keys stable. Nothing in this file changed for either.`

Acceptance: `grep -c 'screened\|screen' $E/view.ts` → 0; `grep -c 'screen\|promote' $E/content-hash.ts` → 0 apart from the one sentence above (`grep -c 'racing fields' $E/content-hash.ts` → 1); `grep -c assignTieGroupsWithinPartition $E/view.ts` → 0.

### Step 4 — Fork commit A (cont.): tab and i18n (depends on C13, C8)

`upgrades_tab.tsx`:
1. `run()` (lines ~484–490): delete the comment block and `fullPool: true,`.
2. `rowsTable` (doc comment ~826–834, body 837–839, 871): drop the "Screened rows … membership, not add a new filter of its own." paragraph; `const belowCutoffRows = allRows.filter((r) => r.belowCutoffInView);`; delete `screenedRows`; empty check becomes `shortlist.length === 0 && belowCutoffRows.length === 0`; delete the `screenedRows.length > 0 ? … : null` line.
3. `expandableRowGroup` (~877–912): drop the `kind` parameter; use `'below-cutoff'` literal class names and the two `below_cutoff_toggle_*` keys directly; rewrite the doc comment to say it is the below-cutoff expand (candidate-pool.md §6.1 "hidden, never deleted"). Update the single call site.
4. `resultRow` (~916–921): delete the comment; `const deltaLabel = \`+${row.deltaDps.toFixed(1)}\`;`.
5. `progressLabel` (~1111–1118): delete the comment and the `case 'screening':` block. The `switch` is exhaustive over `Progress["stage"]`, so leaving it in is a tsc error (TS2678).

`assets/locales/en/translation.json`: delete `progress.screening`, `progress.screening_with_failures`, `results.screened_toggle_show`, `results.screened_toggle_hide`, `results.screened_delta_dps`. Fix the trailing comma on `below_cutoff_toggle_hide` (it becomes the last key in `results`).

Acceptance: `grep -c 'screened\|screening\|fullPool' $TAB` → 0 (note: line 1053's "on screen" and 344/716/729 "on screen"/"a literal … on screen" are not matches for these patterns and stay); `grep -c 'screen' $F/assets/locales/en/translation.json` → 0; `node -e "JSON.parse(require('fs').readFileSync('$F/assets/locales/en/translation.json','utf8'))"` exit 0.

### Step 5 — Fork checks, E-W3, commit A (depends on C9, C10, C14)

1. Run the four fork checks from the shell recipe: tsc no output / exit 0, `lint:css` exit 0, `test:locales` exit 0, oxlint ≤ 5 warnings and only the two baseline rule names.
2. E-W3 from the repo: `pnpm -C $R vitest run packages/core/test/wowsims-fork-parity.test.ts` — must pass with the E-W3 describe running (the `extraInput: { fullPool: true }` is still passed; it is `Record<string, unknown>` and the engine no longer reads the field, C14).
3. `git -C $F add -A $E $TAB $F/assets/locales/en/translation.json && git -C $F status --porcelain` — exactly the six paths (`rank.ts`, `view.ts`, `content-hash.ts`, deleted `promotion.ts`, `upgrades_tab.tsx`, `translation.json`); nothing else.
4. Commit A in the fork: subject `Remove racing; full-sweep every eligible candidate`; body: ported from core `28b00f9` (ADR-0026, recorded in core `66dab19`); cache payload keeps `fullPool: true, screenIterations: null, promoteTopK: null` as literals so keys written since `41e2260` are unchanged, and does not add core's `promoteTopJ`; behaviour on the tab path is unchanged because the tab has passed `fullPool: true` since `41e2260`.
5. Record `A=$(git -C $F rev-parse --short=9 HEAD)`.

Acceptance: all commands above exit 0; `git -C $F log -1 --format=%s` = `Remove racing; full-sweep every eligible candidate`.

### Step 6 — Fork commit B: PROVENANCE.md and ENGINE_FORK_COMMIT (depends on C1, C6, C15)

1. Re-hash with the drift script's method (raw bytes): `sha256sum $E/rank.ts $E/view.ts $E/content-hash.ts` (files are LF; `sha256sum` on raw bytes is what `sha256_of` computes).
2. In `$E/PROVENANCE.md` (CRLF file — edit so line endings stay CRLF; check with `cat -A $E/PROVENANCE.md | grep -vc '\^M\$$'` → 0 after editing):
   - `rank.ts` row: new hash; adaptation text drops the M2 clause and the ticket-156 screening clause, replacing them with `racing removed in place (core 28b00f9 / ADR-0026); cache payload keeps the three frozen racing literals, no promoteTopJ (deliberate divergence from core's four)`. Keep the M1 and ticket-212 clauses.
   - `view.ts` row: new hash; drop `M2's screened-row third-view-state (§6.1/7.7) ported unchanged in shape`.
   - `content-hash.ts` row: new hash; replace the M2 clause with `racing's hash fields are frozen literals at rank.ts's call site (ADR-0026)`.
   - Delete the `promotion.ts` row entirely (the script reports `missing: … (listed in PROVENANCE.md, not found on disk)` otherwise, C15).
   - Add, directly under the "Two rows trace to a later core commit than the header" section, a new section `## Racing removed 2026-08-22` stating: racing deleted in place from `rank.ts`, `view.ts`, `content-hash.ts` (doc only) and `promotion.ts` removed, ported from core commit `28b00f9` ("Remove racing; full-sweep every eligible candidate", ADR-0026 recorded in `66dab19`), which is not an ancestor of the header commit — give the `git merge-base --is-ancestor 28b00f9 12ce58414ad0f8f1e34c581d7583e6998e05e8bb` command; and that `rank.ts` was not re-ported (core's `rank.ts` differs in cache-key construction and `candidateCap` hashing; compare by hand, not `diff -w`).
3. `$F/ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts`: set `ENGINE_FORK_COMMIT = "<A>"` (9-char short hash from Step 5.5). Per its own convention, commit B carries the hash of commit A, which is the last commit that changed engine behaviour.
4. From the repo: `python $R/scripts/check_engine_port_drift.py` → `engine port drift check ok: 32 ported files match PROVENANCE.md` (33 − promotion.ts).
5. Fork checks again (tsc, oxlint on `engine_provenance.ts`). Commit B in the fork: subject `Record the racing removal in PROVENANCE.md`; body names commit A and says `ENGINE_FORK_COMMIT` now points at it.

Acceptance: drift script prints `32 ported files match`; `grep -c promotion.ts $E/PROVENANCE.md` → 0 (the "Not ported" table never listed it, so 0 is exact); `grep -c "$A" $F/ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts` → 1; `git -C $F status --porcelain` empty.

### Step 7 — Repo commit 3: drop `extraInput` (depends on C3)

1. In `$R/packages/core/test/wowsims-fork-parity.test.ts`: delete `extraInput: { fullPool: true },` and the `// The fork still races; …` comment (lines ~899–900); delete the `...engine.extraInput,` spread (line ~499); delete the `extraInput?: Record<string, unknown>;` field and its doc comment (lines ~354–367).
2. `pnpm -C $R verify` — green (includes E-W3 and the drift check against fork commit B).
3. Commit (repo): subject `Drop the fork's fullPool parity input`; body: the fork deleted racing (fork commit A, ported from core `28b00f9`), so the field no longer exists on `RankInput` and the parity call passes the same input to both engines.

Acceptance: `grep -c 'extraInput\|fullPool\|racing' $R/packages/core/test/wowsims-fork-parity.test.ts` → 0; `pnpm -C $R verify` exit 0.

### Step 8 — Final gates

- `grep -c 'screenCandidate\|promotionRule\|stage: "screening"\|\.screened' $E/rank.ts` → 0 and the same for `$E/view.ts` → 0
- `ls $E/promotion.ts` → absent; `grep -c 'screened' $TAB` → 0
- `make -C $F test` exit 0 (Go sanity run, once; no Go files changed)
- `git -C $F status --porcelain` empty; `git -C $R status --porcelain` shows only the pre-existing `.scratch/stage-gate/finish-the-tab/measurements.md`
- `git -C $F log --oneline -3` shows B, A, `e5d8741`; `git -C $R log --oneline -3` shows commit 3, commit 1, `10dbb38`-descendant.

## Claims register

| # | Claim | Verified by |
|---|---|---|
| C1 | The removal commit in core is `28b00f9`; the ADR was recorded in `66dab19`; the brief's command yields `ae32a92`, a ticket-renumber commit | `git -C $R log --format='%h %s' -S'screenCandidate' -- packages/core/src/rank.ts` (top: `28b00f9 Remove racing; …`); `git -C $R log --diff-filter=A --format='%H %s' -- 'docs/adr/0026-*.md'` → `66dab19…`; `git -C $R log -1 --format='%H %s' -- 'docs/adr/0026-*.md'` → `ae32a92… Renumber tickets …` |
| C2 | Only `content-hash.ts` (lines 17–23) mentions screening among disclosure/types/content-hash | `grep -n 'screen\|promot' $E/disclosure.ts $E/types.ts $E/content-hash.ts` → one hit, `content-hash.ts:20` |
| C3 | `extraInput` is declared `Record<string, unknown>` at line 367 with doc comment 354–366, spread at 499, passed at 899–900 | `grep -n 'extraInput' $R/packages/core/test/wowsims-fork-parity.test.ts` → 367, 499, 900 |
| C4 | Fork `view.ts` splits tie grouping into `assignTieGroupsWithinPartition` (93–126) + `assignTieGroups` (128–144); core has one `assignTieGroups` (core 200–227) | `grep -n 'function assignTieGroups' $E/view.ts $R/packages/core/src/view.ts` |
| C5 | `rank.ts` racing touchpoints are at 28–41, 57–62, 155–188, 234–241, 309–327, 544–556, 560–568, 612–614, 673–683, 693–771, 914–1058, 1061–1064, 1150–1156, 1187–1192, 1195–1224, 1283–1295, 1342 | `grep -n 'screen\|racing\|promot\|fullPool' $E/rank.ts` (62 hits, all inside those ranges) |
| C6 | Fork clone has `core.autocrlf=false`; touched `.ts` files are LF; `PROVENANCE.md` is CRLF; drift check passes today with 33 rows | `git -C $F config core.autocrlf` → `false`; `cat -A $E/rank.ts \| grep -c '\^M\$$'` → 0 (same for view.ts, content-hash.ts, upgrades_tab.tsx, translation.json); for PROVENANCE.md → 153; `python $R/scripts/check_engine_port_drift.py` → `ok: 33 ported files` |
| C7 | Ticket 217 is `Status: resolved` | `head -1 $R/.scratch/carry-forward/issues/217-*.md` |
| C8 | `test:locales` validates against `schemas/translation.schema.json`, which does not enumerate `upgrades_tab` keys | `grep -c upgrades_tab $F/schemas/translation.schema.json` → 0; `sed -n 25,50p $F/test-locales.mjs` |
| C9 | oxlint baseline on the touched set is 5 warnings, rules `simple-import-sort(imports)` ×4 and `import(no-duplicates)` ×1 | `npx --prefix $F oxlint $E/rank.ts $E/view.ts $E/promotion.ts $E/disclosure.ts $E/types.ts $E/content-hash.ts $TAB $F/ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts \| grep -c 'warning\|error'` → 5 |
| C10 | E-W3's fork side runs (`canRunForkSide` = fork dir exists and `ui/core/proto/common.ts` exists) | `ls $F/ui/core/proto/common.ts`; test lines 77–81, 869 |
| C11 | `promisePool`, `readCachedSim`, `PoolEntry`, `deps.signal` are still used by the full-iteration path after removal | `grep -n 'promisePool\|readCachedSim\|PoolEntry\|signal' $E/rank.ts` → hits at 774–824 and 1080–1110 outside the deleted ranges |
| C12 | The tab has written `fullPool: true` since fork commit `41e2260`, so the frozen literals reproduce existing keys | `git -C $F log --format='%h %s' -S'fullPool: true,' -- ui/core/components/individual_sim_ui/upgrades_tab.tsx` → `41e226019 Full-sweep every eligible candidate on the tab path` |
| C13 | `progressLabel` switches exhaustively on `p.stage`; a `case 'screening'` against a union without it is a tsc error | hypothesis, untested (TS2678 is standard behaviour; Step 5's tsc run is the check) |
| C14 | After removal the engine ignores an unknown `fullPool` key at runtime | hypothesis, untested until Step 5.2 — `RankInput` is a plain object type and `input.fullPool` is no longer read; E-W3 passing with `extraInput` still present is the measurement |
| C15 | The drift script reports a row whose file is absent as `missing:` and exits non-zero | `sed -n 100,118p $R/scripts/check_engine_port_drift.py` |
| C16 | `promotion.ts` is imported only by `rank.ts` | `grep -rn 'promotion' $F/ui --include=*.ts --include=*.tsx \| grep -v engine/promotion.ts` → only rank.ts hits |

## Out of scope

- Re-porting core's `rank.ts` (CLOSED by F4); measuring `diff -w` against core.
- Adding `promoteTopJ` to the fork's cache payload (BINDING C37: three literals, not four).
- Aligning the fork's `candidateCap` hashing with core's (core hashes it only when defined; the fork always hashes `?? ordered.length`) — a cache-key change, not this step.
- Fixing the stale CRLF section in `PROVENANCE.md` or re-baselining the header commit.
- `pre-merge-review`, merging to `dev`.

## Verify recipe (end state)

```
eval "$(fnm env --shell bash)"; fnm use 22.17.1
R=C:/Users/dgree/Code/lulz/tbc-gear-prio; F=$R/vendor/tbc-new-fork; E=$F/ui/core/components/individual_sim_ui/upgrades/engine; TAB=$F/ui/core/components/individual_sim_ui/upgrades_tab.tsx
grep -c 'screenCandidate\|promotionRule\|stage: "screening"\|\.screened' $E/rank.ts   # 0
grep -c 'screenCandidate\|promotionRule\|stage: "screening"\|\.screened' $E/view.ts   # 0
grep -n 'screen\|promot\|fullPool\|racing' $E/rank.ts                                  # only the frozen-literal block
ls $E/promotion.ts                                                                     # No such file
grep -c 'screened\|screening\|fullPool' $TAB                                           # 0
grep -c screen $F/assets/locales/en/translation.json                                   # 0
node $F/node_modules/typescript/bin/tsc --noEmit -p $F/tsconfig.json                   # exit 0, no output
npm --prefix $F run lint:css && npm --prefix $F run test:locales                       # exit 0
npx --prefix $F oxlint $E/rank.ts $E/view.ts $E/content-hash.ts $TAB                   # <=5 warnings, import-sort/no-duplicates only
python $R/scripts/check_engine_port_drift.py                                           # ok: 32 ported files
pnpm -C $R verify                                                                      # exit 0
make -C $F test                                                                        # exit 0
git -C $F status --porcelain; git -C $R status --porcelain                             # empty / only measurements.md
```

Both trees were left as found: fork `git status --porcelain` empty at `e5d8741`; repo shows only the pre-existing untracked `.scratch/stage-gate/finish-the-tab/measurements.md`.
