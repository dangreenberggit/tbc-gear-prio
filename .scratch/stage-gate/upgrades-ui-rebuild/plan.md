# Plan — upgrades-tab-ui-rebuild

Round 2, after four investigations. Written by the `gate-planner` seat; this
file is its final message verbatim.

## Goal

The Upgrades tab's run configuration lives in a sticky settings card in a right
panel, copied from the Bulk tab's structure: count readout, primary Run action,
then the config controls (Iterations, Candidates, BiS-prune, Phase) as real
picker rows that wrap normally. The post-run view controls (Set potential, BiS
only, Content) sit directly above the results they filter, with short
control-name labels, preserving the anti-jitter height reservation. Rows with
set context show how much of their figure is set bonus (ticket 313). A
ThatsMyBis export box lives with the results and tracks the displayed rows in
displayed order (ticket 314). A dropped candidate shows only the first line of
its error, not a raw Go stack trace (ticket 311, presentation half). The inline
status line is unchanged. All fork gates stay green.

## Approach

Copy the Bulk tab's two-pane settings-card structure, as the owner decided
(ticket 312 "Owner's direction — decided"). This plan does not relitigate that.

**The structural risk the brief flagged is resolved: the split is small.**
Verified in the fork: `UpgradesTab extends SimTab` (`upgrades_tab.tsx:300`), so
`this.contentContainer` **is** the `.tab-pane-content-container`, and the tab
already renders a `.upgrades-tab-left tab-panel-left` (`upgrades_tab.tsx:389`).
There is no `.tab-panel-right`. Adding one is appending a sibling
`<div className="upgrades-tab-right tab-panel-right">` inside `contentContainer`
— exactly Bulk's shape (`bulk_tab.tsx:107,155`) — and the responsive collapse
comes free from `_sim_tab.scss` (`.tab-pane-content-container` flex, column
below `xl`).

**Pickers are the real mechanism, not a markup imitation.**
`BooleanPicker`/`EnumPicker`/`NumberPicker` extend `Input<ModObject, T>` with no
`Sim`/`Player` constraint (`ui/core/components/input.tsx:11-44`), and Bulk
already binds them to plain component state:
`new BooleanPicker<BulkTab>(div, this, {...})` with
`changedEvent: _modObj => this.settingsChangedEmitter`, a bare
`TypedEvent<void>` field (`bulk_tab.tsx:47, 667-818`). `UpgradesTab` does the
same. The one exception is the Phase selector: `makePhaseSelector`
(`other_inputs.ts:77-91`) is a `Sim`-bound `EnumPicker` deliberately surfacing
the page's shared phase (`upgrades_tab.tsx:588-592`) — it moves as-is, never
converted to tab-owned state.

**The known silent break this plan defuses explicitly:** the toolbar SCSS keys
rules two ways. `_upgrades_tab.scss:17-24` nests
`.upgrades-run-controls, .upgrades-view-controls` **inside** `.upgrades-toolbar`
(flex-wrap, gap, row-gap) — those rules stop applying the moment either row
leaves the toolbar ancestor, with no error. `_upgrades_tab.scss:44+` is a
**top-level** block for the same two classes (input widths, `8ch`, touch
targets), which survives a move. Slices 2 and 3 move the two rows to *different*
parents, so every selector that names them together must be split, per slice,
with a screenshot acceptance check that the moved row's gap/wrap still applies.

Rejected alternative: keeping everything in the left panel and only regrouping
rows in place (direction A). It lost because the owner chose C, and because the
card gives the label-wrap and Run-primacy fixes structurally instead of via
per-row CSS surgery.

One deliberate divergence from a literal Bulk copy, carried from the chosen
proposal: the running state stays on the inline status line
(`upgrades_tab.tsx:529-561` — the live-region machinery is deliberate and
commented); no progress modal. And the view controls move to the results, which
Bulk has no equivalent for.

