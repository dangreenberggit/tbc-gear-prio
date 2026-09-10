# Plan — 342-learn-from-upstream

## Goal

Ticket 342 is closed with both acceptance boxes checked. A comparison document exists at `.scratch/stage-gate/342-learn-from-upstream/comparison.md` with one section per kept feature (four) plus a concurrency note, each ending in exactly one verdict: `keep-as-is`, `adopt-their-idea`, or `adopt + note`, with the upstream and fork symbols it compared and the reason. Every `adopt` verdict is either implemented on the branch (with the fork PROVENANCE cycle done) or filed as a ticket numbered from `NEXT`. The ticket carries a `## Resolution` section and the group README row carries the verdict, in the same shape as tickets 339 and 346. `pnpm verify` is green and `docs/reviews/feat-342-learn-from-upstream.md` exists.

## Two corrections to the brief, verified before writing this plan

- The ticket's `rank.ts` line ranges are stale. `candidateSwapWithRepairs` is at line 2004 (ticket says 1574); the partial-Stop branch is at 1413–1424 (ticket says 844–877); `simDatabaseFor` is at line 170 (ticket says 167). The plan locates by symbol, never by line — re-grep at execution time.
- The `async.queue` overlap the ticket names is ticket **344**, not 343 (`344-pr-readiness-cleanup-pass.md` theme 3). 343 is the gem-optimizer measurement question, unrelated to concurrency.

## Approach

Read-and-compare by symbol, both sides in the one fork clone (`vendor/tbc-new-fork`, branch `feat/upgrades-tab`, which sits on upstream `feature/backend-reforge` — so "their" code and "our" code are in the same tree at different paths). Record findings in one scratch document; decide adopt-vs-ticket with a fixed size rule (below); implement only the small adoptions.

Rejected alternative: fetch and diff a newer upstream `feature/backend-reforge` first, so the comparison is against upstream's latest. Rejected because ADR-0025 fixes the posture (reference material only, watched ref recorded in `data/wowsims.lock.json`), and the fork clone already contains `origin/feature/backend-reforge` at the same commit the lock file records (`cbf6b75a8`). Re-fetching is a re-pin question, out of scope. Stamp every upstream claim "as of `feature/backend-reforge` @ `cbf6b75a8`".

