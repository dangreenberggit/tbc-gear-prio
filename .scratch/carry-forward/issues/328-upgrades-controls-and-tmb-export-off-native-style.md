Status: open
Type: bug
Origin: owner report, 2026-08-28
Blocks: none
Blocked by: none

# Upgrades controls and TMB export box don't match wowsims styling

Owner report — three related presentation problems on the Upgrades tab, all
pointing at the tab not matching how wowsims styles its own pages:

1. **The ThatsMyBis export button "looks disabled"**, and the export box copy is
   embarrassing: "A ranked list of candidates, not a 17-slot gear set — it will
   not reconstruct a character on import." The owner: "nobody said it would
   reconstruct a character, let alone 'on import' which doesn't even make sense
   and is clankerbrain." (Copy rework tracked as its own item — see below.)
2. **The "Set potential" and "BiS only" checkboxes look too big.**
3. **The "Content" dropdown looks too big.**

## Owner direction

Use **wowsims' native styling presumptively**. Find the native button /
checkbox / select components used elsewhere on the site (the Simulate button,
settings-tab checkboxes, the phase selector) and match their sizing and classes,
rather than the tab's own oversized controls. Research + direct observation per
component (a research pass on 2026-08-28 catalogs the native patterns).

## Copy

The TMB export blurb rewrite is part of this — plain English, may use terms
often and observably used elsewhere on wowsims, keep it simple, and do not
defend against claims nobody made. Candidate replacements from the copy pass
(2026-08-28); owner picks before it lands. (The set-bonus line wording is a
separate, engine-touching issue — ticket 330.)

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
`_upgrades_tab.scss`, and `assets/locales/en/translation.json` (the export
blurb string).
