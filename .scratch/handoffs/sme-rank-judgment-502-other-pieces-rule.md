# SME rank judgment: ticket 502, rule R1 (Set potential on)

Seat: gate-sme, stage-gate slug `502-other-pieces-rule`, plan step 9.
Audience: the engineering team. This is a product gate, not loot advice.

## Verdict

**trust-with-caveats**

On the two named inputs (`feral-p3-nordrassil4` and `ret-p3-p2`), the Set potential ON ranking under R1 reads right to someone who knows TBC feral and ret. The main 502 complaint is fixed: the tier-4 Malorne rows now sit below Vengeful Gladiator's Staff and Everbloom Idol, and each Malorne row that is in a measured swap shows that swap's measured figure. On ret, the toggle has no effect, and that is correct for the game. The caveats are about how a player reads tied or estimated rows. One regression is outside the two named inputs: in `feral-p3-th-hands-legs`, R1 raises the Thunderheart Cover to ON rank 10 (+20.9) for a feral who wears Wolfshead Helm (F9).

No `contested:` line. No verdict here contradicts a claim that the plan or ticket 502 states as fact. Gate C should still see F9: the design lists it as an accepted consequence, and from the game side the row is misleading.

## What was reviewed

- **Feral, `feral-p3-nordrassil4`.** Preset "Phase 2 / Alt 6%" at page phase 3, Night Elf, 3000 iterations, baseline 2397.05 DPS, noise floor 5.091.
  - Worn gear (read from the recording, see Commands): Wolfshead Helm (8345); four Nordrassil Harness pieces (Feral-Mantle 30230, Chestplate 30222, Handgrips 30223, Feral-Kilt 30229), which is the Nordrassil 4pc; Merciless Gladiator's Maul; Idol of the Raven Goddess.
- **Ret, `ret-p3-p2`.** Preset "Phase 2 / P2" at page phase 3, 3000 iterations, baseline 2084.16 DPS, floor 4.808.
  - Worn gear: one Crystalforge piece (Crystalforge Breastplate 30129); no other tier pieces; Furious Gizmatic Goggles in the head slot; Lionheart Executioner; Libram of Avengement.
- **Engine figures.** Per-row and per-step tables:
  - `.scratch/stage-gate/502-other-pieces-rule/sme/feral-p3-nordrassil4-on.txt`
  - `.scratch/stage-gate/502-other-pieces-rule/sme/ret-p3-p2-on.txt`
  - Identity checks: `.scratch/stage-gate/502-other-pieces-rule/recordings/checks-*.txt`
- **Rendered tab.** `.scratch/stage-gate/502-other-pieces-rule/visual/popovers/facts.json`, tickets `nordrassil4-29096-off`/`-on`, `p2-30132-off`/`-on`, plus the single-row captures and popovers.
- **Recordings.** `.scratch/stage-gate/502-other-pieces-rule/recordings/{feral-p3-nordrassil4,ret-p3-p2,feral-p3-th-hands-legs}.json`.
  - Fork `cd2ca288a` with `forkDirty: true`: the uncommitted 502 tree.
  - `raw-diff differences 0` against the committed fixtures, per the checks files.
- **Item rows.** Read from `data/items/index.json`. I spot-checked the armor type and set name for 31034, 29096 and 30132 in `vendor/wowsims/db.json`. They agree: leather for the druid pieces, plate for Crystalforge.

The rendered table matches the engine figures:
- `nordrassil4-29096-on` r1–r16 equals the "ON new top 16" list.
- `nordrassil4-29096-off` r1–r11 equals the "OFF top 12" list.
- `p2-30132-off` and `p2-30132-on` r1–r16 are identical.
- Every popover in `recordings/popover-*.txt` says "lines add up: true" with Set potential on.

## Findings

Severity: **ok** = looks right for the game; **low** = worth knowing, no action needed for this gate; **medium** = a game-facing row a knowledgeable player would call wrong or misleading.

