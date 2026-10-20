Status: wontfix
Type: feature
Origin: owner decision, 2026-08-10, closing the 103/106 loop
Blocks: none
Blocked by: none

# support custom exported rotation data

The 103/106 loop showed rotation choice is the dominant lever on set-bonus
figures (+49 DPS on the T6 package under the owner's TypeSimple rotation vs
upstream's default APL, on our gear). Decision for now: **keep upstream's
default APL** — the owner doesn't use the site's advanced rotation editor,
and default-vs-default is the honest baseline.

Later: accept the rotation from a user-supplied wowsims settings export
(it rides in the same JSON — `player.rotation`, either `TypeSimple` with
`specRotationJson` or a full APL priority list) so a player who sims with a
custom rotation gets rankings under that rotation. Natural companion to
ticket 72 (user-supplied wowsims setup import); likely the same import
path. Evidence and the owner's export live at
`.scratch/set-bonus-value/loop-103-106/owner-settings-export.json`.

Also noted, no action: the skeleton carries both party-level Lesser Drums
and a Greater Drums consumable; drums create a shared cooldown in this TBC
round. Owner decision: let the sim handle it, assuming the web defaults do
the same. Untested whether the two entries stack, override, or get ignored.

## Comments

### 2026-10-19 — wontfix (ticket housekeeping)

Per the owner's 2026-10-16 scope ruling: there is no standalone web app or Stage 4 deploy, and the work is the fork's Upgrades tab only (`PLAN.md:934`; `.scratch/plans/upgrades-tab-finish-line.md:53-56`): this concerns only this repo's command-line ranking or its HTML report, which the tab does not use. The tab sims the page's own settings, including talents, rotation and consumables (`ui/features/upgrades/model/run_inputs.ts:20-28`, tbc-new-fork@bc3cca6a1), so a player's custom rotation is already what the tab ranks with.
