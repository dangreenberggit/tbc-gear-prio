# Badge source classification is thin across generated universes

Status: open
Origin: pre-merge review feat/upgrades-all-dps-specs (domain D4)
Blocks: none

Only 29 records classify as `kind: "badge"` vs 17,861 `unknown` across the
generated universes. Spot-checked badge items are phased correctly, but the
unknown bucket is too large to rule out misclassification by sampling. The
optional Wowhead source-attribution backfill (ticket 292 family) is the
structural fix; this ticket tracks measuring the gap per spec.
