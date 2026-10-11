Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b (Tab-blocking; owner answer Q-ret-feral-route)
Type: task
Origin: owner answers to Chunk 3b step 6, 2026-10-11 (Q-ret-feral-route)
Blocks: none
Blocked by: none
Related: 609, 610, 611, 612, 505, 297 (db-phase epic floor), 293 (db-phase source attribution), ADR-0028

# Ret and feral build their item lists by older rules than the other nine specs

A ret or feral player never sees about 300 badge, PvP, quest and world
items that the other nine DPS specs' lists include when the spec can wear
them.

## The owner's words, 2026-10-11

Asked whether ret and feral should follow the same item rules as the
other nine specs (db-phase admission on, about 300 badge, PvP and quest
items added), the owner answered: "Yes"

## What happens today

- `scripts/assemble_universe.py` has a per-spec switch,
  `db_phase_membership` (default `False`, `:541`). When it is on, an item
  the spec can wear that has a `phase` in the wowsims database but no
  source the builder can parse is admitted by its phase. The nine newer
  specs set it to `True` (`:855` onward); ret and feral leave it off.
- The comment at `:593-597` gives the reason: it was added "in place of
  the Wowhead-list membership layer the 9 new specs do not have (plan
  amendment 1). Off for ret/feral, whose universes must stay
  byte-identical."

## What a prototype measured (2026-10-11)

A throwaway prototype (`completeness.py` and `unique_gaps.py` in a session
scratchpad, may be gone) compared each spec's phase-5 list with every
epic-or-better wowsims item the spec can wear. Counting items whose own
phase is 2 or later:

- 294 unique badge, PvP (not arena), quest or world items with no source
  in the database are missing from ret's or feral's lists (404 spec-rows:
  ret 226, feral 178). No other spec misses any.
- 117 unique arena items are missing for ret and feral only (ret 51,
  feral 69 spec-rows); the nine db-phase specs miss none.

## What changes for players

Ret and feral rankings will change: their candidate lists grow, and some
of the added items may rank as upgrades. The committed ret and feral
fixtures, golden files and tests that assume today's lists will need
re-recording; the byte-identical rule at `:593-597` is dropped.

Interaction with tickets 609 and 612 (hypothesis, untested): a sourceless
phase-5 item such as a Thunderheart Sunwell piece or a Sunmote upgrade may
enter the ret or feral list by phase alone once this lands, as it already
does for the nine db-phase specs. Those tickets still give such items
their real source.

ADR-0028 may need an amendment (hypothesis, untested): it makes the local
list primary for membership and the wowsims database its auditor, and this
change makes the database a membership route for ret and feral as well.
Decide this when the work is planned; this ticket does not edit the ADR.

## What would close this

1. Ret and feral use the same membership rules as the other nine specs
   (`db_phase_membership=True`, or the switch removed), and the
   byte-identical comment at `:593-597` is replaced.
2. The closing note lists, per phase, how many items ret's and feral's
   lists gained and lost, with the regen command.
3. The ret and feral fixtures and goldens that change are re-recorded,
   with the reason in the commit.
4. Whether ADR-0028 needs an amendment is answered in the closing note,
   with the ADR edit (if any) made on that branch.
5. `pnpm verify` rc=0.
