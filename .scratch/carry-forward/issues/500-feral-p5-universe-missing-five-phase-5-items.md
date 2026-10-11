Status: open
Type: bug
Origin: .scratch/stage-gate/upgrades-tab-closeout/set-rule-scenarios/report.md (scenario G, 2026-09-24)
Blocks: none
Blocked by: none

# feral-p5.universe.json has no entry for five phase-5 items

Scenario G ran feral in Thunderheart 4pc at phase 5, to check whether the
tool can show moving the 4pc to a different worn-piece combination. It
could not: `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/data/feral-p5.universe.json`
has 0 matches for five phase-5 items that the scenario needed as
candidates:

- 34444, Thunderheart Wristguards (phase-5 wrist)
- 34556, phase-5 waist
- 34573, phase-5 feet
- 34397, Bladed Chaos Tunic
- 34370, Gloves of Immortal Dusk

34188 (Leggings of the Immortal Night) and 31034 (Thunderheart Gauntlets)
each have exactly 1 match in the same file. Re-run with `Select-String
-Path <that file> -Pattern '\b34444\b'` (or the other four ids) to
reproduce the 0-match result.

The run's capture recorded the resulting gap directly: `errors: ['no set
row matching "Thunderheart Wristguards" (off)', 'no set row matching
"Thunderheart Wristguards" (on)']` (report.md, Scenario G run record).

**The cause is not investigated.** This ticket is the gap, not a diagnosis
of why the generator or its source data dropped these five items.

## What would close this

1. Find why these five ids are absent from `feral-p5.universe.json` while
   34188 and 31034 are present — a generator bug, a missing source
   pin, or a deliberate exclusion.
2. Regenerate or hand-fix the universe so the five items are candidates,
   with the regen command and its diff recorded.
3. Re-run scenario G (or an equivalent capture) to confirm the tool can
   now show the phase-5 Thunderheart wrist/waist/feet swap the owner
   asked about.

## Comments

**2026-09-24, owner:** The owner did not approve this ticket for the
current Upgrades-tab closeout round, and it was removed from Round 2c.
The owner said: "making an item database is not the job of this fork."
The ticket's premise is in question. It proposes adding more hand-built
admission routes (token maps, a Sunmote map, a force-include) so that the
repo's own candidate universe grows. The owner's view is that the tool
should not maintain its own item database. Before anyone acts on this
ticket, it needs a decision on where the Upgrades candidate pool should
come from: this repo's assembled universes, or the item data wowsims
already ships. The lesson from ticket 301 applies: borrow upstream, don't
re-mirror. The investigation notes are at
`.scratch/stage-gate/upgrades-tab-closeout/round-2c/investigation-500.md`
(gitignored).

**Owner decision 2026-09-24:** "items come from wherever wowsims gets
items from as far as this fork is concerned." The fork's candidate pool
should use wowsims' own item source, not this repo's assembled universes.
500 and 298 are superseded by that direction; see
`.scratch/carry-forward/issues/505-fork-candidate-pool-should-use-wowsims-item-source.md`.

**2026-10-11 — owner answers to Chunk 3b step 6 (Q-feral-p5) of
`.scratch/plans/upgrades-tab-finish-line.md`.** The cause is now known, and
the fix is split into new tickets. The owner rejected the earlier framing
and said where the cause lies: "These are tier items like any other so many
it has to do with the sources--> tier token -->tier vendor --> tier item
system". On the fix: "It's kind of yikes that this was missed, and even
more yikes that it needs to be added manually. There should be a
programmatic way to check and add such items (for example if we add more
specs)".

Close condition 1 (why the five ids are absent), answered:

- 34444, 34556, 34573 (Thunderheart wrist, waist, feet): the wowsims
  database gives them no source and does not contain their Sunwell tokens;
  `data/two-hop/feral-tokens.json` has no rows for those tokens (its note
  at `:12`). Fix: ticket 609.
- 34397 (Bladed Chaos Tunic): a Sunmote upgrade; only ret has a Sunmote
  map (`scripts/assemble_universe.py:817` for feral: `None`). Fix: ticket
  612.
- 34370 (Gloves of Immortal Dusk): crafted from a Sunwell pattern; the
  pattern's zone is recorded but no membership route reads it. Fix:
  ticket 611.

Ticket 610 adds the check that would have caught this, for all 11 specs;
ticket 613 moves ret and feral onto the same item rules as the other nine
specs (owner: "Yes"). This ticket stays open because close condition 3
(re-run scenario G, or an equivalent capture, showing the phase-5
Thunderheart wrist/waist/feet swap) is in none of those tickets. It closes
when 609, 611 and 612 are closed and that capture is recorded here. It is
no longer superseded by 505 (see 505's 2026-10-11 note).
