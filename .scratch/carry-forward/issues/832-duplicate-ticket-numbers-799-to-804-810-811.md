Status: open
Type: process
Origin: merge of the epic 452 chain into `dev` on 2026-11-06 (`chore/452-slice-tickets`, `feat/452-survival-arms`)
Blocks: none
Blocked by: none
Related: 452, 810, 811

# Tickets 799 to 804, 810 and 811 each have two files on dev

## What a reader sees

`ls .scratch/carry-forward/issues | grep -oE '^[0-9]+' | sort | uniq -d`
prints `799 800 801 802 803 804 810 811` on `dev` after the 452 chain
merged. Each number names two tickets: a tooling ticket filed on `dev`
(for example `810-pnpm-store-lock-in-read-only-run-user.md`) and a 452
ticket filed on the chain's branches (for example
`810-other-builds-bis-picks-show-as-bis-losses.md`). "Ticket 803" in a
commit, a review or a code comment no longer says which ticket it means.

## Why

`chore/452-slice-tickets` and `dev` both allocated 799-804 from `NEXT`,
and `feat/452-survival-arms` and `dev` both allocated 810-811. The
`NEXT` conflict that `docs/agents/issue-tracker.md` relies on did show up
in each merge of `dev` into those branches. The merging agent kept the
higher `NEXT` value and did not renumber either side, so both files
landed (merge commits `796347a4` and `5ba31f83` on `dev`).

## What renumbering costs, per side

- **The 452 chain's tickets** (the side that merged in, which is how
  earlier collisions were fixed, for example `18f6b642` "Renumber branch
  ticket 713 to 718"). Nine files in the fork at `c9bb0acd3` cite these
  numbers (for example `ui/features/upgrades/model/data/data.ts:33`,
  ticket 803, and `pool_source.cells.fixture.json`), and five EP-weight
  JSON notes under `data/presets/` cite ticket 803, so a full rename
  needs a fork commit, a re-pin and a push. Reviews, handoffs and live-run docs cite 799-804 and 810-811
  too, and session E is working on 801 (axe and visual-review scans) on a
  branch off `chore/452-slice-tickets`.
- **The tooling tickets filed on `dev`.** Fewer references in tracked
  files (for example `docs/reviews/chore-fix-rule-review-bar.md:91` cites
  799), but `chore/808-one-routing-source` and its review branches cite
  809-811.

Find the references with
`git grep -n -E '\b(ticket|tickets|issues/)[ ]?(799|80[0-4]|81[01])\b'`
in the main repo and the same pattern in `vendor/tbc-new-fork`.

## Done when

Each number in 799-804 and 810-811 names one ticket file on `dev`, the
renamed tickets take numbers from `NEXT`, and the tracked references to
the renamed tickets name the new numbers.

## Comments

2026-11-07, `chore/merge-hurdles`: ticket 834 adds a merge-ready check
that fails a branch adding a ticket number the merge result already
has. It judges only numbers the branch adds, so these duplicates stay
until this ticket renumbers them; they block no merge.