**Formatter reuse caveat the original tickets got wrong (both since corrected to
match this plan's findings):** `firstLineOf`, `wowsimsItemIdsJson`,
`formatSetPotentialLine`, and `SET_POTENTIAL_WEIGHTS` live in the main repo's
`packages/core/src/rank-report*.ts` and are **not present anywhere in the fork's
`ui/`** (C7). The tab cannot import them, and the engine port dir is byte-gated,
so they are re-implemented locally in `upgrades_tab.tsx` (each under ten lines),
with a comment naming the report-path original — the same "deliberate drift"
pattern already used at `upgrades_tab.tsx:1840-1852`. `SET_POTENTIAL_WEIGHTS`
does **not** apply on this surface at all: the fork's view ranks on raw
`prospectiveBonusDps` (`view.ts:169-172`) and the row displays raw `deltaDps`
(`upgrades_tab.tsx:1606`), so the number ticket 313 shows is the raw prospective
bonus, which reconciles exactly with what the toggle adds to the sort — no
discount, and none must be claimed. Ticket 313's text now agrees.

## Claims register

All commands run from repo root `C:\Users\dgree\Code\lulz\tbc-gear-prio` (Git
Bash); `$F` = `vendor/tbc-new-fork`. Rows marked "investigator" were verified by
a dispatched investigator this stage and are re-runnable as written.

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | `UpgradesTab extends SimTab`; `SimTab` creates `contentContainer` with class `tab-pane-content-container` | yes | `grep -n "class UpgradesTab extends" $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx` (line 300); `grep -n "tab-pane-content-container" $F/ui/core/components/sim_tab.ts` |
| C2 | The tab already has `.tab-panel-left` (`upgrades-tab-left`, `upgrades_tab.tsx:389`) and no `.tab-panel-right`; Bulk appends both as siblings in `contentContainer` (`bulk_tab.tsx:107,155`) | yes | `grep -n "tab-panel" $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx $F/ui/core/components/individual_sim_ui/bulk_tab.tsx` |
| C3 | `.tab-pane-content-container` (`ui/scss/core/components/_sim_tab.scss:1-44`) provides the flex layout and the below-`xl` column collapse for both panels | yes | `sed -n '1,45p' $F/ui/scss/core/components/_sim_tab.scss` |
| C4 | Bulk's card idiom: `.bulk-settings-outer-container` sticky at `top: var(--sim-header-height)`, `.bulk-settings-container` bordered grid (`_bulk_tab.scss:11-23`); count readout + primary button inside (`bulk_tab.tsx:156-161`) | yes | `sed -n '11,23p' $F/ui/scss/core/components/individual_sim_ui/_bulk_tab.scss`; `sed -n '155,162p' $F/ui/core/components/individual_sim_ui/bulk_tab.tsx` |
| C5 | The seven run controls and the three view controls render statically in `buildTabContent` (`upgrades_tab.tsx:458-528`); `statusRef`/`resultsRef`/`assumptionsRef` are permanent siblings updated by `replaceChildren` (comments at `:529-561`) | yes | `sed -n '455,570p' $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx` |
| C6 | View controls: three labels with `d-none` children inside `.upgrades-view-controls` (`upgrades_tab.tsx:514-527`); `refreshViewControlVisibility` at `:1038-1049`, gate `this.state.kind !== 'done'` | yes | `grep -n "refreshViewControlVisibility" $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx`; `sed -n '1038,1049p'` same file (investigator, I2) |
| C7 | None of `firstLineOf` / `wowsimsItemIdsJson` / `formatSetPotentialLine` / `SET_POTENTIAL_WEIGHTS` exist in the fork's `ui/` | yes | `grep -rln "firstLineOf\|wowsimsItemIdsJson\|SET_POTENTIAL_WEIGHTS\|formatSetPotentialLine" $F/ui/` → no output |
| C8 | The fork's view ranks on raw `prospectiveBonusDps` (no weight discount), zeroed when confounded; the row displays raw `deltaDps` | yes | `sed -n '160,180p' $F/ui/core/components/individual_sim_ui/upgrades/engine/view.ts`; `grep -n "formatDelta(row.deltaDps)" $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx` (line 1606) |
| C9 | The stack trace renders as `{s.detail}` in the substitutions list (`upgrades_tab.tsx:1783`, `dd` element); JSX auto-escapes | yes | `sed -n '1778,1788p' $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx` |
| C10 | `firstLineOf`'s exact behavior: split on `\r?\n` or literal `\n` pair, append a truncation suffix when trimmed | yes | `sed -n '154,157p' packages/core/src/rank-report.ts` |
| C11 | `wowsimsItemIdsJson` emits `{"items":[{"id":…}]}` two-space indented; report's `updateExport` dedupes via a `seen` map and exports **displayed** order, deliberately not slot grouping (comment `rank-report.ts:873-876`) | yes | `sed -n '452,462p' packages/core/src/rank-report-rules.ts`; `sed -n '873,890p' packages/core/src/rank-report.ts` |
| C12 | The tab has a single `applyView` call site (`currentView()`, `upgrades_tab.tsx:1221`) plus a tab-local BIS filter (`applyBisFilter`, `:1253`) — the displayed rows and their order come from there | yes | `grep -n "currentView\|applyBisFilter" $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx` |
| C13 | Fork gates and working invocations are as recorded in `.scratch/stage-gate/upgrades-ui-quality/fork-gates.md`; `.bin` shims fail with fnm error; all gates green at stage open | yes | Re-run the table commands from `$F` after the PATH pin in `docs/agents/known-traps.md` |
| C14 | New UI strings: only **one** locale exists (`assets/locales/en/`); `test-locales.mjs:37-73` validates each found `translation.json` against the schema independently and does not diff locales; the schema is `additionalProperties:false` with per-group `required` arrays | yes | `ls $F/assets/locales/`; `node ./test-locales.mjs` from `$F` → "validated 3 locale file(s)" (investigator, I3) |
| C15 | The scoped fmt gate covers the ten files in `.scratch/stage-gate/tickets-306-308/fmt-owned-files.txt`, including `upgrades_tab.tsx`; none of this plan's files are under `upgrades/engine/**` or `upgrades/data/**`, so no PROVENANCE cycle arms | yes | `cat .scratch/stage-gate/tickets-306-308/fmt-owned-files.txt`; compare against Paths manifest |
| C16 | A fork commit that touches nothing ported still requires re-pin steps 3–5 of the ported-file cycle (fork commit → move `data/wowsims-fork.lock.json` pin → `pnpm sim-implemented-effects:generate` → `pnpm verify`) | yes | `docs/agents/known-traps.md` § "Before editing a ported engine file", last line |
| C17 | `.upgrades-view-controls` holds `min-height: 2.25rem` deliberately (anti-jitter); the `8ch` iterations rule and inline-label flex squeeze are as ticket 312 records (`_upgrades_tab.scss:40-42`, `:50-61`, `:90-93`) | no | hypothesis from ticket 312's investigation — executor confirms with `sed -n '40,95p' $F/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` before slice 2 |
| C18 | Toolbar breakpoint rules (`_upgrades_tab.scss:66-68`, `102-124`) are disjoint from the results-table rules (`:333-424`) that ticket 310 owns | yes | hypothesis from ticket 312's investigation (static-analysis claim); executor re-confirms with the same `sed` before deleting any toolbar rule |
| C19 | The Phase selector is `makePhaseSelector` (`other_inputs.ts:77-91`), an `EnumPicker<Sim>` bound to `sim.phaseChangeEmitter`/`getPhase`/`setPhase`, mounted into `phaseSelectorRef.value!` at `upgrades_tab.tsx:592`; it deliberately surfaces the page's shared phase (comment `:588-591`) | yes | `sed -n '77,91p' $F/ui/core/components/inputs/other_inputs.ts`; `sed -n '588,592p' $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx` (investigator, I2) |
| C20 | `setContext` fields (`prospectiveBonusDps`, `crossesThreshold`, `prospectiveBonusBreaks`, `setName`, `piecesWornBefore/AfterSwap`, `nextThreshold`) exist on the fork's `RankedItem` (`engine/rank.ts:257`, `:1422-1443`) | yes | `grep -n "setContext" $F/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` |
| C21 | Pickers bind to plain component state: `Input<ModObject, T>` has no `Sim`/`Player` constraint (`ui/core/components/input.tsx:11-44`); Bulk binds `BooleanPicker<BulkTab>` to `this` with a bare `TypedEvent<void>` (`bulk_tab.tsx:47, 667-818`) | yes | `sed -n '11,44p' $F/ui/core/components/input.tsx`; `grep -n "settingsChangedEmitter" $F/ui/core/components/individual_sim_ui/bulk_tab.tsx` (investigator, I1) |
| C22 | All seven run-control refs are plain field references with no `closest()`/sibling/parent traversal; read sites: run `:571/:594-598/:910/:1312`, stop `:572/:616-618/:836/:874/:911`, import `:573/:625-627`, iterations `:574/:736`, candidates `:575/:678/:685-687/:787`, bisPrune `:578/:610/:677/:684/:707/:720`, phase `:511/:592` — a JSX move breaks no listener | yes | `grep -n "runButton\|stopButton\|importButton\|iterationsInput\|candidatesInput\|bisPrune\|phaseSelectorRef" $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx` (investigator, I2) |
| C23 | `_upgrades_tab.scss:17-24` nests `.upgrades-run-controls, .upgrades-view-controls` rules **inside** `.upgrades-toolbar` (flex-wrap/gap/row-gap — silently lost on re-parenting); `:44+` is a top-level block for the same classes (widths, `8ch`, touch targets — survives a move) | yes | `sed -n '14,50p' $F/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` (investigator, I2; independently re-verified by the orchestrator) |
| C24 | Sticky works in this tab: `--sim-header-height` is on `:root` (`ui/scss/core/sim_ui/_shared.scss:1-7`); `.sim-ui` (`overflow-y:auto; max-height:100vh`, `_shared.scss:14-17`) is the only ancestor with overflow between root and card, and Bulk/Upgrades share the identical chain via `SimTab` (`sim_tab.ts:33-35`). Residual untested corner: a stray `overflow` on Bootstrap's own `.tab-content` (none found in this repo's SCSS) | yes | `sed -n '1,17p' $F/ui/scss/core/sim_ui/_shared.scss`; `grep -rn "overflow" $F/ui/scss/core/components/_sim_tab.scss` (investigator, I5) |
| C25 | Locale facts for new keys: existing `upgrades_tab.view.*` keys are `set_potential`, `only_bis`, `raid_filter`, `raid_filter_all`, `raid_filter_group_zone`, `raid_filter_group_other` (`translation.json:878-885`); there is **no** `upgrades_tab.substitutions.*` group — the only substitutions string is `upgrades_tab.assumptions.substitutions_title` (`:929`); a new leaf key needs the schema leaf in the group's `properties` plus the group's `required` array (e.g. `view` at `schemas/translation.schema.json:8787-8805, :8808`); a wholly new group additionally needs its name in `upgrades_tab`'s outer `required` (`:9000`) | yes | `sed -n '878,885p;929p' $F/assets/locales/en/translation.json`; `sed -n '8787,8810p' $F/schemas/translation.schema.json` (investigator, I3) |
| C26 | Whether label stacking alone frees enough width to unclip five-digit iterations values | no | hypothesis, untested — `resize_window` tooling is unreliable in this environment (ticket 310: reported success while `innerWidth` never changed, twice); measured in-slice on the running page (Step 2) |

