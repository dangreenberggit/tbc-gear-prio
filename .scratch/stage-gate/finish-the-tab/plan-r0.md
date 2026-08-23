# Plan — finish-the-tab

## Goal

When this plan is done, a retribution paladin or feral cat druid on the fork's site (production build served from `vendor/tbc-new-fork/dist`) opens the Upgrades tab, clicks Run with the default 3,000 iterations and no candidate cap, and gets a ranked shopping list plus per-slot sub-tabs from a full in-browser sweep of every eligible candidate, with the status line showing each stage, rows landing as they finish, and the elapsed wall-clock on completion. The tab has two new view controls that re-render without any sim call: "Include set-bonus potential" (sorts and cutoff-tests rows on `deltaDps + rankable set potential`, never crediting a confounded row) and "Only items on a BIS list" (shows only `bisTags`-tagged rows; hidden, not disabled, when the ranking carries no tags). The fork engine no longer races (screening/promotion code removed; matches core post-ADR-0026), `pnpm engine-port-drift:check` and E-W3 parity are green against the updated fork tip, `data/wowsims-fork.lock.json` points at that tip, tickets 156 and 199 are closed, 205/206 are closed as moot, 201 carries a line saying why it does not block, and `docs/verification-log.md` has a dated entry with the real foregrounded-browser wall-clock for one ret and one feral run at 3,000 iterations, judged against the budget below. `STATUS-2026-08-22.md` is replaced by a newer STATUS recording Q1–Q7.

**Time budget used by this plan (D7's number):** candidate-pool.md line 11 — "a default ret run at `maxPhase 2` finishes in **single-digit minutes** on a 4-worker machine", read as wall-clock < 600 s, Run click to Run button re-enabled, Candidates empty, Iterations 3,000. The plan's own prediction (C14) is that both remaining sim strategies miss this budget at 3,000 iterations; Step 4 pre-states what is recorded in that case.

## Approach

**Chosen: keep the fork's ported engine and make the tab's path match core's full sweep with one flag, measure, then remove the dead racing code as a nested plan; build the two view controls in the tab only (no engine changes), filtering over `applyView`'s output.**

Why this shape:

- The fork's `view.ts` already carries `withSetPotential`, `pinBis`, `rankableSetPotential` and the inlined `setPotentialIsConfounded` (C5, C6). The set-bonus toggle is therefore a checkbox plus one field in `currentViewOptions()`; no port, no bundle-size work (the fork's `view.ts` imports nothing that reaches `items.ts`, C7).
- The BIS filter is a `bisTags.length > 0` filter over `ViewRow`s applied after `applyView`. Because the cutoff is absolute (ADR-0020, core `view.ts` doc), filtering after the cutoff verdict gives the same rows as "filter first, then cutoff" — so the filter can live in the tab and the engine copy stays byte-identical to its PROVENANCE row (C8).
- The engine with `fullPool: true` is the exact path E-W3 parity already tests against core (C10). So correctness of the full sweep does not wait on the racing-removal port; the port is simplification work and is sequenced last among fork steps, as a `nested-plan`, so every earlier fork commit leaves a shippable tip.
- Measuring the sim strategy in a real browser needs no new harness: ticket 156's resolution left a working one (`.scratch/stage-gate/ticket-156-ew2-table/harness.js`, `protocol.md`, `prep-notes.md`, C12). The tab gets a small product change (elapsed seconds in the done status) so the number is read off the page, not from a harness clock.

**Strongest rejected alternative: re-port core's current `rank.ts`/`view.ts` wholesale into the fork first, then build the controls on top.** It would close the drift in one move and bring `candidates` on the `simming` event, `equipmentForCandidateSwap`, etc. It lost because the fork's `rank.ts` differs from core's by 1,283 `diff -w` lines (C9) across three deliberate adaptations (D4 `canonicalJson` hashing, no `spec.ts`, `simDatabaseFor` threading) plus racing; re-porting wholesale re-applies all of those by hand with no JS test runner in the fork, before any user-visible feature lands. That is the opposite of slow-and-steady. The plan instead ports only what changes behaviour (racing removal) and records the rest as non-required (Q4).

**Second rejected alternative: implement the BIS filter and set-bonus availability inside the fork's `view.ts` (`ViewOptions.onlyBis`, `ViewResult.setPotentialAvailable`).** Cleaner typing, but every engine edit costs a PROVENANCE hash update, an E-W3 run, and a divergence from core that the drift gate cannot see. Two tab-local functions cost none of that.

### Open questions Q1–Q7

**Q1 — sim strategy on the browser path.**