Size rule for "implemented or ticketed" (the executor applies it, does not re-litigate it): an adoption is **implemented here** when it is (a) an adapter-only change under `upgrades/adapters/`, or (b) a change to one ported engine file whose PROVENANCE row is `none`/`import paths only` and that has a unit test in `packages/core/test/` to extend, or (c) a comment. Anything that changes `rankUpgrades` control flow, adds a seam capability, or needs a new fixture is **ticketed**.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | The fork clone exists at `vendor/tbc-new-fork`, is gitignored, HEAD `6d0edd69d` on `feat/upgrades-tab`, working tree clean | yes | `git -C C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork log -1 --format=%H`; `git -C ... status --short` (empty); `git -C C:/Users/dgree/Code/lulz/tbc-gear-prio check-ignore -v vendor/tbc-new-fork` |
| C2 | Upstream's bulk code is reachable in that same clone: `origin/feature/backend-reforge` = `cbf6b75a8`, equal to the watched ref in `data/wowsims.lock.json`, and is an ancestor of HEAD | yes | `git -C .../vendor/tbc-new-fork rev-parse origin/feature/backend-reforge`; `git -C .../vendor/tbc-new-fork merge-base HEAD origin/feature/backend-reforge` (both print `cbf6b75a889e52c4106351976db66efd914ea349`); `grep -n -A3 watchedRefs data/wowsims.lock.json` |
| C3 | `data/wowsims-fork.lock.json` pins the fork at `6d0edd69d` (= current fork HEAD), so no re-pin is pending at plan time | no | `grep -n '"commit"' data/wowsims-fork.lock.json` |
| C4 | Upstream files the ticket names exist: `sim/core/bulk/{generator,candidates,weapons,slots,item_rules,item_keys}.go`, `ui/core/wasm/bulk_sim/{batch,index,reforge,types}.ts` | yes | `ls vendor/tbc-new-fork/sim/core/bulk vendor/tbc-new-fork/ui/core/wasm/bulk_sim` |
| C5 | Our four features live at these symbols (fork paths under `ui/core/components/individual_sim_ui/upgrades/`): F1 `engine/pool.ts:simSlotsForPoolSlot` (line 303) + `engine/rank.ts` `mainHandIsOneHanded` (588), `attemptEligibility` (~850), `runCandidate` (968); F2 `engine/rank.ts:candidateSwapWithRepairs` (2004), `swapItemAt`, `fillOptsForSwap`, `applyRepairedGems`, plus `engine/meta-repair.ts`, `engine/candidate-gems.ts`; F3 `engine/rank.ts` `simDatabaseFor` dep (170), `composeFor` (490), `composeForBulk` (527), `adapters/sim_database.ts:simDatabaseFor` (35); F4 `engine/rank.ts` abort handling (1213–1253) and `if (aborted)` partial return (1413–1424) | yes | `grep -n -E 'simDatabaseFor|candidateSwapWithRepairs|attemptEligibility|mainHandIsOneHanded|if \(aborted\)|composeForBulk' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`; `grep -n simSlotsForPoolSlot vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/pool.ts` |
| C6 | Upstream's nearest equivalents: F1 → `weapons.go:getAllWeaponCombos` (78), `generator.go:initGroupedSlotPairs` (192), `slots.go:isSecondaryItemSlot`/`getBulkItemSlotFromSlot` (124/128), commit `bb4e77528` "Fix 2x2H and 2H+OH bug"; F2 → `item_rules.go:replaceItem` (10), `createSelectedItem` (28), `applyMetaGem` (45), `enchantAppliesToItem` (72), `weapons.go:adjustWeaponImbueID` (36), `item_keys.go:dedupeCandidateOptions` (45); F3 → `ui/core/components/individual_sim_ui/bulk/utils.ts:makeBulkItemDatabaseFromSpecs` (108) and `ui/core/sim.ts:makeBulkBaseRequest` (326–332, uses `Database.mergeSimDatabases`); F4 → `ui/core/wasm/bulk_sim/batch.ts` (`signals.abort.isTriggered()` at 58/102/133), `index.ts` (76/115/151), `reforge.ts:buildBulkSimReforgeRequest` (193–203, keeps `partialOptimizedCandidates` on abort) | yes | `grep -n '^func ' vendor/tbc-new-fork/sim/core/bulk/{weapons,generator,slots,item_rules,item_keys}.go`; `grep -n -E 'abort|partialOptimized' vendor/tbc-new-fork/ui/core/wasm/bulk_sim/{batch,index,reforge}.ts`; `grep -n makeBulkItemDatabaseFromSpecs vendor/tbc-new-fork/ui/core/components/individual_sim_ui/bulk/utils.ts`; `git -C vendor/tbc-new-fork log --oneline -1 bb4e77528` |
| C7 | Upstream's concurrency primitive is `queue` from `async` at `ui/core/wasm/bulk_sim/batch.ts:1,101–140`; ours is `engine/promise-pool.ts:promisePool` (69 lines) with tests in `packages/core/test/promise-pool.test.ts` | no | `grep -n -E "from 'async'|queue<" vendor/tbc-new-fork/ui/core/wasm/bulk_sim/batch.ts`; `ls packages/core/test/promise-pool.test.ts` |
| C8 | The engine exists in two copies: `packages/core/src/*.ts` (tested, `packages/core/test/`) and the fork port. `promise-pool.ts` and `meta-repair.ts` port with `none`/`import paths only`; `rank.ts` is `adapted` and the fork copy carries a bulk-screening branch core does not have (`screenCandidates` count in core = 0) | yes | `grep -n -E '^\| \`(promise-pool\|meta-repair\|rank\|pool)\.ts\`' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md`; `grep -c screenCandidates packages/core/src/rank.ts` |
| C9 | Any edit to a ported engine file (including comment-only) requires the known-traps cycle: E-W3 green → PROVENANCE hash row → fork commit → re-pin `data/wowsims-fork.lock.json` + `pnpm sim-implemented-effects:generate` → `pnpm verify` | yes | `sed -n '45,66p' docs/agents/known-traps.md` |
| C10 | E-W3 (`packages/core/test/wowsims-fork-parity.test.ts`) skips itself unless the fork's protos are generated; whether it actually runs on this machine is unknown at plan time | yes | `sed -n '998,1010p' packages/core/test/wowsims-fork-parity.test.ts` shows the `describe.skipIf`/`it.skip` gate; the run-or-skip outcome is `hypothesis, untested` until Step 0 runs it |
| C11 | Our F4 partial work is retained in memory but not rendered: the tab resets on Stop (ticket 286 owner ruling), `upgrades_tab.tsx` ~1726–1732 | no | `grep -n 'Ticket 286' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` |
| C12 | Ticket 347 (Stop cancels in-flight bulk chunk) is closed, so F4's comparison covers the loop path and the screening path as they are now | no | `head -1 .scratch/carry-forward/issues/347-*.md` → `Status: closed` |
| C13 | Next free ticket number is 350 | no | `cat .scratch/carry-forward/issues/NEXT` → `350` (re-read at Step 7; the directory listing is the authority per known-traps) |
| C14 | Prior closures in this group record the verdict as a `## Resolution` section in the ticket plus a `— **closed**` verdict in the README row, pointing at `.scratch/stage-gate/<slug>/` files | no | `sed -n '52,75p' .scratch/carry-forward/issues/339-adaptive-iterations-and-base-iteration-count.md`; `grep -n 'closed' .scratch/upgrades-tab-sim-followups/README.md` |
| C15 | ADR-0025 already compared our meta/socket-bonus predicates against upstream's `reforge_optimizer/gear.go:socketBonusActive`; that comparison does not need repeating | no | `sed -n '36,56p' docs/adr/0025-upstream-has-a-gem-optimizer-we-stay-pinned-and-borrow-only-its-rules.md` |
| C16 | The fork ships no TypeScript test runner; a fork adapter change is checked by the fork's own typecheck/build, whose exact command is not established | no | `hypothesis, untested` — executor finds it in `vendor/tbc-new-fork/package.json` / `Makefile` at Step 7 before relying on it |
| C17 | Tool shells emit an fnm stderr line that breaks `&&` chains; run git standalone and use `-C` | no | Observed repeatedly this session; `memory/reference-fnm-node-shell-footgun.md` |

