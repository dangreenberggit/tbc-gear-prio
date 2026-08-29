# SME rank judgment — ret cloth armor, and ret one-handers/shields

Ticket: upgrades-dedup-wowsims. Branch `feat/upgrades-dedup-wowsims`.
Audience: engineering team. Companion to
`sme-rank-judgment-upgrades-dedup-wowsims-feral-polearms.md` (feral polearms,
verdict B).

## Verdicts

- **Part 1, cloth armor: ADMIT — do not add an armor-class policy axis.**
  Verdict `trust-with-caveats`. But see F3: the premise the question was built
  on is wrong, and one specific implementation of "exclude cloth" would be a
  **data-loss bug**, not a policy.
- **Part 2, one-handers / off-hands / shields: EXCLUDE — keep the 2H policy.**
  Verdict `trust`. This is the same shape as the feral polearm call and the
  evidence is as clean.

## What was reviewed

Whether ret's pool should exclude (1) cloth armor and (2) one-handed weapons,
off-hands and shields, for TBC phases 1-5.

Inputs read: `vendor/wowsims/db.json` (pinned), `data/items/index.json`,
`data/universes/ret-p5.json`, `data/universes/warrior-p5.json`, and the deleted
hand rules recovered from git at `640ad03`.

## Findings

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| F1 | Ret's committed p5 pool holds 520 entries and its 23 weapons are **all `handType 4` (two-hand)**. No `offhand` or `shield` slot entry exists at all. | Info — confirms the prompt | `Counter(e['handType'] for e in entries if slot=='weapon')` → `{4: 23}` on `data/universes/ret-p5.json`. |
| F2 | Ret's pool already carries leather and mail freely in every armor slot: at p5, armorType 2 = 97, 3 = 91, 4 = 132 across the eight armorType-bearing slots. So this was never "plate only" — it was specifically "not cloth". | Medium | Slot/armorType cross-tab on `ret-p5.json`. |
| F3 | **The prompt's premise that cloaks have no armorType is false, and it matters.** In `db.json`, inventory `type 4` (back) is **250 items, every one of them `armorType 1`** — all cloaks are cloth. Ret's p5 pool contains 36 such cloaks, entry 0 being Cloak of Unforgivable Sin (34241, `armorType: 1`). A filter written as "drop armorType 1" therefore **deletes every cloak from ret's pool**, removing 36 shipped, correct entries. | **High — this is a bug risk, not a policy question** | `Counter((type,armorType))` over `db.json` → `type 4 armorType 1: 250`, and no other armorType at type 4. Ret entry 0 read from `ret-p5.json`. |
| F4 | **The old hand rule did not exclude cloth as a domain judgment — every other spec includes it.** Recovered from `640ad03`: balance `{CLOTH, LEATHER}`, rogue `{CLOTH, LEATHER}`, hunter/ele/enh `{CLOTH, LEATHER, MAIL}`, mage/shadow/warlock `{CLOTH}`, **warrior `{CLOTH, LEATHER, MAIL, PLATE}`**. Cloth is in all nine because cloth is what cloaks are. Ret is the only spec that omits it. | **High** | `git show 640ad03 \| grep armor_types=` — nine profiles, all containing `ARMOR_CLOTH`. |
| F5 | **The controlled comparison already shipped.** Warrior is the other plate class. Its committed p5 pool is 1509 entries and contains **177 cloth pieces in real armor slots** (head/shoulder/chest/wrist/hands/waist/legs/feet) — Jade Inlaid Vestments (20635), Deathmist Robe (22075), Frostfire Robe (22496), Robe of Faith (22512) and 87 more. Ret has 0. The exact thing Part 1 proposes to exclude for ret is already shipped, unremarked, for warrior. | **High** | `data/universes/warrior-p5.json` armor-slot cross-tab → `{1: 177, 2: 183, 3: 164, 4: 313}`. |
| F6 | The commit that introduced the rules justifies the 2H rule in prose and says **nothing** about cloth. Quoted from `640ad03`: "All nine set allow_one_hand=True. Ret's False is specific to it: a retribution paladin only ever swings a two-hander." No comparable sentence exists for ret's missing `ARMOR_CLOTH`. | Medium | `git show 640ad03` commit body. |
| F7 | The cloth pieces that would land are unambiguously caster gear, carrying zero Strength and zero Agility: Robes of Faltered Light (34233) 39 Sta / 40 Int / 134 spellpower; Cowl of Light's Purity (34339) 51 Sta / 42 Int; Sunfire Robe (34364) 36 Sta / 34 Int. Confirmed `armorType 1` in `db.json`. | Medium | Stat arrays from `data/items/index.json`; armorType from `db.json`. |
| F8 | Two of ret's 23 shipped weapons are polearms — Shivering Felspine (34183) and Halberd of Desolation (32248) — the same items ruled out for feral. That is correct and consistent: a ret paladin swings the weapon, so its damage counts, whereas a cat discards it. It is a useful check that the two verdicts do not contradict each other. | Info | `ret-p5.json` weapon list. |

