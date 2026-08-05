# Domain review brief

You are reviewing a diff against subject-area truth about TBC Classic,
Warcraft Logs, and wowsims — not against code style or the product spec.
Your source of truth is `docs/phase0-findings.md` and
`docs/verification-log.md`, both committed in this repo. Read them before
reviewing the diff. Do not rely on general WoW/TBC knowledge where those
files state something more specific — they were verified against live data,
general knowledge wasn't.

## Facts already established — the diff must not contradict these

- **WCL reports 19 gear entries per combatant; the sim expects 17 in a
  different order.** A drop-only mapping gets 11 of 17 positions wrong.
  The real index → slot mapping is in `docs/verification-log.md` (R17).
- **`permanentEnchant` is the `effectId` namespace, not `itemId`** —
  confirmed by resolving all values both ways. `temporaryEnchant` is a
  separate consumables namespace and should never be scored as an enchant.
- **Enchant/gem synthesis must be eligibility-aware, not gap-filling.** An
  empty slot is only a candidate for synthesis if the item DB says that slot
  *can* carry an enchant or has sockets. Treating every empty slot as
  missing data invents enchants for rings and other non-enchantable slots.
- **Meta gem activation is not enforced by the sim.** Any code path that
  runs a baseline or candidate through the sim without checking meta
  activation status, or that re-optimizes gems instead of repairing at
  minimum EP loss, contradicts PLAN.md §9.
- **Race is not derivable from WCL** — confirmed unrecoverable via
  `ReportActor` fields, `CombatantInfo`, `Character.gameData`, and the Buffs
  table (R8). Any code that infers race, or treats a missing race as an
  error rather than a standing assumption with user override, is wrong.
- **Spec is classified from talent-tree point plurality, and from nothing
  else.** There is no WCL spec-name string at actor level for any class
  (`subType` is class-level only), and **`CombatantInfo.specID` is unusable** —
  [P0] every combatant reads `specID: 0` on TBC Anniversary, including confirmed
  Ret (`docs/phase0-findings.md`, PLAN.md §5.2). Treating `0` as a real spec
  mis-specs the whole raid. The points live in `CombatantInfo.talents[].id`,
  which is **points spent, not a talent id** ([R18]) — `[{id:21},{id:40},{id:0}]`
  reads 21/40/0, and the three sum to 61 at level 70.
- **Content tier (`currentPhase`) comes from upstream's own
  `CURRENT_PHASE`** (`data/wowsims.lock.json`, synced via
  `scripts/sync_wowsims.py`), never inferred from a player's most recent
  raid log.

## What to hunt

- Any game-mechanic assumption asserted in the diff (comments, variable
  names, test fixtures, docstrings) that these findings don't support.
- Any place the diff re-derives one of the facts above independently
  instead of reading it from `data/wowsims.lock.json` or the seam that owns
  it — a second, possibly-drifting source of the same truth.
- New WCL field usage not covered by the findings — flag it as unverified,
  not wrong, and say what would need probing to confirm it.

## Report format

For each finding: file + line, the fact it contradicts (quote
`docs/phase0-findings.md` or `docs/verification-log.md`), and the concrete
consequence (wrong number, wrong slot, invented data). If a new WCL
assumption shows up that isn't covered by existing findings, flag it as
**unverified** separately from actual contradictions.

Under 400 words.
