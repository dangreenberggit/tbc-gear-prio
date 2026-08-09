Status: closed
Type: bug
Origin: chat, 2026-08-08
Blocks: phase-2
Blocked by: none
Resolved: 2026-08-08 — ADR-0022, `docs/adr/0022-each-spec-carries-its-own-upstream-buff-defaults.md`

## Resolution

Feral now carries its own upstream buff/debuff/individual-buff blocks,
transcribed from `ui/druid/feralcat/sim.ts` @ 8aa378b3 into
`build_feral_skeleton.py`. Only `encounter` is still copied from ret, and that
is now a checked claim: neither spec's `encounterPicker` sets any encounter or
target value.

Scope items, as filed:

1. **Done.** Sourced per spec. Note the defaults live in `sim.ts`, not
   `presets.ts` where `TALENTS`/`CONSUMABLES` came from — feral inline, ret via
   `Presets.Default*`. They are TypeScript expressions, not pinnable files, so
   they are hand-transcribed with upstream file:line citations rather than added
   to `sync_wowsims.py` TRACKED.
2. **Done — comparability dropped deliberately.** ADR-0022 states it: feral and
   ret DPS are no longer comparable to each other, each is comparable to its own
   wowsims browser output. Nothing in the tool ranks feral against ret, and
   carry-forward 72 would destroy the property regardless.
3. **Done.** Both drums fields stay — `PartyBuffs.drums` (someone else plays)
   and `ConsumesSpec.drums_id` (this player plays) are distinct proto fields
   (`common.proto:479`, `:593`) and upstream sets both. `TypeAPL` recorded as a
   deliberate divergence from upstream's `TypeSimple` default.

**One row of the table above was misattributed.** `exposeWeaknessHunterAgility`
1150 vs 1080 is not ret-inheritance: `utils.ts:1317-1324` maps Phase1→1080,
Phase2→1150, and feral's `sim.ts` passes an explicit `Phase.Phase1` while ret's
`P2_PLAYER_SETTINGS` respreads Phase2. 1080 is feral's real upstream default and
is what now ships, even though this is a P2 tool.

**Still open, deliberately not addressed here:** the APL energy-gate hypothesis
(entries 7-10, `currentEnergy <= 30`) for the ~8.5 vs ~3 DPS helm gap, and the
"Related" worry about whether any buff effect is modelled in our data rather
than deferred to the sim.

# Our raid buffs/debuffs are ret's, not each spec's wowsims defaults

## Problem

`scripts/build_feral_skeleton.py:9-11` copies the `raid.buffs`, `raid.debuffs`,
`parties[].buffs` and `encounter` blocks from the **ret** skeleton. Its docstring
justifies this — those blocks "describe the FIGHT rather than the player and must
match for the two specs to be comparable at all" — and for cross-spec
comparability that is a reasonable call.

The consequence it does not address: the resulting raid matches *neither* spec's
upstream defaults. So an absolute DPS number from our sim cannot be compared
against a wowsims number the user produces in the browser, which is the obvious
thing a user does to sanity-check the tool.

Talents, encounter duration/variation and all 42 target stat entries already
match; this is specifically about the buff, debuff and consumable blocks.

## The divergence

Our `data/presets/feral/p2.raid-sim-skeleton.json` vs the default wowsims TBC
feral cat settings (user-supplied export, apiVersion 14):

| Block | Ours | wowsims default |
| --- | --- | --- |
| partyBuffs | — | `ferociousInspiration: 2` |
| partyBuffs | `leaderOfThePack: Improved` | — |
| debuffs | — | `giftOfArthas: true` |
| debuffs | `exposeWeaknessHunterAgility: 1150` | `1080` |
| debuffs | `jocRetribution2pt4`, `curseOfElements: Improved` | — |
| raidBuffs | `thorns: Improved` | — |
| playerBuffs | `blessingOfWisdom: Improved` | — |
| consumables | `drumsId: GreaterDrumsOfBattle` | absent; party `drums: LesserDrumsOfBattle` in both |
| target | `canCrush: true` | — |

Rotation also differs in kind: ours is `TypeAPL` (1 prepull + 12 priority
entries, from the pinned `vendor/wowsims/feral_default.apl.json`); the export was
`TypeSimple` with a `specRotationJson`. `build_feral_skeleton.py:16-19` records a
measurement that APL is what the Go sim actually runs, so APL is probably right —
but it should be a stated decision rather than an artifact of the copy.

**Deliberately not catalogued here: what each buff does mechanically.** The sim
implements those effects; we do not, and we should not be re-deriving TBC
mechanics to decide which rows matter. The fix is to source the right defaults,
not to audit each one's DPS contribution. (An early pass at that audit produced
at least one confidently wrong mechanic description, which is the other reason
this ticket does not carry one.)

## Scope

1. Source each spec's buff/debuff/consumable defaults from **upstream presets for
   that spec**, the way `TALENTS` and `CONSUMABLES` in `build_feral_skeleton.py`
   already are, rather than inheriting ret's.
2. Decide explicitly what happens to cross-spec comparability, which is the thing
   the current copy exists to protect. If per-spec defaults break it, say so in
   the docstring and in `docs/adr/` rather than letting it lapse silently.
3. Resolve the two drums fields (`consumables.drumsId` vs party `buffs.drums`),
   and record the APL-vs-Simple rotation choice as a decision.

## Ranking impact — likely nil, one thing worth checking

A buff that applies to baseline and every candidate alike shifts the whole list
together and does **not** reorder a shortlist, so this is an absolute-DPS
fidelity bug rather than a ranking-correctness one.

The exception worth checking: APL entries 7-10 gate sappers, trinkets and potions
on `currentEnergy <= 30`. A candidate that changes haste or crit changes how often
those gates open, which is a **non-uniform** interaction. That is the live
hypothesis for a separate open question — why two helms sit ~8.5 DPS apart on
wowsims and ~3 DPS apart here — and it survives regardless of how the buff
defaults are resolved.

## Related

A secondary worry raised alongside this, **not investigated and not in scope
here**: if any buff/debuff effect is modelled in *our* data rather than deferred
to the sim, a wrong value would be a much more serious problem than a default
mismatch. Worth a separate look to confirm we defer all of it to the sim.

Carry-forward 72 (`../../carry-forward/issues/72-import-a-user-supplied-wowsims-setup.md`)
is the complement of this ticket: it lets a user supply *their* config rather
than fixing *ours*. Note it weakens scope item 2 above — an imported config is
per-user, so cross-spec comparability cannot be maintained by choosing one set
of defaults. Resolve this ticket first, or resolve the two together.
