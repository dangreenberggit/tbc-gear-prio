Status: open
Type: feature
Origin: owner request, 2026-08-12
Blocks: none
Blocked by: none

# TMB export should use token and pattern ids, not gear ids

The report's JSON export exists specifically for thatsmybis.com (TMB) loot
lists. TMB tracks what actually drops in the raid. For most items that is
the item itself, but two groups differ:

1. **Tier pieces.** A tier item (e.g. Thunderheart Pauldrons) does not drop
   in the raid — a class token drops (e.g. Pauldrons of the Forgotten
   Conqueror from Mother Shahraz), and the player buys the gear with it. The
   export currently emits the gear item's id; for TMB it should emit the
   token's id.
2. **Craftable items** (probably — same logic, niche case). If a craftable
   is on the list, the thing that drops is the *pattern*, so the export
   should emit the pattern's id. Confirm TMB actually tracks patterns this
   way before building; if it doesn't, note that in this ticket and skip.

## What is needed

- A mapping from tier item id → token item id (and which boss drops it,
  if cheap). Check whether `vendor/wowsims/db.json` carries token/vendor
  relationships; if not, this may be a small vendored data addition under
  the data-pipeline-work rules. Same question for pattern ids on craftables.
- The export keeps its current shape (`{"items":[{"id":…}]}`) and display
  order; only the ids change for the two groups above. Keep the plain
  gear-id export available too (either a second button or a toggle) so the
  wowsims-shaped use isn't lost.
- The export panel's caption must say which flavour it is emitting.

Nothing here changes ranking or sims — export-layer only.
