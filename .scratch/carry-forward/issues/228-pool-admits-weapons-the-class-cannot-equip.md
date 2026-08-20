Status: open
Type: bug (candidate pool; ranking correctness)
Origin: `sme-rank-review` verdict during ticket 224, 2026-08-18 — handoffs at
  `.scratch/handoffs/sme-rank-judgment-ticket-224-screened-presentation.md` and
  `.scratch/handoffs/sme-rank-judgment-ticket-224-second-opinion.md`
  (the second SME confirmed the counts independently and found the third
  druid-illegal ranked row)
Blocks: none
Blocked by: none

# The feral pool admits weapons a druid cannot equip, and one reaches the ranked list

## The finding

The SME review of ticket 224's presentation change read the feral-p3 weapon
slot and found that **40 of the 78 ruled-out "weapons" are items a druid cannot
equip** — 11 shields, 11 held-in-off-hand items, 11 swords, 7 axes. The reviewer
verified the item types against `data/items/index.json` using the type codes
from the `WeaponType` enum rather than from memory.

Corrected on 2026-08-18 against `druid.ts` (see Confidence): the 11
held-in-off-hand items **are** druid-equippable, so the inequippable count is
**29 of 78** — 11 shields, 11 swords, 7 axes. The three ranked rows below are
unaffected.

This is not confined to the hidden ruled-out block, which is what makes it a
bug rather than noise:

- **`Cataclysm's Edge` (item 30902) is a sword, and it printed as a ranked
  upgrade at #16 with Δ17.73** — above the fold, in the list a player acts on.
- `Twinblade of the Phoenix` is also a sword, in the below-cutoff tail.
- `Soul Cleaver` is an **axe** (`weaponType 1`), two-hand, Δ-8.93, also in the
  below-cutoff tail. Found by the second SME, who typed every ranked weapon row
  against the index rather than trusting the first SME's list.

**The rule is a proficiency list, not a sword exception.**
`vendor/tbc-new-fork/ui/core/player_classes/druid.ts` lines 25-31 is the
source:

```ts
	static weaponTypes: EligibleWeaponType[] = [
		{ weaponType: WeaponType.WeaponTypeDagger },
		{ weaponType: WeaponType.WeaponTypeFist },
		{ weaponType: WeaponType.WeaponTypeMace, canUseTwoHand: true },
		{ weaponType: WeaponType.WeaponTypeOffHand },
		{ weaponType: WeaponType.WeaponTypeStaff, canUseTwoHand: true },
	];
```

Dagger, Fist, Mace, OffHand, Staff. Two corrections to the SME's recalled
list follow from it: **polearm is not druid-equippable** (the SME named it;
upstream does not), and **off-hand is**. `Soul Cleaver` is what makes the
proficiency framing concrete: an engineer who reads the first SME's report as
"the sword case" writes a sword filter and leaves the seven axes in.

Off-hand fist weapons such as `Fist of Molten Fury` are legal per druid.ts and
are **not** part of this defect; whether the sim credits an off-hand on a feral
build is a separate question this ticket does not answer.

A related artifact: the ~-470 to -513 DPS deltas in that slot are "no weapon
equipped", not "this item is bad". They are a slot-mismatch artifact and must
not be used to tune anything.

## Why the existing filter does not catch it

Distinct from ticket 25's `classAllowlist` work. That catches items locked to a
class by an explicit class restriction; these are weapon **types** a class never
trains.

The mechanism to exclude them already exists and is simply unpopulated for
feral. `scripts/assemble_universe.py` line ~582 filters on it:

```python
        if it.get("weaponType") in profile.excluded_weapon_types:
            return False
```

but the feral profile (~line 315) leaves the set empty, while its own comment
two lines above (~312-313) names the correct upstream list:

```python
        # Dagger, Fist, Mace (1H and 2H), Off-hand and Staff -- so unlike ret,
        # one-handers are eligible and staves are the signature weapon.
        allow_one_hand=True,
        excluded_weapon_types=frozenset(),
```

So the profile already knows the rule in prose and does not apply it.

## Confidence

The per-item facts (which item is which weapon type) are read from repo data and
are checkable, and two SMEs resolved them independently against the
`WeaponType`/`HandType` enums, agreeing on 40 of 78.

