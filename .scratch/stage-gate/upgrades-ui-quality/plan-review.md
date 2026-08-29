# Plan review — upgrades-ui-quality

VERDICT: revise

Reviewer seat, Opus. Findings verified against the fork checkout at
`vendor/tbc-new-fork` (branch `feat/upgrades-tab`).

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| F1 | blocking | Q1 Candidate A, Step 1, C6 | The measurement C6 makes is real but the **inference is wrong**. C6 shows no *external* consumer of `belowCutoffCount`, and the plan concludes "the change alters exactly the noisy group and nothing else". But `rowsTable` derives `belowCutoffRows` from `allRows`, and `allRows` is the same array the *shortlist* is drawn from. Filtering `row.owned` out of `belowCutoffRows` leaves `belowCutoffCount` (view.ts:231, `rows.length - shortlist.length`) and the recomputed one at tsx:1233 **still counting owned rows**. The plan asserts "the `<summary>` count already comes from the filtered array's `rows.length` (tsx:1444), so the shown count self-corrects" — true for the summary only. Step 1's own acceptance criterion ("the `<summary>` count matches the visible rows") is therefore satisfied *vacuously*: `<summary>` reads `rows.length` of the array passed in, so it can never disagree with the rows rendered from that same array, before or after the change. The criterion cannot fail and proves nothing. Meanwhile `belowCutoffCount` becomes silently wrong. The ticket explicitly warned: "Do not just hide them if the count is used elsewhere — `belowCutoffCount` is derived at `view.ts:227`." | `grep -rn belowCutoffCount vendor/tbc-new-fork/ui` → view.ts:49,231; tsx:1233. `sed -n '1333,1360p' upgrades_tab.tsx`; `sed -n '1444p'` |
| F2 | blocking | C7, Q2 Candidate A, Step 4 | C7 claims "exactly three drawer rows are build metadata". Refuted on two counts. (a) Only **two** are — `engine_provenance` (SHA, ~1632) and `sim_version` (~1634). The third, `pool_universe` (~1577, filename + entry count), varies **per run** by spec and phase: it identifies which data file this run consumed, not which build produced it. Moving it to console removes a run-provenance disclosure, and Q2-A's own win condition is "a player can still learn every way the run was degraded" — a run against a fallback or wrong-phase universe is exactly such a case. Candidate A fails its own win condition, invisibly, because C7 miscategorised the row. (b) The evidence range is wrong: `sed -n '1550,1650p'` does not cover the drawer — a second `<dl>` for substitutions renders at ~1660–1667, plus `candidate_cap` (~1625) which is neither degradation nor build metadata. | Enumeration of `assumptionsContent()`; rows 1561–1635 plus `substitutionsContent()` 1660–1667 |
| F3 | material | C3, Step 3, item 1 | The plan reframes finding 1 from "unreadable grey" to "a *hierarchy* failure, not a WCAG failure" — and C3 is marked **`hypothesis, untested`** and **`Load-bearing: no`**. It is load-bearing: it is the sole basis for the reframe, and Step 3's implementation follows from the reframe rather than any measurement. The arithmetic is also off: rgba(255,255,255,.75) over #15171e blends to #c4c5c7 (correct) but contrast is **10.36:1, not ≈9.8:1**. More substantively: the owner said the grey is unreadable. A ratio computed from a nominal token cannot settle that — the owner may be reading a smaller font size, a different muted token, or the greyed owned-row stacking `text-muted` on `.upgrades-row-owned`. Step 0 schedules the devtools read, which is right, but the plan wrote the conclusion ahead of it. | WCAG computation; `grep -n text-muted upgrades_tab.tsx` → 1483 stacks `upgrades-row-owned text-muted` |
| F4 | blocking | Paths manifest, Step 3 | The i18n path is not a placeholder needing delegation — it is **wrong**. `ui/core/i18n/` does not exist. The resolution recipe `grep -rln upgrades_tab.results ui/` returns nothing (the key is nested JSON, not a literal string). Locale data is `assets/locales/en/translation.json`, validated by an Ajv schema (`schemas/translation.schema.json`) with `additionalProperties: false` **and** the key listed in `required` at three levels, run by the fork's `npm run test:locales` and wired into CI at `.github/workflows/run_tests.yml:54`. Adding one empty-state string therefore touches the locale JSON, the schema, and the call site. An executor following the manifest runs a grep yielding nothing, in a directory that does not exist. Stalls Step 3 outright. | `ls vendor/tbc-new-fork/ui/core/i18n` → No such file or directory; `ls vendor/tbc-new-fork/assets/locales/en/` → translation.json et al.; `grep -n additionalProperties schemas/translation.schema.json` |
| F5 | blocking | Step 6, Verify recipe, brief constraint 7 | `pnpm verify` in the main repo **does not typecheck, lint, or test the fork**. Its sub-checks are main-repo codegen/data gates; nothing in `package.json` references `vendor/` or `tbc-new-fork`. Since every code change lands in the fork, "`pnpm verify` green" passes no matter what the executor writes — a vacuous verify recipe. Step 6 hedges with "if the fork defines one", leaving the real gate optional. It does define one: `npm run lint` (oxlint + stylelint), `npm run type-check`, `npm run fmt`, `npm run test:locales`. These should be named, not left to discretion; `test:locales` is mandatory given F4. | `grep -c vendor package.json` → 0; fork `package.json` scripts block |
| F6 | material | C13, Approach, Step 3 | C13 calls `dr-no-results` "the site's empty-state precedent … a dedicated pane". What it actually is: a visibility switch plus one rule — `#noResultsTab { display:flex; justify-content:center; align-items:center; padding: var(--gap-width); font-size:1rem; }` — over a `<div>` holding one translated string. No icon, no heading, no CTA, no container styling. Step 3 asks for "icon+heading" empty states using "the `dr-no-results` idiom". The idiom cannot supply icon or heading because it has neither. The borrow is nominal: the executor will invent the treatment locally while the plan records it as borrowed — precisely the failure mode brief constraint 1 exists to prevent. C14 handles this honestly for label-width; C13 does not. | `sed -n '89,95p' _detailed_results.scss`; `sed -n '127,129p' detailed_results.tsx` |
| F7 | material | C8, Step 4 | C8 says per-slot counts need no new plumbing. But tabs are built in a different scope from panes, and from a **different view**: `renderSubTabs` derives slots from `slotsInView(this.unfilteredView())` — deliberately — while `slotPaneContent(slot, view)` filters the **filtered** `view`. With the BiS-only toggle on, a tab exists whose pane shows zero rows. The plan does not say which view the count reads. From the unfiltered view the badge contradicts the pane; from the filtered view badges read `(0)`, resurrecting the empty-tab question deferred as out of scope (Q3-B). Step 4's acceptance, "the count equals the pane's shortlist rows", is unachievable under the BiS filter without deciding this. | `sed -n '1130,1170p' upgrades_tab.tsx`; tsx:1319; tsx:1226–1233 |
| F8 | material | Approach ¶3 vs Steps | Cross-reference errors that misdirect an executor. (a) Approach says item 2 is folded into 290 and "**Step 5** produces the design note" — the states cluster is **Step 3**; Step 5 is live jitter verification. (b) Approach says "the same end markup is reached by **Step 3**", but the `.content-block` wrapping is Step 2's rhythm bullet. (c) Q3-A cites the empty-tab comment at "tsx:1130–1136"; it is ~1130–1134 with `slotsPresent` at 1135. (d) Q1-A cites `rowsTable` at "1354–1359"; the function starts at 1333 and `belowCutoffRows` is assigned at 1334, 1359 being the `expandableRowGroup` call. An executor told to edit "1354–1359" will not find the filter site. | `grep -n "rowsTable(" upgrades_tab.tsx` → 1333; `grep -n belowCutoffRows` → 1334, 1335, 1359 |
| F9 | material | Step 3 | Step 3 bundles four separable jobs into one step with one acceptance block: authoring 290's seven-state design note, reconciling the stopped-message wording (290's own second "done when"), implementing three empty states, and re-auditing every `text-muted` use. 290 is a **design** ticket whose output is meant to be reviewable before implementation; folding authorship and implementation into one step removes the review point that made it a design ticket. Brief constraint 4 asked fold-vs-supersede and the plan answers "folded", but folding a design gate into an implementation step is closer to superseding. Also 290's "done when" includes the stopped-message wording; Step 3's acceptance mentions it only inside the note, never in the implementation, so it may be designed and not changed. | Plan Step 3; ticket 290 "Done when" bullets 2–3 |
| F10 | material | Findings coverage | Enumerating all eleven: 1→Step 3 ✓; 2→Step 3 ✓; 3→Step 2 ✓; 4→Step 2 ✓; 5→Step 2+5 ✓; 6→Step 2 ✓; 7→Step 1 ✓; 8→Step 4 ✓; 9→Step 4 ✓; 11→Step 2+5 ✓. **Item 10 is partially dropped.** The ticket asks four things: counts per tab, de-emphasised empty tabs, **"Organise them, rather than one long wrapping strip"**, and batch-UI inspiration. The plan delivers counts (Q3-A), defers empty tabs (Q3-B, stated), addresses batch inspiration (dropped with reason). The **organisation/grouping** sub-ask appears nowhere in Q3, the Steps, or Out of scope — silently dropped, not deferred. Since Q3-A's win condition is "no behaviour change", the strip stays exactly the long wrapping strip the owner complained about. Step 6's acceptance cannot be met for item 10. | Ticket 304 §10, four bullets; plan Q3, Step 4, Out of scope |
| F11 | minor | C15, Step 5 | C15 is marked `hypothesis, untested` but is not a hypothesis — "fixtures are data, reflow is rendering" is definitional, and the plan itself calls it "inherent". Labelling a definitional constraint as untested muddies the register: a reader scanning for untested rows gets a false positive here and (per F3) a false negative on C3. | Plan C15 row |
| F12 | minor | Verify recipe | `grep -c text-muted … # < 10` encodes the target as a comment, not a command. The count is a weak proxy: Step 3 could satisfy "< 10" by deleting one muted use while leaving the hierarchy failure intact. The measurement that matters (which text is muted) is not the count. | Plan verify recipe |

