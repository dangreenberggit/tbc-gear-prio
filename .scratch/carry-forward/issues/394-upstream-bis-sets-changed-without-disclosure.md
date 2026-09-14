Status: closed
Type: task
Origin: docs/reviews/feat-upstream-catchup-chunk1.md
Blocks: none
Blocked by: none

# Upstream's P3 BiS sets changed for mage and shadow priest, unmentioned in the prose

Closed 2026-09-14 by commit `2c61c723` on `feat/upstream-catchup-chunk1`.
ADR-0033 Consequence 6 names the three gear-set files, the four item
substitutions, the connection between `35319` and the phase 4 → 3 Vindicator
correction, and the universes that follow them, sourced to the `git diff` over
`ui/mage/dps/gear_sets/` and `ui/priest/dps/gear_sets/`. Measured while writing
it: those three files are the complete set of gear-set changes in this range —
no other class's gear sets moved — so the claim is safe to limit to mage and
shadow priest. The fixture note that was Consequence 6 is now 7.

Verified with
`grep -c '28783\|32343\|35319' docs/adr/0033-upstream-is-master-again.md` → 3,
and `node node_modules/prettier/bin/prettier.cjs --check` on the ADR → rc 0.

The engine re-pin moved upstream's own reference gear sets, and this repo's
committed universes correctly followed. Nothing in the branch's prose says so.

`data/wowsims.lock.json` carries new sha256 values for `mage_p3_staff.gear.json`,
`mage_p3_sword.gear.json` and `shadow_p3.gear.json`. Reading those files at both
pins:

- **Mage P3**, ranged slot: `32363` Naaru-Blessed Life Rod → `28783` Eredar Wand
  of Obliteration.
- **Shadow priest P3**, ranged slot: `29982` Wand of the Forgotten Star → `32343`
  Wand of Prismatic Focus; neck slot: `30666` Ritssyn's Lost Pendant → `35319`
  Vindicator's Pendant of Subjugation.

The `bisTags` / `bisSets` entries in `mage-p3/p4/p5.json` and
`shadow-p3/p4/p5.json` move off the old ids and onto the new ones, faithfully.

Note `35319` is one of the three Season 3 Vindicator items upstream reclassified
from phase 4 to phase 3 in the same range — the two data corrections are
connected, not independent.

## Why this is a finding

The data is **correct**; it mirrors upstream. The gap is disclosure:
`docs/adr/0033-upstream-is-master-again.md` lists six consequences and none says
that the BiS reference sets this project publishes changed for two specs. A
reader of the ADR would not learn that shadow priest's P3 BiS wand and neck both
moved.

Related: [[393-adr-0033-omits-ranking-visible-engine-changes]] — the same
document, the same class of omission (data and behaviour that moved, correctly,
without being written down).

## What would fix it

One consequence entry in ADR-0033 naming the three gear-set files whose hashes
moved and the item substitutions above, sourced to
`git -C vendor/tbc-new-fork diff <old> <new> -- ui/mage/dps/gear_sets/ ui/priest/dps/gear_sets/`.
