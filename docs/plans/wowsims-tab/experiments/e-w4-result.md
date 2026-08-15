# E-W4 result — 2026-08-14

Fork worktree tip at capture time: `e1fbf0e2db2695bc1f3b47393235805b230198f2`
(before slice 5's own commits landed on top).

Page: `/tbc/paladin/retribution/` (`npx vite serve --port 5199` — port 5173 was
occupied by another chat's dev server; recipe otherwise matches
`e-w4-method.md` §1).

Fixture: `ui/paladin/retribution/gear_sets/p1.gear.json`.

Non-default settings applied (step 3), all set programmatically through the
console hook (`window.__ew4`) rather than by clicking, and re-verified live
after each write:

- **Gear**: PreRaid preset (`ui/paladin/retribution/gear_sets/preraid.gear.json`,
  applied via `player.setGear` before the P1 fixture in step 5), confirmed to
  differ item-by-item from P1.
- **Bonus stats**: exposed on the ret page (`player.getBonusStats()` /
  `setBonusStats`) — set Strength (`stats[4]`) to 20.
- **Item swap**: exposed (`player.itemSwapSettings`) — enabled with one item
  (the currently-equipped PreRaid weapon in slot 0).
- **Talents**: flipped one point in the second talent-string segment
  (`5-053...` → `5-153...`).
- **Rotation**: `player.aplRotation.simple.specRotationJson`'s
  `delayMajorCDs` changed to `99` (an intentionally unmistakable non-default
  value).
- **Consumes**: food changed from the preset default (`27658`) to `27655`.
- **Miscellaneous**: distance from target set to `15` (default `5`).
- **Buffs/debuffs**: `raidBuffs.giftOfTheWild` toggled `TristateEffectMissing`
  → `TristateEffectRegular`; `debuffs.judgementOfWisdom` toggled `false` →
  `true`.
- **Encounter**: duration set to `150`.
- **UI settings**: iterations set to `5000`.

Every value above was read back from both the live in-memory state
(`player`/`sim`/`raid` getters) and the page's own autosave
(`localStorage[...__currentSettings__]`) before either capture, and the two
agreed — this caught one real harness mistake mid-run (a first attempt at
changing rotation left an earlier "before" capture briefly out of sync with
live state; it was discarded and redone with an explicit live/stored
cross-check before trusting a capture, not accepted on the first read).

## Verdict: PASS

Sanity check: `player.equipment` differs between captures (confirmed: index 0
goes from PreRaid's `32087` to P1's `29073`). No other field differs.

## Script output

```
PASS: empty diff outside player.equipment
```

Exit code: `0`.

## Notes

- `player.itemSwap.items[0]` still carries the PreRaid weapon
  (`id: 32087`) unchanged after the gear-only import — confirming the item
  swap _setting_ (a page setting, not part of the WCL log) is untouched by
  `setGear`, exactly as the method doc's field-by-field derivation predicts.
- The harness hook (`window.__ew4`, a one-line addition to
  `IndividualSimUI`'s constructor in `ui/core/individual_sim_ui.tsx`) was
  removed after the run; `git diff` on that file is empty.
- No WCL credentials or sims were used, per the method doc — this experiment
  tests `player.setGear` application only.