## Register verdicts

| Claim | Verdict | Evidence |
| --- | --- | --- |
| C1 | stands | `grep -n text-muted upgrades_tab.tsx` → exactly 10 hits at 927, 929, 940, 969, 1277, 1294, 1336, 1347, 1483, 1523 |
| C2 | stands | `_variables.scss:250-251`; only `--main-secondary-color` in `_global_old.scss:6` (different token); bootstrap `^5.3.7` |
| C3 | refuted (in part) | Blend #c4c5c7 confirmed; ratio is **10.36:1**, not 9.8:1. Marked not-load-bearing but is the sole basis for reframing finding 1 — see F3 |
| C4 | stands | `_upgrades_tab.scss:123-129`; `.upgrades-progress` 133-137; tsx:892 |
| C5 | stands | `_upgrades_tab.scss:57-60`. Correctly flagged untested |
| C6 | stands (measurement) / refuted (inference) | Grep matches exactly. But "alters exactly the noisy group and nothing else" is false and the acceptance criterion is vacuous — see F1 |
| C7 | refuted | Two are build metadata; `pool_universe` is per-run provenance. Range excludes the substitutions `<dl>` and omits `candidate_cap` — see F2 |
| C8 | refuted | Tabs build from `unfilteredView()` (tsx:1135); panes filter `view` (tsx:1319). Under BiS filter they disagree — see F7 |
| C9 | stands | Full 58-line file read: divider + flex ratios, one `grid-template-columns: 3fr 2fr`. No `font-size`, no hero emphasis. Candidate correctly dropped |
| C10 | stands | `git -C vendor/tbc-new-fork branch --show-current` → `feat/upgrades-tab` |
| C11 | stands | `grep -n media-breakpoint _upgrades_tab.scss` → 49, 69, 236; table block at 236 is mobile-guarded |
| C12 | stands | `_content_block.scss:1-28`; `_variables.scss:218-219` → `--block-spacer: 0.75rem`, `--gap-width: 1.5rem` |
| C13 | refuted | A visibility toggle plus one centering rule over a bare string; no icon, heading, or CTA to borrow — see F6 |
| C14 | stands | `_progress_tracker_modal.scss:28-38`; the plan honestly labels the reservation an invention |
| C15 | stands | Correct as a constraint, though mislabelled — see F11 |

