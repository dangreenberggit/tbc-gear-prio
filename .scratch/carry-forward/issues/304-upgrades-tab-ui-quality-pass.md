Status: open
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

- [ ] Every item 1–11 is either fixed or explicitly deferred with a reason.
- [ ] Item 7 has a decided-and-recorded behaviour, not just a hidden row.
- [ ] Spacing, text styling and layout borrow from existing site partials;
      no new one-off idiom where one already exists.
- [ ] Contrast checked against a ratio, not by eye.
- [ ] Jitter (5, 11) verified gone by watching a real run start and finish, not
      by reasoning about the CSS.
- [ ] `pnpm verify` green.

## Comments