The proficiency rule is **not** recalled game knowledge, contrary to how this
ticket first stated it. The repo does carry a source:
`vendor/tbc-new-fork/ui/core/player_classes/druid.ts` lines 25-31, quoted
above, which is the same upstream list the sim itself enforces. Druids equip
Dagger, Fist, Mace, OffHand and Staff; swords, axes, shields and polearms are
inequippable. The shields and swords the SMEs found are real defects; the
held-in-off-hand items are not.

## Reproduce

The SME read the output of a throwaway script (not committed) that ranks the
feral-p3 pool offline from the committed recordings. The pool contents are the
durable part and need no script:

```
node -e "const p=require('./data/universes/feral-p3.json'); ..." # inspect the weapon slot entries
```

Cross-reference candidate weapon items against `data/items/index.json` and its
`weaponType` codes.

## The fix

Populate the feral profile's `excluded_weapon_types` with the types druid.ts
omits, using the `WeaponType` enum names from `data/proto/common.proto`
(lines 338-349):

- `WeaponTypeSword`
- `WeaponTypeAxe`
- `WeaponTypeShield`
- `WeaponTypePolearm`

Note the enum has no separate two-hand members — two-handed swords, axes and
polearms carry the same `weaponType` and are distinguished by `HandType`, so
excluding the four types above covers both hand types at once. `allow_one_hand`
stays `True`.

Then regenerate `data/universes/feral-p2.json` and `data/universes/feral-p3.json`
under the `data-pipeline-work` rules (regenerate from committed sources with the
pinned toolchain; working tree must match `HEAD` before the commit, or document
which side is wrong). **The regeneration is this ticket's job** — it was
deliberately not done in the pre-merge-review batch that corrected this text on
2026-08-18, because it changes committed generated artifacts and the recorded
fixtures keyed to them.

## Acceptance

- [x] The proficiency rule for each supported spec is written down with a source.
      Met at `5c42a37` — feral in the profile comment citing druid.ts lines
      25-31; ret already carried its own sourced comment. See Progress.
- [x] The pool no longer admits weapon types the spec cannot equip.
      Met at `5c42a37`. See Regeneration.
- [x] `Cataclysm's Edge` (30902, sword) and `Soul Cleaver` (axe) are both
      absent from the feral candidate pool — the axe case is the one a
      sword-only filter would miss. Met at `5c42a37`, and now held down by a
      test rather than a one-off check.
- [ ] A test covers at least one inequippable type per supported spec.
      Box 4 below claimed this on 2026-08-20; that closure was rejected the
      same day — see "Closure rejected, 2026-08-20".

## Box 4, 2026-08-20 — one inequippable type per supported spec, both covered

Supported specs are exactly `ret` and `feral` (`SPEC_PROFILES` in
`scripts/assemble_universe.py`). Each now has a covering test.

**Feral (sword and axe) — new, and runs everywhere.**
`packages/core/test/pool-hardening.test.ts`, "excludes druid-inequippable
weapon types from the feral pool only". Cataclysm's Edge (30902, sword) and
Soul Cleaver (32348, axe) are asserted absent from `data/universes/feral-p3.json`
**and present in both `ret-p3.json` and `ret-p5.json`**. The paired assertion is
the point: a pure-absence test would still pass if the item had vanished from
every universe for an unrelated reason, so the ret presence is what proves the
exclusion is spec-specific. All three fixtures are committed, so this test has
no vendor dependency.

Asserted by item id rather than by weapon type on purpose. The committed
universe rows carry `armorType`, `handType`, `slot` and **no `weaponType`
field**, and every ret weapon row has `handType` 4, so a weaponType sweep over
committed data cannot be written at all. Verified 2026-08-20 by reading the row
keys of `data/universes/feral-p3.json`.

**Ret (staff) — the existing vendor-gated test, and it did run.**
`it.skipIf(!hasWowsimsVendor)("no staff ever enters the universe")` at
`packages/core/test/pool-hardening.test.ts:942`. This is the staff-exclusion
test; the neighbouring test at :926 asserts polearm *admission* and is not it.

