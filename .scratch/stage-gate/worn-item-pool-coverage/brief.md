# Brief — worn items must be scored against, not dropped

Opened 2026-08-21. Base `011159de72e15fc6269d08c0b5df147e294e8123`, branch
`fix/worn-item-pool-coverage` off `dev`-descendant
`feat/stage-2-close-shortlist-box`.

## Goal

Fix ticket 253 so the Stage 2 gate box can close: **a worn item that is not in
the candidate pool must still be the baseline its slot is scored against.**

Today, when a character's worn item is absent from the pool for its slot, the
engine scores that slot against an **empty slot**, so every candidate in it
shows an inflated gain. The report discloses this
(`ranking.plausibilityWarnings`, `cause: worn-unrankable`) but the inflated rows
still appear in the shortlist. This is the sole reason PLAN.md §14 Stage 2's
last gate box stayed open: shredzepelin had three such slots, leaving 4 of 14
above-cutoff rows measured against real gear, and an SME returned `do-not-trust`.

## Read this first — the diagnosis is settled, do not re-derive it

`.scratch/carry-forward/issues/253-worn-gear-missing-from-pool-makes-slots-unrankable.md`,
including its **"Correction, 2026-08-21"** and **"Cause 3"** sections. Summary of
what is already established, with commands in the ticket:

- **The heroic exclusion is deliberate.** `scripts/assemble_universe.py:68-76`
  admits only Magisters' Terrace on purpose; every other heroic drops phase-1
  items and admitting them "would rewrite the phase-1 end of every tier", which
  is ticket 17's pre-raid question. **Do not widen the heroic gate.**
- **The Ahune items have no source data anywhere.** `278827` and `278819` carry
  `sources: null` in wowsims' own `db.json`, and `assemble_universe.py` has no
  world-event concept. There is nothing to read and nowhere to read it from.
  **Do not invent holiday source data.**
- **Ticket 108 already fixed item *resolution* for these ids** — they are
  legitimate TBC phase-2 epics with full stats the sim pays (~96 DPS for the
  pair), externally verified against Wowhead. That is a different layer and is
  not regressed. **Nothing to re-do there.**

The generalising defect is **cause 3**: the engine should score against what the
player wears regardless of *why* the item is missing from the pool. Fixing that
clears shredzepelin's neck, back and waist and nexess's wrist at once, without
touching either scope question above, and it prevents the next silently-dropped
worn item (ticket 173's standing complaint).

## Scope

In scope:

- Making worn items their own slot's baseline even when absent from the pool.
  Force-inclusion in-slot is the obvious shape; **read ticket 174 first** —
  "force-included items claim unknown origin they have" is adjacent and its
  mistake should not be repeated.
- Whatever disclosure change follows: if a worn item is now scored against but
  has no source, the row's provenance must say something true. A
  `worn-unrankable` warning that no longer applies must stop being emitted.
- Tests. `tdd` skill; red first. The 19→17 slot mapping and ranking statistics
  are named in AGENTS.md as directly unit-testable pure functions.
- Regenerating the three Stage 2 shortlists afterwards and reporting the new
  `plausibilityWarnings` counts against the recorded baseline of shredzepelin 3
  / nexess 1 `worn-unrankable`.

Out of scope:

- Widening the heroic gate (ticket 17's question).
- Inventing holiday/world-event source data.
- Ticket 227's role-relevance question (parked `wontfix`).
- Closing the Stage 2 gate box. That needs a fresh SME pass on the corrected
  output, which is a separate step after this lands. **Do not edit PLAN.md's
  gate line.**
- `WclGearSource` / going live; any Stage 3 work.

## Open questions

### Q1. Where does the worn item enter, and against what is it scored?

- **Candidate A — force-include the worn item into its own slot's candidate
  set** at pool-assembly or rank time, flagged as worn. Wins if the baseline
  then reflects real gear and the item's own row is suppressed or marked as
  already-owned rather than appearing as an upgrade over itself.
- **Candidate B — score the slot against the worn item without adding it to the
  pool**, i.e. the baseline composition reads worn gear directly and the pool
  stays a pure candidate list. Genuinely different: it separates "what we
  compare against" from "what we rank". Wins if the pool's meaning stays clean
  and no consumer has to learn that pools now contain non-candidates.
- **Measured by:** which one leaves `plausibilityWarnings` correct, keeps
  `contentHash` semantics intact (PLAN.md §4.1 — display-only options must not
  change it), and needs fewer consumers to change. Say which consumers you
  checked.

### Q2. What happens to a worn item with no source data?

- **Candidate A — synthesise a source** of a new kind (e.g. `worn`/`unknown`).
  Wins if downstream display and grouping already tolerate an unknown kind —
  note `unknown` already appears in live reports, so check what it renders as.
- **Candidate B — allow a null source on worn-only entries** and make consumers
  handle absence. Wins if ticket 174's complaint (items claiming unknown origin
  they actually have) argues against synthesising a label.
- **Measured by:** read ticket 174 and `data/atlasloot_sources.json`'s null
  handling; state which consumers break under each.

### Q3. Does the fix actually clear the gate blocker?

- Not a design question — a verification one. **Measured by:** regenerate all
  three shortlists and compare `worn-unrankable` counts to the recorded 3 / 1 /
  0. If any remain, say which and why.

## What done means

`pnpm verify` green; tests that fail before the fix and pass after; the three
regenerated shortlists reporting their new warning counts; ticket 253 updated
with what landed and its acceptance boxes resolvable. The gate box stays ☐ —
closing it needs a fresh SME pass, which is not this work.

## Constraints

- Durable claims (AGENTS.md): every causal claim in a committed artifact points
  at a re-runnable command or says hypothesis/untested in the same sentence.
- Commit per green slice, not one commit at the end.
- Do not merge to `dev`.
