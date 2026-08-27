# Plan — upgrades-ui-quality (rev 2)

## Goal

The Upgrades / Shopping List tab looks like it belongs to the rest of the sim: controls sit in grouped rows that do not clip, vertical rhythm uses the site's `--block-spacer`/`--gap-width` scale, the results table is deliberately styled on desktop, each UI state (idle, running, done, stale, stopped, error, empty) has a designed presentation whose text-emphasis choices follow a devtools measurement rather than a default, the status/progress area holds a fixed layout so nothing jitters at run start or end, the assumptions drawer keeps every run-provenance and degradation disclosure while its two build-metadata rows move to the console, the slot sub-tabs carry per-tab counts with filter-emptied tabs de-emphasised, and worn items no longer render in the below-cutoff group. All eleven findings of ticket 304 are fixed or explicitly deferred with a stated reason; the fork's own gates (`npm run lint`, `type-check`, `fmt`, `test:locales`) and the main repo's `pnpm verify` are green.

All code paths below are in the gitignored fork checkout `vendor/tbc-new-fork`, branch `feat/upgrades-tab` (C10). A fresh worktree gets it with `pnpm sync:wowsims`.

## Approach

**Chosen: borrow-first, four serial clusters, logic first.** Each visual decision names its source idiom, and where none exists the plan says "invention" outright. Borrowed: `.content-block`/`--block-spacer` rhythm (`_content_block.scss`, `_variables.scss:218-220`), the `badge rounded-pill` chip idiom (`.upgrades-bis-badge`, gear-set chips), the progress-tracker's `width:100%; max-width` bar cap (`_progress_tracker_modal.scss:28-38`), the bulk renderer's divider idiom (`_bulk_sim_result_renderer.scss`). Stated inventions, with no site precedent to borrow: the reserved-width status label (C14), the empty-state icon/heading/CTA treatment (C13 — `dr-no-results` supplies only centering and padding), and the content-sized label/value grid for the drawer. Clusters run **serially, no fan-out**: Steps 2–4 all edit `upgrades_tab.tsx` and `_upgrades_tab.scss`, so parallel-phase's disjointness precondition fails by inspection. Item 7 (logic) is sequenced first so the visual clusters style the corrected row set.

**Strongest rejected alternative:** a single wholesale redesign pass rebuilding the tab around `.content-block` markup in one step. Rejected because it maximizes blast radius on a 1807-line file whose state machine (render via `replaceChildren`, live regions, tab restore) is subtle and review-hardened; incremental cluster commits keep each defect's fix attributable and revertable for the owner's screenshot-per-defect review. The same end markup is reached by Step 2's rhythm work anyway.

**Ticket disposition:** item 2 is folded into **290**, with the design-review point preserved: Step 3a authors 290's design note as its own commit and pauses for orchestrator/owner review before Step 3b implements it. 290 closes when 3b lands. **269** and **270** stay open and untouched (Q1). The empty-slot-tab question (Q3) and any heavier tab grouping are recorded in the 290 note as owner questions, not guessed.

## Open questions

### Q1 — worn items in the below-cutoff group (item 7)

