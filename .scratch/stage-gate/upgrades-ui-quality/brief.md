# Brief: Upgrades tab UI quality pass

## Source

Ticket: `.scratch/carry-forward/issues/304-upgrades-tab-ui-quality-pass.md`.
**Read it first and in full** — it carries all eleven findings, the causes read
out of the source for each, and the related-ticket context. This brief does not
repeat it; it sets the goal, the constraints and the open questions.

## Goal

The Upgrades / Shopping List tab works but looks unfinished. The owner reviewed
it against screenshots and reported eleven defects. Produce a plan that fixes
them.

The owner's summary judgment — this is the framing, not a twelfth item:

> a total failure to be imaginative, to make a practical UI, and most
> importantly to borrow from existing styling elsewhere on the site (spacing,
> text styling, layout options)

So a plan that invents a new local idiom, however tidy, has missed the point. A
plan that adopts what the site already does has hit it.

## Where the code is

**All UI paths are in the gitignored fork checkout** `vendor/tbc-new-fork`, on
branch `feat/upgrades-tab`. The fork is fetched, never committed, so a fresh
worktree will not have it.

- Get it: `pnpm sync:wowsims`
- Verify it: `ls vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
- Check the branch: `git -C vendor/tbc-new-fork branch --show-current`

The main repo is on `feat/upgrades-dedup-wowsims` — a *different* branch from
the fork's. Do not assume they move together.

Primary files:

- `ui/core/components/individual_sim_ui/upgrades_tab.tsx` (1807 lines)
- `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` (327 lines)
- `ui/core/components/individual_sim_ui/upgrades/engine/view.ts` (item 7 only)

Precedent to borrow from, listed in the ticket: the `bulk/` SCSS partials,
`_progress_tracker_modal.scss`, `_sim_tab.scss`, `_content_block.scss`.

## Constraints

1. **Borrow before inventing.** For each visual decision, name the existing
   site partial or utility it comes from. Where nothing exists to borrow, say
   so explicitly — that is a real answer, but it must be a stated one.
2. **Do not re-derive causes that are already recorded.** The ticket names the
   cause for most findings, read out of the source. Verify rather than redo;
   if a recorded cause is wrong, say so and show the measurement.
3. **Item 7 is logic, not CSS**, and is the only finding that changes what the
   tab computes. It can be sequenced independently of the visual work and
   should be, unless there is a stated reason not to.
4. **Do not design the empty state twice.** Open ticket 290 already scopes the
   tab's per-state presentation. Fold item 2 into it or supersede it — say
   which.
5. **Contrast is a measurement, not an opinion.** Item 1's acceptance is a
   ratio. Name the target and how it gets checked.
6. **Jitter is verified by watching a run**, not by reasoning about CSS. Items
   5 and 11 need a check against a real run start and finish. The owner has
   noted a browser is available for live testing if needed.
7. `pnpm verify` green on the tip.
8. The existing SCSS carries prior fix attempts that did not hold (the
   `width: 6ch` on the iterations input, for item 3). Re-measure before
   assuming any existing rule works.

## Open questions

Each needs a candidate that is not the same approach with different constants,
the result that would make it win written down *before* measuring, and a
measurement or the reason the fixtures cannot measure it. A dropped candidate
carries a stated reason.

### Q1 — What happens to worn items in the below-cutoff group? (item 7)

The owner: worn items appear there, obviously provide no increase, and are
noise. `row.owned` already exists but is styling-only; `belowCutoffInView` is
decided from the delta alone (`view.ts:214`).

This collides with two existing tickets, and the collision is the question:
**269** (open) says `hideOwned` currently *removes* owned rows where the plan
wanted them kept-and-greyed; **270** (blocked on an owner ruling) says the
"Already have it" control's semantics are a guess.

Candidates must include at least: drop owned rows from the below-cutoff group
only (leaving 269's kept-and-greyed behaviour intact elsewhere); versus a
single unified owned-item rule across the whole table. State which existing
ticket each candidate closes, contradicts, or leaves alone. If the honest
answer is that this needs the same owner ruling 270 is blocked on, say that
rather than guessing — that is a valid outcome for this question.

Note `belowCutoffCount` is derived at `view.ts:227`; a candidate that hides
rows must say what happens to the count.

### Q2 — What stays in the assumptions drawer, and what leaves? (items 8, 9)

The owner on the dev-only detail:

> look at what data is already presented to a user in the UI and think about it
> that way. maybe assumptions should just be a console log for now if these
> specific details are never presented to the user elsewhere

The tension: several rows exist to disclose a *degradation* (EP-weight
fallback, BiS tags from an older phase, partial source attribution, unmeasured
cutoff basis), written under a brief that banned silent wrongness. Others are
build metadata (engine commit SHA, `api-v<N>`, the pool filename and entry
count).

Candidates must include at least: split the drawer into user-facing
disclosures and console-only build details; versus move the whole drawer to
console for now. The win condition must be stated in terms of what a player can
still learn about a degraded run.

### Q3 — What is the sub-tab strip's shape? (item 10)

The owner wants counts per tab, empty tabs de-emphasised, real organisation,
and inspiration from the batch UI's "#1 result then smaller siblings" layout
(`_bulk_sim_result_renderer.scss`).

Two sub-parts, and the plan should not conflate them: the **tab strip** itself,
and whether the **shopping list pane** adopts the batch UI's hero-plus-siblings
shape. Candidates for each.

Note the current code only builds a tab for slots present in the ranking
(`slotsInView`), so "de-emphasise empty tabs" requires deciding whether empty
slots should start appearing at all — that is a behaviour change, not styling.

## What done means

`plan.md` exists and:

- Covers all eleven findings. Each is fixed, or deferred with a stated reason.
- Answers Q1, Q2, Q3 with candidates, pre-stated win conditions, and
  measurements (or the reason the fixtures cannot measure them).
- Names, per visual decision, the existing site idiom it borrows.
- Sequences the work — the ticket suggests four clusters (layout/spacing;
  states; information design; logic). The plan may regroup them, but should say
  why if it does.
- States which cluster, if any, is worth splitting into a parallel fan-out
  versus running serially, and on what basis.
- Carries a Claims register and a Paths manifest per the plan template.

The plan is the deliverable of this stage. No code is written until the plan
clears Gate B.
