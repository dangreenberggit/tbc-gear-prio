# Plan — finish-the-tab (revision 1)

Revision of the round-1 plan against `plan-review.md` (F1–F16) and the amended brief. Every finding is addressed in the text or by a `Rebuttal:` on a claim row; none is dropped. Changes of substance: the budget is now proposed, not attributed to D7 (F1/F2/F12, C32); the pre-sim BIS prune is in tranche 1 (Step 5); every fork code step lands before the browser-measurement milestone, which is an explicit stop-and-report (F8); the Step 6 sub-brief mandates delete-in-place with the fork's three computed hash fields collapsed, never `promoteTopJ` (F3/F4), states the parity-test commit ordering (F9), and has a reachable grep gate (F10); tie groups are shown to be unrendered (F5, C33); `feralcat` URL, build recipe, `applyView` call-site refactor, `candidate_cap_note` wording, and protocol deviations are fixed (F6, F7, F11, F14, F15); `MemoryStore` and the budget conversion are registered (F13, C34; F12, C32); the weighted set-bonus variant is named in Out of scope with the shape rule.

## Goal

When this plan is done, a retribution paladin or feral cat druid on the fork's site (production bundle served from `vendor/tbc-new-fork/dist`) opens the Upgrades tab, clicks Run with the default 3,000 iterations, and gets a ranked shopping list plus per-slot sub-tabs from an in-browser run, with stage labels, rows landing as they finish, and the elapsed wall-clock shown on completion. Three new controls exist, each hidden (not disabled) when its data is absent: **"Sim only items on a BIS list"** (pre-sim prune; off by default; prunes the candidate pool to `bisTags`-tagged entries before `rankUpgrades`, the eligible count beside Candidates follows it, and the cache key distinguishes the pruned and full pools), **"Only items on a BIS list"** (post-sim display filter over `ViewRow.bisTags`), and **"Include set-bonus potential"** (binary `withSetPotential`; re-renders with zero sim calls; a confounded row is never credited). The fork engine no longer races: screening, promotion, `fullPool`, and the `screened` row state are deleted in place, matching core post-ADR-0026, with E-W3 parity green and PROVENANCE re-hashed. `data/wowsims-fork.lock.json` points at the fork tip; `pnpm engine-port-drift:check` is ok; tickets 156 and 199 are closed; 205/206 are closed as moot; 201 carries a line saying why it does not block. `docs/verification-log.md` has a dated entry with real foregrounded-browser wall-clock for one ret and one feral run at 3,000 iterations, both with the prune **on** (judged against the proposed budget) and **off** (recorded as a measurement), plus the racing-vs-full-sweep comparison for Q1. `STATUS-2026-08-22.md` is replaced by a newer STATUS recording Q1–Q7 and tranche 2.

**Proposed time budget — proposed, not D7.** D7 (`PLAN.md:61`) sets an iteration default and carries no time number. This plan proposes **600 s wall-clock, Run click to Run button re-enabled, for a default run (Iterations 3,000, Candidates empty, page defaults, maxPhase 2) with the pre-sim BIS prune on, on a 4-worker machine**. Reasoning: `candidate-pool.md:11` is the only written target ("single-digit minutes", explicitly "the user's call after §3.3 has numbers"); reading "single-digit minutes" as "under ten minutes" gives 600 s (C32). The owner ratifies or replaces the number at hand-off; the plan records the measurements against whatever number stands.

## Approach

**Chosen: build every fork-side change first (serial, each commit a shippable fork tip), then one explicit measurement milestone that stops and reports to the orchestrator, then the decisions, tickets and logs.** Engine changes are confined to one nested-plan step (racing removal, delete-in-place); the three controls live in the tab and filter over `applyView`'s output or over the pool handed to `rankUpgrades`.

Why this shape:

- The fork's `view.ts` already carries `withSetPotential`, `pinBis`, `rankableSetPotential` and an inlined `setPotentialIsConfounded` (C5, C6) and imports nothing that reaches `items.ts` (C7). The set-bonus toggle is a checkbox plus one field in `currentViewOptions()`.
- The post-sim filter is a `bisTags.length > 0` filter over `ViewRow`s after `applyView`. `belowCutoffInView` is per-row (C8, narrowed), and the tab never renders `tieGroupId` or `groups` (C33), so the only set-dependent outputs of `applyView` are not on screen; the engine copy stays byte-identical to its PROVENANCE row.
- The pre-sim prune is a filter on the pool the tab already passes as `deps.pool` (`upgrades_tab.tsx:407`) and the same filter in `eligibleCount` (`:343`). The engine hashes every eligible candidate into the cache key before simming (C35), so a pruned pool and a full pool cannot collide in the store without any `RankInput` change.
- The engine with `fullPool: true` is the path E-W3 already tests against core (C10), so the full sweep is correct before racing is deleted; the deletion (Step 6) then removes dead code and lets 205/206 close as moot.
- Measurement needs a human to front a Brave tab (C29) and the owner is not watching; all code lands first, and Step 8 is a stop-and-report. Candidate (a) racing is measured from an archived build of the Step 1 tip (racing still present there), so the comparison survives the deletion.

**Strongest rejected alternative: re-port core's current `rank.ts`/`view.ts` wholesale.** It would close all drift at once, but the fork's `rank.ts` differs from core by 1,283 `diff -w` lines (C9) across three deliberate adaptations (D4 `canonicalJson` hashing, no `spec.ts`, `simDatabaseFor` threading) that would be re-applied by hand with no JS test runner in the fork (C31) and E-W3 as the only gate. Reviewer F4 upheld: this plan mandates delete-in-place and does not reopen the choice.