- **Candidate A — render-side drop from the below-cutoff group, count decision stated.** In `rowsTable` (`upgrades_tab.tsx:1333`; `belowCutoffRows` assigned at 1334), exclude `row.owned` when deriving `belowCutoffRows`. The `<summary>` count reads the filtered array (tsx:1444) so the *visible* count follows. The engine's `belowCutoffCount` (view.ts:231; recomputed tsx:1233) is **deliberately left with delta-only semantics and keeps counting owned rows**: C6 shows it has no reader anywhere in the fork UI beyond its own construction, and a code comment at the filter site records that the rendered group is the engine count minus owned rows, so a future consumer is warned rather than surprised. This answers the ticket's "do not just hide them if the count is used elsewhere" warning by measurement: it is used nowhere else. **Win condition, pre-stated:** no consumer of `belowCutoffCount` or of below-cutoff owned rows exists outside `rowsTable`'s render path, so the visible change is confined to the noisy group while shortlist owned rows stay kept-and-greyed (269's rule). **Measured:** `grep -rn belowCutoffCount vendor/tbc-new-fork/ui` → view.ts:49,231 and tsx:1233 only, all construction sites (C6). Wins.
- **Candidate B — engine-side rule** (filter owned in `belowCutoffInView` at view.ts, or a new `ViewOptions` flag). **Win condition:** would win if multiple call sites needed the rule or the count had downstream consumers whose semantics should change together. Same measurement (C6): one render path, zero count consumers — B buys engine surface (and re-opens the `hideOwned` naming trap ticket 269 documents) for nothing. Dropped.
- **Candidate C — wait for the owner ruling blocking 270.** Dropped with reason: 270's ruling concerns the toggle's semantics for shortlist rows; item 7 is the owner's own explicit instruction about below-cutoff noise, so the ruling for this sub-question already exists. A touches neither `hideOwned` (269) nor `greyOwned` (270); both tickets stay open, uncontradicted.

### Q2 — assumptions drawer contents (items 8, 9)

Full enumeration of the drawer (`assumptionsContent()` tsx:1561–1640 plus `substitutionsContent()` ~1660–1667), replacing the refuted three-row taxonomy:

| Row | Category | Fate |
| --- | --- | --- |
| seeds, iterations, max_phase, pool mode | run settings | keep |
| `pool_universe` (file + entry count, tsx:~1577) | **per-run provenance** — varies by spec/phase, discloses fallback-file reads | keep (reworded player-facing: "Item data: Phase 3 set" style, filename retained in the console line too) |
| `ep_weights`, `bis_tags`, `cutoff_basis`, `source_attribution` | degradation disclosures | keep |
| `candidate_cap` | run-setting disclosure that changes result interpretation (neither degradation nor build) | keep |
| substitutions `<dl>` | degradation (dropped candidates) | keep |
| `engine_provenance` (SHA, ~1632), `sim_version` (`api-v<N>`, ~1634) | build metadata — identical for every run of a given build | move to one `console.info` at run completion |

- **Candidate A — split: the two build-metadata rows to console, everything else stays.** **Win condition, pre-stated:** after the change a player reading only the page can still learn every way the run was degraded *and* which data the run consumed (fallback universe file included). Measured against the enumeration above: the two moved rows are invariant per build and disclose nothing about this run (C7-rev). Wins.
- **Candidate B — whole drawer to console.** Loses the win condition by construction — every degradation and provenance disclosure becomes invisible, the silent wrongness the original brief banned. Dropped, stated reason; no further measurement needed beyond the enumeration.
- Layout for what stays (item 8): replace `dl.row col-sm-4/col-sm-8` with `display: grid; grid-template-columns: max-content 1fr; gap: var(--spacer-1) var(--spacer-3)`. **No site idiom exists to borrow for content-sized label/value pairs** — the site's only precedent is the same Bootstrap `dl.row` being replaced — so this is a stated invention, scoped to one selector.

### Q3 — sub-tab strip shape (item 10)

Item 10 asks four things: counts, de-emphasised empty tabs, organisation, batch-UI inspiration. Each is answered below; none is silently dropped.