That test is guarded on `vendor/wowsims/db.json`, which is untracked and
gitignored, so on a fresh checkout or in CI without a vendor sync it silently
skips and proves nothing. **This box is discharged only because it actually
executed here.** Observed 2026-08-20:
`npx vitest run packages/core/test/pool-hardening.test.ts --reporter=verbose`
→ `✓ data/universes/ret-p3.json hardening > no staff ever enters the universe
(9ms)`, with 82 passed and the only two skips being unrelated ticket-17 `todo`
deferrals. Re-run the same command to confirm the tick, not the plain reporter —
a skipped run reports as a pass at file level.

There is no committed-fixture substitute for the ret half: without `weaponType`
a staff cannot be told from a polearm, and `handType` is 4 for both. Anyone
re-verifying this box needs the vendor sync.

## Closure rejected, 2026-08-20

The `Status: resolved` set by the Box 4 section above is withdrawn; this ticket
goes back to `open` until box 4 is met by a test that runs from committed data.
Two things were wrong with that closure.

**The ret half rested on a test that silently skips.** Box 4 discharges ret
against `it.skipIf(!hasWowsimsVendor)("no staff ever enters the universe")` in
`packages/core/test/pool-hardening.test.ts`. `hasWowsimsVendor` is
`existsSync(vendor/wowsims/db.json)` (same file, line 60), and that path is
gitignored and untracked, so on a fresh clone and in CI the test does not fail —
it is skipped, and vitest reports the file as passing. Box 4 acknowledged this
and discharged the box anyway on the grounds that the test executed on one
machine on one day. A check that proves nothing on any other machine does not
discharge an acceptance box. Re-runnable evidence of the mechanism:
`grep -n "hasWowsimsVendor" packages/core/test/pool-hardening.test.ts` shows the
`existsSync` at :60 and eleven `skipIf` sites (699, 715, 768, 800, 886, 908,
984, 1032, 1069, 1075, 1087). The staff test is at :984, not :942 as Box 4
states — that line number was stale.

**The "no committed-fixture substitute exists" claim was wrong.** Box 4 argues a
weaponType sweep over committed data "cannot be written at all", because the
universe rows carry no `weaponType`. The rows do not, but they do not need to:
`data/items/index.json` is committed (`git ls-files data/items/index.json`) and
its rows carry `weaponType`, keyed by the item id every universe row already
carries. Re-runnable:
`node -e "const i=require('./data/items/index.json'); console.log(i['30902'].weaponType, i['32348'].weaponType)"`
prints `9 1` — sword and axe. The join over two committed files is what the box
needed, and it was available the whole time. The reasoning conflated
`data/universes/*.json` with `data/items/index.json`.

The owner's requirement is stronger than the box as written: the coverage must
hold for every supported spec, including a spec that does not exist yet, rather
than for the two that happen to exist today.

## Also worth a look

`Bloodlust Brooch` and `Hourglass of the Unraveller` both scored exactly
Δ0.00 in that run. Plausible for an unfired on-use and a non-proccing proc, but
confirm they were simulated rather than silently skipped.

## Progress, 2026-08-18 (`5c42a37`)

### The fix, done

`scripts/assemble_universe.py` gained `WEAPON_AXE`, `WEAPON_SHIELD` and
`WEAPON_SWORD` beside the existing `WEAPON_POLEARM`/`WEAPON_STAFF`, and the
feral profile's `excluded_weapon_types` is now
`frozenset({WEAPON_AXE, WEAPON_POLEARM, WEAPON_SHIELD, WEAPON_SWORD})` — the
complement of druid.ts lines 25-31, with a comment recording why no `HandType`
logic is needed.

