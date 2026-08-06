# Feral coupling audit — ticket 05, evidence pass

Branch `phase-2/feral`. This file records what the audit **measured** before any
feral code was written, so the gate-box verdict rests on evidence rather than on
inspection alone. Every claim below names a command a reader can re-run.

Toolchain: wowsims pinned at `v0.0.101` (`8aa378b3671a`) per
`data/wowsims.lock.json`. Restore inputs with `pnpm sync:wowsims:restore`.

## 0. A correction to the ticket's own precondition

Ticket 05 says to restore `vendor/` with `pnpm sync:wowsims`. **That command is
wrong and destructive here.** `package.json:18` maps it to
`sync_wowsims.py --update`, which fetches the *latest* tag and rewrites the
lockfile. Running it moved the pin `v0.0.101 -> v0.0.109` and dropped the entire
`proto` block from `data/wowsims.lock.json`.

The correct command is `pnpm sync:wowsims:restore` (`--restore`), which the
script's own docstring (`scripts/sync_wowsims.py:180`) describes as the one for
"CI and fresh worktrees". Reverted with `git checkout -- data/wowsims.lock.json`;
the tree is clean at the committed pin.

```bash
pnpm sync:wowsims:restore && git status --short data/
```

Note `pnpm sync:wowsims:check` **exits 1** here, reporting upstream drift
(`v0.0.101 -> v0.0.109`). That is a pre-existing upstream-moved condition, not
something this branch introduced or should act on.

## 1. Feral cat gear sets exist upstream, and are richer than ret's

Checked at the pinned commit, not at HEAD:

```bash
gh api "repos/wowsims/tbc-new/contents/ui/druid/feralcat/gear_sets?ref=8aa378b3671a0923fd11fb34b4b3753e53f20c9b" --jq '.[].name'
```

Upstream splits `ui/druid/feralcat/` from `ui/druid/feralbear/` — the cat/bear
distinction this ticket must make is one **upstream already makes**. Cat ships
16 gear sets (`p1_bis_9p`, `p1_realistic_6p`, `p2_9p`, ... `p5`, `pre_raid`)
against ret's 3 (`preraid`, `p1`, `p2`).

This falsifies a comment in `scripts/assemble_universe.py:30-33`, which says
upstream ships "one curated set per stage ... (no BiS/Alt/Realistic split like
some other specs)". True for ret; **false for feral cat**, which is exactly the
BiS/Alt/Realistic split that comment says some other specs have. Any code that
tags `bisTags` by "appears in a curated set" needs a rule for *which* of the 16,
and the `6p`/`9p` suffixes are tier-bonus variants, not phases.

**Scope limit, recorded rather than assumed:** the Phase 1 note that wowsims has
no ret P3 set does not carry over. Feral cat has `p3`, `p4` and `p5` sets, so a
feral comparison basis exists past P2 where ret's does not.

## 2. The generator: per hard-coding, logic vs path

Ticket 05 asks for exactly this table. Verdicts are **path** (a constant to
parameterise) or **logic** (a rule that is materially different for feral).

| # | What | Where | Verdict |
|---|---|---|---|
| 1 | `EP_WEIGHTS` -> `data/presets/ret/p2.ep-weights.json` | `:25` | **path** |
| 2 | `WOWSIMS_GEAR_SETS` -> three `ret_*.gear.json` | `:35-37` | **path**, but see §1 — feral has 16 candidates, so the *selection rule* is new |
| 3 | `TWO_HOP` -> `data/two-hop/ret-tokens.json` | `:39` | **path** + new data |
| 4 | `SUNMOTE_UPGRADES` -> `ret-sunmote-upgrades.json` | `:43` | **path** + new data |
| 5 | `WOWHEAD_DIR` -> `data/wowhead-lists/ret` | `:45` | **path** + new data |
| 6 | `RET_TIER_PIECE_IDS`, `"spec": "ret"` stamped | `:104`, `:910` | **path** + new data |
| 7 | `CLASS_PALADIN = 2`, gating `classAllowlist` | `:152/156` | **logic** — see below |
| + | `ret_eligible_d7()` | `:198` | **logic**, four independent rules |

### Why #7 and `ret_eligible_d7` are logic, not path

`ret_eligible_d7` (`scripts/assemble_universe.py:196-238`) encodes four
class-specific equip rules. Checked against upstream's own class definition at
the pinned commit:

```bash
gh api "repos/wowsims/tbc-new/contents/ui/core/player_classes/druid.ts?ref=8aa378b3671a0923fd11fb34b4b3753e53f20c9b" --jq '.content' | base64 -d
```