## Part 1 — cloth armor: ADMIT

The question as posed does not survive contact with the data. It assumes ret's
cloth exclusion was a deliberate domain policy analogous to the feral polearm
rule. It was not. Every other spec profile in `640ad03` includes `ARMOR_CLOTH`,
including **warrior**, the other plate class, whose shipped p5 pool already
carries 177 cloth armor pieces (F4, F5). Ret's omission is an outlier that the
introducing commit never explains, while it does explain the 2H rule in the same
breath (F6). An unexplained outlier that contradicts the sibling plate spec is
better read as an oversight than as wisdom.

The domain answer to "did a ret ever wear cloth in an armorType slot" is no —
a plate wearer loses a large armor bonus and the tier set bonuses, and no real
ret equips a caster robe (F7). But that argument proves too much: it applies
verbatim to warrior, and this repo already shipped and reviewed warrior's pool
with the cloth in it. Ruling ret differently would make the two plate specs
disagree for no stated reason, which is a worse outcome for a reader than either
choice made consistently. This is where D5 genuinely does apply: unlike the
feral polearms, these items are not mechanical zeros — they carry real stat
budget that a ret EP set simply weights near nothing, so the ranking buries them
honestly rather than being asked to rank a blank.

**The load-bearing point is F3.** All 250 cloaks in the db are `armorType 1`.
A filter expressed as "ret excludes armorType 1" would strip all 36 cloaks from
ret's pool, including its current top entry. If the team decides to exclude
cloth anyway, the rule must be scoped to the eight armorType-bearing body slots
and must explicitly exempt `back` — otherwise it is a data-loss bug wearing a
policy's clothes. My recommendation is to admit and add no axis, which avoids
the trap entirely.

**Am I comfortable with ret's reviewed pool growing by ~97 at p5?** Yes, with
one caveat: this makes ret consistent with warrior rather than making it novel,
so the growth is a correction of an outlier rather than a new risk. Nothing in
the sampled additions needs excluding for a different reason — they are ordinary
raid caster drops, and the arena filter's 0/786 overlap is expected because none
of them are rating-gated. I did **not** independently re-derive the +97 or the
786; those came from the prompt.

## Part 2 — one-handers, off-hands, shields: EXCLUDE

Retribution in TBC is defined by the two-hander. The spec's signature ability,
Seal of Command, and its whole talent structure are built around one big slow
weapon swing; a paladin holding a one-hander and a shield is playing protection
or holy, which are different specs with different gear. The pool is explicitly
`RetributionPaladin`, and the repo builds no holy or protection universe (the
prompt states this and it is consistent with only 11 slugs existing), so there
is no sibling list where Bulwark of Azzinoth or Aegis of the Vindicator would
legitimately belong.

