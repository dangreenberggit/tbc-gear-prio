Status: closed
Type: task
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: 448 (the disclosure), 456 (Sim-sets reshape — may absorb this)
Resolution: Fixed in fork commit 8bc15cad9 (re-pin 09caef2b) as a live reword,
  not moot (the off-phase disclosure still exists after the 456 reshape).
  settings.sets_other_phases now reads "Other sets ({{n}})". Verified live: the
  disclosure reads "Other sets (n)" on ret and feral (live-verify; tab-review
  disclosureText fact).

# "Other phases" disclosure label should be "Other sets"

Owner report, 2026-09-20. The Sim-sets disclosure label "Other phases ({{n}})"
should read "Other sets ({{n}})".

## What would close this

- Reword `upgrades_tab.settings.sets_other_phases` to "Other sets ({{n}})"
  (value only, no schema change).
- If 456 reshapes Sim-sets into a phase picker, this control may change or
  disappear — coordinate so this reword isn't wasted. If 456 lands first and
  removes the disclosure, close this as moot.
