Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-blocking
Type: feature (owner ruled option A on 2026-10-11)
Origin: owner, 2026-09-30, in chat (relayed verbatim by the orchestrating session), about the third Cherryboom enhancement run
Blocks: none
Blocked by: none
Related: 525, 527, 305, 309, 430, 312, 614, 615

# A BiS item that does not clear the cutoff is hidden in the closed fold

The owner ruled on 2026-10-11: option A, with the details in
"2026-10-11 — owner ruling: option A" at the bottom of this file. The
options below are kept as the record of what was asked.

## The owner's words

2026-09-30, verbatim:

> its interesting that a 'bis' item (in this case the bis head, cursed vision etc) wont even show if its negative. maybe we should make an exception to show bis items. make that a ticket as a possibility (not decided)

## Why the item does not show

**Short answer.** Cursed Vision of Sargeras (item 32235) is in the candidate
pool, was simmed and is in the finished ranking. It fails the cutoff, so the
tab puts it in the closed "N item(s) below the cutoff" group. It is not
dropped, not absent from the pool, and not removed by a filter. A reader
sees it only after opening that group.

Line numbers are in `vendor/tbc-new-fork` at fork commit
`02d0ea2ad1dae34087a6d69d316f9c3879bd8247`, the `commit` in
`data/wowsims-fork.lock.json` on 2026-09-30. Read them with
`git -C vendor/tbc-new-fork show 02d0ea2a:<path> | sed -n <from>,<to>p`.
`upgrades_tab.tsx` is `ui/core/components/individual_sim_ui/upgrades_tab.tsx`;
`engine/` is `ui/core/components/individual_sim_ui/upgrades/engine/`.

**In the pool, tagged BiS.** In
`ui/core/components/individual_sim_ui/upgrades/data/enh-p3.universe.json`
the entry for 32235 has `"bisTags": ["BiS"]`, `"bisSets": ["p3"]` and source
Black Temple, Illidan Stormrage. It is the only head with a `BiS` tag in
that file. `enh-p4` also tags it `BiS`; `enh-p5` does not.

**The code path.**

1. `rank.ts:1303` sets `belowCutoff = !meetsCutoff(...)`. `meetsCutoff`
   (`engine/cutoff.ts:132-138`) passes a row whose delta clears either the
   absolute DPS arm or the percentage arm.
2. `applyView` (`engine/view.ts:440-480`) recomputes the verdict per row as
   `belowCutoffInView` (`view.ts:461`, `belowCutoffUnderView` at `188-205`,
   which counts set potential when that toggle is on). The shortlist is the
   rows that are not below the cutoff (`view.ts:475`).
3. The shopping list renders `view.shortlist` in the main table and every
   other non-owned row in the fold (`upgrades_tab.tsx:2734`, `2864`,
   `2911`). The fold is a `<details>` with no `open` attribute
   (`upgrades_tab.tsx:2988-3000`), so it starts closed. A slot pane does
   the same for its slot (`upgrades_tab.tsx:2823-2827`).

**Seen live, 2026-09-30.** Page `http://localhost:5173/tbc/shaman/enhancement/`
in the Browser pane, a settled ranking reading "Your current gear: 2244.0
DPS. Took 1225s." (the third Cherryboom run). Read with page-console queries
only; no setting changed and no sim started.

- Shopping list: 25 rows in the main table, and the closed group
  "917 item(s) below the cutoff". Cursed Vision is row 87 of that group,
  with the BiS badge and a DPS figure of -18.3.
- Head pane: the main table says "No upgrades found". Cursed Vision is row
  1 of "61 item(s) below the cutoff". So it is the best head the run found,
  and the pane still shows it only inside the group. (That group was open
  when read; this agent did not open it.)
- 14 rows in the shopping list carry a BiS badge: 8 in the main table and
  6 in the fold. The 6 folded ones: Shoulders of Lightning Reflexes -3.6,
  Cursed Vision of Sargeras -18.3, Syphon of the Nathrezim -24.9, Midnight
  Chestguard -27.8, Bow-stitched Leggings -30.1, Fists of Mukoa -37.0.
