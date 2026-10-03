Status: closed
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

## Closed 2026-10-02: fixed at fork 55c705173

Fixed by fork commit `55c705173117f1b2a681571d5933b93f0da36d6c`
("Guard off-class set bonuses (532)", `dangreenberggit/tbc-new`,
branch `feat/upgrades-tab`, not pushed) and the main-repo re-pin
`54a65b6f` ("Re-pin fork to 55c705173 for ticket 532"). Plan, logs and
results are in `.scratch/stage-gate/532-cryptstalker-crash/`
(gitignored, so a fresh checkout does not have them).

### Orchestrator rulings

As recorded in the plan's Rulings section:

1. **Test seam.** A fork Go test calling `core.RunRaidSim` is approved.
   AGENTS.md's three seams are about adapters, not where a test goes,
   and no TS seam can see a fork-only Go change.
2. **Scope widened.** 532 also covers the three other sets an off-class
   wearer can reach: Bold Armor (653), Moonglade Raiment (637) and
   Assassination Armor (620). Each gets a red test case and the same
   comma-ok class guard. No follow-up ticket for other unguarded sets is
   filed. The scan scripts that found these sets (`scan.py`, `masks.py`
   and their `.out` files) are kept in the stage folder's `scan/`.
3. **Fork commit subject:** "Guard off-class set bonuses (532)".

### The cause, confirmed

The hypothesis above was right. Class-mask bits are per class, so a set
bonus written for one class names unrelated spells on another class.
The Cryptstalker 2pc's Rapid Fire bit names warrior Charge and shaman
Lightning Shield, which have no `RelatedSelfBuff`, and
`applyBuffDurationFlat` (`sim/core/spell_mod.go:790`) dereferences nil.

### The fix

The comma-ok class guard from `c4d1cb661` (ticket 311) on:

- Cryptstalker Armor 2pc and 8pc (`sim/hunter/item_sets.go`)
- Bold Armor 2pc and 4pc (`sim/warrior/items.go`)
- Moonglade Raiment 4pc (`sim/druid/item_sets.go`)
- Assassination Armor 4pc (`sim/rogue/items.go`)

The Moonglade and Assassination 2pc bonuses are empty functions, so
they need no guard. These are upstream files, so each guard is an
upstream candidate. No ported engine file changed, so no PROVENANCE row
moved.

### Red and green

Test `TestOffClassSetBonuses` in the new fork file
`sim/off_class_set_bonus_test.go`, through `core.RunRaidSim` with
`IsTest: false`, a 180 s fight, 10 iterations and seed 532. An
off-class case passes when the sim has no error and its DPS equals the
same sim with the set's bonuses replaced by no-ops. An own-class case
passes when its DPS equals the literal recorded in the red run.

Command:
`go -C vendor/tbc-new-fork test -tags=with_db ./sim/ -run TestOffClassSetBonuses -count=1 -v`.
Before the guards: rc=1, 7 off-class cases fail and 5 own-class cases
pass (run twice, identical output). After: rc=0.

| Case | Red | Green |
| --- | --- | --- |
| Cryptstalker 2pc, fury warrior | FAIL: nil pointer dereference, `spell_mod.go:790` | PASS, 601.675320 DPS |
| Cryptstalker 8pc, fury warrior | FAIL: same | PASS, 456.220487 |
| Cryptstalker 2pc, elemental shaman | FAIL: same | PASS, 666.331665 |
| Cryptstalker 8pc, elemental shaman | FAIL: same | PASS, 403.287909 |
| Cryptstalker 2pc, BM hunter | PASS, 789.706224 | PASS, 789.706224 |
| Cryptstalker 8pc, BM hunter | PASS, 774.907778 | PASS, 774.907778 |
| Bold Armor 5pc, ret paladin | FAIL: `*retribution.RetributionPaladin is not warrior.WarriorAgent`, `sim/warrior/items.go:24` | PASS, 371.769934 |
| Bold Armor 5pc, fury warrior | PASS, 450.971957 | PASS, 450.971957 |
| Moonglade 5pc, arms warrior | FAIL: DPS 455.795292, want 421.011089 | PASS, 421.011089 |
| Moonglade 5pc, feral cat | PASS, 685.414701 | PASS, 685.414701 |
| Assassination 5pc, BM hunter | FAIL: DPS 687.343316, want 690.836376 | PASS, 690.836376 |
| Assassination 5pc, swords rogue | PASS, 553.359163 | PASS, 553.359163 |

Also at the fork commit:
`go -C vendor/tbc-new-fork test -tags=with_db ./sim/ ./sim/hunter/... ./sim/warrior/... ./sim/druid/... ./sim/rogue/... ./sim/paladin/... ./sim/shaman/... -count=1`
rc=0; `go vet` rc=0 on the five changed packages; the four fork-gated
vitest suites rc=0 (94 passed, 1 skipped); `pnpm verify` rc=0.

Two guards, from the independent review:

- **The Cryptstalker 8pc guard is defensive (reviewer F2).** Removing it
  fails no test, because its cost mod hits spells that do not move DPS
  for these presets.
- **The Bold Armor 2pc guard has a measured red (reviewer F3).** With
  only it removed, the paladin's DPS is 372.951623 against the
  no-bonus reference 371.769934.

### Live tab check

K5E character C5 (elemental shaman, phase 3, 3000 iterations) on the
`:5173` tab against a backend rebuilt from fork `55c705173`:
`node .scratch/stage-gate/511-512-set-credit/k5p/run-check.mjs .scratch/stage-gate/511-512-set-credit/k5e/characters/C5.json .scratch/stage-gate/532-cryptstalker-crash/C5-after.json`
rc=0. 0 of 969 sims failed; before the fix, 31 of 956 failed
(`k5e/results/C5.json`). No set 530 `setBonuses` entry is
`sim-failed`. Each measured threshold reads `sameGearDps: 0`, because
the bonuses do nothing for a shaman. The set 530 screen has no missing
pair or rung. The threshold-7 entry is still `repair-failed`, as it was
before the fix; ticket 524 records that.

### The close conditions

- Cause confirmed, with the re-runnable test above and its stack trace.
- A warrior and an elemental shaman with 2 or 8 Cryptstalker pieces sim
  without error.
- The fix covers set 530 and the three other sets an off-class wearer
  can reach (rulings above). No follow-up ticket.
- The Go change is a fork commit plus a re-pin.