## Investigations needed

None outstanding. I1, I2, I3, I5 were dispatched and answered (folded into C6,
C14, C19, C21–C25). I4 (iterations clip) was deliberately **not** run — it needs
the running page and the resize tooling is unreliable — so it is handled as an
in-slice measurement with both branches written (Step 2, C26), not as a premise.

## Steps

Slices ordered smallest-risk first; each is a separate fork commit, each
independently gated. "Fork gates" = the five-row table in `fork-gates.md`, run
from `$F` via `node` against real entry points (C13), with the fnm PATH pin from
`known-traps.md` applied first (`node --version` must print v22.x before judging
any output). "Visual check" = dev servers per `known-traps.md` § dev servers
(backend exactly 3333, reuse a live 5173), Chrome extension for screenshots.

**Locale recipe used by every string-adding step (C14, C25):** (1) add the schema
leaf in the group's `properties`; (2) add the key to that group's `required`
array; (3) add the string to `assets/locales/en/translation.json` (one locale
only — `en` is the only one that exists); (4) `node ./test-locales.mjs` exit 0
with "validated 3 locale file(s)". A new top-level group under `upgrades_tab`
additionally goes into the outer `required` (`schema :9000`) — prefer extending
an existing group to avoid that third edit.

**Step 0 — preconditions (no edits).** Confirm fork branch `feat/upgrades-tab`
and record fork HEAD SHA; run all five gates green before any edit; re-verify
C17/C18 line ranges with
`sed -n '14,124p' $F/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`,
confirming the C23 selector shape at the same time. Acceptance: five exit-0 gate
runs recorded; SCSS ranges confirmed or corrected in the working notes. Depends:
C13, C17, C18, C23.

