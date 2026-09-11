Status: open
Type: bug
Origin: .scratch/carry-forward/issues/362-upgrades-tab-enhancement-run-panics-on-an-item-swap-item.md
Blocks: none
Blocked by: none

# `NewItem` panics instead of returning an error on an unknown item id

`NewItem` (`vendor/tbc-new-fork/sim/core/database.go:485-490`) panics with
`No item with id: %d` when an id is absent from `itemsByID`, rather than
returning an error the caller can handle. `enableItemSwap`
(`sim/core/item_swaps.go:50-57`) calls it through `toItem` on every swap entry
unconditionally at character construction, so one unresolvable id takes down
the whole run before a single iteration executes. Ticket 362 hit this: the
enhancement page's Upgrades tab aborted with a Go stack trace where the honest
outcome was "the request did not describe item 30832".

This is upstream's code, not ours. `database.go` and `item_swaps.go` are
`wowsims/tbc-new` source that the fork carries unmodified — the owner here is
the fork/upstream, not the Upgrades tab. Fixing it would turn a crash into a
tidy failure: the caller could report which id failed to resolve and which
slot wanted it, instead of surfacing a goroutine dump in the UI. It would not
have prevented 362, whose real defect was on our side (the request omitted the
item), and it buys nothing until someone chooses to carry a fork patch against
upstream source. Left open deliberately, with its owner named.

## Notes

Split from 362, whose ours-half (the tab's request omitting item-swap gear) is
fixed and closed. Related: 212, which took the same deliberate position for
candidate ids — no silent fallback when an id fails to resolve, because a
fallback turns a data gap into a wrong number.