## Approach verdict

The borrow-first framing is right and matches the brief. The serial-not-fan-out
call is **sound and correctly evidenced**: Steps 2, 3, and 4 all edit
`upgrades_tab.tsx` and `_upgrades_tab.scss`, so the disjointness precondition
genuinely fails by inspection. Sequencing item 7 first is also correct.

What the plan does not survive is its own evidence. Three register rows that let
it drop a candidate or declare a step safe (C6's inference, C7, C8) do not hold,
and one path in the manifest does not exist. The two remaining defects that make
this `revise` rather than `sound`: the verify recipe's main-repo gate cannot see
any of the code being changed (F5), and item 10's organisation sub-ask is dropped
without a deferral line (F10), which Step 6's own acceptance then cannot satisfy.

## Orchestrator's independent verification

Two blocking findings re-checked directly rather than taken on the reviewer's word:

- **F4 confirmed.** `ls vendor/tbc-new-fork/ui/core/i18n` → no such directory.
  `ls vendor/tbc-new-fork/assets/locales/en/` → `character.json`, `talents.json`,
  `translation.json`, `updates.json`. A separate independent check confirmed the
  schema's `additionalProperties: false` plus three-level `required` listing, and
  the CI wiring at `.github/workflows/run_tests.yml:54`.
- **F5 confirmed.** `grep -c vendor package.json` → `0`. The fork's own
  `package.json` defines `lint` (oxlint + stylelint), `type-check`, `fmt`, and
  `test:locales`.

---

# Re-review of rev 2 (round 2)

VERDICT: sound

Scoped to changed claims, as the stage-gate contract directs. Claims marked
`stands` in round 1 were not re-litigated.

## Blocking findings

- **F1 — resolved (not merely reworded).** The acceptance criterion is now
  genuinely falsifiable: it requires establishing the precondition (devtools
  confirmation that `currentView().rows` holds a row with
  `owned === true && belowCutoffInView === true`) before checking the
  postcondition. The old criterion compared an array's length against rows
  rendered from that same array — a tautology. The new one can fail two ways:
  the precondition row exists and still renders, or no such row can be produced
  at all. The predicate is well-formed against source: `owned?: boolean`
  (rank.ts:246) is set only when true (rank.ts:796, 892), and `currentView()`
  is a real method (tsx:1193).
  On "leave the count wrong but comment it" — defensible, and deliberately not
  re-blocked. Round 1's F1 was not that leaving the count is indefensible; it
  was that the plan drew a false conclusion from a true measurement and hid the
  divergence behind a vacuous check. Rev 2 states the divergence as a decision,
  names the semantics kept, cites the measurement licensing it (C6), and
  requires a comment at the filter site. Changing `belowCutoffCount` means
  touching `view.ts`, which the plan keeps out of scope to avoid re-opening
  269/270. With zero readers, a stated-and-commented divergence is the smaller
  trap.
- **F2 — resolved.** C7-rev's enumeration is complete and correctly
  categorised, verified against `sed -n '1561,1680p'`. The cited range now
  covers `substitutionsContent()` (invoked ~1637, defined ~1650), which
  1550–1650 did not. Independent corroboration: the schema's `assumptions`
  `required` array lists exactly these 22 keys, so no row can have been missed.
  `pool_universe` kept as per-run provenance is right — the source comment at
  ~1578 says it records which bundled file the run drew from.
- **F4 — resolved.** C16 is exact on every checkable point: `translation.json:855`,
  `en/` the only locale, `additionalProperties: false`, three-level `required`
  (`upgrades_tab.assumptions` ~8976, `upgrades_tab` ~8980, root ~8984), and CI
  at `.github/workflows/run_tests.yml:54` verbatim. The three-edit cost is
  propagated into Steps 3b, 4 and the Paths manifest.
- **F5 — resolved.** C17 stands. The recipe names the four fork gates as
  required, and Step 6 scopes them correctly: fork gates cover the code,
  `pnpm verify` covers only the main-repo ticket/doc edits.
- **F10 — resolved.** All four sub-asks carry a disposition, and organisation is
  genuinely answered: pinned-first, count badges, muted zero-count tabs,
  canonical order. Only the heavier grouped-rows form is deferred, for the
  verified reason that no site idiom exists for a grouped nav strip. Candidate B
  (order by count) is dropped on a mechanical reason confirmed at tsx:1427.

## Material findings

F3, F6, F7, F9, F11, F12 — all resolved; see the round-2 detail retained in the
orchestrator's summary. F8 resolved except one stale cite: C13's Verified-by
named a `detailed_results/` subdirectory that does not exist.

## Verdict

No finding still blocks. Nothing new was introduced by rev 2 beyond the C13 path
typo. Every claim that lets the plan drop a candidate or skip work is now
measured; the two that cannot be settled at plan time (C3, C5) are labelled as
such with a step that settles them before anything depends on them.

## Orchestrator follow-up

- **C13 path typo fixed.** Verified independently: the file is
  `ui/scss/core/components/_detailed_results.scss`; the
  `detailed_results/_detailed_results.scss` form does not exist. Corrected in
  plan.md.
- **All four fork gates measured** after the re-review, resolving the plan's
  "oxlint and tsc untested" caveat. `type-check` exits 0 clean;
  `lint:js` exits 0 with pre-existing warnings in unrelated files
  (`ui/shaman/inputs.ts`). Commands and baseline noise recorded in
  `fork-gates.md`.