| Rule | Ret (implemented) | Druid (upstream) | Same shape? |
|---|---|---|---|
| Armor | Leather, Mail, Plate | Leather, **Cloth** | No — not a subset either way |
| Weapon hand | two-hand **only** | 1H and 2H (Dagger, Fist, Mace, Staff) | No |
| Staff | **excluded** | **allowed**, `canUseTwoHand` | Inverted |
| Ranged | Libram (7) | **Idol (6)** | Different enum value |
| Class id | `CLASS_PALADIN = 2` | wowsims `ClassDruid = 11` | Constant |

The class id alone is a path change. The other four are not: the two-hand gate
and the staff exclusion would reject the bulk of druid weapons, and there is no
`RANGED_IDOL` constant in the file at all (`:91-98` defines
`RANGED_LIBRAM = 7` and no idol).

Impact measured against the pinned db rather than estimated:

```bash
python -c "import json;db=json.load(open('vendor/wowsims/db.json'));i=db['items'];print('idols',sum(1 for x in i if x.get('rangedWeaponType')==6),'librams',sum(1 for x in i if x.get('rangedWeaponType')==7),'staves',sum(1 for x in i if x.get('weaponType')==8))"
```

36 idols, 33 librams, 160 staves. 347 items carry a druid `classAllowlist`
against 337 for paladin. So ret's filter, run unchanged for feral, would drop
every idol and every staff — the ranged slot would be empty and the weapon slot
badly wrong.

**Verdict on the generator: 6 of 7 named hard-codings are paths; one
(`CLASS_PALADIN`) plus the unnamed `ret_eligible_d7` are logic.** Per ticket 05
this is reported *separately from* the gate box, which asks only about
`rankUpgrades` and its seams — the generator is a build-time script, not a seam,
so the box can legitimately pass while this remains true.

## 3. The engine: what feral actually forces

`Deps` (`packages/core/src/rank.ts:88-101`) already carries `raidSimSkeleton`,
`epWeights`, `gemPalette` and `pool` as **data, not ports** (ADR-0019), and
`RankInput.spec` is already `SpecId`. `SpecId` in `packages/core/src/types.ts:11`
is already `"ret" | "feral"` — the type anticipated the second spec.

The skeleton carries class, talents and race as data:

```bash
python -c "import json;d=json.load(open('data/presets/ret/p2.raid-sim-skeleton.json'));p=d['raid']['parties'][0]['players'][0];print(p['class'],p['race'],p['talentsString'])"
```

-> `ClassPaladin RaceBloodElf 5-053201-...`. So a feral preset is genuinely a new
JSON file. `compose.ts` was inspected and is spec-agnostic: it maps gear into
the skeleton and never branches on class.

Three real engine couplings, none of them structural:

1. **`PRESET_ID = "ret/p2.raid-sim-skeleton"`** (`rank.ts:228`) is a module
   constant used at `:332` and `:570`. Its comment — *"Hashed and disclosed from
   one place, so the two cannot drift apart"* — is the property to preserve
   while making it per-spec. This is a **value** change, not a shape change.
2. **`classifySpec`** (`packages/core/src/spec.ts:34-58`) returns
   `unsupported-class` for any `className !== "Paladin"`, and
   `SpecClassification` is a closed union of `{ok:true, spec, treeIndex}` /
   `{ok:false, reason:"ambiguous"|"unsupported-class"}`. **There is no place in
   this type to express "feral, but which one".** This is the one type that has
   to change shape, and §4 is why.
3. **`PREFERRED_META_IDS = [32409]`** (`candidate-gems.ts:85`) hard-codes ret's
   Relentless Earthstorm Diamond, justified by a long comment about ret weights.

On (3), measured rather than assumed — feral cat's upstream presets carry **no
meta gem at all**:

```bash
python -c "import json;db=json.load(open('vendor/wowsims/db.json'));m={x['id'] for x in db['gems'] if x.get('color')==1};print([ (i,i in m) for i in (32409,24028,30549,30556,32194)])"
```

Only 32409 is color 1 (meta). The gems in `feralcat/p2_9p.gear.json` —
24028, 30549 — are Delicate Living Ruby and Shifting Tanzanite, neither a meta.
So the meta-repair path's preferred-meta list is ret-specific and feral needs
its own answer (which may legitimately be "none").

## 4. Cat vs bear: measured, and plurality provably cannot separate them

Two fixtures captured from **one raid night, one character**, via
`scripts/capture_fixture.py` (new in this branch):

```bash
python scripts/capture_fixture.py --name shredzepelin --server-slug dreamscythe \
  --region US --report YwahQLgv2jBrZGn6 --fight 39 \
  --out test/fixtures/shredzepelin.raw.json
python scripts/capture_fixture.py --name shredzepelin --server-slug dreamscythe \
  --region US --report YwahQLgv2jBrZGn6 --fight 33 \
  --out test/fixtures/shredzepelin-bear.raw.json
```