**Second rejected alternative: implement the filters and the set-bonus availability inside the fork's `view.ts`.** Every engine edit costs a PROVENANCE re-hash, an E-W3 run and a silent divergence from core. Tab-local functions cost none of that (F16 advisory acknowledged: the 2-line predicate mirror in Step 3 is accepted drift, commented as such).

### Open questions Q1–Q7

**Q1 — sim strategy on the browser path.**

| Candidate | Status | Pre-stated win condition | Measurement |
| --- | --- | --- | --- |
| (a) M2 racing as shipped | measured in Step 9 from the archived Step 1 build | Wins only if its elapsed is ≤ 0.8 × candidate (c)'s on **both** specs (ADR-0026's 20 % bar, C13) **and** its shortlist item set ⊇ (c)'s on both | Uncapped, prune off, Iterations 3,000, maxPhase 2, foregrounded Brave; elapsed from the page's done status; shortlist names from `.upgrades-results-table` rows |
| (b) per-slot top-*j* racing | **dropped** | — | Never built in the fork (C11); fit on two fixtures; every racing variant failed ADR-0026's bar including an oracle K; building a third variant contradicts "simple code" |
| (c) full sweep (`fullPool: true` in Step 2, racing deleted in Step 6) | measured in Step 9; **default winner** | Wins if (a) fails its condition; its uncapped elapsed is recorded, not pass/fail | Same protocol |

Prediction (C14, hypothesis): from ticket 156's resolution (feral-p2, 3,000 iterations, 4 workers: 130.1 s for 34 full sims ≈ 3.8 s each; screening 207 s for 246 candidates; promoted ratio 0.704 per HANDOFF-NEXT §3), racing ≈ 207 + 0.704 × 246 × 3.8 ≈ 865 s + replication and full sweep ≈ 246 × 3.8 ≈ 935 s + replication: racing saves ~8 %, under the 20 % bar. Pre-stated remedy if (a) nonetheless wins: revert the Step 6 fork commits (`git -C vendor/tbc-new-fork revert <range>`) and the Step 6 repo test commits, re-hash PROVENANCE, bump the lockfile, and record the measured saving in STATUS; tickets 205/206 then stay open with the "racing kept" reason. This is costed as one fork revert plus one repo revert, and expected not to run.

**Q2 — ticket 156.** Its three acceptance boxes were ticked on 2026-08-18 (C12); only `Status:` is stale. Step 9 adds the uncapped and pruned full-run numbers; Step 10 closes it. D7: **keep 3,000 with the visible control** — full-sim cost is linear in iterations (C12), so raising the default multiplies the run; lowering it is not what D7 asks and the prune reaches the budget without trading precision (C36, hypothesis until Step 9).

**Q3 — §9 item 7 scope (proposal; owner decides).** More specs: **out**, tranche 2 (no other spec has tab data, C18; each is a pipeline job first). IndexedDB cache: **out** — `MemoryStore` already dedupes identical sim requests across runs within a page session (C34); a cross-session store is a fourth `Store` adapter with its own invalidation story. Local-sim port: **out** — plan.md §9 item 7 marks it "hypothesis, untested" and it is upstream-shipping work.

**Q4 — engine drift.** Before: `engine port drift check ok: 33 ported files match PROVENANCE.md` (C1). Per core change:

| Core change | Needed for correctness? | Action |
| --- | --- | --- |
| `set-potential.ts` split | No — inlined at port time (C6, C7) | none |
| Racing removal (ADR-0026) | No for correctness (`fullPool: true` is the E-W3-tested path, C10); yes for simplicity and to close 205/206 | Step 2 (flag), Step 6 (delete-in-place, nested plan) |
| `candidates` on the `simming` event | No — tab renders `done/total` plus the row side-channel | none; noted in STATUS |
| `equipmentForCandidateSwap`, `gemContext` index exports | No — fork has no `index.ts`; `gemContext` is in its `candidate-gems.ts` (C9) | none |
| `HIT_CAP_PERCENT` | No — present in fork `caps.ts` (C9) | none |

Gate honesty: every engine file Step 6 edits gets its sha256 row recomputed **after** E-W3 passes (C2); the PROVENANCE header gains a dated note naming the core commit the removal was ported from; the drift check is recorded before (Step 0) and after (Step 7); the `promotion.ts` row is removed from the table when the file is deleted (the script reports a missing file otherwise, C2).

**Q5 — set-bonus toggle.** Chosen: the binary `withSetPotential` checkbox in the tab; `currentViewOptions()` reads it; `change` → `this.render()`. Win: toggling a completed ranking changes row order / shortlist membership with zero sim calls (C15) and a row with `prospectiveBonusBreaks.length > 0` gets no credit (C5). Hidden when no row has rankable set potential (C16). Shape rule for tranche 2's weighted variant: the control's state is read only through `currentViewOptions()`, is never persisted, and its i18n key is `view.set_potential` — so a three-state select (off / full / weighted) can replace the checkbox in place.

