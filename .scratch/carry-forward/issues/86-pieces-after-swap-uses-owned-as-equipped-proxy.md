Status: open
Type: bug
Origin: pre-merge review of feat/set-bonus-value (spec C3 / adversarial 2 / domain "lesser item")
Blocks: none
Blocked by: none

# `piecesAfterSwap` derives "already worn" from `item.owned`, an ownership proxy

`applySetContext` (rank.ts, set-bonus prospective value feature) computes
`piecesAfterSwap` using `item.owned` — "the player possesses this exact item"
— as a stand-in for "this swap raises the set count". Two failure shapes:

1. An owned-but-benched set piece counts as not joining the set, understating
   `piecesAfterSwap` (spec §3: `piecesAfterSwap ≥ before when the candidate
   joins the set`).
2. Verified benign today only because all six `IMPLEMENTED_IN_SIM` sets have
   exactly one piece per canonical slot. An 8-piece set (Lightbringer /
   Thunderheart at P5, wrist/waist/feet) puts two set pieces in contention and
   can flip `crossesThreshold` wrongly — the report then claims "completes 4pc
   (included in delta)" for a swap that completed nothing.

Fix: derive the count from the swapped equipment array (setCounts before/after
the actual swap, as `setBreakNote` already does), not from `owned`.