Note: every claim marked "yes" (load-bearing) above should be **re-verified at execution time**, not trusted from this table — the planner's own C5/C6 line numbers were themselves corrections to the ticket's stale numbers, and further drift is possible since this plan was written.

## Steps

Fork-side paths below are relative to `C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork\`; `U/` abbreviates `ui/core/components/individual_sim_ui/upgrades/`. Repo-side paths are relative to `C:\Users\dgree\Code\lulz\tbc-gear-prio\`.

**Step 0 — Branch and baseline.** (C1, C2, C3, C10, C17)
- `git switch -c feat/342-learn-from-upstream dev` in the main checkout (the fork is only there).
- Re-run the C1/C2 commands; record fork HEAD and upstream ref in the comparison doc header.
- Run `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` and record verbatim whether E-W3 **ran** or **skipped** and the skip reason. If it skipped, follow the message's protoc instructions once; if that fails, record it — every later "parity green" claim then says "E-W3 skipped on this machine", never "green".
- Acceptance: the doc header exists with three lines: fork HEAD, upstream ref, E-W3 status.

**Step 1 — Symbol map.** (C5, C6) Write a two-column table in `comparison.md` § "Where the code is" listing, per feature, our symbols and upstream's, each as `path:symbol` with the line number observed today. Re-grep; do not copy C5/C6 blindly.
- Acceptance: every symbol in the table resolves with `grep -n '<symbol>' <path>` (exit 0).

**Step 2 — F1 multi-slot best-of.** (C5, C6) Read `U/engine/pool.ts:simSlotsForPoolSlot`, `U/engine/rank.ts` `mainHandIsOneHanded`, `attemptEligibility`, `runCandidate`, and the comment block at ~779–800; read `sim/core/bulk/weapons.go:getAllWeaponCombos`, `weaponComboMatchesSettings`, `matchesWeaponTypeFilter`, `generator.go:initGroupedSlotPairs`, `slots.go:isSecondaryItemSlot`, and `git -C vendor/tbc-new-fork show bb4e77528 --stat` plus its diff. Answer, in the doc:
1. Which placement cases does each side enumerate (ring1/ring2, trinket1/trinket2, MH/OH, 2H vs 1H+OH, dual-wield eligibility)? List any case one side handles and the other does not.
2. Does `bb4e77528`'s 2x2H / 2H+OH fix describe a bug our `attemptEligibility`/`mainHandIsOneHanded` also has? Cite the exact guard on our side.
3. How does each side deduplicate identical placements (`item_keys.go:dedupeCandidateOptions` vs ours)?
- Acceptance: section ends with one verdict line and a one-paragraph reason naming the symbols.

**Step 3 — F2 per-swap gem/meta repair.** (C5, C6, C15) Read `U/engine/rank.ts:candidateSwapWithRepairs`, `swapItemAt`, `fillOptsForSwap`, `applyRepairedGems`, `metaPreferenceDisclosure`; `U/engine/meta-repair.ts` exports; `U/engine/candidate-gems.ts`; `U/engine/enchants.ts`. Read `sim/core/bulk/item_rules.go` (all six funcs) and `weapons.go:adjustWeaponImbueID`/`adjustCandidateImbues`. Answer:
1. When upstream swaps an item in (`replaceItem`/`createSelectedItem`), what does it carry over from the worn item (gems, enchant, meta) and what does it validate (`enchantAppliesToItem`, `applyMetaGem`)? Same list for ours.
2. Is there a carry-over or validation rule upstream applies that ours lacks, or vice versa (weapon imbue adjustment is a candidate — does our enchant carry-over check weapon-type applicability)?
3. Do not re-compare `socketBonusActive` (ADR-0025 did).
- Acceptance: verdict line + reason; if question 2 finds a rule we lack, the reason states whether it can change a ranking (cite the composed-request field it would alter).

**Step 4 — F3 per-request item-database injection.** (C5, C6) Read `U/adapters/sim_database.ts` (45 lines), `U/engine/rank.ts` `composeFor`/`composeForBulk` and the `simDatabaseFor` doc comment; read `ui/core/components/individual_sim_ui/bulk/utils.ts:makeBulkItemDatabaseFromSpecs` and `ui/core/sim.ts:makeBulkBaseRequest` (326–340), `Database.mergeSimDatabases` in `ui/core/proto_utils/database.ts`. Answer:
1. Does upstream's helper build the same shape (items, enchants, gems rows) as our adapter, from the same source (`Database`)? List field-by-field differences.
2. Could `U/adapters/sim_database.ts` call `makeBulkItemDatabaseFromSpecs`/`mergeSimDatabases` instead of hand-building rows — and would the composed request stay byte-identical? (A call is allowed; a shared-file edit is not.)
3. Does upstream's worker-side assumption differ (e.g. it merges into `player.database` once per base request rather than per composed request), and does that matter for our `composeForBulk` union?
- Acceptance: verdict line + reason. If `adopt`, the reason names the exact helper and the byte-identity check to run (Step 7).

**Step 5 — F4 resumable-Stop partial work.** (C5, C6, C11, C12) Read `U/engine/rank.ts` 1213–1253 and 1413–1424, the `PartialRanking` type in `U/engine/types.ts`, and `upgrades_tab.tsx` Stop wiring (~937–946, ~1204–1290, ~1726). Read `ui/core/wasm/bulk_sim/batch.ts` abort checks, `index.ts` 58–151, `reforge.ts:buildBulkSimReforgeRequest` and its `aborted` branch. Answer:
1. On abort, what does each side return: ours `PartialRanking{complete:false}` with landed rows; theirs — does `reforge.ts` return partial optimized candidates on abort, and does `index.ts` return an `ErrorOutcomeAborted` with nothing? State both precisely.
2. Where does each side check the signal (before dispatch / after each result / inside the worker call)? Any check point one side has and the other lacks?
3. Given C11 (tab discards the partial on Stop), does anything upstream does suggest a cheaper retention shape? Record as observation only — changing the Stop UX is ticket 286's ruling, out of scope.
- Acceptance: verdict line + reason.

**Step 6 — Concurrency note (observation only).** (C7) Read `batch.ts:80–140` and `U/engine/promise-pool.ts`. Record in a § "Concurrency (hand-off to 344)": the two guarantees ours has (result-at-index determinism, lowest-index error) and whether `async.queue` as used at `batch.ts:101` provides each. **No verdict, no code change** — the fold-or-keep decision belongs to ticket 344; write "decision: ticket 344" and add a one-line pointer to `comparison.md` in 344's theme-3 paragraph.
- Acceptance: section present; `git diff --stat .scratch/carry-forward/issues/344-pr-readiness-cleanup-pass.md` shows a one-line addition only.

**Step 7 — Apply the size rule to every `adopt` verdict.** (C8, C9, C13, C16)
- For each `adopt`: classify **implement** or **ticket** per the rule in Approach; write the classification and reason under the verdict.
- **Implement, adapter-only** (`U/adapters/*`): edit, then run the fork's typecheck (find the command per C16 and record it), then the byte-identity check named in Step 4 if it is F3, then fork commit, re-pin `data/wowsims-fork.lock.json`, `pnpm sim-implemented-effects:generate`, `pnpm verify`.
- **Implement, ported engine file**: change `packages/core/src/<file>.ts` first with a red-then-green test in `packages/core/test/<file>.test.ts` (use the `tdd` skill); port the same change to `U/engine/<file>.ts`; then the full C9 cycle in order.
- **Ticket**: read `NEXT`, list the directory for that number, file `.scratch/carry-forward/issues/<NN>-<slug>.md` with the six header lines (`Origin: .scratch/stage-gate/342-learn-from-upstream/comparison.md`), bump `NEXT` in the same commit, add a row to `.scratch/upgrades-tab-sim-followups/README.md`.
- If there are zero `adopt` verdicts, write "nothing adopted" in the doc's summary and say why for each feature — that satisfies acceptance box 2.
- Acceptance: for every `adopt` line in `comparison.md`, either a commit hash or a ticket path is written beside it; `pnpm verify` exit 0; `git -C vendor/tbc-new-fork status --short` empty.

**Step 8 — Record the closure.** (C14)
- Append `## Resolution` to `.scratch/carry-forward/issues/342-learn-from-upstream-for-kept-features.md`: four verdict lines + concurrency hand-off + list of commits/tickets, each fact citing `comparison.md` section; tick both acceptance boxes; set `Status: closed`.
- Edit the 342 row in `.scratch/upgrades-tab-sim-followups/README.md` to `— **closed**` with a one-sentence verdict, matching the 339 row's shape.
- Commit (`Close ticket 342: ...`, per the commit-message rules in the global AGENTS.md).
- Acceptance: `pnpm issues:open` no longer lists 342; `grep -c '\[x\]' .scratch/carry-forward/issues/342-*.md` → 2.

**Step 9 — Verify and review, then stop.**
- `pnpm verify` exit 0.
- Run the `pre-merge-review` skill → `docs/reviews/feat-342-learn-from-upstream.md`, commit on the branch.
- Stop. Do not merge; report the review summary and wait for a separate merge ask.
- Acceptance: review file exists and is committed; branch has no uncommitted changes.

## Paths manifest

Created:
- `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\stage-gate\342-learn-from-upstream\comparison.md`
- `C:\Users\dgree\Code\lulz\tbc-gear-prio\docs\reviews\feat-342-learn-from-upstream.md`
- `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\carry-forward\issues\<NN>-<slug>.md` (zero or more, Step 7)

Modified:
- `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\carry-forward\issues\342-learn-from-upstream-for-kept-features.md`
- `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\carry-forward\issues\344-pr-readiness-cleanup-pass.md` (one pointer line)
- `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\upgrades-tab-sim-followups\README.md`
- `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\carry-forward\issues\NEXT` (only if a ticket is filed)

Conditionally modified (only on an `implement` verdict, Step 7):
- `C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork\ui\core\components\individual_sim_ui\upgrades\adapters\sim_database.ts` (or another `adapters/*` file named in the verdict)
- `C:\Users\dgree\Code\lulz\tbc-gear-prio\packages\core\src\<file>.ts` and `packages\core\test\<file>.test.ts`, with the twin `vendor\tbc-new-fork\...\upgrades\engine\<file>.ts`
- `C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork\ui\core\components\individual_sim_ui\upgrades\engine\PROVENANCE.md`
- `C:\Users\dgree\Code\lulz\tbc-gear-prio\data\wowsims-fork.lock.json` and the artifact `pnpm sim-implemented-effects:generate` rewrites

Never touched: any file under `vendor/tbc-new-fork/sim/`, `vendor/tbc-new-fork/ui/core/wasm/`, `vendor/tbc-new-fork/ui/core/sim.ts`, `ui/core/components/individual_sim_ui/bulk/` (shared wowsims files — read only). No partition; single executor.

## Verify recipe

```
git -C C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork status --short        # empty
grep -c -E '^(Verdict|verdict): (keep-as-is|adopt-their-idea|adopt \+ note)' C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/342-learn-from-upstream/comparison.md   # 4
grep -n '^Status: closed' C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/carry-forward/issues/342-learn-from-upstream-for-kept-features.md
pnpm verify                                                                                # exit 0 (includes engine-port-drift and fork-universes checks)
npx vitest run packages/core/test/wowsims-fork-parity.test.ts                             # report ran-or-skipped verbatim
ls C:/Users/dgree/Code/lulz/tbc-gear-prio/docs/reviews/feat-342-learn-from-upstream.md
```

## Out of scope

- Measuring or calling upstream's reforge/gem optimizer for one-item swaps (ticket 343).
- Deciding fold-vs-keep for `promise-pool.ts` vs `async.queue`, request-ID uniqueness, comment thinning (ticket 344) — Step 6 records observations and hands off.
- Re-comparing meta/socket-bonus predicates against `reforge_optimizer/gear.go` (ADR-0025).
- Changing Stop's UX (ticket 286 ruling) or the BiS/tournament route (340/341, closed).
- Fetching a newer upstream ref, re-pinning wowsims, or editing any shared wowsims file; upstream ideas are referenced by symbol and stamped `@ cbf6b75a8`, never imported as a live dependency on their branch.
- Any `rankUpgrades` control-flow rewrite; those become tickets under Step 7.
- Merging to `dev`.
