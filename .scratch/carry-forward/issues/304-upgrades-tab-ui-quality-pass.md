Status: closed
Type: task
Origin: user UI review, 2026-08-27 (chat, with screenshots)
Blocks: none
Blocked by: none

# Upgrades tab: UI quality pass

The Upgrades / Shopping List tab works but looks unfinished. The owner reviewed
it against three screenshots and called out eleven defects. The summary judgment
was: a failure to be imaginative, a failure to make the UI practical, and —
most importantly — **a failure to borrow styling that already exists elsewhere
on the site** (spacing, text styling, layout idioms).

That last point is the theme, and it is the one to fix first. The site already
has a bulk/batch results UI, a progress-tracker modal, a gear picker and a set
of SCSS partials under `ui/scss/core/components/`. The Upgrades tab should look
like it belongs to the same product.

**All paths below are in the gitignored fork checkout** `vendor/tbc-new-fork`,
on branch `feat/upgrades-tab`. The fork is fetched, not committed — a fresh
worktree will not have it. Get it with `pnpm sync:wowsims` (verify with
`ls vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`)
and check the branch with `git -C vendor/tbc-new-fork branch --show-current`.

The two files nearly every item below touches:

- `ui/core/components/individual_sim_ui/upgrades_tab.tsx` (1807 lines)
- `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` (327 lines)

## Reference material

Two guides the owner supplied for the empty-state work (item 2):

- <https://www.pencilandpaper.io/articles/empty-states>
- <https://medium.com/@lapomeray/designing-for-every-state-a-comprehensive-guide-to-ui-states-in-product-design-77b72cef0034>

In-repo precedent to borrow from, rather than inventing a second idiom:

- `ui/scss/core/components/individual_sim_ui/bulk/` — the batch UI's partials.
  `_bulk_sim_result_renderer.scss` in particular lays out a primary result with
  smaller sibling rows beneath it, which is the shape item 10 asks for.
- `ui/scss/core/components/_progress_tracker_modal.scss` and
  `progress_tracker_modal.tsx` — the site's existing progress idiom. The
  Upgrades tab already reuses its markup (see `progressBarContent()`); it
  should reuse its layout discipline too.
- `ui/scss/core/components/_sim_tab.scss`, `_content_block.scss` — the
  spacing/vertical-rhythm vocabulary the rest of the tabs use.

## Related tickets

A search of the existing tickets found **no duplicate** of any item below, but
four touch the same surface and an implementer should read them first:

- **290 — design the Upgrades tab state presentations** (`Status: open`,
  `Type: design`). Asks for the tab's per-state presentation to be designed
  deliberately as a set, including whether the empty results area needs a
  placeholder. **Item 2 falls inside this ticket's scope** — do not design the
  empty state twice. Either fold item 2 into 290 or close 290 into this pass.
- **269 — `hideOwned` removes rows the plan wants greyed** (`Status: open`,
  `Type: bug`). Owned rows are dropped where the plan wanted them kept and
  greyed. Directly adjacent to item 7 and pulling in the opposite direction:
  269 wants owned rows *kept*, item 7 wants them *out of the below-cutoff
  group*. Reconcile these two before writing code — they are not in conflict
  (below-cutoff is one group, not the whole table) but the decision must be
  made once, for both.
- **270 — "Already have it" control semantics are a guess** (`Status: blocked`
  on an owner ruling, `Blocks: phase-4`). The same owned-item question, waiting
  on the owner. Item 7 may need that same ruling; check before assuming.
- **281 — Upgrades tab progress bar during a run** (`Status: closed`). Built
  the progress bar that items 5 and 11 complain about. Precursor, not a
  duplicate — it never mentions jitter.

## Findings

Each item records what the owner reported and what the code shows. Where a
cause is named below, it was read out of the source; where it is a guess, it
says **hypothesis**.

### 1. Unreadable grey text

Low-contrast grey body text throughout. `text-muted` is applied to
near-everything: every status-line state (`statusContent()`, lines ~927–970),
all three empty states (lines 1277, 1294, 1336, 1348), and whole owned rows
(line 1483). Muting is the tab's default rather than an emphasis choice, so
nothing reads as primary and the muted text that *is* meaningful does not stand
out. Decide which text is genuinely secondary, and check the rest against a
contrast ratio rather than by eye.

