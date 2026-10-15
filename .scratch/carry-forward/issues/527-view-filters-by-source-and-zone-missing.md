Status: closed
Type: feature gap (omission)
Priority: major (owner, 2026-09-29)
Origin: owner, 2026-09-29, in chat (relayed verbatim by the orchestrating session)
Blocks: none
Blocked by: none
Related: 417, 447, 438, 277, 496, 418, 35, 287, 525, 526

# The settled Upgrades table has no filter by source or zone

The Upgrades (New) tab can narrow what gets simmed by source. It cannot
narrow the finished table by source or zone. The owner expects both.

## The owner's words

2026-09-29, verbatim:

> VIEW filters based on source/zone are missing (major, this was supposed to get done a while ago but somehow got missed)

Clarified by the owner, same day, verbatim:

> i told you what i expected to see. view filters, not just sim filters.

So the owner expects a control that narrows the rows of a settled ranking
by source or zone, for example only Black Temple, only Karazhan, or only
badge vendor and crafted items, with no new sim.

## What exists today

Line numbers are in `vendor/tbc-new-fork` at fork commit
`02d0ea2ad1dae34087a6d69d316f9c3879bd8247`, the `commit` in
`data/wowsims-fork.lock.json` on 2026-09-29. Read them with
`git -C vendor/tbc-new-fork show 02d0ea2a:<path> | sed -n <from>,<to>p`.
`upgrades_tab.tsx` is `ui/core/components/individual_sim_ui/upgrades_tab.tsx`;
`view.ts` is `ui/core/components/individual_sim_ui/upgrades/engine/view.ts`.

**The Sources control is a sim filter.** The "Select item sources" button
opens a popup of source checkboxes (`upgrades_tab.tsx:1001-1011`, built by
`refreshSourceFilter` at `2199-2239`). A ticked or unticked box changes
`excludedSources` (`2228-2230`). `effectivePool` drops excluded sources from
the candidate pool before the sim (`1693-1707`). A change after a finished
run marks the result stale (`2237`), so the user must press Simulate again
to see the effect.

**The view controls have no source filter.** The "View options" group
(`upgrades_tab.tsx:1051-1074`) holds two toggles: "Set potential" and "BiS
only". `currentViewOptions` passes no `raid` or `boss` to `applyView`
(`2659-2675`). Its comment says why: "No `raid` here any more (ticket 417)"
(`2666`).

**The engine already supports a zone view filter.** `ViewOptions` has
`raid` and `boss` (`view.ts:65-73`). `applyView` filters rows on them
(`view.ts:440-456`). `raidFilterGroups` builds the zone and zoneless-bucket
option list from ranked rows (`view.ts:130-145`). The `raid` option takes
one value, not a set. The main repo has the same view layer
(`packages/core/src/view.ts`, tests in `packages/core/test/view.test.ts`)
and a CLI `--raid` flag (`packages/core/src/cli.ts:181`).

**A tab-local post-run filter already exists as a model.** `applyBisFilter`
filters the rows `applyView` returns when "BiS only" is on
(`upgrades_tab.tsx:2648-2657`). `currentView` is the one call site both
the shopping list and the slot panes read (`2607-2618`). The slot strip is
built from the unfiltered view, so a filter empties a pane and never
removes it (`2620-2623`).