**Counts and de-emphasis (one mechanism):**
- **Candidate A — badge per tab from the *filtered* view, zero-count tabs de-emphasised.** `renderSubTabs()` already computes the filtered `view` (tsx:1110) and re-runs on every filter/sort change (tsx:1427), while tab *existence* comes from `slotsInView(this.unfilteredView())` (tsx:1135, deliberate per the comment at ~1130–1134). So: badge = that slot's filtered `shortlistForSlot.length` (same filter `slotPaneContent` applies, tsx:1315); a tab whose filtered count is 0 keeps existing (unfiltered view owns existence) but gets a muted treatment plus `(0)`. This resolves the tab/pane disagreement F7 identified: badge and pane read the same view and rebuild in the same call. Badge styling borrows `badge rounded-pill` (gear-set chips / `.upgrades-bis-badge`). **Win condition, pre-stated:** counts and pane contents can never disagree, verified by toggling the BiS-only filter and comparing each badge to its pane's row count. Measured at plan time: tabs and panes are rebuilt by the same `renderSubTabs()` invocation (tsx:894, 1427), so consistency is structural (C8-rev). Wins.
- **Candidate B — badge from the unfiltered view.** Win condition would be badges stable under filters; loses because a badge saying `(3)` over a pane showing 0 rows is a contradiction on screen. Dropped, stated reason.
- **Candidate C — render all 17 equip slots and grey absent ones.** A behaviour change contradicting the recorded design comment (tsx:~1130–1134) and unmeasurable from fixtures — it is a product ruling. Not guessed: recorded as an owner question in the 290 note. Deferred, stated reason.

**Organisation of the strip:**
- **Candidate A — keep canonical slot order, organise by information: Shopping List pinned first, count badges, zero-count tabs muted.** **Win condition:** the strip reads as organised without tabs changing position when a filter toggles. Position stability is structural (order never depends on counts). Wins.
- **Candidate B — order tabs by descending shortlist count.** Win condition would be "most relevant first" outweighing position stability; loses because `renderSubTabs()` re-runs on every filter and sort change (tsx:1427), so tabs would reorder mid-use — a known usability failure — and no site nav orders tabs by content. Dropped, stated reason.
- **Candidate C — split the strip into grouped rows (armor / jewelry / weapons) with headers.** **No site idiom exists for a grouped nav strip** — stated plainly — and inventing one is the failure mode the owner named. Deferred to the 290 note as an owner question, with the A treatment shipped as the baseline. If the owner wants grouping, it is a follow-up ticket.

