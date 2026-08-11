# Our settings, as a wowsims web import

Companion to `our-settings-for-web-import.json` (apiVersion 14, same
`IndividualSimSettings` shape as your export). Import it on the wowsims web UI
to see exactly the configuration our pipeline sims against, and compare it to
what you had loaded.

## How it was built

Your export was used as the template, then three things were replaced with what
our pipeline actually uses:

- `player.equipment` — shredzepelin's baseline gear, taken from the composed
  production request our ranking pipeline builds
  (`.scratch/set-bonus-value/loop-103-106/owner-arms/OURS_BASE.req.json`,
  itself produced by the real `equipmentForCandidateSwap` path).
- `player.rotation` — our skeleton's `TypeAPL` rotation (upstream's default
  feral APL, pinned in `data/wowsims.lock.json` as
  `ui/druid/feralcat/apls/default.apl.json`).
- `player.consumables` — our skeleton's list, which additionally carries a
  player-level `drumsId: GreaterDrumsOfBattle`.

Everything else is left exactly as your export had it, because it already
matched ours field for field.

## What actually differs (measured)

Seeds [11,22,33,44,55] @ 3000 iterations, pinned wowsimcli v0.0.101.

### 1. Gear — 10 of 17 slots differ

Your export is a different, better-geared character than the log our report
ranks against.

| slot | ours (shredzepelin) | yours |
|---|---|---|
| neck | 278827 Amulet of Bitter Hatred | 30017 Telonicus's Pendant of Mayhem |
| back | 278819 The Frost Lord's War Cloak | 29994 Thalassian Wildercloak |
| waist | 29247 Girdle of the Deathdealer | 30106 Belt of One-Hundred Deaths |
| legs | 28741 Skulker's Greaves (3 sockets) | 29995 Leggings of Murderous Intent (0 sockets) |
| finger1 | 30052 Ring of Lethality | 29997 Band of the Ranger-General |
| finger2 | 30834 Shapeshifter's Signet | 30052 Ring of Lethality |
| trinket1 | 28034 Hourglass of the Unraveller | 30627 Tsunami Talisman |
| weapon | 28658 Terestian's Stranglestaff | 32014 Merciless Gladiator's Maul |
| relic | 29390 Everbloom Idol | 32387 Idol of the Raven Goddess |
| shoulder enchant | 2983 | 2986 |

Head, shoulder/chest items, wrist, hands, feet and the empty ranged slot match.

### 2. Rotation

You ran `TypeSimple` (biteweave, mangleTrick, maintainFaerieFire, rip/bite at
5 CP). Our skeleton runs upstream's default APL. This is the single biggest
lever we found — worth roughly +31 to +49 DPS on the T6 four-piece delta
depending on which gear it is measured on.

### 3. Everything else is identical

Raid buffs, party buffs (including `totemTwisting` and
`drums: LesserDrumsOfBattle`), all 12 debuffs (including
`exposeWeaknessUptime 0.9` and `exposeWeaknessHunterAgility 1080`), talents
string, race, both professions, `reactionTimeMs 250`, consumables (potion,
elixirs, food, mainhand imbue, both sappers, both scrolls), and the entire
encounter block (180s ±5, level-73 Mechanical target, armor, parry haste) match
field for field.

## Why the numbers differed

| comparison | our stored figure | + your gear | + your rotation | + both | your reported figure |
|---|---|---|---|---|---|
| T6 four-piece package | +64.48 | +56.55 | +113.73 | **+87.63** | +97 |
| Cursed Vision − Vengeful Glad helm | +0.15 | +4.64 | +6.75 | **+7.78** | ~+10 |

With both of your differences applied, our pipeline lands close to both of your
numbers. The remaining few DPS is plausibly iteration count (you ran 25000, we
ran 3000), seed, and rounding — we would need your exported *results*, not
settings, to close it further.

## Caveats — fields we constructed or could not represent faithfully

- **`player.name`** set to `shredzepelin`; cosmetic, no sim effect.
- **Empty slot 15** (ranged) is `{}` in both, matching your export's shape.
- **`consumables.potions` / `conjuredItems`** are kept from your export. These
  are your UI's owned-item dropdown lists, not sim inputs; our pipeline has no
  counterpart and does not set them.
- **`encounter.targets[0].canCrush`** — our internal request sets this to
  `true`; the `IndividualSimSettings` export format has no such field, so it
  could **not** be represented here. We did not measure whether it matters.
- **Player-level `consumables.drumsId: GreaterDrumsOfBattle`** — our skeleton
  sets this *in addition to* the party-level `LesserDrumsOfBattle` you and we
  both have. We do not currently know whether wowsims treats that as additive,
  overriding, or ignored, and we did not measure it. If the web UI shows you
  drums twice after importing, that is this field and it is worth telling us.
- Our `feralCatDruid.options` is `{"classOptions": {}}` where yours is `{}`;
  believed equivalent after proto defaulting, but unverified.