### 2. Empty state is unstyled and badly placed

`No finished ranking to show` renders as a bare `<div className="text-muted">`
(line 1277) with no container, no icon, no heading, no spacing and no call to
action. There are at least three distinct empty states in the file
(`empty_no_ranking` 1277, `rows_pending` 1294, `empty_no_upgrades` 1336/1348)
and all three are the same bare muted div.

Per the guides above, an empty state should say what the user is looking at,
why it is empty, and what to do next — here, plausibly "press Run". Treat the
three states as different messages, not one. Also audit the other UI states in
the same pass (loading, error, partial), since the state vocabulary is the
subject of the second guide.

### 3. Control row is overcrowded and clips

Everything — Run, Stop, Import log, Iterations, Candidates, the BiS-list
toggle and the phase picker — sits on one wrapped flex row
(`.upgrades-toolbar`). The screenshot shows `3000` clipped inside the
Iterations field to `300`.

Note the SCSS **already** carries a fix attempt: `.upgrades-iterations-input`
is set to `width: 6ch; flex-shrink: 0`, added for "WP1 defect 2". It is not
holding at the width in the screenshot, so re-measure rather than assuming the
existing rule works. The deeper problem is that one row is the wrong container
for this many controls of three different kinds (actions, run inputs, view
filters); consider grouping or a second row.

### 4. Bad vertical spacing between components

Spacing between the toolbar, the status line, the progress bar and the results
table reads as arbitrary. Present values are ad hoc: `.upgrades-status-line`
has `margin-top: var(--spacer-2)`, the assumptions block gets a `mt-gap`
utility (line 560), and the table has none of its own. Adopt the site's
existing rhythm (`--gap-width`, `--block-spacer`, `.content-block`) instead of
per-element one-offs.

### 5. Massive jitter between simming and not-simming

Root cause is visible in `statusContent()`: each state returns a **different
DOM shape** into the same slot via `replaceChildren` (line 892) — the running
state is `<span>text</span> + progress bar`, done is text plus elapsed, idle is
one short string. The states have different heights and widths, so everything
below them jumps when the run starts and again when it ends. Reserve the space
the running state needs, so the surrounding layout does not reflow. See also
item 11, which shares this cause.

### 6. Table spacing

Column and cell spacing reads as cramped/arbitrary. Note that the desktop table
is essentially unstyled: nearly all of the table rules in the SCSS are wrapped
in `@include media-breakpoint-down(md)` and apply to mobile only. Desktop gets
`table-layout: auto` and Bootstrap defaults, which is why it looks
uncalibrated.

### 7. "Items below the cutoff" includes items already worn — logic bug

**This one is not cosmetic and is worth splitting out if it complicates the UI
work.** Items the player already wears appear in the below-cutoff group. They
of course show no increase, so they are noise that makes the group look
broken.

The code already knows: `row.owned` exists and is used at lines 1483 and 1523,
but *only for styling* — a muted row and an `(owned)` suffix. Nothing filters
owned rows out. `belowCutoffInView` is assigned in
`ui/core/components/individual_sim_ui/upgrades/engine/view.ts:214` purely from
the row's delta, with no reference to `owned`.

Decide the intended behaviour before coding: drop owned rows from the
below-cutoff group entirely, or keep them behind their own disclosure. Do not
just hide them if the count is used elsewhere — `belowCutoffCount` is derived
at `view.ts:227`.

### 8. Assumptions block is hard to read

It renders as a Bootstrap `<dl className="row">` with `col-sm-4` / `col-sm-8`
pairs (lines 1560+). That fixed 4/8 split is what produces the large, ugly
horizontal gap between each label and its value: the labels are short, so most
of the 4-column gutter is empty. Use a layout sized to the content — the label
column does not need a third of the width.

### 9. Assumptions exposes developer-only detail

Rows like `Pool source — ret-p3.universe.json (467 entries)` mean nothing to a
player. Also in this category: engine provenance (a commit SHA, line 1633) and
`api-v<N>`.

