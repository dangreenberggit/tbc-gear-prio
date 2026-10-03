Status: open
Type: feature
Origin: owner request, 2026-09-18 (viewing the running tab)
Blocks: none
Blocked by: 417 (needs the Crafted content checkbox to hang off of)
Priority: post-finish nice-to-have ("nice-to-heavy") — NOT a condition of the tab being finished

# Per-profession filter for Bind-on-Pickup crafted upgrades

Owner request, on the Upgrades tab. When the **Crafted** content source is
included (ticket 417's checkbox), add a companion **profession dropdown/picker**
— **disabled unless the Crafted checkbox is ticked** — where the user selects
which professions they have. The ranking then only offers a crafted item the
user could actually make.

**Priority: post-finish nice-to-have.** The owner was explicit this is a
follow-up, not a blocker for calling the tab finished.

## The rule that makes this correct (owner, verbatim intent)

The gate applies **only to Bind-on-Pickup (BoP) crafted items** — the item the
profession produces is soulbound to the crafter, so only someone with the
profession can ever equip it. Bind-on-Equip (BoE) crafted items are NOT gated:
anyone can buy them on the auction house, so they stay offered regardless of
professions.

Owner's precise point, easy to get wrong: **the pattern's own binding is
irrelevant.** A pattern can be BoE (freely traded), but if the crafted *item*
it produces is BoP, the item is still bound to the crafter — so the gate keys
off the crafted **item's** BoP flag and the **profession** needed to craft it,
never off whether the pattern is tradeable. Having (or being able to buy) the
pattern does not make the item obtainable; having the profession does.

## What would close this

- With Crafted included, a profession picker is enabled; unticking Crafted
  disables it.
- A **BoP** crafted item appears in the ranking only if the user has selected
  the profession that crafts it. Deselecting that profession removes it.
- A **BoE** crafted item is always eligible when Crafted is included,
  regardless of profession selection.
- Verify with at least one BoP crafted and one BoE crafted item: toggling the
  relevant profession adds/removes the BoP one and never the BoE one.

## Where / open questions for the implementer

- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
  (attach to 417's Crafted checkbox) and the pool/eligibility layer.
- **Data question (settle before building):** does the bundled item universe
  carry, per crafted item, (a) its BoP/BoE binding and (b) the profession +
  skill that crafts it? If not, this needs a data-pipeline pass to add it
  (`data/` + the universe assembly) — which is what makes this "nice-to-heavy"
  rather than a quick UI toggle. Measure the data gap first; do not assume the
  fields are present.
- Profession list scope: the TBC crafting professions that produce equippable
  BoP gear (Blacksmithing, Leatherworking, Tailoring, Jewelcrafting,
  Engineering, and Enchanting for rings/rods where applicable) — confirm the
  exact set against what the universe actually tags.

## Notes

Depends on 417 landing first (the Crafted checkbox is the anchor). New request
from the owner's sign-off pass; tracked as a follow-up feature, not part of the
Chunk 3 tab-surface set.