**Seen live, 2026-09-29.** On `http://localhost:5173/tbc/shaman/enhancement/`
with a settled ranking on screen ("Your current gear: 2244.0 DPS. Took
12s.", 188 table rows), a page-console read found only two labels in
`.upgrades-view-controls`: "Set potential" and "BiS only". The only
`<select>` in `#upgrades-tab` was the phase picker. No setting was changed
and no sim was started.

## What the plan promised

PLAN.md §4.1 (`PLAN.md:252-263`) defines `ViewOptions` with
`raid?: string // 'all' | zone key` and `boss?: string`, and says toggling
is "A re-sort or re-filter of data already in hand. No re-sim".

PLAN.md §8.3.1 (`PLAN.md:548`) says the product question is "inherently
raid-scoped" and a source filter "is core to the framing, not a
nice-to-have".

PLAN.md §12 (`PLAN.md:762-766`) lists a "Raid filter" as a view control
on `ItemSource.zone`, including tier pieces through their token's zone,
and says all view controls are "pure re-renders, no re-sim, not in
`contentHash`". Two rules follow at `PLAN.md:776-777`: the filter hides
rows but never deletes them, and `rank` "stays absolute, never renumbered
per filter".

PLAN.md Stage 3 (`PLAN.md:909`) asks for "view controls over the Stage 2
`applyView`". Its gate line "filters and pins re-render without a network
round trip" is ticked (`PLAN.md:911`). That gate was for the planned web
shell, not the wowsims tab.

ADR-0019 keeps `ViewOptions` out of the hash. ADR-0020 says a filter never
moves the cutoff bar.

## History: delivered, then removed

The tab had this filter from 2026-08-23 to 2026-09-18. Fork dates from
`git -C vendor/tbc-new-fork log -1 --format=%ad --date=short <sha>`.

1. **Added 2026-08-23.** Fork commit `eb6567076` "Filter a finished
   shopping list by content" put a post-run "Content" `<select>` on the
   tab, fed to `applyView` as `ViewOptions.raid`. Ticket 277 records it:
   "a completed shopping list can be narrowed to one zone ... without
   re-simming". Tickets 282 (option groups, fork `e565d4a67`) and 285
   (selection survives a run, fork `270f57da9`) then improved it.
2. **Removed 2026-09-18.** Ticket 417 asked for the Content dropdown to
   become checkboxes "in the sim settings". The stage-gate plan
   `.scratch/stage-gate/tab-signoff-followups/plan.md:23-29` chose a
   pre-sim pool filter and rejected keeping the post-run one. Its words:
   "The post-sim `<select>` is removed, not kept alongside." Fork commit
   `15b29ac41` did that. Ticket 417 closed with "The post-run
   `raidFilter <select>` is replaced", so the removal was recorded but no
   ticket tracked the lost view filter.
3. **Restyled, not restored.** Ticket 438 (claimed) explored the design of
   the Sources control, and ticket 447 (closed, fork `3f19c283c`) moved the
   checkboxes into the popup. Both kept the pre-sim meaning. Neither brought
   back a post-run filter.

So the owner's memory matches the record. A view filter by zone was built
and then removed by ticket 417's plan. The owner's 417 request is recorded
only as the paraphrase "in the sim settings"; whether the owner meant to
lose the view filter is not recorded anywhere found.

**Stale text that still says the filter exists.** Ticket 277 opens with
"The tab now has a post-sim raid filter". `docs/upgrades-tab-scope.md:112`
and `:186` say the same. All three describe the state before 2026-09-18.

## Relation to other tickets

- **417, 447, 438.** This ticket adds a view filter beside their pre-sim
  Sources control. Ticket 418 (the crafted-profession gate) attaches to the
  pre-sim Crafted checkbox (ticket 417, "Notes").
- **277 (open, blocked by 35).** The boss sub-filter stays deferred. This
  ticket is zone and source only.
- **496 (open, low).** That ticket is about more Gear-picker filters on the
  Sources control. It is a separate, low-priority item.
- **525 (open).** A separate layout bug: the "removes worn …" note overflows
  the DPS cell. Its "Out of scope" line mentions view filters on the mid-run
  table; the owner's request here is about the settled table.
- **526 (open).** A separate investigation: whether a restart after Stop
  reuses old sims. A view filter that starts no sim should not touch 526's
  store (hypothesis, untested).

## Proposed scope (proposals only; the owner decides the design first)

Proposed by the filing agent on 2026-09-29. These are not owner rulings.
Settle the design with the owner at the start of this ticket.

- Add a source/zone filter to the "View options" group. It narrows the
  settled table only: it starts no sim, leaves the result fresh, and
  leaves `contentHash` unchanged.
- Options to settle with the owner:
  - One value (the engine's `ViewOptions.raid`, `view.ts:440-456`) or
    several at once. Several at once fits "only badge vendor and crafted".
    It could be a tab-local filter after `applyView`, like
    `applyBisFilter`, so the byte-gated engine directory need not change
    (hypothesis, untested).
  - The control: a native `<select>`, or a popup like "Select item sources"
    with the same Raids / Other sources groups.
  - The option list: only sources present in the settled rows
    (`raidFilterGroups`, `view.ts:130-145`), which is at most what the
    Sources popup let into the sim.
  - Whether the filter also applies to the mid-run table
    (`landedRowsTable`). That table does not go through `applyView`
    (`upgrades_tab.tsx:2692-2698`).
  - The Rank column. PLAN.md wants the absolute rank kept under a filter
    (`PLAN.md:777`). The tab shows a 1-based position in each table
    instead, never `RankedItem.rank`, by owner ruling on ticket 287
    (`upgrades_tab.tsx:3031-3035`). So under a filter the tab would show
    1..N unless the owner decides otherwise.
- Keep the other PLAN.md rules: the cutoff bar does not move (ADR-0020),
  and a tier piece matches the zone its token drops in (`PLAN.md:576`).

## What would close this

1. The owner's design choices from the list above, recorded here.
2. A fork commit and a re-pin in this repo, with `pnpm verify` rc=0.
   Follow AGENTS.md, "The forked tab repo".
3. A check that changing the view filter starts no sim and does not mark
   the result stale. A test or a by-hand check in the Browser pane both
   count; say which.
4. Visual acceptance, judged by `gate-visual`:

   > On a settled ranking from a recorded fixture, at 1280 and 375 px,
   > after the view filter is set to Black Temple, every row in the
   > shopping list names Black Temple (or a Black Temple boss) in its
   > Source cell, at least one row is shown, and the "Your current gear"
   > DPS figure is the same as in the unfiltered capture.

   Add a clause for the Rank column once the owner has decided it (see
   "Proposed scope").

   Capture it with `pnpm tab-review`: one post-run entry with no filter,
   then one with the filter set, in that order, because clicks persist
   across post-run entries (`vendor/tbc-new-fork/test-review.mjs`, header
   comment). The script supports only `hover` and `click` interactions,
   so a native `<select>` cannot be set by it today. Either the control
   must be settable by clicks, or the script needs a `select` interaction.
   The fixture file `data/tab-fixtures/ret-p3-p2.json` contains Black
   Temple sources:
   `grep -o '"zone": *"Black Temple"' data/tab-fixtures/ret-p3-p2.json | wc -l`
   printed 192 on 2026-09-29. Whether any settled row in it is a Black
   Temple item is not checked (untested).
5. Ticket 277's opening sentence and `docs/upgrades-tab-scope.md:112` and
   `:186` match the shipped tab.

## Out of scope

- The boss sub-filter (ticket 277, blocked by 35).
- More Gear-picker filters on the Sources popup (ticket 496).
- Any change to what the pre-sim Sources popup does.

## Comments

**2026-10-11 — owner answer (Q-raid-filter, Chunk 3b step 6 of
`.scratch/plans/upgrades-tab-finish-line.md`).** Asked whether the
after-run raid/source filter must exist before the tab counts as finished,
the owner answered: "Yes. It should probably be like the sources box but
I'll wait for anymore detailed choice set that makes more sense before
answering those". So the filter is on the finish list (Tab-blocking). The
owner leans toward a control like the pre-run Sources box. The detailed
design choices under "Proposed scope" are not decided; the owner wants a
clearer set of choices before answering them, so close condition 1 still
needs that set brought to the owner.

**2026-10-12 — owner design answer (Q-527-design, stage-gate
`tab-view-filter`).** Shown two mock-ups, A (a button under View options
that opens a checkbox dialog like the pre-run Sources box) and B (chips),
the owner answered, verbatim: "A. select view sourtces is bad wording
though". The orchestrating session set the wording from that answer: the
button and the dialog title read "Filter by source", and the line under
the button reads "Showing all sources" or "{{n}} of {{m}} sources hidden".
The other choices under "Proposed scope" were settled in the plan
(`.scratch/stage-gate/tab-view-filter/plan.md`, "Settled decisions") from
earlier rulings: several sources at once; the options are the sources the
settled rows carry, keyed as the pre-run Sources box keys them; a row
stays while any of its sources is shown (the pre-run box's rule); the
filter combines with BiS only; it persists across runs and reloads like
the column sort (ticket 582); the Rank column shows the position among
the rows shown, 1..N (ticket 287 ruling); the slot sub-tabs stay and a
pane the filter empties says "No rows from the shown sources."; the
cutoff bar does not move. Three more choices in the plan are agent
decisions with no owner ruling (review P3,
`docs/reviews/feat-tab-view-filter.md`): the table is not filtered while
a run is in progress; Hide all hides every source the dialog offers and
keeps hidden any source it does not offer; and the JSON export follows
the filter, so it lists only the rows shown.

## 2026-10-15 — closed

Verified by: tbc-new-fork@c99dd97e4 (fork branch `feat/tab-view-filter`,
commits `ad81076cd` to `c99dd97e4`), which `data/wowsims-fork.lock.json`
names on `feat/tab-view-filter` (tbc-gear-prio@e89f1da7, `pnpm verify`
rc=0). From the pair's fork folder, `vendor/tbc-new-fork`:
`node node_modules/vitest/vitest.mjs run ui/features/upgrades` (55 files,
489 tests passed on 2026-10-15 at `c99dd97e4`). Close condition 3: the
test "drops a hidden source’s rows from every pane, keeps every slot tab,
and re-ranks nothing" in
`ui/features/upgrades/components/UpgradesResults/UpgradesResults.view.test.tsx`
asserts the run and settings objects are unchanged after a source is
unticked, and the capture below records `stale` false and the same status
text ("Your current gear: 2,082.7 DPS. Took 106.8s.") in every entry.
Close condition 4: `pnpm tab-review .scratch/stage-gate/tab-view-filter/review-527.json --out .scratch/stage-gate/tab-view-filter/review-out`
(rc=0, 10 captures, 0 errors, forkHead `c99dd97e4`), judged `pass` at 1280
and 375 px by gate-visual in
`.scratch/handoffs/visual-review-tab-view-filter-527.md`
(tbc-gear-prio@5fb4589e). With only Black Temple shown, the Upgrades table
lists 9 rows, all Black Temple, ranked 1..9, and the summary reads "13 of
14 sources hidden". The manifest is gitignored; a copy is in the main
checkout's `.scratch/stage-gate/tab-view-filter/review-527.json`. Close
condition 5: ticket 277's opening sentence and the rows for 277 and 35 in
`docs/upgrades-tab-scope.md` now describe the shipped filter.