| # | Finding | Severity | Evidence |
|---|---|---|---|
| F1 | Thunderheart Gauntlets, Chestguard, Leggings and Pauldrons all show +179.15, the measured 4-piece swap from Nordrassil 4pc to Thunderheart 4pc. For a P2-geared feral at P3, T6 4pc replacing T5 4pc should be the largest upgrade on the list. It is. | ok | checks-feral-p3-nordrassil4.txt lines 2–5 (\|diff\| 0.0000). Recording `setBonuses` Thunderheart 4pc `packageDeltaDps` 179.149. Item rows: each Thunderheart piece has more strength, agility and stamina than the Nordrassil piece in its slot (e.g. Chestguard 53/36/51 vs Chestplate 46/30/43), which matches the small positive own-stats lines (+4.59 to +18.65). |
| F2 | Vengeful Gladiator's Staff (5) and Everbloom Idol (6) now rank above every Malorne row. This fixes the ticket 502 complaint that four tier-4 pieces outranked the staff. | ok | facts.json `nordrassil4-29096-on` r5–r9. |
| F3 | Breastplate and Gauntlets of Malorne show +30.37, the measured swap of those two pieces for the Nordrassil chest and hands. The Nordrassil 4pc is lost, the Malorne 2pc is gained, and both pieces are small stat downgrades. The per-piece figures fit the stat rows: Gauntlets of Malorne 32/24/28 with no socket vs Nordrassil Handgrips 35/27/40 gives −8.23. So does the size of the gap to the T6 rows. | ok | checks lines 6–7. Recording Malorne 2pc `packageDeltaDps` 30.370, `se` 2.83. Item rows 29096, 29097 vs 30222, 30223. |
| F4 | The sim says the Malorne 2pc (+93.1) is worth more than the worn Nordrassil 4pc (−47.2) for a cat. That is plausible. Recalled, unverified: the T4 feral 2pc is an energy proc on melee hits, and the T5 4pc adds flat damage to Shred. But the wowsims P2 preset itself wears Nordrassil 4pc, so a feral reader may be surprised to see "go back to T4 chest and hands" as a +30 gain. This is a sim result, not an R1 artefact. R1 only reports the measured swap. I am unsure whether the TBC community ranked T4 2pc above T5 4pc for cats. | low | Recording Malorne 2pc `bonusDpsNet` 93.08. `brokenSetValues` Nordrassil 4pc `dps` 47.19. Worn gear list. |
| F5 | The four Thunderheart rows tie at +179.1. The table no longer shows which single piece helps most, or what the first two pieces give (Chestguard + Gauntlets measured +87.3). In game, the pieces drop from different bosses (Gauntlets in Hyjal; Chestguard, Leggings and Pauldrons in Black Temple) and arrive one at a time. The popover names the other pieces the figure assumes, so the information is there on hover. The owner accepted ties as a consequence of the rule. | low | facts.json r1–r4. Recording Thunderheart 2pc `packageDeltaDps` 87.319. Design §1 "Consequences to show the owner". |
| F6 | The rows do not add together, and some share slots. The Thunderheart rows (chest, hands, legs, shoulders) and the Malorne rows 7–9 (chest, hands, shoulders) need the same slots, so a player can take one path or the other, not both. This was already true before R1, and ties make it more visible. | low | Package item ids in the recording `setBonuses`. Design §1 Q3 item 6. |
| F7 | Mantle of Malorne (+28.54, rank 9) and Greaves of Malorne (+11.89, rank 14) are estimates: each piece paired with the Breastplate, not measured. The per-piece "stats" figures match the stat rows (Mantle 33/27/25 vs Feral-Mantle 35/34/28 gives −10.06; Greaves has no socket and no hit vs the Kilt's 18 gives −26.71). The estimate assumes item stats add up across two slots, which is usually close. Low risk, but rank 9 sits within 2 DPS of the measured rows above it, so their order is not worth arguing over. | low | sme text lines 21–26. Item rows 29100, 29099 vs 30230, 30229. Design Q4 table. |
| F8 | Head rows stay negative: Thunderheart Cover −27.5 and Stag-Helm of Malorne −172.5. This is correct. The feral wears Wolfshead Helm. Recalled, unverified: its energy on shifting into Cat Form keeps it the feral cat head through TBC. The recording's own warning agrees ("nothing in a full pool matches Wolfshead Helm's effect"). | ok | Worn gear slot 0 = 8345. Recording `plausibilityWarnings[0]`. facts.json `nordrassil4-31039-on`. |
| F9 | **Outside the two named inputs, but rendered in facts.json.** In `feral-p3-th-hands-legs` (Wolfshead Helm worn, Thunderheart hands and legs worn), R1 raises Thunderheart Cover from −7.87 (ON today) to +20.86, ON rank 10. The figure is an estimate of "Cover + Chestguard for the 4pc". A feral would never make that swap: Chestguard + Pauldrons reaches the same 4pc and measures +103.49 without giving up Wolfshead. Relative to that best swap, taking the Cover costs about 82 DPS. So a row a feral should not act on now sits in the top 10, above real upgrades such as Nordrassil Chestplate and Idol of the White Stag. The design lists this as an accepted consequence of counting "gained or lost". From the game side it is misleading. | medium | facts.json `th-hands-legs-31039-on` and `-on-row` (rank 10, +20.9). checks-feral-p3-th-hands-legs.txt lines 35–36 and 82–98. Recording worn slot 0 = 8345. Thunderheart 4pc `packageDeltaDps` 103.495. |
| F10 | Ret: the toggle changes nothing, and that is right for the game. Both Lightbringer bonuses measure below zero, within noise. Recalled, unverified: the T6 ret 2pc is a self-heal proc and the 4pc boosts Hammer of Wrath, which is usable only on low-health targets, so neither adds real DPS. Completing Crystalforge 4pc from one worn piece measures −35.80: the War-Helm and Shoulderbraces are downgrades from the worn head and shoulders. The Justicar 4-piece swap measures −104.95. Removing the old credits is correct. The old ON rank 11 for Crystalforge Greaves (+7.82) was a row no ret should have acted on. | ok | Recording ret `setBonuses`: Lightbringer 2pc `bonusDpsNet` −3.14 (`se` 4.44), 4pc −4.22 (`se` 5.43). Crystalforge 4pc `packageDeltaDps` −35.80. Justicar 4pc −104.95. facts.json `p2-30132-off`/`-on` identical. |
| F11 | The measured Crystalforge 4pc "bonus" (+21.07) is probably not real. Its standard error is 10.08, and `packages/core/src/set-value.ts` says Crystalforge is a mana and heal set. On this gear, R1 removes it only because the other Crystalforge pieces are downgrades, not because the bonus is 0. On gear where those pieces were upgrades, the value would still count as a bonus above the floor. For a row inside the measured swap the figure would still be honest (it equals the measured swap). For a row outside that swap the figure would be an estimate that includes the false +21. This is ticket 511's territory, not 502's. | low | Recording ret Crystalforge 4pc `bonusDps` 21.07, `se` 10.08. set-value.ts comment above `IMPLEMENTED_IN_SIM`. |
| F12 | The Nordrassil 2pc is marked not implemented in the sim. The full Thunderheart swap removes all four Nordrassil pieces, so the measured +179.15 charges no 2pc loss. If that bonus adds any cat DPS, the Thunderheart rows are slightly high. I do not reliably recall what the Nordrassil Harness 2pc does. This is a sim-coverage gap (design Q3 item 7, ticket 512), not an R1 error. | low | set-value.ts `641: { 2: false, 4: true }`. Recording Thunderheart 4pc `breaks` lists only the Nordrassil 4pc. |

## Rows that look fine

- Thunderheart 4-piece rows at the top of the feral list (F1).
- Staff and Everbloom Idol above old-tier set pieces (F2).
- Malorne Breastplate and Gauntlets at the measured pair figure (F3).
- Wolfshead-slot rows stay negative in nordrassil4 (F8).
- The whole ret list: Torch of the Damned, Cataclysm's Edge, Cursed Vision and so on, unchanged by the toggle, with no ret tier piece raised on bonus grounds (F10).
- The non-set rows are identical OFF and ON in both fixtures.

## Gate

For the two named inputs, a feral or ret player who knows the game would trust this ranking, with the caveats above: tied Thunderheart rows, estimates for Mantle and Greaves, and non-additive rows. What must hold before a plain `trust`:

1. Someone decides whether F9 is acceptable. A row that assumes swapping out Wolfshead Helm for a set bonus the player can reach without the head should not rank in the top 10. That decision belongs to the owner, since the design already lists it as a consequence. The owner should see the `th-hands-legs` Cover render, not only the nordrassil4 and ret ones.
2. Ticket 511 settles whether the Crystalforge 4pc +21 is real (F11). It does not change any row in these fixtures.

## Notes for engineering

- A row outside the measured swap can rank high only because another set piece's own stats are good. Thunderheart Cover in th-hands-legs is the example. Compare it against the best measured swap that reaches the same bonus without it.
- The Crystalforge 4pc value on ret has a standard error about half its size.

## Commands used (read-only)

All run with Git Bash from the repo root. Each printed the rows cited above.

- Worn gear with item rows: `node -e` loading `.scratch/stage-gate/502-other-pieces-rule/recordings/feral-p3-nordrassil4.json` and `ret-p3-p2.json` (`gear.items`), joined to `data/items/index.json` by id.
- Set measurements: `node -e` printing `ranking.setBonuses` (rows without `unmeasured`), `ranking.brokenSetValues`, `ranking.cutoff` and `ranking.plausibilityWarnings` from the same recordings, plus `feral-p3-th-hands-legs.json`.
- Set piece rows: `node -e` printing `data/items/index.json` rows for ids 31034, 31042, 31044, 31048, 31039, 29096–29100, 33716, 30989–30997, 30130–30133, 29071–29075, and `vendor/wowsims/db.json` for 31034, 29096, 33716, 30132.
- `sed -n 40,72p packages/core/src/set-value.ts` for `IMPLEMENTED_IN_SIM`.
- `grep` on `recordings/checks-feral-p3-th-hands-legs.txt` for the Cover and top-16 lines.

## Confidence caveats

- Every set-bonus effect description above (T4, T5 and T6 feral; T5 and T6 ret; Wolfshead Helm) is **recalled, unverified**. The DPS figures come from the recordings, not from memory.
- I did not re-run any sim, and I judged the figures as recorded. The recordings are from an uncommitted fork tree (`forkDirty: true`). The checks files report zero raw differences from the committed fixtures, and I did not re-derive that.
- I read the popover PNG contents through facts.json text, not by viewing each image.
- F4 depends on community consensus about T4 2pc vs T5 4pc for cats, and I am unsure of it.