| Candidate | Status | Pre-stated win condition | Measurement |
| --- | --- | --- | --- |
| (a) M2 racing as shipped (`fullPool` unset) | measured in Step 2 | Wins only if wall-clock is ≥ 20 % lower than (c) on **both** ret and feral (ADR-0026's bar, C13) **and** its shortlist item set ⊇ (c)'s shortlist item set on both | Step 2: production build, foregrounded Brave tab, Candidates empty, Iterations 3,000, maxPhase 2, one warm-up run then one timed run per spec; elapsed read from the new done-status field; shortlist names read from `.upgrades-results-table` rows |
| (b) per-slot top-*j* racing (j = 5) | **dropped** | — | Never built in the fork (fork `promotion.ts` has no `promoteTopJ`, C11); fit on two fixtures only (HANDOFF-NEXT §4 caveat); core measured the whole racing family against the 20 % bar including an oracle K and every variant failed on feral (ADR-0026). Building a third racing variant to measure it contradicts the owner's "simple code" ruling. |
| (c) full sweep (`fullPool: true`), matching core | measured in Step 3; **default winner** | Wins if (a) fails its condition. Reports its own wall-clock against the 600 s budget either way. | Step 3: same protocol as (a) after the one-line flag |

Prediction, labelled: from ticket 156's resolution (feral-p2, 3,000 iterations, 4 workers: full sims 130.1 s for 34 rows → ~3.8 s per full sim; screening 207 s for 246 candidates), a full sweep of 246 rows ≈ 940 s + ~36 replication sims; racing ≈ 207 s + ~0.70 × 246 × 3.8 s ≈ 860 s + replication. Both ≈ 15–18 min; neither clears 600 s, and (a) does not clear 20 % over (c). `hypothesis, untested` until Steps 2–3 (C14).

**Q2 — ticket 156.** Its three acceptance boxes were all ticked on 2026-08-18 (foregrounded Brave, 20 hardware threads, 4 workers: 337.3 s at 3,000 / 459.4 s at 5,000 for the 20-candidate cell, spreads 3.6 % / 1.3 %, C12). Only the `Status:` line is stale. Steps 2–3 add the uncapped full-run numbers the brief asks for; Step 9 closes 156 with those numbers. D7: **keep 3,000 with the visible control** — full-sim cost is linear in iterations (130.1 → 215.5 s for 3,000 → 5,000, C12), so raising the default multiplies an already-over-budget run; lowering it is not what D7 asks and would trade precision for a budget that tranche 2's prune reaches without that trade.

**Q3 — §9 item 7 scope (proposal; owner decides).**
- More specs: **out** of "finished"; tranche 2, as a data drop-in per Q7. Reason: no universe or EP file exists for any other spec in the tab (`upgrades/data/` lists ret-p2..p5, feral-p2,p3 only, C18), so each spec is a data-pipeline job in this repo first.
- IndexedDB cache: **out**. `MemoryStore` already dedupes sim requests within a page session (tab doc comment, line 93–97); a cross-session cache is a fourth `Store` adapter with its own invalidation story and adds nothing to the tranche 1 goal.
- Porting into the downloadable local sim: **out**. plan.md §9 item 7 itself marks it "hypothesis, untested" and it is upstream-shipping work, which the owner's brief excludes from "finished".

**Q4 — engine drift.** `pnpm engine-port-drift:check` today: `engine port drift check ok: 33 ported files match PROVENANCE.md` (C1). Core changes since the port, judged for the tab's correctness:

| Core change | Needed for the tab to be correct? | Action |
| --- | --- | --- |
| `set-potential.ts` split | **No** — the fork inlined `setPotentialIsConfounded` in `view.ts` at port time and imports nothing that reaches `items.ts` (C6, C7) | none |
| Racing removal (ADR-0026) | **No for correctness** — `fullPool: true` puts the fork on the path E-W3 tests (C10). **Yes for simplicity** — dead screening/promotion code, a `screened` UI state, and tickets 205/206 all hang off it | Step 3 (flag), Step 7 (`nested-plan` port) |
| `candidates` on the `simming` event | No — the tab renders `done/total` and the row side-channel (tab lines 415–430) | none; recorded in STATUS as a known, harmless gap |
| `equipmentForCandidateSwap`, `gemContext` index exports | No — the fork has no `index.ts`; `gemContext` lives in its `candidate-gems.ts` (C9) | none |
| `HIT_CAP_PERCENT` | No — present in the fork's `caps.ts` (C9) | none |

Gate honesty: every engine file edited in Step 7 gets its sha256 row in `engine/PROVENANCE.md` recomputed **after** E-W3 passes (the script's own rule, C2); the PROVENANCE header gains a dated note naming the core commit the racing removal was ported from; `pnpm engine-port-drift:check` is recorded before (Step 0) and after (Step 8).

**Q5 — set-bonus toggle.** Candidate (a) — port `withSetPotential` — is already done by the existing port; what remains is the checkbox. Chosen: (a′) checkbox in the run row, `currentViewOptions()` reads it, `change` → `this.render()`. Win condition: toggling on a completed ranking changes row order / shortlist membership with zero sim calls (`rankUpgrades(` has exactly one call site, inside `run()`, bound only to the Run button — C15), and a row with `prospectiveBonusBreaks.length > 0` gets no credit (`rankableSetPotential` returns 0 for it — C5). Control hidden, not inert, when no row has rankable set potential (PLAN.md line 274 rule, C16). Candidate (b) "something simpler" — none found; a checkbox is the floor.

**Q6 — post-sim BIS filter.** Chosen: **(a) a filter** over `ViewRow.bisTags`, in the tab. Not (b) `pinBis`: a pin keeps every untagged row on screen below the pinned ones, so it does not answer "which BIS-list items should I chase"; the owner asked for a filter. Win: filter on → only rows with `bisTags.length > 0` in the shopping list and every slot pane; control hidden when `ranking.items.every(i => i.bisTags.length === 0)`. Every committed universe carries 16–17 tags (C17), so the hidden polarity is unreachable with shipped data — Step 6 records that and verifies it by construction (the control element is only created inside the availability branch), not by a browser observation.

**Q7 — tranche 2 decisions (record, do not build).**
- BIS source for the pre-sim prune: **the universe's `bisTags`.** They are already bundled, phase-scoped by `assemble_universe.py` (C19), and the same tags the post-sim filter uses — so pre- and post-sim filters agree by construction. wowsims' runtime `gear_sets/` would need per-spec preset imports into the tab and a per-spec phase-naming map (feral's files are `p1_bis_6p`, ret's are `p2`, C20) — which is exactly the offline job `assemble_universe.py` already does. Honest degradation: a (spec, phase) whose pool has no tags hides the prune control. Prune shape: filter `deps.pool` at the call site in `run()` (`poolFor(...).filter(e => e.bisTags?.length)`) and make `eligibleCount` use the same filter; eligible candidates are already part of the cache key (fork `rank.ts` 562–575), so no `RankInput`/hash change.
- What tranche 1 must not do: put BIS membership into `RankInput`, `contentHash`, or the engine's pool filter; keep `SPEC_ID_BY_PROTO_SPEC` and `data.ts` as the only spec-registration points.
- Spec drop-in today costs five touches: universe JSON, EP-weights JSON, `UNIVERSES_BY_SPEC_AND_PHASE` entry, `EP_WEIGHTS_BY_SPEC` entry (`data.ts`), `SPEC_ID_BY_PROTO_SPEC` line (`upgrades_tab.tsx:34-37`), plus the `SpecId` union in `engine/types.ts` if the spec id is new to the engine. Recommendation for tranche 2: one registry object keyed by proto `Spec` holding universes-by-phase and EP weights, and derive `SPEC_ID_BY_PROTO_SPEC` from it — then a spec is two JSON files and one object entry.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | Drift gate is green on the base tip: 33 ported files match PROVENANCE.md | yes | `pnpm engine-port-drift:check` (output observed 2026-08-22: `engine port drift check ok: 33 ported files match PROVENANCE.md`) |
| C2 | The drift gate compares fork engine bytes to sha256 rows in `engine/PROVENANCE.md`, not to core; updating a row is manual and must follow an E-W3 pass | yes | `sed -n 99,137p scripts/check_engine_port_drift.py` |
| C3 | Fork clone is at `f359239`, clean, branch `feat/upgrades-tab`, lockfile `commit` = `f359239572c38af9acb24c1ee178088bfe44692c` | yes | `git -C vendor/tbc-new-fork status --porcelain && git -C vendor/tbc-new-fork rev-parse --abbrev-ref HEAD HEAD && grep commit data/wowsims-fork.lock.json` |
| C4 | Racing is default-on in the fork engine: `const racing = input.fullPool !== true;` and the tab never sets `fullPool` | yes | `grep -n 'input.fullPool !== true' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts; grep -c fullPool vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` (second prints 0 matches outside comments — verify the only hits are in the assumptions comment, lines 775–784) |
| C5 | Fork `view.ts` already implements `withSetPotential` via `sortKeyFor`/`belowCutoffUnderView` and zeroes confounded rows in `rankableSetPotential` | yes | `grep -n 'withSetPotential\|rankableSetPotential\|setPotentialIsConfounded' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts` |
| C6 | Fork `view.ts` inlines `setPotentialIsConfounded`; no `set-potential.ts` port is needed | yes | `grep -n '^function setPotentialIsConfounded' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts` |
| C7 | Fork `view.ts` imports only `./cutoff.js`, `./pool.js`, `./rank.js` (types) — nothing reaching the item index | no | `grep -n '^import' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts` |
| C8 | Filtering `ViewRow`s by `bisTags` after `applyView` changes no `belowCutoffInView` verdict (cutoff is absolute; verdict is computed per row from `item`, `baseline.dps`, `cutoff` only) | yes | `sed -n 158,175p vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts` (signature of `belowCutoffUnderView` takes no row-set argument) |
| C9 | Fork `rank.ts` differs from core by 1,283 `diff -w` lines; fork has `promotion.ts` with no core counterpart; `HIT_CAP_PERCENT` is in fork `caps.ts`; `gemContext` in fork `candidate-gems.ts` | no | `diff -w packages/core/src/rank.ts vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts \| wc -l; ls packages/core/src/promotion.ts; grep -c HIT_CAP_PERCENT vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/caps.ts` |
| C10 | E-W3 parity passes `fullPool: true` on the fork side to hold both engines on the full-sweep path | yes | `grep -n 'fullPool' packages/core/test/wowsims-fork-parity.test.ts` (lines 359–363, 900, 1070) |
| C11 | Fork `promotion.ts` has no `promoteTopJ` (per-slot top-j was never ported) | no | `grep -c promoteTopJ vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/promotion.ts` → 0 |
| C12 | Ticket 156's resolution (2026-08-18) measured, foregrounded Brave, 20 threads, 4 workers, feral, Candidates=20: 337.3 s @3,000 (screening 207.2 s, full sims 130.1 s for 34 rows), 459.4 s @5,000; spreads 3.6 %/1.3 %; harness files exist | yes | `sed -n 1266,1300p .scratch/carry-forward/issues/156-ew2-browser-wasm-throughput-unexplained.md; ls .scratch/stage-gate/ticket-156-ew2-table/` |
| C13 | ADR-0026's pre-stated bar: a screening mechanism must save ≥ 20 % wall-clock at zero recall misses; racing measured 1.407/1.476/1.098 (slower) on the three fixtures | yes | `grep -n '20 %\|1.407' docs/adr/0026-racing-is-removed-the-engine-full-sweeps-every-eligible-candidate.md` |
| C14 | Both (a) and (c) exceed 600 s for an uncapped ret-p2 / feral-p2 run at 3,000 iterations on 4 workers, and (a) is not ≥ 20 % faster than (c) | yes | `hypothesis, untested` — measured by Steps 2–3 |
| C15 | `rankUpgrades(` has exactly one call site in the tab, inside `run()`, which only the Run button invokes | yes | `grep -n 'rankUpgrades(' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` → one line (398); `grep -n 'this.run()' …/upgrades_tab.tsx` → one line (239) |
| C16 | PLAN.md's rule: hide or disable a view control when no data exists for it; the web shell hides (log box 5) | no | `sed -n 274p PLAN.md; sed -n 1811,1824p docs/verification-log.md` |
| C17 | Every bundled universe carries BiS tags (feral-p2/p3: 17, ret-p2..p5: 16), so `bisTags`-empty rankings are unreachable with shipped data | yes | `python -c "import json,glob;[print(p,sum(1 for e in json.load(open(p,encoding='utf-8'))['entries'] if e.get('bisTags'))) for p in glob.glob('vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/data/*.universe.json')]"` |
| C18 | Tab data exists only for ret p2–p5 and feral p2–p3; EP weights only ret-p2 and feral-p1 | no | `ls vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/data/` |
| C19 | `bisTags` are produced offline by `scripts/assemble_universe.py` from wowsims gear-set presets, phase-scoped | no | `grep -n 'gear_sets\|def .*bis' scripts/assemble_universe.py` (lines 204–304, 495–530) |
| C20 | wowsims gear-set naming differs per spec (feral: `p1_bis_6p.gear.json` …; ret: `p2.gear.json`) | no | `ls vendor/tbc-new-fork/ui/druid/feralcat/gear_sets vendor/tbc-new-fork/ui/paladin/retribution/gear_sets` |
| C21 | Fork checks are `npm run type-check`, `npm run lint`, `npm run format`, `make test`; production build is `npm run build` (= `make host`, output `dist/tbc`); the tab bundle alone rebuilds with `npx tsx vite.build-workers.mts && npx vite build` | yes | `sed -n 12,25p vendor/tbc-new-fork/package.json; sed -n 1p vendor/tbc-new-fork/makefile; sed -n 286,292p vendor/tbc-new-fork/makefile` |
| C22 | The fork branch changes no Go file, so `lib.wasm` in `dist/tbc/` does not need rebuilding for this plan | yes | `git -C vendor/tbc-new-fork diff --name-only cbf6b75..HEAD -- '*.go' \| wc -l` → 0; `ls -la vendor/tbc-new-fork/dist/tbc/lib.wasm` |
| C23 | Fork shells need `eval "$(fnm env --shell bash)"` and Go/protoc on PATH; a bare `cd` into the fork fails the fnm shim | yes | `sed -n 136,156p .scratch/handoffs/wowsims-tab/slice-1/HANDOFF.md`; reproduced 2026-08-22 (`cd vendor/tbc-new-fork` printed the fnm "can't find the necessary environment variables" error) |
| C24 | Tab i18n strings live in `vendor/tbc-new-fork/assets/locales/en/translation.json` under `upgrades_tab` (line 855) | no | `grep -n '"upgrades_tab"' vendor/tbc-new-fork/assets/locales/en/translation.json` |
| C25 | Ticket 199's three "Done when" items are met on `dev`: plan.md says "no EP prefilter" (line 246), ticket 156's recipe was rewritten around the cap (2026-08-15 comment), and the cap decision is recorded (candidate-pool.md M1, merged) | no | `sed -n 246p docs/plans/wowsims-tab/plan.md; grep -n 'recipe rewritten' .scratch/carry-forward/issues/156-ew2-browser-wasm-throughput-unexplained.md; git merge-base --is-ancestor feat/candidate-pool dev && echo merged` |
| C26 | Tickets 205 and 206 are entirely about the racing/screening pass | no | `sed -n 1,12p .scratch/carry-forward/issues/205-racing-reuses-nothing-from-the-screen.md .scratch/carry-forward/issues/206-screening-emits-no-progress.md` |
| C27 | `ENGINE_FORK_COMMIT` literal convention: update in any commit that changes what the engine does; may lag by provenance-only commits | no | `sed -n 1,21p vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts` |
| C28 | The fork ranking produces `setContext.prospectiveBonusDps` on rows (set packages are built in the fork engine) | yes | `grep -n 'prospectiveBonusDps' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` (line 1701 assigns it) |
| C29 | A foregrounded, compositing tab is reachable through the Claude in Chrome extension on Brave with the user fronting the tab; the Claude Code Browser pane never composites and must not be used for timing | yes | `grep -n 'Brave, tab manually fronted\|never composites' .scratch/carry-forward/issues/156-ew2-browser-wasm-throughput-unexplained.md` |
| C30 | Feral's production page URL is `/tbc/druid/feral/` under `dist` | no | `hypothesis, untested` — confirm with `ls vendor/tbc-new-fork/dist/tbc/druid/` before Step 2 |
| C31 | Core's `full-sweep-recall.test.ts` exists and is the recall gate that replaced racing's; the fork has no test runner | no | `ls packages/core/test/full-sweep-recall.test.ts; grep -c '"test"' vendor/tbc-new-fork/package.json` → 0 |

## Steps

Serial. "Fork" = commit in `C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork` on `feat/upgrades-tab`. "Repo" = commit in `C:/Users/dgree/Code/lulz/tbc-gear-prio` on `feat/finish-the-tab`. Every fork shell starts with the C23 recipe; never `cd` into the fork — use `npm --prefix`, `git -C`, absolute paths. Fork commit messages follow the seven rules (AGENTS.md); each fork commit runs `npm run type-check && npm run lint && npm run format` green (C21); `make test` runs once, at Step 7's end (no Go changes in this plan, C22).

**Step 0 — Preconditions (no commit).**
Run and paste into `.scratch/stage-gate/finish-the-tab/measurements.md` (Repo, committed in Step 10): C1, C3, C22, `ls vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades`, `git -C vendor/tbc-new-fork log --oneline -1`.
Acceptance: drift check prints `ok: 33 ported files`; both working trees clean; fork tip `f359239`.
Depends on: C1, C3, C22.

**Step 1 — Fork: elapsed wall-clock in the done/stopped status.**
`upgrades_tab.tsx`: record `performance.now()` at the top of `run()`; on `done`/`stopped` append the elapsed seconds (integer) to the status text via new i18n keys `upgrades_tab.status.elapsed` = `"Took {{seconds}} s."` in `translation.json` (C24). No layout work.
Acceptance: `npm run type-check`, `lint`, `format` green; `grep -n 'status.elapsed' upgrades_tab.tsx translation.json` hits both files. Commit to Fork.
Depends on: C24.

**Step 2 — Measure candidate (a), racing as shipped (no commit).**
Build: `npx tsx vite.build-workers.mts && npx vite build` in the fork (C21, C22); confirm the bundle is fresh: `grep -l 'status.elapsed' vendor/tbc-new-fork/dist/tbc/bundle/*.js` (non-empty). Serve: `npx http-server vendor/tbc-new-fork/dist -p 8123 -c-1` (launch config `wowsims-fork-prod` is an alternative on 4180). Surface: Claude in Chrome on Brave, the owner fronts the tab (C29) — the executor asks the orchestrator for this before starting; if no foregrounded surface is available, stop and report (do not time from the Browser pane). Protocol per `.scratch/stage-gate/ticket-156-ew2-table/protocol.md` and `prep-notes.md` (C12): reload between runs, never poll mid-run, read once after the Run button re-enables, confirm engine load from the http-server access log (`GET /tbc/lib.wasm`).
Cells: ret at `http://localhost:8123/tbc/paladin/retribution/` and feral at `/tbc/druid/feral/` (C30), default page gear and settings, maxPhase 2, Candidates empty, Iterations 3,000. Per cell: one warm-up run with Candidates=5 (discarded), then one timed run. Record: elapsed seconds (from Step 1's status), `navigator.hardwareConcurrency`, worker picker value, `visibilityState`, the shortlist item names from `.upgrades-results-table` rows in the shopping list, and the "screened" expand count.
Acceptance: two rows in `measurements.md` with every field filled.
Depends on: C12, C21, C22, C23, C29, C30.

**Step 3 — Fork: full sweep on the tab path, then measure candidate (c).**
`upgrades_tab.tsx` `run()`: add `fullPool: true` to `RankInput` with a comment pointing at ADR-0026 (core full-sweeps; the flag is the fork's pre-removal escape hatch). Replace the `candidate_cap_note` i18n text (which describes screening) with the pre-racing meaning: "top {{cap}} of the candidates by EP order, plus anything you already own". Update `ENGINE_FORK_COMMIT` is **not** required here (engine code unchanged) — leave it. Rebuild, verify the bundle contains `fullPool:!0` or equivalent (`grep -c fullPool dist/tbc/bundle/*.js`), re-run the Step 2 protocol for both cells.
Decision rule (pre-stated): (a) wins only if `elapsed_a ≤ 0.8 × elapsed_c` on both specs **and** every shortlist item of (c) appears in (a)'s shortlist on both specs. Otherwise (c) wins. If the two elapsed figures differ by < 10 % on either spec, run one more timed run of each on that spec and use the means. Record the verdict and all numbers in `measurements.md`, and judge each cell against the 600 s budget: `met` / `missed by N s`.
If (a) wins: `git -C vendor/tbc-new-fork revert` this step's commit, skip Step 7, and record in STATUS that the fork keeps racing with the measured saving. If (c) wins (predicted, C14): keep the commit and proceed.
Acceptance: fork checks green; `measurements.md` has four timed rows and a verdict line; the commit exists (or its revert, with the reason).
Depends on: C4, C10, C13, C14.

**Step 4 — Record the D7 / budget outcome (Repo, no commit yet — text lands in Step 10).**
Pre-stated outcomes: if the winning candidate met 600 s on both specs → goal line "within budget" is met at D7 = 3,000. If it missed on either → record "budget missed: ret N s, feral M s against 600 s; D7 stays 3,000 with the control; the path to the budget is tranche 2's pre-sim BIS prune (16–17 tagged candidates per universe, C17) and ticket 201's worker count (`DEFAULT_WORKER_COUNT = 4` on a 20-thread machine)". Do not lower the default or raise the worker count in this plan.
Acceptance: the outcome paragraph exists in `measurements.md`.
Depends on: C12, C14, C17.

**Step 5 — Fork: set-bonus toggle.**
`upgrades_tab.tsx`: add a checkbox `.upgrades-set-potential-toggle` (label via new key `upgrades_tab.view.with_set_potential` = "Include set-bonus potential") in the run row, unchecked by default; `currentViewOptions()` returns `{ hideOwned: false, withSetPotential: this.setPotentialToggle.checked }`; `change` listener calls `this.render()`. Visibility: in `render()`, show the checkbox only when `this.state.kind === 'done'` and `this.state.ranking.items.some(hasRankableSetPotential)`, where `hasRankableSetPotential(i)` is a tab-local function `(i.setContext?.prospectiveBonusDps ?? 0) > 0 && !(i.setContext?.prospectiveBonusBreaks?.length)` with a comment naming `view.ts`'s `rankableSetPotential` as the predicate it mirrors; hidden (`d-none`) otherwise.
Acceptance: fork checks green; `grep -n 'withSetPotential' upgrades_tab.tsx` shows it read from the checkbox; C15 still holds (`rankUpgrades(` one call site); browser check on a completed ret run from Step 3's build: toggle flips row order or shortlist membership within one second and the status line does not change to a progress label (zero sim calls by construction, C15). If no row in the run has rankable set potential, the control is hidden — record which polarity was observed.
Depends on: C5, C15, C16, C28.

**Step 6 — Fork: post-sim BIS-list filter.**
`upgrades_tab.tsx`: add a checkbox `.upgrades-bis-only-toggle` (key `upgrades_tab.view.only_bis` = "Only items on a BIS list"), unchecked by default, `change` → `this.render()`. Implement a tab-local `applyBisFilter(view: ViewResult): ViewResult` that, when the toggle is on, returns `{ ...view, rows: view.rows.filter(tagged), shortlist: view.shortlist.filter(tagged), belowCutoffCount: recomputed }` with `tagged = r => r.bisTags.length > 0`; route `renderSubTabs()`, `resultsContent()` and `slotPaneContent()` through one `currentView()` helper that calls `applyView` then `applyBisFilter`, so the shopping list and every slot pane agree. Visibility: the element is created only when `this.state.kind === 'done' && this.state.ranking.items.some(i => i.bisTags.length > 0)`; otherwise not rendered. Empty result under the filter renders the existing `results.empty` string.
Acceptance: fork checks green; browser check on a completed run: filter on → every visible row carries the `★ BiS`/`Alt` badge, slot tabs with no tagged row show the empty string; filter off → previous rows return; `grep -n 'applyView(' upgrades_tab.tsx` shows exactly one call site (inside `currentView()`). The hidden polarity is verified by construction (C17 explains why no browser run can reach it).
Depends on: C8, C16, C17.

**Step 7 — Fork + Repo: port core's racing removal into the fork engine — `nested-plan`.**
Sub-brief for a focused planner: *Remove racing from the fork's ported engine so it matches core post-ADR-0026, touching the fewest files. Inputs: fork `engine/rank.ts` (racing gated at `const racing = input.fullPool !== true`, lines ~554–990: `screenCandidate`, `screeningSkips`, the `screening` progress stage, `ScreeningResult`, `screenedRows`, `promotionRule` call), `engine/promotion.ts` (delete), `engine/view.ts` (drop the screened partition in `assignTieGroups`/`compareRows`/`belowCutoffUnderView`), `engine/disclosure.ts` and `engine/types.ts` if they carry `screened`/`screening` fields, `engine/content-hash.ts` doc comment, the tab's `screened` UI (`expandableRowGroup('screened')`, `screened_*` i18n keys, `progress.screening*` keys, `candidate_cap_note`), and this repo's `packages/core/test/wowsims-fork-parity.test.ts` (drop `fullPool: true` at line 900 and the `fullPool: false` racing case at ~1069). Cache keys: keep `fullPool: true, screenIterations: null, promoteTopK: null` as constants in the fork's `canonicalJson` payload, exactly as core did (ADR-0026 "Cache keys are frozen"). Choose between deleting the racing branches in place and re-porting core's `rank.ts` wholesale, by measuring `diff -w` line count against core before and after for each engine file touched — pick the smaller resulting divergence that keeps the fork's three adaptations (D4 hashing, no `spec.ts`, `simDatabaseFor`). Win: E-W3 (`pnpm test packages/core/test/wowsims-fork-parity.test.ts`) green with no `fullPool` on the fork side; `grep -rc 'screen' engine/ upgrades_tab.tsx` → 0 outside the frozen hash constants; fork checks and `make test` green; every touched PROVENANCE row re-hashed after E-W3, header note dated with the core commit ported from (`git log -1 --format=%H -- docs/adr/0026-*.md`); `ENGINE_FORK_COMMIT` updated (C27); `pnpm engine-port-drift:check` ok; tab's `fullPool: true` from Step 3 removed since the field no longer exists. Commits: engine + tab + PROVENANCE in the Fork; parity test in the Repo, same sitting, with the lockfile bump of Step 8.*
Acceptance: the nested plan's own verify recipe passes; the orchestrator has the nested plan on disk at `.scratch/stage-gate/finish-the-tab/nested/racing-removal/plan.md` (Repo).
Depends on: C2, C9, C10, C13, C26, C27, C31.

**Step 8 — Repo: lockfile and gates.**
Set `data/wowsims-fork.lock.json` `commit` to `git -C vendor/tbc-new-fork rev-parse HEAD`; leave `pushed: false` and `branchedFrom` untouched. Run `pnpm engine-port-drift:check` and `pnpm verify`; paste both outputs into `measurements.md`.
Acceptance: `pnpm verify` exit 0; drift check prints `ok`; the lockfile commit equals the fork tip. Commit to Repo.
Depends on: C1, C2, C3.

**Step 9 — Repo: tickets.**
- 156 → `Status: closed`; append a dated comment with Steps 2–3's uncapped numbers and "D7 stays 3,000" (Q2).
- 199 → `Status: closed`; comment citing C25.
- 205, 206 → `Status: closed` with "moot: racing removed from the fork engine in <fork sha>" if Step 7 landed; otherwise leave `open` and add one line: "does not block finished — the tab path runs `fullPool: true` since <fork sha>, so screening never executes".
- 201 → leave `open`; append one line: "does not block finished; named in STATUS as a budget lever for tranche 2".
Acceptance: `pnpm issues:open` no longer lists 156 or 199; every edited ticket's first line is one of the six allowed status words. Commit to Repo.
Depends on: C25, C26.

**Step 10 — Repo: verification log, STATUS, measurements.**
- `docs/verification-log.md`: new dated entry "finish-the-tab, tranche 1" with one subsection per Tranche 1 goal line (ranked list + sub-tabs from a full in-browser run; time budget — numbers, surface, machine, `met`/`missed`; honest progress — stage labels and elapsed; set-bonus toggle — Step 5 observation; post-sim BIS filter — Step 6 observation and the unreachable hidden polarity; required tickets closed), each with the command run and what was observed. Real-browser figures only; no Node-hosted numbers.
- `.scratch/handoffs/wowsims-tab/STATUS-<today>.md` replacing the 2026-08-22 file (delete the old one): owner rulings carried forward verbatim, Q1–Q7 decisions as recorded above with the measured numbers, what tranche 2 is (pre-sim BIS prune from `bisTags`, spec registry + new specs, ticket 201 worker count), fork tip sha, lockfile state.
- Commit `.scratch/stage-gate/finish-the-tab/measurements.md` and the nested plan.
Acceptance: `pnpm verify` green; `ls .scratch/handoffs/wowsims-tab/STATUS-*.md` shows exactly one file; the log entry has six goal-line subsections. Commit to Repo. Do not merge; the orchestrator asks the owner.
Depends on: C12, C14.

## Paths manifest

**Fork clone (`vendor/tbc-new-fork`, branch `feat/upgrades-tab`)**
- `ui/core/components/individual_sim_ui/upgrades_tab.tsx` (Steps 1, 3, 5, 6, 7)
- `assets/locales/en/translation.json` (Steps 1, 3, 5, 6, 7)
- `ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts` (Step 7)
- `ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`, `engine/promotion.ts` (delete), `engine/view.ts`, `engine/disclosure.ts`, `engine/types.ts`, `engine/content-hash.ts` (doc only), `engine/PROVENANCE.md` (Step 7; final list fixed by the nested plan)
- `dist/` (build output, not committed — verify it is gitignored before building: `git -C vendor/tbc-new-fork check-ignore dist`)

**This repo (`feat/finish-the-tab`)**
- `data/wowsims-fork.lock.json` (Step 8)
- `packages/core/test/wowsims-fork-parity.test.ts` (Step 7)
- `.scratch/carry-forward/issues/156-ew2-browser-wasm-throughput-unexplained.md`, `199-tab-candidate-pool-is-not-prefiltered.md`, `205-racing-reuses-nothing-from-the-screen.md`, `206-screening-emits-no-progress.md`, `201-*.md` (Step 9)
- `docs/verification-log.md` (Step 10)
- `.scratch/handoffs/wowsims-tab/STATUS-2026-08-22.md` (delete) and `STATUS-<today>.md` (create) (Step 10)
- `.scratch/stage-gate/finish-the-tab/measurements.md` (create; Steps 0–4, 8) and `.scratch/stage-gate/finish-the-tab/nested/racing-removal/plan.md` (create; Step 7)

No partition: single executor, serial, because the fork clone exists only in the main checkout and Steps 3, 7 and 8 each touch both repos in one sitting.

## Verify recipe

```bash
# this repo
cd /c/Users/dgree/Code/lulz/tbc-gear-prio
pnpm verify                                   # exit 0
pnpm engine-port-drift:check                  # "ok: N ported files match PROVENANCE.md"
pnpm test packages/core/test/wowsims-fork-parity.test.ts   # E-W3 green, not skipped
test "$(git -C vendor/tbc-new-fork rev-parse HEAD)" = "$(python -c "import json;print(json.load(open('data/wowsims-fork.lock.json'))['commit'])")" && echo lockfile-matches
git status --porcelain                        # empty
pnpm issues:open | grep -c '156\|199'         # 0
ls .scratch/handoffs/wowsims-tab/STATUS-*.md  # exactly one file, dated after 2026-08-22
grep -n 'finish-the-tab' docs/verification-log.md   # the new entry heading

# fork clone (start the shell with the C23 recipe; no cd)
F=/c/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork
git -C $F status --porcelain                  # empty
npm --prefix $F run type-check && npm --prefix $F run lint && npm --prefix $F run format
(cd $F && make test)                          # Go tests, once, at the end
grep -c 'upgrades-set-potential-toggle\|upgrades-bis-only-toggle' $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx   # ≥ 2
grep -rc 'screen' $F/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts   # 0 outside frozen hash constants, if Step 7 landed
grep -c 'rankUpgrades(' $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx     # 1
```

Plus the browser observations recorded in `measurements.md` and the verification-log entry (Steps 2, 3, 5, 6): four timed uncapped runs at 3,000 iterations on a foregrounded Brave tab with `visibilityState: visible`, `hardwareConcurrency`, worker count and the http-server `lib.wasm` fetch lines quoted.

## Out of scope

- Pushing the fork, opening a PR, flipping `"pushed": false`, rebasing onto upstream `master`, ticket 251 reconciliation.
- The pre-sim BIS prune (tranche 2). Argument recorded for the owner: it is ~20 tab lines at the `pool:` call site with no engine change, and it is the only lever that reaches the 600 s budget with shipped data (16–17 tagged candidates ≈ 1–2 min); this plan still leaves it out because the owner ruled it tranche 2 and it changes what the shopping list answers.
- New specs, the spec registry refactor, IndexedDB cache, local-sim port (Q3, Q7).
- Raising `DEFAULT_WORKER_COUNT` or fixing `memoryCapFromDeviceMemory` (ticket 201), lowering D7's default, or changing the 5,000-iteration screening observation in ticket 156.
- Porting `candidates` on the `simming` event, `equipmentForCandidateSwap`, or any core change other than racing removal (Q4 table).
- Any `ViewOptions`/`ViewResult` change in the fork's `view.ts` for the two new controls; `pinBis` UI; `hideOwned` UI; raid/boss filters; layout or styling (the owner will tweak later).
- Rebuilding the weighted 0.5x/0.25x set-potential variant.
- Rebuilding `lib.wasm` (no Go changes, C22) unless `make test` demands it.
- Merging to `dev` — the orchestrator asks the owner after the review file exists.