- The fold is "below the cutoff", not "negative". Its first row is
  Romulo's Poison Vial at +2.4. So a BiS item with a small positive delta
  would be folded too.
- Worn head: Cataclysm Helm (30190). The character also wears Cataclysm
  Chestplate, Gauntlets and Legplates. So swapping the helm most likely
  breaks a worn tier 5 four-piece bonus, which would explain the negative
  delta (hypothesis, untested). The Cursed Vision row shows no "set detail"
  note. Why not is not checked.

**What "BiS" means in the tab.**

- The tag comes from the spec and phase universe file (`bisTags`), built by
  `scripts/assemble_universe.py` (the file's `generatedBy`) from upstream's
  curated preset gear sets. The engine copies it onto each ranked row
  (`rank.ts:1314`).
- The badge: when set chips are selected, one badge per selected set that
  contains the item, named after the set (`rowTagLabels`,
  `upgrades_tab.tsx:3346-3352`). Otherwise a generic "BiS" or "Alt" badge
  from `bisTags` (`upgrades_tab.tsx:3383`). No set chip was active on the
  live page, so its badges were the generic kind.
- "BiS only" (`applyBisFilter`, `upgrades_tab.tsx:2648-2657`; tooltip "Show
  only items on the phase's curated BiS list.") keeps only rows with any
  `bisTags`, in both the main table and the fold. It does not move a row
  across the cutoff. So with "BiS only" on, Cursed Vision stays in the fold
  (from the code; the toggle was not tried live).
- The engine has a `pinBis` view option that sorts `BiS` rows first
  (`compareRows`, `view.ts:421-431`; PLAN.md §4.1 at `PLAN.md:258` and `:271`). The tab
  does not pass it (`currentViewOptions`, `upgrades_tab.tsx:2659-2675`).
  It sorts before the shortlist split (`view.ts:470-475`), so it would not
  pull a folded row into the main table either.

## Options as filed on 2026-09-30 (option A chosen on 2026-10-11)

The 2026-10-11 chat question used its own letters for its options B to D.
Its option A is the same as option A here.

Each is a fork change plus a re-pin; follow AGENTS.md, "The forked tab
repo". Counts below are from the live page above.

**A. BiS rows always in the main table.** A BiS-tagged row that fails the
cutoff is shown in the main table with its negative (or small) delta.

- Gains: the owner sees every BiS item without opening the fold. The Head
  pane would show Cursed Vision instead of "No upgrades found".
- Costs: the main table no longer means "clears the cutoff". Sorted by
  delta, these rows sit at its bottom (here 25 rows become 31). The slot
  tab count (`upgrades_tab.tsx:2564`) counts the shortlist, so it would
  count them too, and the ThatsMyBis export reads `view.shortlist`
  (`upgrades_tab.tsx:2731-2733`), so they would be exported as priorities
  unless they are kept apart. ADR-0020 says a filter never moves the bar.
  Whether an exception by tag conflicts with it is for the owner
  (hypothesis).

**B. A separate BiS group.** A small group, open by default, between the
main table and the fold, for example "BiS items that do not beat your
gear", listing the folded BiS rows with their deltas.

- Gains: the main table, the tab count and the export keep their meaning.
  The reader sees the BiS rows and is told why they are not upgrades.
- Costs: a third group in every pane, and the fold still lists the same
  rows unless they are moved out of it. Adds to the crowded results area
  (tickets 312, 486).

**C. Only under "BiS only".** When "BiS only" is on, show the BiS rows that
fail the cutoff in the main table or open the fold. With the toggle off,
nothing changes.

- Gains: the smallest change to the default view. It fits what a reader
  who ticks "BiS only" is asking: see the list, good or bad.
- Costs: the default view still hides Cursed Vision, which is what the
  owner noticed. The export question from A applies while the toggle is on.

**D. Say it in the fold's summary.** Keep the rows where they are; change
the summary, for example "917 item(s) below the cutoff (6 BiS)".

- Gains: cheapest; no row moves, no count or export changes.
- Costs: the reader still has to open the group to see which items.

**E. No change.** A folded BiS item means the character's worn gear beats
it in this sim. The tab already says so by where it puts the row.

## Relation to other tickets

- **525 (open).** The same fold hides the "removes worn …" overflow. Any
  option that shows folded rows by default puts those cells on screen, so
  525's layout fix should land first or together.
- **527 (open).** A source/zone view filter. It would sit in the same
  "View options" group as "BiS only". Whether BiS rows are exempt from the
  cutoff under a zone filter is a question for whichever lands second.
- **305 (blocked).** Whether empty slot tabs render. With option A or C a
  slot like Head stops being empty under "BiS only".
- **309 (open).** Owned rows are dropped from the fold
  (`upgrades_tab.tsx:2864`). A worn BiS item is therefore never shown in
  the fold; any option here should decide whether that still holds.
- **430 (closed)** set the badge rules; **312 (closed)** covered the
  "BiS only" control's wording.
- Checked and not related: 350, 493, 506, 278, 463, 483 are layout and
  sort tickets about the row cells and table shape, not about which rows
  are shown.

## Acceptance

- [x] The owner rules. Done 2026-10-11: option A (see the note at the
      bottom of this file).
- [x] A BiS-list row below the cutoff appears in the main table, sorted by
      its gain, marked as not an upgrade; slot counts and the ThatsMyBis
      export count only rows that meet the cutoff; unit tests cover both.

The cutoff is becoming a flat 3 DPS bar (ticket 615, branch
`feat/flat-cutoff`, in progress), so "below the cutoff" here means below
that bar once it is merged.

## Out of scope

- Why Cursed Vision sims at -18.3 for this character. If the owner doubts
  the number, that is an SME check (`sme-rank-review`), not this ticket.
- The pre-sim "Sim only selected set items" prune.

## Comments

## 2026-10-11 — owner ruling: option A

The owner was asked in chat on 2026-10-11: "Q-528: how should the tab show
BiS items that do not beat your gear?" Option A read: "put BiS items in the
main table anyway. You see them without a click. But the table would no
longer mean 'these beat your gear', so the slot counts and the ThatsMyBis
export would start including items that are not upgrades." The other
options were B (a small open group under the table), C (name the BiS count
in the closed group's title; recommended) and D (no change). The owner
answered: "A".

The session then decided the details and stated them to the owner, who did
not object:

- A BiS item that misses the cutoff goes into the main table, sorted by its
  gain like any other row.
- The row has a short mark saying it is not an upgrade.
- The slot counts and the ThatsMyBis export keep counting only real
  upgrades (rows that meet the cutoff).

Implementation runs later, together with ticket 614 in one fork branch,
after the flat-cutoff work (ticket 615, branch `feat/flat-cutoff`) is merged.
Both tickets change the same fork file,
`ui/features/upgrades/model/results_view.ts`.

## 2026-10-11 — closed

Verified by: tbc-new-fork@72de95a28 ("Show BiS rows below the cutoff in the
main table (528)"), inside fork `176268e7c`, which
`data/wowsims-fork.lock.json` names on `feat/bis-rows`; review
`docs/reviews/feat-bis-rows.md`. The tests are the four cases in the
"BiS-list rows below the cutoff" block of
`ui/features/upgrades/model/results_view.test.ts`: main table in gain order
marked as not upgrades, left out of the slot counts and the export's
shortlist, owned rows kept out, and the same rule under BiS only and Set
potential.

Re-run from the pair's fork folder, `vendor/tbc-new-fork`:
`node node_modules/vitest/vitest.mjs run ui/features/upgrades/model/results_view.test.ts ui/features/upgrades/components/ResultsPanes/ResultsPanes.test.tsx`
(2 files, 39 tests passed on 2026-10-11 at fork `176268e7c`). The root
`pnpm verify` does not run these tests: `vitest.config.ts` excludes
`vendor/`.