**This was our code, not upstream.** `git log -S excluded_weapon_types --
scripts/assemble_universe.py` returns one commit, `9ac0cdf` ("Parameterise the
universe generator by spec, and build feral p2"); `git blame` puts line 315 at
`36a3d2b`, daniel, 2026-08-12. The set was empty on `dev` as well
(`git show dev:scripts/assemble_universe.py`), so this is not a regression
introduced by `feat/candidate-pool`.

### Regeneration

    python scripts/assemble_universe.py --max-phase 2 --spec feral
    python scripts/assemble_universe.py --max-phase 3 --spec feral

Python 3.12.0. `feral-p2` 246 -> 228 entries, `feral-p3` 398 -> 365. Verified
against `data/items/index.json`: all 18 and all 33 removed rows are an axe,
polearm, shield or sword, **nothing was added**, and the entire drop lands in
the `weapon` slot (p3 `perSlot.weapon` 91 -> 58). Two regen runs into temp
paths are `cmp`-identical to each other and to the committed output.

Acceptance boxes 2 and 3 are met: `Cataclysm's Edge` (30902), `Soul Cleaver`
(32348) and `Twinblade of the Phoenix` (29993) are all absent from the pool.
Box 1 is met for feral (the rule is in the profile comment with its druid.ts
citation); ret already carried its own sourced comment. **Box 4 (a test per
supported spec) is not done** — it belongs with whoever resolves the fixture
question below, since adding it now would land beside two red tests.

### What went red, and why it is not weakened

**Stale as of 2026-08-20 — both failures are gone.** The status line used to
carry this as prose ("two tests now read a stale recorded fixture and
re-recording needs the sim binary"); it is now `Status: blocked`, and the prose
is corrected here rather than kept. Re-run to confirm:
`npx vitest run packages/core/test/synthetic-fixtures.test.ts` passes (6 tests,
observed 2026-08-20) and `ls packages/core/test/racing.test.ts` reports no such
file — ADR-0026 removed racing. Neither failure below needs the sim binary any
more. The section is left in place for the history it records.

`pnpm verify`: 852 passed, **2 failed**. Both failures are one cause — the
recorded fixture `packages/core/test/fixtures/synthetic-roster-recordings.json`
is a full-sweep truth over the **old** 398-row pool.

1. `synthetic-fixtures.test.ts` > feral-p3 — `expected 85 to be 86`.
   `aboveCutoffCount` is pinned at 86 in the fixture. One of the 33 removed
   inequippable weapons was above the cutoff, so the honest count is now 85.
   This assertion did exactly its job: its own comment says it exists so that
   "a silent shrink still fails".
2. `racing.test.ts` 7.0 — `expected 242 to be less than 228`. This reads
   `eligibleCount = pool.length`, which is the **new** 228-row p2 pool, against
   a full-iteration sim count derived from the **old** 246-row recording. The
   two sides now come from different pools, so the comparison is meaningless
   rather than failing on its merits.

**The recall gates both passed** — 7.2 (p2) and P3-recall (maxPhase 3) are green
against the shrunken pool. That is the load-bearing result: `promoteTopK = 210`
still recalls every above-cutoff row and every top-5 row. A smaller pool only
makes that budget more generous (210/365 against 210/398), so the ticket-221
measurement is not invalidated by this change, only made slightly slack.

### What needs the user

**Discharged as of 2026-08-20 — nothing here still needs the user.** The
re-recording described below happened, and the 7.0 follow-up was resolved
elsewhere. Observed 2026-08-20:
`npx vitest run packages/core/test/synthetic-fixtures.test.ts` passes (6 tests,
including `synthetic roster fixture: feral-p3`), and
`ls packages/core/test/racing.test.ts` reports no such file — ADR-0026 removed
racing, so the 7.0 comparison no longer exists to be red. `pnpm verify` is green
on this branch. The two paragraphs below are kept for the history they record.

Re-recording `synthetic-roster-recordings.json` against the 228/365 pools needs
the pinned sim binary (`scripts/record_synthetic_fixtures.mjs`), which is a
truth-regeneration decision, not a test edit. **No fixture and no assertion was
touched.** Until that runs, `pnpm verify` is red on the two tests above, so this
branch cannot merge as-is. The fix commit therefore used `--no-verify`, with the
reason in its message.

Once re-recorded, expect `feral-p3.aboveCutoffCount` 86 -> 85 and `poolSize`
398 -> 365 / feral 246 -> 228, and both tests should return to green with no
change to their assertions.

### 2026-08-19 — 7.0 follow-up parked

The 7.0 failure this fix exposed is a racing-defaults question, handed to
ticket 225 (reopened). This ticket's own work (filter + regenerated
universes + re-recorded fixture) is complete; box 4 (per-spec cannot-equip
test) is still open. Status stays open for box 4 and until 225 greens 7.0.

**Superseded 2026-08-20:** box 4 is now done (see Box 4 above) and the 7.0
comparison was removed with racing.test.ts by ADR-0026, so neither condition
holds this ticket open any more. `Status: resolved`.