**Shopping-list pane and batch-UI inspiration:**
- **Candidate A — hero #1 card above siblings.** Win condition, pre-stated: the bulk renderer carries a reusable emphasis idiom. **Measured: it does not** — the 58-line file has dividers and flex ratios, no font-scale or hero rules (C9). A hero card would be a new local idiom. Dropped, stated reason.
- **Candidate B — adopt what the bulk renderer actually has: its divider idiom (`&:not(:last-child)` border + padding) between result groups, inside a `.content-block` with header + count.** Wins by the borrow-first rule; the "clear #1" reading comes from the existing sort order plus the shortlist/below-cutoff split. Chosen.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | `text-muted` is the tab's default styling: exactly 10 uses — every status state, all three empty states, owned rows (which stack `upgrades-row-owned text-muted`) | yes | `grep -n text-muted vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` → 927, 929, 940, 969, 1277, 1294, 1336, 1347, 1483, 1523 |
| C2 | Theme is `$body-bg: #15171e`, `$body-color: #fff`; `--bs-secondary-color` is not overridden, so muted text is Bootstrap 5.3's `rgba(body-color, .75)` | yes | `grep -n 'body-bg\|body-color' vendor/tbc-new-fork/ui/scss/shared/_variables.scss` (250–251); `grep -rn 'secondary-color' vendor/tbc-new-fork/ui/scss` (only `--main-secondary-color`, a different token); bootstrap `^5.3.7`, fork `package.json:34` |
| C3 | Nominal arithmetic: rgba(255,255,255,.75) over #15171e blends to ≈#c4c5c7, contrast **10.36:1**. This is a *reference computation only* — it does not settle the owner's "unreadable" complaint (font size, token differences, or the owned-row `text-muted` stacking could all be what the owner saw). The muted-vs-body decision is made **after** Step 0's devtools read, not from this row | yes | hypothesis until Step 0 measures computed color, font size, and the owned-row stacked case in the browser |
| C4 | Jitter cause (items 5, 11): `render()` swaps whole DOM shapes via `statusElem.replaceChildren` (tsx:892) and the running label + bar share a `flex-wrap` row (`_upgrades_tab.scss:123-129`) so the bar slides as digits grow | yes | `sed -n '885,975p' .../upgrades_tab.tsx`; `sed -n '119,137p' .../_upgrades_tab.scss` |
| C5 | The `width: 6ch` iterations fix exists (`_upgrades_tab.scss:57-60`) yet "3000" clips in the owner's screenshot; whether the rule loses the cascade or 6ch is too small for this font is unmeasured | yes | hypothesis, untested — Step 0 measures the rendered input in devtools before Step 2 picks a fix |
| C6 | `belowCutoffCount` has no reader in the fork UI beyond its construction sites; the below-cutoff `<summary>` count reads the passed array's length | yes | `grep -rn belowCutoffCount vendor/tbc-new-fork/ui` → view.ts:49,231; tsx:1233 only; tsx:1444 |
| C7-rev | Exactly two drawer rows are build metadata (engine SHA ~1632, `api-v<N>` ~1634); `pool_universe` (~1577) is per-run provenance; `candidate_cap` (~1625) is a run-setting disclosure; the substitutions `<dl>` (~1660–1667) is a degradation disclosure | yes | `sed -n '1561,1670p' vendor/.../upgrades_tab.tsx` (full drawer including `substitutionsContent()`) |
| C8-rev | Tab existence comes from `unfilteredView()` (tsx:1135) while pane contents filter the filtered `view` (tsx:1110, 1315); both tabs and panes are rebuilt by the same `renderSubTabs()` call, which re-runs on filter/sort changes (tsx:894, 1427) — so a badge computed from the filtered view inside `renderSubTabs` cannot drift from its pane | yes | `sed -n '1104,1136p' .../upgrades_tab.tsx`; `grep -n 'renderSubTabs()' .../upgrades_tab.tsx` → 894, 1427 |
| C9 | The bulk renderer has a divider idiom and flex ratios but no #1-emphasis (font-scale/hero) idiom to borrow | yes | `cat vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/bulk/_bulk_sim_result_renderer.scss` (58 lines) |
| C10 | Fork checkout present, branch `feat/upgrades-tab` | yes | `git -C vendor/tbc-new-fork branch --show-current` |
| C11 | Desktop table is essentially unstyled: the table rules sit inside `@include media-breakpoint-down(md)` guards | yes | `grep -n media-breakpoint-down vendor/.../\_upgrades_tab.scss` → 49, 69, 236 |
| C12 | Spacing vocabulary: `--spacer-N` < `--block-spacer` (0.75rem) < `--gap-width` (1.5rem); containers are `.content-block`/`-header`/`-title`/`-body` | yes | `sed -n '1,28p' vendor/tbc-new-fork/ui/scss/core/components/_content_block.scss`; `_variables.scss:218-220` |
| C13 | The site's only empty-state precedent, `dr-no-results`, is a visibility switch plus one centering rule over a bare string — **it supplies centering and `--gap-width` padding only; icon, heading, and CTA have no site precedent and are an invention** | yes | `sed -n '89,95p' vendor/tbc-new-fork/ui/scss/core/components/_detailed_results.scss`; `grep -n noResultsTab vendor/tbc-new-fork/ui/core/components/detailed_results.tsx` |
| C14 | Progress-tracker precedent stabilizes the bar with `width:100%; max-width:250px`; it has no reserved-width technique for a changing label — that part is an invention | yes | `sed -n '28,43p' vendor/tbc-new-fork/ui/scss/core/components/_progress_tracker_modal.scss` |
| C15 | Live-run jitter cannot be measured from committed fixtures — fixtures are data, reflow is rendering. Definitional constraint, not a hypothesis; the live browser the owner offered is the instrument | yes | constraint by construction; brief §Constraints 6 |
| C16 | Locale strings live in `assets/locales/en/translation.json` (`upgrades_tab` block at line 855; `en/` is the only locale), validated by `schemas/translation.schema.json` with `additionalProperties: false` and keys `required` at three levels; gated by fork `npm run test:locales` and CI `.github/workflows/run_tests.yml:54`. **Every new key costs three edits: locale JSON, schema (properties + required), call site** | yes | `ls vendor/tbc-new-fork/assets/locales/` → `en/`; `grep -n '"upgrades_tab"' vendor/tbc-new-fork/assets/locales/en/translation.json` → 855; `grep -n additionalProperties vendor/tbc-new-fork/schemas/translation.schema.json`; `grep -n test:locales vendor/tbc-new-fork/package.json` → 25 |
| C17 | `pnpm verify` in the main repo does not lint, typecheck, or test the fork; the fork's own gates are `npm run lint`, `type-check`, `fmt`, `test:locales` | yes | `grep -c vendor C:\Users\dgree\Code\lulz\tbc-gear-prio\package.json` → 0; fork `package.json:16-25` |