The owner's instruction: look at what data is already presented to a user
elsewhere in this UI and judge these rows the same way; if a detail is never
surfaced to a user anywhere else, it probably belongs in a console log for now
rather than on the page.

Judgment needed rather than a blanket delete — several of these rows exist to
disclose a *degradation* (EP-weight fallback, BiS tags from an older phase,
partial source attribution, unmeasured cutoff basis), and the brief those were
written under explicitly banned silent wrongness. Keep the honesty, drop the
build metadata. Splitting the drawer into "what this run assumed" (user-facing)
and "build details" (console) is one way to satisfy both.

### 10. Tabs look bad and carry no information

The slot sub-tabs (Head, Neck, Shoulder, …) are a flat unstyled Bootstrap
`nav-link` strip built in `renderSubTabs()` (lines ~1140+), with no grouping and
no ordering rationale. Requested:

- Show a count per tab, e.g. `Shoulder (3)`.
- Visually de-emphasise (disabled-looking) tabs with nothing in them.
- Organise them, rather than one long wrapping strip.
- Take layout inspiration from the batch UI, which shows a clear #1 result with
  smaller similar elements beneath it.

Counts are available without new plumbing: `slotPaneContent` already filters
`rowsForSlot` per slot (line ~1319). Note the existing code only creates a tab
for slots that are present at all (`slotsInView`), so "slightly disabled if
empty" needs a decision on whether empty slots should start appearing.

### 11. Progress bar jitters horizontally

Same container as item 5. `.upgrades-status-line` is a `flex-wrap` row and the
progress bar is placed *after* a text span whose content changes every tick —
`Simming 25/57` grows to `Simming 100/246` as digits are added
(`status.running_rows`, lines ~934–943). The bar has no reserved position, so
it slides right as the label grows, and re-wraps when the row overflows. Give
the label a stable width or put the bar somewhere its position does not depend
on the label's length.

## Suggested grouping

These are not eleven independent jobs. Rough clusters:

- **Layout/spacing system** — 3, 4, 6, and the shared cause behind 5 and 11.
  One coherent pass adopting the site's existing spacing and container idioms.
- **States** — 1 and 2, informed by the two guides.
- **Information design** — 8, 9, 10.
- **Logic** — 7, standalone, and the only item that changes what the tab
  *computes* rather than how it looks.

## Acceptance

- [x] Every item 1–11 is either fixed or explicitly deferred with a reason.
      See the per-item disposition below.
- [x] Item 7 has a decided-and-recorded behaviour, not just a hidden row.
      Owned rows are dropped from the below-cutoff group only; the engine's
      `belowCutoffCount` keeps delta-only semantics and the divergence is
      commented at the filter site (it has no reader in the UI).
- [x] Spacing, text styling and layout borrow from existing site partials;
      no new one-off idiom where one already exists. Borrowed:
      `.content-block` rhythm, `badge rounded-pill`, the progress-tracker's
      bar cap, `#noResultsTab`'s centring, and `var(--bs-gray-*)` for
      de-emphasised text. Two local rules are stated as such in comments:
      the reserved status-label width and the content-sized drawer grid.
- [x] Contrast checked against a ratio, not by eye. Measured in devtools:
      `text-muted` computed to 1.11:1 and is gone from both files;
      secondary text is now `--bs-gray-500` at 8.63:1, primary text white
      at 17.9:1.
- [x] Jitter (5, 11) verified gone by watching a real run start and finish.
      Item 11: the progress bar's left edge holds at 700.5px across 41
      distinct running labels (spread 0px, was 21px). Item 5: toolbar
      height constant at 111.6px (was 69.6→108.1px) and sub-tab strip
      height constant at 92.2px (was 44.3→92.2px), so the results table's
      top edge holds at 371.8px across idle, running and done — spread 0.
      No vertical shift remains.
