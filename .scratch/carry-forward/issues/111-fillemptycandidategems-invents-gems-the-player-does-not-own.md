Status: open
Type: decision
Origin: combined 103/106 diagnostic loop, 2026-08-10 (`.scratch/set-bonus-value/loop-103-106/08-sequential-gems-typesimple.md`)
Blocks: none
Blocked by: none

# `fillEmptyCandidateGems` fills sockets wowsims leaves empty, inflating candidate deltas

**This needs an owner decision before any code moves.** It is a real, measured
overstatement, but removing it collides with a settled spec requirement — so it
is filed as a decision, not a bug to fix.

## The measurement

On the owner's gear under their `TypeSimple` rotation, seeds [11,22,33,44,55] @
3000 iters, pinned CLI v0.0.101
(`python .scratch/set-bonus-value/loop-103-106/sim_pkg_uimigrate.py`; see
`08-sequential-gems-typesimple.md` for the exact invocations):

| T6 four-piece arm | delta |
|---|---|
| `PKG_PROD` (production today) | **+113.42** |
| `PKG_FILL24028` (fill, but with a gem the owner actually owns) | +111.72 |
| `PKG_UIMIGRATE` (true wowsims UI semantics) | **+102.99** |

**Our figure overstates the swap by 10.43 DPS** against what a player equipping
those four items in wowsims would see. Under our own APL rotation the same
mechanism is worth −7.76, so the effect is rotation-modulated but not
rotation-caused.

## The mechanism — one gem in one slot

Upstream `ui/core/proto_utils/equipped_item.ts` at the pinned commit `8aa378b`:
`EquippedItem.withItem` (:138-168) migrates gems colour-matched-then-eligible,
drops overflow, and **leaves leftover sockets null — it never auto-fills**.

Our `migrateGemsToItem` is a faithful port of that. The divergence is the step
we run *afterwards*: `fillEmptyCandidateGems`
(`packages/core/src/candidate-gems.ts:117`, called from
`packages/core/src/rank.ts:1462`), which **has no upstream counterpart on the
equip path**. Its own docstring concedes the shape — "EP-fill only empty sockets
(after UI-style migrate)" (`candidate-gems.ts:114-116`).

Concretely, in this swap: the owner's worn gloves 29947 have **no sockets**, so
migration leaves T6 gloves 31034's single socket empty, and we EP-fill it with
**32194** — a phase-3 epic +10-agi gem **the player wears nowhere in their gear**.
The `PKG_UIONLY_*` intermediates isolate it: shoulder/chest/legs land exactly on
`PKG_PROD`, hands lands exactly on `PKG_UIMIGRATE`. One socket carries the whole
10.43.

No `repairMeta` rewrite is involved — no T6 piece has a meta socket.

## Why this is a decision and not a fix

`fillEmptyCandidateGems` is load-bearing for a settled requirement: **spec §2.2
step 1 requires byte-identical gem policy between package and single swaps**, and
the fill exists so a candidate is not penalised merely for arriving with sockets
its predecessor could not supply. Removing or changing it moves **every**
candidate delta in every report, not just this package.

The tension, stated fairly:

- **Keeping the fill** models "this item, gemmed as you would gem it" — arguably
  the more useful ranking, and it does not punish socket-rich items. But it
  prices gems the player may not own, and it disagrees with what they will see
  in wowsims after equipping the item, which is the tool's oracle.
- **Matching upstream** makes our numbers reproducible against wowsims and stops
  inventing owned inventory. But it penalises items whose sockets cannot be
  filled from the outgoing item's gems, which is exactly what the fill was
  introduced to avoid.

A middle option worth costing: fill only from gems the player **demonstrably
owns** (present elsewhere in their logged gear), which preserves the
no-penalty property without inventing inventory. `PKG_FILL24028` above prices
that variant at +111.72, i.e. it recovers only 1.70 of the 10.43 — so it is a
smaller change than it sounds and does **not** by itself close the gap.

## Evidence that would sharpen the decision

The load-bearing premise is what wowsims actually leaves in that gloves socket
after equipping 31034. Confirmed from upstream source above; **confirming it
from the owner's own UI would settle it beyond doubt** and is one screenshot.

## Relationship to other tickets

- **103** — this is 10.43 of that ticket's 16.42 DPS overshoot against the
  owner's +97. The remaining −5.99 is unattributed there.
- Supersedes the "sequential re-gemming" framing carried in 103's earlier
  sections: the sequential application is not the mechanism, and iteration 03
  never tested this (all three of its arms filled the socket; it varied *which*
  gem, never *whether*).
