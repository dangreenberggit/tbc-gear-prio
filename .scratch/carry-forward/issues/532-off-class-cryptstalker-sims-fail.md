Status: open
Type: defect
Origin: stage-gate 511-512-set-credit, chunk K5E, 2026-10-01 (`.scratch/stage-gate/511-512-set-credit/execution-report.md`, section "Sim failures (finding, not a plan stop)"; gitignored)
Blocks: none
Blocked by: none
Related: 524, 311, 511, 512

# Sims fail when a non-hunter wears 2+ Cryptstalker Armor pieces

This ticket is a record only. Do not start a fix from it. Nobody ran a
sim to file it.

## What was seen

During the K5E screening test (record mode, item swap off), every sim
that gave a non-hunter two or more set-tagged pieces of Cryptstalker
Armor (set 530, the hunter's level-60 T3 set) failed. A hunter at the
same screen settings had no failures.

| Character (K5E/K5P id) | Spec, phase | Full-pass iterations | Failed sims | Failed sims that are not set 530 |
| --- | --- | --- | --- | --- |
| C1 | Warrior, phase 5 | 3000 | 30 of 1076 | 0 |
| C5 | Elemental shaman, phase 3 | 3000 | 31 of 956 | 0 |
| HUN-C3 | Hunter, phase 5 | 10000 | 0 of 814 | 0 |

All three runs used fork `35d152d0` and screen iterations 10, 100, 300
and 1000. HUN-C3's full pass used 10000 iterations and
`partnerRule: "every-combination"`, so its settings match the other two
on the screen sims only.

The failures add up to set 530 exactly:

- C1: 5 `setBonuses` entries for 530 are `unmeasured: "sim-failed"`
  (counts 2, 3, 4, 5 and 8). The set screen has 4 of 4 pairs and 21 of
  27 rungs missing for 530. 5 + 4 + 21 = 30.
- C5: 6 `setBonuses` entries for 530 are `sim-failed`, with the same 4
  pairs and 21 rungs missing. 6 + 4 + 21 = 31.
- Every other screened set on C1 (32 sets) and C5 (28 sets) has no
  missing pair or rung.
- HUN-C3 wears 3 Cryptstalker pieces. Its 530 screen has 0 of 22
  readings missing.

The backend log showed only "Thread N had an error. Cancelling all
sims!" (`progress.md`, K5E section, the C1 line). That line is not in
`k5e/logs/`, which holds the run script's own output. No stack trace was
captured.

### How to re-read the evidence

All paths are under `.scratch/stage-gate/511-512-set-credit/`
(gitignored, so a fresh checkout does not have them).

- `python k5e/inspect_fail.py`, run from that folder, is read-only. It
  prints the K5P failure counts (all 0) and C1's unmeasured
  `setBonuses` and missing screen readings.
- `k5e/results/C1.json`, `k5e/results/C5.json` and
  `k5p/results/HUN-C3.json`: `sims.failed`, then
  `ranking.ranking.setBonuses` and `ranking.ranking.setScreen.sets`
  filtered to `setId == 530`.
- `progress.md`, K5E section, the "30.2 C1" and "30.2 C5" lines.
- `k5e/report.md`, line 181.

## What the tab shows for these rows

Read at fork `4c936ce164879253e456139db7a371524c30df43`, the current lock
`commit`. `git -C vendor/tbc-new-fork diff --quiet 35d152d0 HEAD -- sim/`
exits 0, so the Go code is the same as in the runs. Engine paths are
under `ui/core/components/individual_sim_ui/upgrades/engine/`.

- When a set package's same-gear sims or its package sim fail, the
  engine writes the `setBonuses` entry with `unmeasured: "sim-failed"`
  (`rank.ts:2191` and `rank.ts:2245`).
- Each Cryptstalker row on C1 and C5 (8 rows each) has
  `stepRanking: true` and `futureBonuses` for counts 2 to 8, none with
  `sameGearDps` (read from the result files above). `rank.ts:3254`
  copies `sameGearDps` only when the bonus has one.
- For a step ranking, `setCreditUnmeasured` is true when a future that
  is not below the gate has no `sameGearDps` (`view.ts:258`). The row's
  set credit is then 0.
- With the Set potential toggle on, the row's popover has a "Set
  potential" heading and one line per count, "Cryptstalker Armor Npc
  (0/N)", each with the value "couldn't measure"
  (`upgrades_tab.tsx:435-442`, `upgrades_tab.tsx:3325` and
  `upgrades_tab.tsx:3365-3368`; strings at
  `assets/locales/en/translation.json:911-914`).
- The sub-line under the DPS cell reads "set detail" in both states.
  The `not_counted` key that `setBonusSubLine` picks
  (`view.ts:289`) has the English text "set detail"
  (`translation.json:905`).

So for a non-hunter, each Cryptstalker row reads "couldn't measure" for
every count, in the popover, with the toggle on. This is code reading
plus the recorded row data. Nobody looked at the rendered tab.

## Cause (hypothesis, untested)

The likely panic is in the 2-piece bonus, because the failures start at
2 pieces. Lines are at fork `4c936ce1`, read with
`git -C vendor/tbc-new-fork show HEAD:<path>`.

1. `sim/hunter/item_sets.go:16-21`: the 2-piece bonus attaches a
   `SpellMod_BuffDuration_Flat` mod with
   `ClassMask: HunterSpellRapidFire`. It has no class guard. The 4- and
   6-piece bonuses have the ticket-311 comma-ok guard
   (`item_sets.go:30-33` and `72-75`).
2. `sim/hunter/hunter.go:316`: `HunterSpellRapidFire` is bit `1 << 11`
   (by counting the `iota` list from line 305).
3. `sim/core/spell_mod.go:179`: a mod applies to every spell of the
   wearer whose `ClassSpellMask` shares a bit with the mod's
   `ClassMask` (`spell.Matches`, `sim/core/spell.go:784-786`). Class
   masks are per-class bit lists, so bit 11 names a different spell for
   each class.
4. Bit 11 for a warrior is `SpellMaskCharge` (`sim/warrior/warrior.go:41`,
   counting from line 29). For a shaman it is `SpellMaskLightningShield`
   (`sim/shaman/shaman.go:198`, counting from line 187).
5. Neither matching spell sets `RelatedSelfBuff`: warrior Charge
   (`sim/warrior/charge.go:33-58`) and the shaman's Lightning Shield
   damage spell (`sim/shaman/shields.go:85-99`). Both are registered for
   every warrior (`warrior.go:156`) and every shaman (`shields.go:12`).
6. `sim/core/spell_mod.go:790`: `applyBuffDurationFlat` runs
   `spell.RelatedSelfBuff.Duration += mod.timeValue`. With a nil
   `RelatedSelfBuff` (a `*Aura`, `sim/core/spell.go:171`) this is a nil
   pointer dereference.
7. The hunter's own Rapid Fire sets `RelatedSelfBuff`
   (`sim/hunter/rapid_fire.go:39`), which fits HUN-C3 passing.

A 2-piece warrior or shaman request with the backend's stack trace
would confirm or refute this.

**Side effect for other classes (hypothesis, untested).** The same
bit collision means the 8-piece bonus (`item_sets.go:92-97`, a mana
cost mod with `HunterSpellMultiShot | HunterSpellAimedShot`) would
change the cost of whichever of the wearer's spells hold those bits.
That gives a wrong number, not a failure.

## Is it only 530? (hypothesis, untested)

- In these runs, yes. On C1 and C5, Cryptstalker is the only screened
  set from another class that has Go set code. The other off-class sets
  in those pools, such as the level-60 T3 sets 521, 524 to 527 and 529,
  match no `Name:` in the fork's set files, so they have no bonus code
  to fail.
- `SpellMod_BuffDuration_Flat` appears in one other set file:
  `sim/priest/items.go:21` (Incarnate Regalia).
- 25 of the 55 sets defined in the class set files assert the class
  without a comma-ok guard, for example
  `warrior := agent.(WarriorAgent).GetWarrior()` in Warbringer
  Battlegear (`sim/warrior/items.go:82`) and
  `paladin := agent.(PaladinAgent).GetPaladin()` in Crystalforge
  Battlegear (`sim/paladin/item_sets.go:45`). The files are the
  `item_sets.go` or `items.go` of druid, hunter, mage, paladin, priest,
  rogue, shaman, warlock and warrior. The count comes from a scan of
  each `NewItemSet` block for `agent.(XAgent).` without `, ok`. Such
  a set on another class's character would panic with an interface
  conversion error.
- No run in K5P or K5E put one of those 25 sets on another class. Every
  one that was screened belonged to the character's own class (for
  example Malorne and Nordrassil Harness on the feral druids, Netherblade
  and Slayer's Armor on WCL-R5). Whether any pool offers one of them to
  another class was not checked.

## What would close this

- The cause is confirmed or replaced, with a request a reader can re-run
  and the stack trace it gives.
- A warrior and an elemental shaman with 2 or more Cryptstalker pieces
  sim without error, or the tab no longer sends such requests (see
  ticket 524 for removing level-60 sets from the pools).
- The fix says whether it also covers the other sets above, or files
  them separately.
- A Go change in `sim/` is a new fork divergence from upstream, like
  ticket 311's guard (fork commit `c4d1cb661`). It lands as a fork
  commit plus a re-pin (`AGENTS.md`, "The forked tab repo").