| Fight | Talents | specID | Cat Form | Dire Bear Form |
|---|---|---|---|---|
| 39 Morogrim Tidewalker | `[0, 45, 16]` | 0 | **99.1%** | 0% |
| 33 Fathom-Lord Karathress | `[0, 45, 16]` | 0 | 30.9% | **69.1%** |

**The talent arrays are byte-identical and `specID` is 0 in both**, confirming
ticket 01's finding on a second class. Cat and bear are the same 45-point feral
tree. Form uptime is the only signal that separates them, and this pair is a
natural falsification case: same character, same night, same talents, opposite
answer. Corroborating casts, from the same captures: fight 39 is
`Shred x76 / Rip x14 / Ferocious Bite x5` with zero bear abilities; fight 33 is
`Lacerate x24 / Mangle (Bear) x15 / Maul x6`.

Note fight 33 is **not** a clean bear fight either — 30.9% cat form is a real
mixed fight, so any threshold rule has to say what it does with one.

## 5. `kharnij` is a Warrior — the third-character box cannot close as planned

Two characters share the name. `characterData.character(name:"kharnij")` on
Dreamscythe-US returns id `97181368`, `classID: 11`; the Kharnij in report
`YwahQLgv2jBrZGn6` is actor id 10, `subType: "Warrior"`.

These agree, and the trap is worth writing down: **WCL's class ids are not
wowsims' class ids.**

```bash
# WCL: 2=Druid, 11=Warrior.  wowsims common.proto: 2=ClassPaladin, 11=ClassDruid.
```

So WCL `classID: 2` for shredzepelin means **Druid**, and WCL `classID: 11` for
kharnij means **Warrior** — the reverse of the wowsims reading. Both sources
agree once the right enum is used: shredzepelin is a Druid, kharnij is a
Warrior. Any code mapping between them needs an explicit table, not a cast.

Consequence: kharnij is not rankable by this engine (no warrior spec, and
warrior is not in `SpecId`). The "≥3 real characters produce believable
shortlists" box has **two** available characters — slamaltman (ret) and
shredzepelin (feral cat) — not three. This is a blocked box, reported rather
than worked around.

The stale claim in `PLAN.md:881` that shredzepelin is a **warrior** is wrong;
he is a druid, and the Phase 0 table in `docs/phase0-findings.md:69` repeats it.

**Resolved 2026-08-06.** `nexess` (Dreamscythe-US, WCL `classID` 2 = Druid) is
the third character — feral cat, 96.6% cat form on Fathom-Lord Karathress,
captured to `test/fixtures/nexess.raw.json`. Three rankable characters now
exist across two specs.

## 6. Outcome of the generator work

The seven hard-codings became `SpecProfile`. Six were paths and moved without
argument; `CLASS_PALADIN` plus `ret_eligible_d7` were logic, and became
`eligible_d7(it, profile)` driven by `armor_types`, `ranged_type`,
`allow_one_hand` and `excluded_weapon_types`.

```bash
for n in 2 3 4 5; do python scripts/assemble_universe.py --max-phase $n; done
git diff --stat data/universes/   # ret-p*.json: no diff
python scripts/assemble_universe.py --max-phase 2 --spec feral
```

Ret regenerates byte-identically across all four universes, so the refactor is
behaviour-preserving and `data/universes/` shows **additions only** — the
condition ticket 05 named as its reportable-defect check.

`feral-p2.json` holds 225 entries against ret's 230, overlapping on 120. The
new equip rules demonstrably fire: the ranged slot holds two idols and no
librams, zero mail or plate leaked in, and 8 staves and 36 one-handers are
present — every one of which ret's filter would have rejected.

Tier: `tierPiecesExpected` 10, `tierPiecesPresent` 10, none missing, all of
them Harness, no Regalia or Raiment leaked in.

### Known limits, not defects

- **Feral has no vendored wowsims gear sets.** `sync_wowsims.py` `TRACKED`
  pulls only `ret_*.gear.json`, so `bis_ids` is empty for feral and every entry
  is untagged rather than falsely "BiS". Fixing this means adding feral entries
  to `TRACKED` and choosing among the 16 upstream cat sets (§1).
- **The token map is not Wowhead-verified**, unlike ret's. The piece↔token join
  is by armour slot within a tier because no committed source states the
  redemption pairing. The slot join is sound; "Defender is the druid token"
  is the assumption that still wants a human check.
- **No feral Wowhead lists**, so feral gets no `wowhead` origin and no recall
  grading. `--hold-out-wowhead` exists precisely because the universe builds
  without them, so this costs quality rather than correctness.
- **Feral tier stops at T5.** No T6 Thunderheart rows, so `maxPhase` 3+ has no
  feral tier coverage.