**Q6 — post-sim BIS filter.** Chosen: **a filter** (owner's word), not `pinBis` — a pin keeps untagged rows on screen. Win: filter on → only `bisTags.length > 0` rows in the shopping list and every slot pane; hidden when `ranking.items.every(i => i.bisTags.length === 0)`. Every committed universe carries 16–17 tags (C17), so the hidden polarity is unreachable with shipped data; Step 4 verifies it by construction and says so.

**Q7 — pre-sim prune (built, Step 5) and more specs (decide only).** BIS source: **the universe's `bisTags`** — bundled, phase-scoped by `assemble_universe.py` (C19), and the same tags the post-sim filter uses, so the two controls agree by construction; wowsims' runtime `gear_sets/` would need per-spec preset imports and a per-spec phase-naming map (C20) — the offline job `assemble_universe.py` already does. Win (brief): with the control on only tagged candidates are simmed (`Simming n/N` total equals the tagged count plus owned rows the engine keeps), the eligible count shown before the run matches, the cache key distinguishes the two pools (C35), and a (spec, phase) with no tags hides the control. Spec drop-in today costs five touches (universe JSON, EP JSON, two `data.ts` map entries, `SPEC_ID_BY_PROTO_SPEC` line, plus the `SpecId` union in `engine/types.ts` if new). Tranche 2 recommendation: one registry keyed by proto `Spec` holding universes-by-phase and EP weights, from which `SPEC_ID_BY_PROTO_SPEC` is derived — then a spec is two JSON files and one entry. Tranche 1 must not: put BIS membership into `RankInput` or the engine's pool filter, or add a second spec-registration point.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | Drift gate green on the base tip: 33 ported files match PROVENANCE.md | yes | `pnpm engine-port-drift:check` |
| C2 | The drift gate hashes fork engine bytes against sha256 rows in `engine/PROVENANCE.md` (reports drifted and missing files), compares nothing to core, and its own rule is: re-run E-W3 before updating any row | yes | `sed -n 99,137p scripts/check_engine_port_drift.py` |
| C3 | Fork clone at `f359239`, clean, branch `feat/upgrades-tab`; lockfile `commit` matches | yes | `git -C vendor/tbc-new-fork status --porcelain; git -C vendor/tbc-new-fork rev-parse --abbrev-ref HEAD HEAD; grep commit data/wowsims-fork.lock.json` |
| C4 | Racing is default-on in the fork engine (`const racing = input.fullPool !== true;`, `rank.ts:554`); the tab's only `fullPool` mentions are in a comment (lines 776, 780) | yes | `grep -n 'input.fullPool !== true' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts; grep -n fullPool vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` |
| C5 | Fork `view.ts` implements `withSetPotential` via `sortKeyFor`/`belowCutoffUnderView`; `rankableSetPotential` returns 0 for a confounded row | yes | `grep -n 'withSetPotential\|rankableSetPotential\|setPotentialIsConfounded' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts` |
| C6 | Fork `view.ts` inlines `setPotentialIsConfounded`; no `set-potential.ts` port needed | yes | `grep -n '^function setPotentialIsConfounded' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts` |
| C7 | Fork `view.ts` imports only `./cutoff.js`, `./pool.js`, `./rank.js` (types) | no | `grep -n '^import' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts` |
| C8 | `belowCutoffInView` is computed per row from `item`, `withSetPotential`, `baseline.dps`, `cutoff` only, so filtering rows after `applyView` preserves every row's cutoff verdict. (Narrowed per F5: `tieGroupId` and `groups` are set-dependent and are **not** covered by this claim — see C33.) | yes | `sed -n 144,165p vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts` |
| C9 | Fork `rank.ts` differs from core by 1,283 `diff -w` lines; fork `promotion.ts` has no core counterpart; `HIT_CAP_PERCENT` is in fork `caps.ts`; `gemContext` in fork `candidate-gems.ts` | no | `diff -w packages/core/src/rank.ts vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts \| wc -l; ls packages/core/src/promotion.ts; grep -c HIT_CAP_PERCENT vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/caps.ts` |
| C10 | E-W3 passes `fullPool: true` on the fork side (line 900) for the full-sweep parity case, and has a separate racing case passing `fullPool: false` (lines 1069–1071) that exercises the fork's screening path; the test loads the fork's live files and self-skips when the clone is absent | yes | `grep -n 'fullPool\|loadForkEngine\|runIf' packages/core/test/wowsims-fork-parity.test.ts` |
| C11 | Fork `promotion.ts` has no `promoteTopJ` | yes | `grep -c promoteTopJ vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/promotion.ts` → 0 |
| C12 | Ticket 156's resolution (2026-08-18, foregrounded Brave, 20 threads, 4 workers, feral, Candidates=20): 337.3 s @3,000 (screening 207.2 s, full sims 130.1 s for 34 rows), 459.4 s @5,000; spreads 3.6 %/1.3 %; harness files exist; the harness measures elapsed with its own `performance.now()` clock | yes | `sed -n 1266,1300p .scratch/carry-forward/issues/156-ew2-browser-wasm-throughput-unexplained.md; ls .scratch/stage-gate/ticket-156-ew2-table/; grep -n 'performance.now' .scratch/stage-gate/ticket-156-ew2-table/harness.js` |
| C13 | ADR-0026's bar: a screening mechanism must save ≥ 20 % wall-clock at zero recall misses; racing measured 1.407/1.476/1.098 | yes | `grep -n '20 %\|1.407' docs/adr/0026-racing-is-removed-the-engine-full-sweeps-every-eligible-candidate.md` |
| C14 | Uncapped, prune-off ret-p2 and feral-p2 runs at 3,000 iterations on 4 workers both exceed 600 s, and racing (a) is not ≥ 20 % faster than full sweep (c) | no (the goal line is judged with the prune on; this only decides Q1 and the record) | `hypothesis, untested` — measured in Step 9 |
| C15 | `rankUpgrades(` has exactly one call site in the tab (`:398`, inside `run()`), and `run()` is invoked only from the Run button (`:239`) | yes | `grep -n 'rankUpgrades(\|this.run()' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` |
| C16 | PLAN.md rule: hide or disable a view control when no data exists for it; the web shell hides | no | `sed -n 274p PLAN.md; sed -n 1811,1824p docs/verification-log.md` |
| C17 | Every bundled universe carries BiS tags (feral-p2/p3: 17; ret-p2..p5: 16) | yes | `python -c "import json,glob;[print(p,sum(1 for e in json.load(open(p,encoding='utf-8'))['entries'] if e.get('bisTags'))) for p in glob.glob('vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/data/*.universe.json')]"` |
| C18 | Tab data exists only for ret p2–p5 and feral p2–p3; EP weights only ret-p2 and feral-p1 | no | `ls vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/data/` |
| C19 | `bisTags` are produced offline by `scripts/assemble_universe.py` from wowsims gear-set presets, phase-scoped | no | `grep -n 'gear_sets\|def .*bis' scripts/assemble_universe.py` |
| C20 | wowsims gear-set naming differs per spec | no | `ls vendor/tbc-new-fork/ui/druid/feralcat/gear_sets vendor/tbc-new-fork/ui/paladin/retribution/gear_sets` |
| C21 | Fork checks: `npm run type-check`, `npm run lint`, `npm run format`, `make test`. The bundle is built by `npx tsx vite.build-workers.mts && npx vite build` (output `dist/tbc`). **`npm run build` = `make host` starts an `http-server` and must not be used as a build** (corrected per F6) | yes | `sed -n 12,25p vendor/tbc-new-fork/package.json; sed -n 313,323p vendor/tbc-new-fork/makefile` |
| C22 | The fork branch changes no Go file; `dist/tbc/lib.wasm` exists (20,293,865 bytes); `dist` is gitignored | yes | `git -C vendor/tbc-new-fork diff --name-only cbf6b75..HEAD -- '*.go' \| wc -l; ls -la vendor/tbc-new-fork/dist/tbc/lib.wasm; git -C vendor/tbc-new-fork check-ignore dist` |
| C23 | Fork shells need `eval "$(fnm env --shell bash)"` plus Go/protoc on PATH; a bare `cd` into the fork fails the fnm shim; use `npm --prefix`, `git -C` | yes | `sed -n 136,156p .scratch/handoffs/wowsims-tab/slice-1/HANDOFF.md` |
| C24 | Tab i18n strings live under `upgrades_tab` in `vendor/tbc-new-fork/assets/locales/en/translation.json` (line 855; `candidate_cap_note` at 906) | no | `grep -n '"upgrades_tab"\|candidate_cap_note' vendor/tbc-new-fork/assets/locales/en/translation.json` |
| C25 | Ticket 199's three "Done when" items are met on `dev` | no | `sed -n 246p docs/plans/wowsims-tab/plan.md; grep -n 'recipe rewritten' .scratch/carry-forward/issues/156-ew2-browser-wasm-throughput-unexplained.md; git merge-base --is-ancestor feat/candidate-pool dev && echo merged` |
| C26 | Tickets 205 and 206 are entirely about the racing/screening pass | no | `sed -n 1,12p .scratch/carry-forward/issues/205-racing-reuses-nothing-from-the-screen.md .scratch/carry-forward/issues/206-screening-emits-no-progress.md` |
| C27 | `ENGINE_FORK_COMMIT` convention: update in any commit that changes what the engine does; may lag by provenance-only commits | no | `sed -n 1,21p vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts` |
| C28 | The fork ranking assigns `setContext.prospectiveBonusDps` (`rank.ts:1701`) | yes | `grep -n 'prospectiveBonusDps' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` |
| C29 | A foregrounded, compositing tab is reachable only through Claude in Chrome on Brave with the user fronting the tab; the Claude Code Browser pane never composites | yes | `grep -n 'Brave, tab manually fronted\|never composites' .scratch/carry-forward/issues/156-ew2-browser-wasm-throughput-unexplained.md` |
| C30 | Feral's production page is `/tbc/druid/feralcat/` (corrected per F7) | no | `ls vendor/tbc-new-fork/dist/tbc/druid/` → `feralcat` |
| C31 | Core's `full-sweep-recall.test.ts` exists; the fork has no JS test runner | no | `ls packages/core/test/full-sweep-recall.test.ts; grep -c '"test"' vendor/tbc-new-fork/package.json` → 0 |
| C32 | The only written time target is `candidate-pool.md:11` "single-digit minutes … the user's call after §3.3 has numbers"; D7 carries no number; this plan converts "single-digit minutes" to 600 s as a **proposal** the owner ratifies | yes | `grep -n 'single-digit minutes' docs/plans/wowsims-tab/candidate-pool.md; grep -n 'D7' PLAN.md docs/plans/wowsims-tab/plan.md` |
| C33 | The tab never reads `tieGroupId`, `groups` or `groupBy`, so set-dependent `applyView` outputs left stale by a post-filter are not rendered; slot panes filter `view.rows` themselves (`:636`) | yes | `grep -n 'tieGroupId\|\.groups\|groupBy' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` → no output; `sed -n 635,639p …/upgrades_tab.tsx` |
| C34 | `MemoryStore` is a `Map`-backed `Store`; `rankUpgrades` reads per-sim observations and whole rankings through `deps.store` (`rank.ts:617`, `:1760`); the tab holds one store per tab instance (`:99`), so identical sim requests are deduped across runs in a page session | no | `grep -n 'class MemoryStore\|new Map' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/seams/store.ts; grep -n 'deps.store.get' …/engine/rank.ts; grep -n 'new MemoryStore' …/upgrades_tab.tsx` |
| C35 | The engine hashes every eligible candidate (derived from `deps.pool`) into the ranking cache key before the sim loop, so a pruned pool and a full pool have distinct keys with no `RankInput` change | yes | `sed -n 546,575p vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` (comment "Hashed on every *eligible* candidate" and the `canonicalJson({ … })` payload) |
| C36 | A prune-on default run (16–17 tagged candidates + owned rows, ≈ 3.8 s per full sim at 3,000 iterations on 4 workers, plus ~36 replication sims) finishes under 600 s on both specs | yes | `hypothesis, untested` — measured in Step 9; arithmetic from C12 and C17 |
| C37 | The fork's ranking cache payload computes three racing fields (`fullPool: !racing`, `screenIterations: racing ? … : null`, `promoteTopK: racing ? … : null`, `rank.ts:612–614`); core freezes four including `promoteTopJ: null`. Collapsing the fork's three to their `racing === false` values (`true, null, null`) reproduces every key the tab has ever written with `fullPool: true`; adding `promoteTopJ` would change every key | yes | `sed -n 606,616p vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts; sed -n 160,167p packages/core/src/content-hash.ts` |
| C38 | E-W3's `extraInput` is a plain object spread into the fork-side `RankInput`; an unknown `fullPool: true` field reaching a post-removal engine is ignored at runtime | yes | `hypothesis, untested` — executor confirms with `grep -n 'extraInput' packages/core/test/wowsims-fork-parity.test.ts` and `pnpm verify` at each commit in Step 6's ordering; if the fork `RankInput` type is used to type `extraInput` and type-check fails, fall back to the alternative ordering in Step 6 |

## Steps

Serial. "Fork" = commit in `C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork` on `feat/upgrades-tab`. "Repo" = commit in `C:/Users/dgree/Code/lulz/tbc-gear-prio` on `feat/finish-the-tab`. Every fork shell starts with the C23 recipe; never `cd` into the fork. Each fork commit runs `npm --prefix <fork> run type-check && npm --prefix <fork> run lint && npm --prefix <fork> run format` green (C21); `make test` runs once at the end of Step 6 (no Go changes, C22). Each repo commit runs `pnpm verify` green. Commit messages follow the seven rules. The executor records outputs in `.scratch/stage-gate/finish-the-tab/measurements.md` (Repo; committed in Step 11) as it goes. Commit-time acceptance for Steps 1–5 is static (type-check, greps); browser observations for the same steps are collected once, in Step 9.

**Step 0 — Preconditions (no commit).**
Run and paste: C1, C3, C22, `ls vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades`, `git -C vendor/tbc-new-fork log --oneline -1`.
Acceptance: drift check prints `ok: 33 ported files`; both trees clean; fork tip `f359239`.
Depends on: C1, C3, C22.

**Step 1 — Fork: elapsed wall-clock in the done/stopped status.**
`upgrades_tab.tsx`: capture `performance.now()` at the top of `run()`; on `done` and `stopped` append new key `upgrades_tab.status.elapsed` = `"Took {{seconds}} s."` (integer seconds) to the status text (`translation.json`, C24).
Acceptance: fork checks green; `grep -n 'status.elapsed' <tab> <translation.json>` hits both. Commit to Fork.
Depends on: C24.

**Step 1b — Archive the racing build (no commit).**
Build the Step 1 tip: `npx tsx vite.build-workers.mts && npx vite build` in the fork (C21, C22 — `lib.wasm` is reused, not rebuilt). Confirm freshness: `grep -l 'status.elapsed' vendor/tbc-new-fork/dist/tbc/bundle/*.js` non-empty. Copy `vendor/tbc-new-fork/dist` to `C:/Users/dgree/AppData/Local/Temp/finish-the-tab-builds/racing/` (outside both repos). Record the fork sha it came from.
Acceptance: `ls C:/Users/dgree/AppData/Local/Temp/finish-the-tab-builds/racing/tbc/lib.wasm` and `…/tbc/bundle/` exist; `git -C vendor/tbc-new-fork status --porcelain` empty.
Depends on: C21, C22, C23.

**Step 2 — Fork: full sweep on the tab path.**
`run()`: add `fullPool: true` to `RankInput` with a comment citing ADR-0026 (core full-sweeps; the flag is the fork's escape hatch until Step 6 deletes racing). Replace `candidate_cap_note` with wording true under both engine paths: `"top {{cap}} candidates simmed in full, plus anything you already own"` (F15: accurate whether or not racing is present; Step 6 does not need to touch it again). Remove the stale racing paragraph in the drawer comment (`:775–784`). Do not touch `ENGINE_FORK_COMMIT` (engine unchanged).
Acceptance: fork checks green; `grep -n 'fullPool: true' <tab>` → one hit inside `run()`. Commit to Fork.
Depends on: C4, C10.

**Step 3 — Fork: set-bonus toggle.**
Checkbox `.upgrades-set-potential-toggle`, key `upgrades_tab.view.set_potential` = `"Include set-bonus potential"`, unchecked by default, in the run row; `currentViewOptions()` returns `{ hideOwned: false, withSetPotential: this.setPotentialToggle.checked }`; `change` → `this.render()`. Visible only when `this.state.kind === 'done'` and `this.state.ranking.items.some(hasRankableSetPotential)`, where the tab-local `hasRankableSetPotential(i) = (i.setContext?.prospectiveBonusDps ?? 0) > 0 && !(i.setContext?.prospectiveBonusBreaks?.length)`, commented as a mirror of `view.ts`'s private `rankableSetPotential` (F16 advisory: accepted, to avoid an engine edit); otherwise `d-none`. State is read only through `currentViewOptions()` and never persisted (tranche 2 weighted-mode rule, Q5).
Acceptance: fork checks green; `grep -n 'withSetPotential' <tab>` shows it read from the checkbox; C15 still holds. Commit to Fork.
Depends on: C5, C15, C16, C28.

**Step 4 — Fork: post-sim BIS-list filter.**
Checkbox `.upgrades-bis-only-toggle`, key `upgrades_tab.view.only_bis` = `"Only items on a BIS list"`, unchecked by default, `change` → `this.render()`. Refactor (F11): add `private currentView(): ViewResult` that calls `applyView(this.state.ranking, this.currentViewOptions())` then `applyBisFilter`; replace the two existing `applyView` call sites (`renderSubTabs` `:521`, `resultsContent` `:594`) with `this.currentView()`; `slotPaneContent(slot, view)` keeps its parameter and receives the filtered view from `renderSubTabs`. `applyBisFilter(view)`: when the toggle is on, `rows = view.rows.filter(tagged)`, `shortlist = view.shortlist.filter(tagged)`, `belowCutoffCount = rows.length - shortlist.length`, `pinBisAvailable` unchanged; `tieGroupId` and `groups` are left as-is because the tab never renders them (C33) — say so in a comment. Element created only when `this.state.kind === 'done' && this.state.ranking.items.some(i => i.bisTags.length > 0)`; otherwise not rendered (hidden polarity unreachable with shipped data, C17 — state this in the commit message).
Acceptance: fork checks green; `grep -c 'applyView(' <tab>` → 1; `grep -n 'tieGroupId\|\.groups' <tab>` → no output. Commit to Fork.
Depends on: C8, C16, C17, C33.

**Step 5 — Fork: pre-sim BIS-list prune.**
Checkbox `.upgrades-bis-prune-toggle`, key `upgrades_tab.prune.only_bis` = `"Sim only items on a BIS list"`, unchecked by default, in the run row beside Candidates. Add `private effectivePool(specId, maxPhase): readonly PoolEntry[]` = `poolFor(specId, maxPhase)` filtered by `e => (e.bisTags?.length ?? 0) > 0` when the toggle is on; use it in both `eligibleCount` (`:343`) and `run()`'s `pool:` (`:407`). The toggle's `change` calls `refreshCandidatesPlaceholder()` so the count follows it. Visibility: in `refreshCandidatesPlaceholder()` (runs at construction and on every settings change), show the control only when `specId` is supported and `poolFor(specId, maxPhase).some(e => e.bisTags?.length)`; otherwise hide it and treat it as off. Record `this.lastRunPruned` in `run()` and show one `dt/dd` line in the assumptions drawer (`upgrades_tab.assumptions.pool` = `"Candidate pool"`, values `"BIS-list items only"` / `"every eligible item"`), so a pruned result is disclosed. No engine change; the cache key already distinguishes pools (C35).
Acceptance: fork checks green; `grep -c 'poolFor(' <tab>` → 2 (both inside `effectivePool` and the visibility check) or as the executor documents; `grep -n 'pool: this.effectivePool' <tab>` → one hit. Commit to Fork.
Depends on: C17, C35.

**Step 6 — Fork + Repo: delete racing from the fork engine — `nested-plan`.**
Sub-brief for the focused planner: *Delete racing in place from the fork's ported engine so it matches core post-ADR-0026; do not re-port core's `rank.ts` (reviewer F4). Scope: `engine/rank.ts` — remove `screenCandidate`, `ScreeningResult`, `screeningSkips`, the `screening` progress stage and its `Progress` variant, `screenedRows`, the `if (racing)` branch and the `promotionRule` call (lines ~554–990 region), `RankInput.screenIterations`/`promoteTopK`/`fullPool` and `DEFAULT_SCREEN_ITERATIONS`/`DEFAULT_PROMOTE_TOP_K`, the `screened` field on `RankedItem`, the replication skip for screened rows; delete `engine/promotion.ts`; `engine/view.ts` — remove the screened partition in `assignTieGroups`, the screened-first rule in `compareRows`, and the `screened` early return in `belowCutoffUnderView`; `engine/disclosure.ts` / `engine/types.ts` / `engine/content-hash.ts` comments if they mention screening; tab — remove the `'screened'` expand, `screened_*` and `progress.screening*` i18n keys, the `screening` case in `progressLabel`, and Step 2's `fullPool: true` line (the field no longer exists). **Cache keys (C37): keep the fork's three existing fields in the `canonicalJson` payload as literals `fullPool: true, screenIterations: null, promoteTopK: null` — these are the values the tab has written since Step 2 — and do NOT add core's `promoteTopJ`.** PROVENANCE: after E-W3 passes, re-hash every touched row, remove the `promotion.ts` row, add a dated header note naming the core commit ported from (`git log -1 --format=%H -- docs/adr/0026-*.md`). Update `ENGINE_FORK_COMMIT` (C27). Commit ordering so `pnpm verify` is green on every repo commit (F9, C38): (1) Repo commit: delete the `fullPool: false` racing case in `packages/core/test/wowsims-fork-parity.test.ts` (~1069) and its comment; `pnpm verify` green against the still-racing fork. (2) Fork commits: the deletion above; E-W3 passes because the `fullPool: true` extra at line 900 is ignored by the new engine (C38) and the frozen key literals match. (3) Repo commit: drop `extraInput: { fullPool: true }` and the lines 359–363 comment; `pnpm verify` green. If C38 fails type-check, alternative ordering: make (1) also change the extra to a spread of an `{}` object typed `Record<string, unknown>` so both engines accept it, then (3) removes it. Gate for "racing is gone" (F10): `grep -c 'screenCandidate\|promotionRule\|stage: "screening"\|\.screened' <engine>/rank.ts <engine>/view.ts` → 0 for each file; `ls <engine>/promotion.ts` → absent; `grep -c 'screened' <tab>` → 0; the literal `screenIterations: null` in the hash payload is the one permitted mention. Fork checks green plus `make test` once.*
Acceptance: the nested plan exists at `.scratch/stage-gate/finish-the-tab/nested/racing-removal/plan.md` (Repo, committed in Step 11) and its verify recipe passes; `pnpm test packages/core/test/wowsims-fork-parity.test.ts` green and not skipped; `pnpm engine-port-drift:check` ok.
Depends on: C2, C9, C10, C11, C13, C26, C27, C31, C37, C38.

**Step 7 — Repo: lockfile and gates.**
Set `data/wowsims-fork.lock.json` `commit` to `git -C vendor/tbc-new-fork rev-parse HEAD`; leave `pushed: false` and `branchedFrom` untouched. Run `pnpm engine-port-drift:check` and `pnpm verify`; paste outputs.
Acceptance: `pnpm verify` exit 0; drift check `ok`; lockfile commit equals the fork tip. Commit to Repo.
Depends on: C1, C2, C3.

**Step 8 — MEASUREMENT MILESTONE: stop and report to the orchestrator.**
Build the final fork tip (`npx tsx vite.build-workers.mts && npx vite build`), copy `dist` to `C:/Users/dgree/AppData/Local/Temp/finish-the-tab-builds/full/`. Confirm `grep -l 'upgrades-bis-prune-toggle' …/full/tbc/bundle/*.js` non-empty. Then **stop** and report: both trees clean, fork tip sha, the two archived builds, and the request that the owner front a Brave tab driven through Claude in Chrome (C29) for Step 9. Do not time anything from the Claude Code Browser pane. The executor resumes Step 9 only when the orchestrator confirms the surface.
Acceptance: the report is sent; both `git status --porcelain` outputs empty.
Depends on: C21, C22, C29.

**Step 9 — Browser measurements and Q1 verdict (no commit until Step 11).**
Serve one archived build at a time: `npx http-server <build dir> -p 8123 -c-1`. Pages: ret `http://localhost:8123/tbc/paladin/retribution/`, feral `http://localhost:8123/tbc/druid/feralcat/` (C30). Protocol: ticket 156's `protocol.md`/`prep-notes.md` (C12) with these stated deviations (F14): runs are **uncapped** (Candidates empty), elapsed is read from the page's `Took N s.` status (the harness `performance.now()` figure is kept as a cross-check and both are recorded), reload between runs, never poll mid-run, confirm engine load from the http-server log (`GET /tbc/lib.wasm`). Per cell: one warm-up run (Candidates=5, discarded), then one timed run; if two cells being compared differ by < 10 %, add one more timed run of each and use means. Record per run: elapsed (page and harness), `hardwareConcurrency`, worker picker, `visibilityState`, shortlist item names, `Simming n/N` total.
Cells (Iterations 3,000, maxPhase 2, page defaults):
1. `full` build, prune **on**, ret and feral — judged against the proposed 600 s (goal line).
2. `full` build, prune **off**, ret and feral — recorded as candidate (c).
3. `racing` build, prune off, ret and feral — candidate (a).
Verdicts, pre-stated: goal line `met` if both cell-1 runs ≤ 600 s, else `missed by N s` per spec (then the owner's hand-off decision stands, and the plan records it; nothing else is changed). Q1: (a) wins only if `elapsed_a ≤ 0.8 × elapsed_c` on both specs and `shortlist_c ⊆ shortlist_a` on both; otherwise (c). If (a) wins, apply the remedy in Q1 (revert Step 6 fork and repo commits, re-hash, re-bump lockfile) before Step 10.
Browser observations for Steps 3–5 (collected on a completed cell-1 run): set-bonus toggle changes row order or shortlist within one second with the status line unchanged (or is hidden, and which polarity was seen); BIS filter on → every visible row carries the `★ BiS`/`Alt` badge, slot tabs with no tagged row show the empty string, off → rows return; prune on → Candidates placeholder equals the tagged count and `Simming n/N` total equals tagged plus owned rows; prune control visible for ret and feral (hidden polarity unreachable, C17).
Acceptance: six timed rows plus warm-ups in `measurements.md`, each field filled, plus the two verdict lines and the three observation paragraphs.
Depends on: C12, C13, C14, C29, C30, C36.

**Step 10 — Repo: tickets.**
156 → `Status: closed`, comment with Step 9's numbers and "D7 stays 3,000". 199 → `closed`, citing C25. 205, 206 → `closed` with "moot: racing deleted from the fork engine in <fork sha>" (or, if the Q1 remedy ran, left `open` with "does not block finished — racing kept on measured evidence <numbers>"). 201 → stays `open`; append "does not block finished; named in STATUS as a budget lever for tranche 2".
Acceptance: `pnpm issues:open` lists neither 156 nor 199; every edited ticket's first line is one of the six allowed status words. Commit to Repo.
Depends on: C25, C26.

**Step 11 — Repo: verification log, STATUS, measurements, nested plan.**
`docs/verification-log.md`: dated entry "finish-the-tab, tranche 1" with one subsection per tranche-1 goal line (ranked list + sub-tabs from an in-browser run; time budget — proposed 600 s, prune on, numbers, surface, machine, `met`/`missed`; uncapped and racing figures as measurements; honest progress; set-bonus toggle; post-sim filter; pre-sim prune; required tickets), each with the command and what was observed; real-browser figures only. `.scratch/handoffs/wowsims-tab/STATUS-<today>.md` replacing the 2026-08-22 file: rulings carried forward, Q1–Q7 decisions with numbers, the proposed budget and the owner's ratification status, tranche 2 (weighted set-bonus variant with its own researcher and nested planner; spec registry and new specs; ticket 201 workers), fork tip, lockfile. Commit `measurements.md` and `nested/racing-removal/plan.md`.
Acceptance: `pnpm verify` green; exactly one `STATUS-*.md`; the log entry has one subsection per goal line. Commit to Repo. Do not merge.
Depends on: C12, C14, C32, C36.

## Paths manifest

**Fork clone (`vendor/tbc-new-fork`, branch `feat/upgrades-tab`)**
- `ui/core/components/individual_sim_ui/upgrades_tab.tsx` (Steps 1–6)
- `assets/locales/en/translation.json` (Steps 1–6)
- `ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts` (Step 6)
- `ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`, `engine/view.ts`, `engine/promotion.ts` (delete), `engine/disclosure.ts`, `engine/types.ts`, `engine/content-hash.ts` (comments), `engine/PROVENANCE.md` (Step 6; final list fixed by the nested plan)
- `dist/` — build output, gitignored (C22), never committed

**This repo (`feat/finish-the-tab`)**
- `packages/core/test/wowsims-fork-parity.test.ts` (Step 6, two commits)
- `data/wowsims-fork.lock.json` (Step 7; again after a Q1 remedy)
- `.scratch/carry-forward/issues/156-*.md`, `199-*.md`, `205-*.md`, `206-*.md`, `201-*.md` (Step 10)
- `docs/verification-log.md` (Step 11)
- `.scratch/handoffs/wowsims-tab/STATUS-2026-08-22.md` (delete), `STATUS-<today>.md` (create) (Step 11)
- `.scratch/stage-gate/finish-the-tab/measurements.md`, `.scratch/stage-gate/finish-the-tab/nested/racing-removal/plan.md` (create; Step 11)

**Outside both repos:** `C:/Users/dgree/AppData/Local/Temp/finish-the-tab-builds/{racing,full}/` (Steps 1b, 8).

No partition: single executor, serial; the fork clone exists only in the main checkout and Steps 6–7 touch both repos in one sitting.

## Verify recipe

```bash
# this repo
cd /c/Users/dgree/Code/lulz/tbc-gear-prio
pnpm verify                                                  # exit 0
pnpm engine-port-drift:check                                 # "ok: N ported files match PROVENANCE.md"
pnpm test packages/core/test/wowsims-fork-parity.test.ts     # green, not skipped
grep -c fullPool packages/core/test/wowsims-fork-parity.test.ts   # 0
test "$(git -C vendor/tbc-new-fork rev-parse HEAD)" = "$(python -c "import json;print(json.load(open('data/wowsims-fork.lock.json'))['commit'])")" && echo lockfile-matches
git status --porcelain                                       # empty
pnpm issues:open | grep -c '156\|199'                        # 0
ls .scratch/handoffs/wowsims-tab/STATUS-*.md                 # exactly one file
grep -n 'finish-the-tab' docs/verification-log.md            # the new entry

# fork clone (shell started with the C23 recipe; no cd)
F=/c/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork
E=$F/ui/core/components/individual_sim_ui/upgrades/engine
T=$F/ui/core/components/individual_sim_ui/upgrades_tab.tsx
git -C $F status --porcelain                                 # empty
npm --prefix $F run type-check && npm --prefix $F run lint && npm --prefix $F run format
(eval "$(fnm env --shell bash)"; make -C $F test)            # Go tests, once
grep -c 'upgrades-set-potential-toggle\|upgrades-bis-only-toggle\|upgrades-bis-prune-toggle' $T   # ≥ 3
grep -c 'applyView(' $T                                      # 1
grep -c 'rankUpgrades(' $T                                   # 1
grep -c 'screened' $T                                        # 0
for f in $E/rank.ts $E/view.ts; do grep -c 'screenCandidate\|promotionRule\|stage: "screening"\|\.screened' $f; done   # 0 and 0
ls $E/promotion.ts                                           # No such file
grep -n 'screenIterations: null' $E/rank.ts                  # exactly one hit: the frozen hash literal
```

Plus `measurements.md` and the verification-log entry: six timed uncapped/pruned runs at 3,000 iterations on a foregrounded Brave tab with `visibilityState: visible`, `hardwareConcurrency`, worker count and the http-server `lib.wasm` fetch lines quoted; the three control observations.

## Out of scope

- Pushing the fork, opening a PR, flipping `"pushed": false`, rebasing onto upstream `master`, ticket 251.
- **The weighted set-bonus variant (owner, 2026-08-22): tranche 2, with its own researcher and nested planner.** Tranche 1 ships only the binary `withSetPotential` toggle and keeps it replaceable: state read through `currentViewOptions()` only, never persisted, i18n key `view.set_potential`, no second control that would collide with a three-state select. Do not rebuild the reverted 0.5x/0.25x attempt.
- New specs, the spec registry refactor, IndexedDB cache, local-sim port (Q3, Q7).
- Raising `DEFAULT_WORKER_COUNT` or fixing `memoryCapFromDeviceMemory` (ticket 201); lowering D7's default; the 5,000-iteration screening observation in ticket 156.
- Porting `candidates` on the `simming` event, `equipmentForCandidateSwap`, or any core change other than racing removal; adding `promoteTopJ` anywhere in the fork.
- Any `ViewOptions`/`ViewResult` change in the fork's `view.ts`; `pinBis` UI; `hideOwned` UI; raid/boss filters; layout or styling.
- Rebuilding `lib.wasm` (no Go changes, C22) unless `make test` demands it.
- Merging to `dev` — the orchestrator asks the owner after the review file exists.
