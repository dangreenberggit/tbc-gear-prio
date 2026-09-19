Status: open
Type: task
Origin: pre-merge-review adversarial axis, feat/tab-signoff-followups, 2026-09-18
Blocks: none
Blocked by: none
Related: 417 (the source-checkbox filter this describes)

# Content filter: a multi-source item stays if ANY of its sources is ticked

Adversarial finding (minor, behaviour note) from the feat/tab-signoff-followups
pre-merge review. In the 417 source-checkbox filter, `sourceMatches` keeps a pool
entry if it matches any of its own sources against the ticked set
(`upgrades_tab.tsx` ~L293-297). An item that drops from more than one source
(`sources?: ItemSource[]`, plural) therefore survives when the user unticks ONE
of its sources, as long as another of its sources stays ticked.

This is coherent — "keep an item that is reachable from any ticked source" is a
defensible semantics for a pre-sim pool filter, and it matches the engine's own
"reachable from any source" model. But it may surprise a user who unticks a
source expecting every item they associate with it to disappear.

## What would close this

Decide and record which behaviour is wanted:
- **Keep as-is** (reachable-from-any-ticked-source) — then add one line to the
  417 UI or a tooltip so the behaviour is stated, and close this.
- **Change to strict** (hide an item if ANY of its sources is unticked) — a
  different filter semantics; only if the owner wants it. Costlier and arguably
  wrong for items with a raid + badge-vendor dual source.

Owner/eng call; default recommendation is keep-as-is with a one-line note.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(`sourceMatches`) and the 417 source-filter UI/tooltip.

## Notes

Minor, deferred from the pre-merge review (not merge-blocking). Behaviour is
correct-by-one-reading; this ticket is to make the choice explicit rather than
implicit.

## Also here (pre-merge Standards S2, perf smell, minor)

`guaranteedSetsAvailable()` re-parses `localStorage` (JSON.parse) on every call —
`effectivePool`, `refreshSetChips`, `logAssumptions`, and `resultRow` (once PER
result row). Correctness is fine; it is a per-row localStorage read + parse. Cache
the parsed set list per render (or per settings-change) rather than re-reading it
per row. Folded here because it lives in the same 417/424 settings family; not
merge-blocking.