## Steps

All fork paths are inside `C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork\`. Precondition for every step: C10 (`pnpm sync:wowsims` if absent). "Fork gates" means `npm run lint && npm run type-check && npm run fmt && npm run test:locales` run inside the fork checkout (C17).

**Step 0 — Baseline measurement.** Start the dev UI, load the ret sim, run the Upgrades tab once. Record in working notes: (a) devtools computed color **and font size** of a muted status line, a muted empty-state div, and an owned row (the `upgrades-row-owned text-muted` stacked case, tsx:1483); (b) the rendered width of `.upgrades-iterations-input` with value 3000 and which rule wins the cascade; (c) baseline screenshots of idle/running/done. *Acceptance:* all three measurements written down with values — this settles C3 and C5 before any conclusion is drawn from them. *Depends:* C10, C3, C5. *Files:* none.

**Step 1 — Item 7 (logic).** In `upgrades_tab.tsx` `rowsTable` (function at 1333), exclude `row.owned` from the `belowCutoffRows` derivation (line 1334). Add the comment recording the count decision: engine `belowCutoffCount` keeps delta-only semantics and still counts owned rows; it has no reader (C6); the rendered group is engine-count minus owned. Touch neither `view.ts` nor `hideOwned`. *Acceptance (can fail):* in a live done run where at least one worn item falls below the cutoff (confirm via devtools that `currentView().rows` contains a row with `owned === true && belowCutoffInView === true`), that item does **not** appear in the rendered below-cutoff table, while an owned *shortlist* row still renders greyed with its `(owned)` suffix; `grep -n hideOwned` in the fork UI is unchanged from the pre-step baseline. *Depends:* C6, Q1-A.

**Step 2 — Cluster: layout/spacing (items 3, 4, 6, CSS half of 5/11).**
- Toolbar (item 3): split `.upgrades-toolbar` into two rows — actions + run inputs; the already-separate `.upgrades-view-controls` group (tsx:514) on its own row — using `.content-block-body`'s column-flex + `--block-spacer` gap idiom (C12). Fix the iterations clip per Step 0(b)'s measurement; the commit message names what was beating the `6ch` rule or that `6ch` was simply too narrow.
- Rhythm (item 4): wrap toolbar, status, results, assumptions in `.content-block` structure (borrowed: `_content_block.scss`); the results block gets a `.content-block-header` with title + row count. Replace `mt-gap` one-offs and `margin-top: var(--spacer-2)` with the block rhythm.
- Status stability (5/11): `.upgrades-status-line` becomes a fixed-shape grid — `grid-template-columns: max-content minmax(0, 200px) max-content`, label cell `min-width` sized in `ch` to the widest running string, `.upgrades-status` given a `min-height` equal to the running state's height. Borrowed: the bar's `max-width` cap (C14). **Invention, stated: the reserved label width — no site precedent exists** (C14).
- Desktop table (item 6): add desktop rules outside the `media-breakpoint-down(md)` guards (C11) — `th, td { padding: var(--spacer-2) var(--spacer-3) }`, narrow explicit widths for Rank/Slot/DPS, majority share to Item, mirroring the mobile block's rationale.
*Files:* `_upgrades_tab.scss`, `upgrades_tab.tsx`. *Acceptance:* at 1280px no control clips with iterations 3000 (screenshot); computed inter-block margins all resolve to `--block-spacer` or `--gap-width` (devtools); desktop table cells show the new padding; fork gates green. *Depends:* C4, C5, C11, C12, C14.

**Step 3a — Author 290's design note (design only, own commit, review point).** Write the seven-state design note ticket 290 asks for: per state (idle, running, done, done+stale, stopped, error, unsupported-spec, plus the three empty variants) what the status line, results area, and controls show and why; the reconciled stopped-message wording; the text-emphasis map (which text stays muted, decided from Step 0(a)'s measurements against WCAG AA 4.5:1); and the two owner questions (empty-slot tabs, grouped strip — Q3 C-candidates). Commit it alone and **stop for orchestrator review before 3b** — this preserves the design-review point that makes 290 a design ticket. *Files:* new note in the main repo (see manifest). *Acceptance:* note covers every 290 "done when" bullet; orchestrator has acknowledged it before 3b starts. *Depends:* C1, C2, C3 (as measured in Step 0), C13.

**Step 3b — Implement the states cluster (items 1, 2).** Per the reviewed note: three distinct empty states (`empty_no_ranking` with "what this is / why empty / press Run" including heading + CTA, `rows_pending`, `empty_no_upgrades`); borrowed: `dr-no-results`' centering + `--gap-width` padding (`_detailed_results.scss:89-95`); **invention, stated: the icon/heading/CTA treatment — no site precedent** (C13). Demote `text-muted` exactly per the note's emphasis map. Change the stopped-state wording to the note's reconciled text. New or changed strings follow C16's three-edit cost: `assets/locales/en/translation.json`, `schemas/translation.schema.json` (properties **and** `required`), call site. *Files:* `upgrades_tab.tsx`, `_upgrades_tab.scss`, `assets/locales/en/translation.json`, `schemas/translation.schema.json`; main repo: close 290. *Acceptance (each can fail):* the served page's state matrix matches the note state-for-state; every muted text's measured contrast ≥ 4.5:1 with the ratio recorded in the commit message; the stopped state's rendered text equals the note's reconciled wording (not the old "rows still simming were skipped"); `npm run test:locales` green; fork gates green. *Depends:* C1, C2, C3, C13, C16.

**Step 4 — Cluster: information design (items 8, 9, 10).** Per Q2-A: move the two build-metadata rows (`engine_provenance`, `sim_version`) to one `console.info` at run completion, keeping `pool_universe`, `candidate_cap`, all degradation rows, and the substitutions list on the page; re-lay the drawer as the content-sized grid (invention, stated — see Q2). Per Q3: count badge per slot tab computed from the filtered view inside `renderSubTabs()` (C8-rev), `badge rounded-pill` idiom; zero-count tabs muted but clickable; canonical order kept with Shopping List pinned first (Q3 organisation-A); results area adopts `.content-block` header + the bulk divider idiom (Q3 pane-B, C9/C12). *Files:* `upgrades_tab.tsx`, `_upgrades_tab.scss`, locale/schema files if badge or console strings are added (C16). *Acceptance (each can fail):* drawer shows neither SHA nor `api-v` but still shows the pool file row; console shows both once on completion; with the BiS-only filter toggled on, every tab badge equals its own pane's rendered shortlist row count (the F7 disagreement case); zero-count tabs render muted; fork gates green. *Depends:* C7-rev, C8-rev, C9, C12, C16.

**Step 5 — Live jitter verification (items 5, 11 acceptance).** In the browser, start a real run; watch start and finish. *Acceptance:* the results table's top edge position (`getBoundingClientRect().top`) is equal before, during, and after the run; the progress bar's left edge is constant while the counter grows from 1 to 3 digits; evidence is a recording or logged rect values. Fixtures cannot measure this (C15, definitional). *Depends:* C4, C15, Step 2.

**Step 6 — Close out.** Run the fork gates (`npm run lint && npm run type-check && npm run fmt && npm run test:locales` in `vendor/tbc-new-fork`) — these are the required gates for every code change in this plan (C17). Run `pnpm verify` in the main repo — it gates only the main-repo ticket/doc edits and is required for pushing those. Tick ticket 304's acceptance boxes; each of item 10's four sub-asks has a disposition (counts: fixed; de-emphasis: fixed for filter-emptied tabs; organisation: fixed via pinned-first + badges + muting, with grouping deferred to the 290 note; batch inspiration: divider/content-block adopted, hero dropped with reason). Close 290. Commit fork work on `feat/upgrades-tab`; main-repo edits on the current branch. *Acceptance:* all named gates green; every 304 checkbox ticked or carrying its deferral line (deferrals: empty-slot tabs and grouped strip, both owner questions in the 290 note).

## Paths manifest

Fork (`vendor/tbc-new-fork`, branch `feat/upgrades-tab`):
- `ui/core/components/individual_sim_ui/upgrades_tab.tsx` — modify (steps 1, 2, 3b, 4)
- `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` — modify (steps 2, 3b, 4)
- `assets/locales/en/translation.json` — modify (steps 3b, 4; `upgrades_tab` block at line 855)
- `schemas/translation.schema.json` — modify (steps 3b, 4; every new key added to `properties` and `required`)

Main repo (`C:\Users\dgree\Code\lulz\tbc-gear-prio`):
- `.scratch/carry-forward/issues/304-upgrades-tab-ui-quality-pass.md` — modify (step 6)
- `.scratch/carry-forward/issues/290-design-the-upgrades-tab-state-presentations.md` — modify (close, step 6)
- `.scratch/carry-forward/notes/upgrades-tab-state-design.md` — create (step 3a; `docs/adr/` instead only if the note sets cross-tab precedent, per 290's own wording)

Not touched: `ui/core/components/individual_sim_ui/upgrades/engine/view.ts`, tickets 269 and 270.

**Partition:** none — single executor, serial (Steps 2–4 share both primary files; disjointness fails by inspection).

## Verify recipe

```
pnpm sync:wowsims                                   # if fork absent
git -C vendor/tbc-new-fork branch --show-current    # feat/upgrades-tab

