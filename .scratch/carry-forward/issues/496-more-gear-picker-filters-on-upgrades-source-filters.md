Status: open
Type: task
Priority: low (owner, 2026-09-24: a note "for much later")
Origin: owner answer during stage-gate upgrades-tab-closeout round 2b (2026-09-24)
Blocks: none
Blocked by: none
Related: 482

# Offer more Gear-picker filters on the Upgrades tab's own source filters

Offer more of the Gear-picker filters on the Upgrades tab's own source
filters, kept independent of the Gear-tab filters.

The owner approved 482's behaviour on 2026-09-24: Gear-picker filters
must not affect the Upgrades ranking. This ticket keeps that rule. Any
filter added here belongs to the Upgrades tab and reads nothing from the
Gear tab's filter state.

## What would close this

1. A list, agreed with the owner, of which Gear-picker filters the
   Upgrades tab should offer.
2. Those filters on the Upgrades tab, stored separately from the Gear
   tab's, with a check that changing a Gear-tab filter still does not
   mark the ranking stale (482).
