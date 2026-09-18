Status: open
Type: feature
Origin: owner request, 2026-09-18 (viewing the running tab)
Blocks: none
Blocked by: none
Priority: BLOCKING — owner considers this part of the tab being finished
Related: 417 (content checkboxes in sim settings — sibling settings control), the main gear tab's saved-sets / phase-BiS UI

# Sim settings: select gear sets to guarantee into the sim, with result tags

Owner request on the Upgrades tab. Add a **set-selection control** to the sim
settings that guarantees chosen gear sets are included in the simming — the same
way the existing "BiS" option forces the BiS-list items in. It should let the user
select **any sets available in the main gear tab**, and each selected set's label
carries through into the **result tags** on ranked rows.

## What the owner described

- **A set-selection option in sim settings**, analogous to the existing BiS
  toggle: selecting a set guarantees its items are considered in the ranking run
  (not just filtered afterward).
- **Source of sets:** anything selectable in the **main gear tab**, including:
  - the phase BiS sets (e.g. Phase 2 → "BIS 6%"), and
  - the user's **saved** gear sets.
- **UI:** a **multi-select tags UI similar to the gear page** — the same tag-chip
  selection idiom the gear tab uses, allowing multiple sets/tags at once.
- **Result tagging:** the selected set's label is used in the tags shown on
  matching results. Owner's example: the gear tab's "Phase 2" tab, set "BIS 6%",
  would display as **"P2 - BIS 6%"** on a result that comes from that set.

## Open questions to settle before building (do not assume)

1. **Where the sets live.** How does the main gear tab enumerate phase-BiS sets
   and saved sets today? Find the component/store that backs the gear-page tag
   selection and reuse it — do not re-implement a set list. (Likely in
   `ui/core/components/gear_tab*` / the individual-sim-ui gear picker and the sim
   preset/saved-settings store.)
2. **"Guarantee into the sim" semantics.** Does forcing a set in mean its items
   are always simmed as candidates regardless of the content/phase filters (like
   BiS-prune does), or that they are pinned into the baseline? Confirm the exact
   behaviour against how the existing BiS option works so this is consistent.
3. **Label → tag plumbing.** How is a set's display label ("P2 - BIS 6%") derived
   (phase abbreviation + set name), and how does a result row know which selected
   set(s) it belongs to so it can show the tag? Define the mapping.
4. **Interaction with 417.** 417 turns content sources into checkboxes in the same
   sim-settings area; this set-selection control sits alongside them. Lay them out
   together so the settings area stays coherent.

## What would close this

- Sim settings has a multi-select set/tag control matching the gear page's idiom,
  populated from the same sets the gear tab offers (phase BiS + saved sets).
- Selecting one or more sets guarantees those sets' items are in the ranking run,
  consistent with how BiS is guaranteed.
- Ranked result rows that come from a selected set show that set's label as a tag,
  formatted like the owner's example ("P2 - BIS 6%").
- Verify on a live run: select a phase-BiS set and a saved set, run, and confirm
  (a) those items appear in the ranking and (b) the rows carry the right tags.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(sim-settings area + result row tags), the gear-tab set/tag source it borrows
from, the pool/candidate assembly in `upgrades/engine/` (candidates that must be
guaranteed in), and `_upgrades_tab.scss` for the tag-chip styling. Prefer reusing
the gear page's own tag component over a bespoke one.

## Notes

BLOCKING per the owner. This is the heaviest of the current tab-surface items —
it touches candidate assembly (guaranteeing items in), a borrowed gear-tab
control, and result tagging — so it likely warrants its own stage-gate plan
rather than being lumped with the light polish tickets (415/416/419/420/421/422/
423). Sequence after the open questions above are answered.