- [x] `pnpm verify` green **with the fork clone at its pinned commit**, which
      is the state the gate is written for. It does not lint, typecheck or
      test the fork itself. The gates that cover the changed code are the
      fork's own: `test:locales`, `type-check`, `lint:css`, `lint:js`, all
      exit 0. `fmt` (oxfmt --check) is red on 194 files, identical at the
      stage-open SHA and at the tip, so it is a pre-existing tree-wide
      condition and not this work — see below.

      **Open, needs a decision:** `equip-eligibility:check` compares the fork
      clone's HEAD against `data/wowsims-fork.lock.json`, which pins
      `fd4d65c4a` — the fork's stage-open commit. The five fork commits move
      the clone off that pin, so `pnpm verify` exits 2 while they are checked
      out. Verified both ways: with the clone reset to the pin the whole of
      `pnpm verify` passes; with the branch checked out only this one gate
      fails. Bumping the pin declares these fork commits the paired state and
      regenerates `data/equip-eligibility.json`, which is outside this
      ticket's scope (`data/` is not in its paths manifest), so it was not
      done here.

## Disposition

Fork commits on `feat/upgrades-tab`: `05bbd8c1d`, `30c2f9c3a`, `2f9d0eebe`,
`44f63ae78`, `0666c60ba`.

| Item | Disposition |
| --- | --- |
| 1 unreadable grey | **Fixed.** Not a hierarchy problem: measured 1.11:1. `text-muted` was our own invention (only in this tab and its WCL modal, both added by us); nothing upstream uses it. All 14 uses replaced with the site's `var(--bs-gray-*)` convention. |
| 2 empty state | **Fixed.** Three distinct messages with heading, explanation and a Run CTA where Run can help; none where it cannot. |
| 3 control row clips | **Fixed.** `6ch` won the cascade but was too narrow under `border-box`; probed to `8ch`. Toolbar split into two rows. Five-digit values still clip — the field is sized for the four the default uses. |
| 4 vertical spacing | **Fixed.** `.content-block` rhythm replaces the `mt-gap` one-offs. |
| 5 jitter simming/not | **Fixed.** The recorded cause (status line) was refuted by measurement — the status host is a constant height in every state. The two real causes were the toolbar growing when the view filters appear and the sub-tab strip wrapping to a second row when slot tabs appear; both now reserve their height from first paint. Measured across a full run: strip 92.2px, results top 371.8px, table top 371.8px, toolbar 111.6px, status 21px — every one a single value in idle, running and done. |
| 6 table spacing | **Fixed.** Desktop rules added outside the mobile guards. |
| 7 worn items below cutoff | **Fixed.** Live A/B: 192 rows with 16 owned before, 176 with 0 after. |
| 8 assumptions hard to read | **Fixed.** Content-sized grid; label column 117.6px vs 730.3px, was a fixed 1:2. |
| 9 developer-only detail | **Fixed.** Engine SHA and `api-v` move to one `console.info`; degradation and run-provenance rows stay on the page. |
| 10 tabs carry no information | **Fixed**, all four sub-asks. Counts: badge per tab, agreement with its own pane verified under the BiS-only filter (0 mismatches across 16 tabs). De-emphasis: filter-emptied tabs muted but still clickable. Organisation: the strip is a deliberate two-row shape (owner ruling), reserved from first paint, with canonical order and Shopping List pinned first. Batch-UI inspiration: the divider idiom adopted; the hero-#1 card **dropped with reason** — that file has dividers and flex ratios but no emphasis idiom to borrow. **Still open, separately:** whether all 17 equip slots should render, greyed when empty — a behaviour ruling, recorded in the state-design note. Two rows does not decide it, and the strip reserves its height either way. |
| 11 bar jitters horizontally | **Fixed.** Bar left edge spread 21px → 0px. |

Design note: `.scratch/carry-forward/notes/upgrades-tab-state-design.md`
(closes ticket 290).

### Known-not-fixed

- **`oxfmt --check` red on 194 files.** Pre-existing: identical count at the
  stage-open SHA `fd4d65c4a` and at the tip. The installed oxfmt disagrees
  with the committed formatting across the whole tree (arrow-parens, line
  width), so running it would reformat 194 unrelated files. Its own ticket
  if wanted; not actionable inside this one.
- **Whether all 17 equip slots should always render, greyed when empty.**
  A behaviour ruling, not styling; recorded as an owner question in the
  state-design note. Independent of the two-row strip, which reserves its
  height either way.

## Comments