**Step 1 — slice 1: stack-trace trim (ticket 311 presentation).** In
`upgrades_tab.tsx`, add a local `firstLineOf` (re-implementing C10's four lines,
comment pointing at `packages/core/src/rank-report.ts:154`; suffix adjusted —
there is no JSON report in the tab, so it reads "… (full text in the browser
console)" and the full `detail` is `console.warn`ed once at render) and apply it
at the `{s.detail}` render (`:1783`, C9). The suffix string is localized as
`upgrades_tab.assumptions.substitution_truncated_suffix` — **extending the
existing `assumptions` group**, because no `substitutions` group exists (C25) and
a new group costs a third schema edit. Acceptance: locale recipe green;
type-check exit 0; visual check with a run that produces the Beast-tamer's
substitution (Ret Paladin pool, item 30892 in all ret phases) shows one line, no
stack trace. Depends: C9, C10, C14, C25. **Do not touch** the Go sim or anything
under `upgrades/engine/`.

**Step 2 — slice 2: the two-pane split and settings card (ticket 312 core).** In
the constructor/`buildTabContent` JSX: append
`<div className="upgrades-tab-right tab-panel-right">` as a sibling of
`.upgrades-tab-left` inside `contentContainer` (C1, C2); inside it, an
`upgrades-settings-outer-container` / `upgrades-settings-container` pair copying
Bulk's SCSS shape **including sticky** (C4, C24 — new rules in
`_upgrades_tab.scss`, borrowing `_bulk_tab.scss:11-23` verbatim apart from class
names; no cross-file `@extend`). Card contents, in Bulk's order: candidates-count
readout (the existing "all 227 eligible" summary becomes the readout line), `Run`
(`btn btn-primary`, full-width primary), `Stop` and `Import log` below at outline
weight, then config rows as **real pickers bound to the tab** (C21):
`NumberPicker<UpgradesTab>` for Iterations, the Candidates control,
`BooleanPicker<UpgradesTab>` for BiS-prune (short label — strings in slice 3),
each with `changedEvent: () => this.settingsChangedEmitter` (a new plain
`TypedEvent<void>` field) and `getValue`/`setValue` over the tab's existing
state, preserving the current values and behavior; the Phase selector moves
**as-is**, still `makePhaseSelector` into `phaseSelectorRef` (C19 — never
converted to tab-owned state). Picker labels stack above inputs, which removes
the horizontal squeeze.