# Required gates for the fork code (C17) — run inside vendor/tbc-new-fork:
npm run lint
npm run type-check
npm run fmt
npm run test:locales

pnpm verify                                         # main repo — gates the ticket/doc edits

grep -rn belowCutoffCount vendor/tbc-new-fork/ui    # still only view.ts:49,231 and tsx:1233 (construction)
grep -n text-muted vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx
#   compare this enumeration line-by-line against the design note's emphasis map:
#   every remaining use must be one the note lists as deliberately secondary
```

Plus the live checks fixtures cannot carry: Step 0's measurements recorded; Step 1's owned-row observation; Step 5's jitter evidence; the contrast ratios in Step 3b's commit message.

**Orchestrator note on running the fork gates:** the `node_modules/.bin/` shims
fail in this environment with an fnm error; invoke each tool's entry point
through `node` directly instead. Measured commands and results are in
`fork-gates.md` beside this plan — `node ./test-locales.mjs` and
`node ./node_modules/stylelint/bin/stylelint.mjs <path>` both exit 0 on the tree
at stage open. The oxlint and tsc invocations are untested; resolve them the
same way.

## Out of scope

- Any change to `hideOwned` / `greyOwned` semantics, to the fork's `engine/view.ts`, or to `packages/core` in the main repo — tickets 269 and 270 stay open and untouched.
- Rendering tabs for empty/absent slots and grouping the tab strip into sections — both deferred as owner questions in the 290 design note (Q3 candidates C), with stated reasons.
- A hero/#1-emphasis card in the shopping list — dropped: no site idiom to borrow (C9).
- The progress bar's stage semantics (ticket 281, closed) — only its position stabilizes.
- New sorting, filtering, or engine behaviour beyond Step 1's render filter.
- Non-`en` locales (none exist, C16).
- Merging anything to `dev`; committing the fork checkout into the main repo.