Is a shield in a retribution list misleading? Yes, and more so than a caster
robe. A robe reads as obvious junk to any reader — wrong armor, wrong stats,
sorted to the bottom, dismissed in a glance. A shield reads as a **build
recommendation**. Bulwark of Azzinoth and Bastion of Light are genuinely
desirable paladin items, correctly ranked high for a paladin who wants them, and
their presence in a *retribution* upgrade list invites the reader to conclude
the tool thinks ret should consider a shield. That is the F3-precedent harm from
the prior arena gate — a row the reader cannot act on — but with an added trap,
because here the item is not merely unactionable, it is actively wrong for the
spec while looking right for the class.

This also lines up with the feral verdict rather than cutting against it. Both
are cases where the fork's capability answer ("a paladin can hold a shield") is
true and irrelevant, because the pool's question is spec membership, not class
capability.

**Paste-ready justification:**

> Retribution is a two-handed spec: Seal of Command and the ret talent tree are
> built around a single slow two-hander, and a paladin wielding a one-hander
> with a shield is playing protection or holy. This repo builds no holy or
> protection universe, so a shield like Bulwark of Azzinoth (id 28593) has no
> list it legitimately belongs to. Shields and one-handers are excluded because
> they are not low-ranked ret candidates but correct items for a different spec,
> and their presence in a retribution list reads as a build recommendation the
> tool is not making.

## contested

`contested:` the prompt states as fact that "the classic cross-armor cases are
usually cloaks/rings/trinkets, which have NO armorType and are unaffected by
this filter." **Cloaks do carry armorType, and it is always 1 (cloth)** — all
250 back-slot items in `db.json`, and all 36 cloaks currently in ret's p5 pool.
Rings and trinkets are correctly described (`armorType: None`). Any exclusion
built on the stated premise would silently delete ret's cloaks.

`contested:` the prompt frames Part 1 as choosing whether to keep a deliberate
policy. The evidence (F4, F5, F6) says there was no deliberate cloth policy to
keep — ret is the only one of ten specs missing `ARMOR_CLOTH`, and warrior ships
cloth today.

## Confidence and caveats

- **High confidence** on F1-F7: every figure was read from the named files by
  the commands quoted, on this branch.
- **Recalled, unverified**: that Seal of Command and the ret talent tree are
  built around a slow two-hander; that ret's 2H preference was universal in TBC
  practice; that plate wearers lose meaningful armor and set bonuses in cloth.
  These are the mechanical premises under both verdicts. The repo evidence for
  Part 2 (F1: all 23 shipped weapons are two-handed) is independent of them.
- **Not verified**: the +66/+110/+156 growth figures and the 786/97 cloth counts
  are from the prompt. F5's warrior comparison is mine and is the stronger
  argument regardless of the exact ret number.
- **Part 1 is the weaker of the two calls.** I land on admit mainly for
  consistency with warrior (F5) rather than because caster robes in a ret list
  are good. What would settle it decisively: a decision on whether warrior's
  shipped 177 cloth pieces are themselves considered correct. If the team judges
  warrior's cloth to be wrong too, then the right move is a **shared** plate-class
  armor policy applied to both specs and scoped to exclude the `back` slot — not
  a ret-only axis. I would support that; what I will not support is ret and
  warrior disagreeing.
- **Part 2 I am confident in** and would not expect a second opinion to move it.

---

## Correction appended 2026-08-25 (pre-merge review, finding D1)

This handoff is a record and is left as written. One factual error in it, for
anyone reading it later:

The paste-ready justification above cites "Bulwark of Azzinoth (id 28593)".
**28593 is Eternium Greathelm**, a plate helm that is legitimately in ret's
pool. **Bulwark of Azzinoth is 32375**, and it is correctly excluded by the
policy. Verified against the pinned `vendor/wowsims/db.json`:

```
python -c "
import json
db=json.load(open('vendor/wowsims/db.json',encoding='utf-8'))
by={int(i['id']):i for i in db['items']}
for i in (28593,32375): print(i, by[i]['name'], by[i].get('weaponType'))"
```

The verdict is unaffected — only the illustrative id was wrong. The shipped
note in `scripts/assemble_universe.py` and the regenerated ret universes carry
32375.
