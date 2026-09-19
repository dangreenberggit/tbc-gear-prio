Status: closed
Closed: d17587b5a
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

## Closed

Fork commit d17587b5a (re-pinned in data/wowsims-fork.lock.json, Unit C). A
run-settings chip control ("Always sim these sets"), beside 417's source
checkboxes. Chips are the gear tab's `saved-data-set-chip badge rounded-pill`
class toggled as a multi-select, built from (a) the spec's phase-BiS presets
(`individualConfig.presets.gear`) and (b) the saved gear sets under
`getSavedGearStorageKey()` (parsed with `SavedGearSet.fromJson`) — no engine
boundary crossed, no set list re-implemented. Saved sets are re-read on the
tab's `shown.bs.tab` (C33) so one saved on the Gear tab after this tab was built
still appears.

Q1-Q4 resolved from the code: Q1 sets come from presets + saved-gear storage;
Q2 "guarantee" = the set's in-phase items are unioned into the pool in
`effectivePool` regardless of prune/source filters (never pinned into the
baseline), because BiS-prune is itself a prune not an add; Q3 label is
"P{phase} - {name}" unless the name already leads with its P-token (ret shows
"P2"/"P3 - Bulwark"), and row membership is an exact itemId test against the
set's ids (the universe's set tokens are phase strings, not set names, C20/C21);
Q4 one unit, copy to the owner at sign-off. Two stated limits: an item absent
from the phase universe cannot be added (each chip shows "n/m in pool" and
disables at 0), and a non-zero candidate cap still applies engine-side after the
union (the caption gains a note when a cap is set and a set is selected).

Verified-by (live, ret page phase 3): the chip list shows "P1 - Pre-raid", "P1",
"P2", "P3", "P3 - Bulwark" with n/m counts. Selecting "P3 - Bulwark" with only
Karazhan ticked and BiS-prune off raised eligible to 140 (the 16 Bulwark items
unioned in past the Karazhan-only filter); an uncapped run then produced
"Bulwark of the Ancient Kings" tagged "P3 - Bulwark". A saved gear set written
under the page's saved-gear key appeared as a "My Test Set 0/2 in pool" chip
after a Gear→Upgrades tab switch, and disabled at 0. At phase 1 every ret chip
reads 0/16 and disables (the phase-1 candidate pool does not contain those item
ids — a `poolFor` property, and the disabled-at-0 rule applied to it). Desktop
gate (h) matches the golden with NO set selected (union is a no-op), confirming a
no-selection run is the exact prior ranking. `grep -c upgrades-set-tag` >= 1 in
TAB and SCSS. `pnpm verify` 0; layout gate 45 assertions green with tags present.
Note: the on-row tag was verified; the candidate-cap-after-union limit is a
documented behaviour (an owner sign-off eyeball item, not a defect).