**SCSS split, done in this same slice (C23):** the run row leaves
`.upgrades-toolbar`, so its flex-wrap/gap rules at `:17-24` silently stop
applying — re-home the run row's share of those rules under the new card classes,
and split every top-level `:44+` rule that names
`.upgrades-run-controls, .upgrades-view-controls` together so the view-controls
half stays behind untouched (slice 3 moves it separately). Delete only toolbar
breakpoint rules confirmed disjoint from `:333-424` (C18). **In-slice measurement
for the clip (C26):** with the stacked label in the card, type `30000` into
Iterations on the running page and screenshot; if five digits render unclipped,
delete the `8ch` rule; if not, widen the input within the card (the card removes
the squeeze, so one of the two closes it) — record which branch was taken and the
screenshot.

The status line, view controls, results and assumptions stay in the left panel
untouched this slice; `.upgrades-view-controls` keeps its `min-height` (C17).
Acceptance: all five fork gates exit 0; visual check pre-run shows card on the
right with Run visually primary, no run controls in the left column,
status/results area unmoved, **card gap/wrap intact (screenshot — the C23
check)**, card sticky while scrolling a long results page; below-`xl` check shows
the card stacking under the left panel (C3); a full run works end to end (Run,
Stop mid-run, Import log opens, iterations/candidates/BiS-prune edits still take
effect on the next run). Stop-and-report if: anything needs edits under
`upgrades/engine/**`, `sim_tab.ts`, `input.tsx`, or Bulk's own files, or the
responsive collapse needs new rules inside `_sim_tab.scss` — those widen the
blast radius past this plan.

**Step 3 — slice 3: view controls to the results, with legible labels (ticket 312
post-run half).** Move the `.upgrades-view-controls` row (C5, C6) to sit as the
permanent static sibling directly **above** `resultsRef` in the left panel (still
static markup, so `refreshViewControlVisibility` — refs, not position (C22) —
keeps working). Carry the `min-height: 2.25rem` reservation with it (C17).
**SCSS re-home (C23):** this row also leaves `.upgrades-toolbar`, so its share of
the `:17-24` nested rules and the view-controls half of every split `:44+`
selector move to a new scope rooted at the row's own class in its new position;
after this slice, no rule anywhere still keys `.upgrades-run-controls` and
`.upgrades-view-controls` in one selector list, and `.upgrades-toolbar`'s nested
block is deleted or empty. Restyle so each control reads as a unit (checkbox +
label as one grouped element, borrowing `.bulk-boolean-settings-container`'s grid
or `.content-block-header` labelling per ticket 312's idiom list); shorten
strings: `view.set_potential` → "Set potential", `view.only_bis` → "BiS only"
(phase qualifier demoted to `<small>`/tooltip text), `view.raid_filter` →
"Content" if not already; add a `content-block-header` "Filter results" so the row
reads as acting on computed results. String edits reuse the **existing** `view.*`
keys where possible (value changes only — no schema edit); any genuinely new key
follows the locale recipe (C25). Acceptance: gates exit 0; visual check post-run
shows the three controls grouped above the results with short labels and their
gap/wrap intact (screenshot — C23 check); pre-run the row occupies its reserved
height with no visible children (compare screenshots before/at/after a run — no
layout jump); BiS-only still filters (toggle, watch row count change). Depends:
C5, C6, C14, C17, C22, C23, C25.

**Step 4 — slice 4: set-bonus share on the row (ticket 313).** In the row
renderer near `formatDelta` (`:1606`), when the set-potential toggle is on and
the row has `setContext`: append a compact secondary element. Three states,
visually distinct: (a) prospective (`!crossesThreshold`, `prospectiveBonusDps`
set, no breaks): "+X.X set bonus (3/5 → 4/5 SetName)" as muted small text or a
`badge rounded-pill` (idiom already in this file); (b) `crossesThreshold === true`:
no separate number — a marker like "includes N-pc bonus" so the reader knows the
bonus is already inside `deltaDps`; (c) confounded (`prospectiveBonusBreaks`
non-empty): the figure shown with an explicit "not counted in ranking — breaks
SetName Npc" qualifier, mirroring `formatSetPotentialLine`'s suppress-and-disclose
wording (C20; logic re-implemented locally per C7, comment pointing at
`rank-report-rules.ts:722` — the corrected ticket 313 now says exactly this). The
number shown is raw `prospectiveBonusDps` — exactly what the view's sort adds
(C8), so it reconciles with row ordering with no weights caveat. Nothing renders
on rows without `setContext`. Strings via the locale recipe (C25), in a
`results`-adjacent existing group where one fits. Acceptance: gates exit 0; visual
check with toggle on shows the sub-line on set rows only, absent when toggle off;
the three states render differently (find one of each in a ret run, or screenshot
whichever exist and note absentees); ticket 313's acceptance boxes each mapped to
an observed screenshot or an explicit "state not present in this pool" note.
Depends: C7, C8, C20, C25.

**Step 5 — slice 5: TMB export box (ticket 314).** Below the results (with the
results block, not the settings card), a permanent-but-post-run-visible
`content-block` holding: caveat line ("a ranked list of candidates, not a 17-slot
gear set — it will not reconstruct a character on import", localized), a readonly
`<textarea>`, a count, and a Copy button (`navigator.clipboard` with
select-fallback like the report's `:915`). Contents: local re-implementation of
`wowsimsItemIdsJson` (C7, C11) over **the same row array `currentView()` +
`applyBisFilter` hand the renderer** (C12), deduped by id in first-seen order —
computed inside the render pass so every filter/sort/toggle change that re-renders
results also refreshes the export; no snapshot at run completion. Cross-slot order
check: with BiS-only toggled, capture the payload, confirm ids follow the
displayed cross-slot ranked order (not slot grouping) and that toggling changes
the payload — record the two payload head-10s in the working notes. Acceptance:
gates exit 0; the recorded before/after payloads differ and match on-screen order;
ticket 314's acceptance boxes each mapped. Depends: C7, C11, C12, C25. Do **not**
implement ticket 126's token/pattern ids.

**Step 6 — regression sweep against the original-asks rubric.** With the tab in
its final state, walk `.scratch/carry-forward/notes/upgrades-ui-original-asks.md`
items 1, 2, 4, 5, 7, 8, 9, 11 on the running page (the already-fixed set) and
confirm none regressed — especially 5/11 (jitter: compare progress-bar and layout
positions across a run's start/middle/end screenshots) and 2 (empty state
untouched). Item 6/10 surfaces owned by 310/305 are observed but not acted on.
Acceptance: a checklist in the executor's notes, one line per item,
screenshot-backed for 5 and 11.

**Step 7 — re-pin and close out.** After the final fork commit: steps 3–5 of the
cycle per C16 — update `data/wowsims-fork.lock.json` to the new fork tip,
`pnpm sim-implemented-effects:generate`, then `pnpm verify` in the main repo.
Acceptance: `pnpm verify` exit 0; `git status` in the main repo shows only the
lock file + regenerated artifact + any `.scratch` notes.

## Paths manifest

Fork checkout (`vendor/tbc-new-fork`, branch `feat/upgrades-tab`, gitignored from
the main repo):

- `ui/core/components/individual_sim_ui/upgrades_tab.tsx` — slices 1–5
- `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` — slices 2–5;
  **lines 333–424 (results-table rules) are forbidden** (ticket 310 owns them)
- `assets/locales/en/translation.json` — slices 1, 3, 4, 5 (the only locale — C14)
- `schemas/translation.schema.json` — same slices, for new keys only

Main repo:

- `data/wowsims-fork.lock.json` — step 7
- the artifact regenerated by `pnpm sim-implemented-effects:generate` — step 7

No file under `upgrades/engine/**`, `upgrades/data/**`, or `sim/**` (Go) is
touched (C15). No partition/fan-out: every slice edits `upgrades_tab.tsx`, so the
work is strictly serial in one checkout.

## Verify recipe

From `vendor/tbc-new-fork` (PATH pin first if `node --version` ≠ v22.x):

```
node ./test-locales.mjs
node ./node_modules/stylelint/bin/stylelint.mjs "ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss"
node ./node_modules/typescript/bin/tsc --noEmit
node ./node_modules/oxlint/dist/cli.js ./ui
node ./node_modules/oxfmt/dist/cli.js --check <the ten files from .scratch/stage-gate/tickets-306-308/fmt-owned-files.txt>
```

All exit 0; judge `lint:js` by exit code plus no *new* warnings naming touched
files (baseline noise documented in `fork-gates.md`). Then the visual acceptance
checks per slice (dev servers per `known-traps.md`; Chrome extension for
screenshots — including the two C23 gap/wrap screenshots and the C26 clip
measurement). Finally, from the repo root after re-pin: `pnpm verify` exit 0.
Note `pnpm verify` proves nothing about the fork UI itself (C13) — the five gates
plus the visual checks are the coverage.

## What could go wrong (per slice)

- **Slice 1:** essentially none; stop only if `s.detail` turns out to be
  structured rather than a string (it is typed as rendered text at `:1783` — C9).
- **Slice 2 (the risk concentration):** the **silent SCSS drop** — moving the run
  row out of `.upgrades-toolbar` loses the `:17-24` nested rules with no error
  (C23); defused by re-homing them in the same slice with a screenshot acceptance
  check. Picker `getValue`/`setValue` wiring subtly changes when a run reads its
  inputs (verify by editing each value and running); a ref-dependent behavior
  missed by the C22 inventory (exercise Run/Stop/Import explicitly); sticky
  misbehaving despite C24's chain analysis (the one untested corner is a stray
  Bootstrap `.tab-content` overflow — if it bites, report it with the observed
  computed style rather than silently shipping non-sticky); the left panel's
  `auto-fit` grid rendering badly next to a right panel (CSS-only fix in
  `_upgrades_tab.scss`). **Stop rather than adapt** if the fix requires editing
  `upgrades/engine/**`, `sim_tab.ts`, `input.tsx`, `_sim_tab.scss`, or Bulk's
  files.
- **Slice 3:** the same C23 silent drop for the view-controls row (same defusal:
  re-home + screenshot); jitter regression (the before/at/after screenshot
  comparison is the tripwire; if the reservation can't move cleanly, stop and
  report rather than restyling `render()`).
- **Slice 4:** the pool exhibits only one of the three states, leaving two
  unverifiable visually — acceptable, record which; stop if displaying the figure
  requires new engine computation (means C20's fields don't carry what the ticket
  claims).
- **Slice 5:** the displayed-row array isn't reachable at the export's render
  point without restructuring `render()` — adapt by computing the export in the
  same method that calls `resultsContent` (single view per render, C12); stop if
  correctness would require asserting on stage internals or a second `applyView`
  call site.

## Out of scope

- Ticket 311's panic half — the Go sim's unguarded `agent.(HunterAgent)`
  assertion. Not touched, not "quickly guarded".
- Ticket 310 — `_upgrades_tab.scss:333-424` and any results-table wrapping work.
- Ticket 126 — token/pattern ids in the export payload; slice 5 exports current
  item ids.
- Ticket 305, and anything in `packages/core/` (the report path keeps its own
  formatters; no sharing mechanism is built).
- The Bulk-style progress modal — explicitly rejected; the inline status line and
  its live-region structure stay in place (slice 3 moves nothing between
  `statusRef` and its comments).
- Adding a second locale, or any non-`en` locale file.
- Reformatting anything outside the ten owned files; any edit under
  `upgrades/engine/**` or `upgrades/data/**`.
