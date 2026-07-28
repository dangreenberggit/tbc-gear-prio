# Sub-phase 6: tags, tests, hardening

**Status:** Plan. Not implemented.
**Parent:** `.scratch/handoffs/raid-scoped-pool-plan.md`, sub-phase 6.
**Scope:** best-in-slot tags for display only, regression tests, and
operational notes. No code is changed by writing this document —
`packages/`, `scripts/`, and `data/` are untouched by this pass.

Files read to write this plan: `packages/core/src/pool.ts`,
`packages/core/test/pool-file.test.ts`, `scripts/curate_ret_pool.py`,
`scripts/generate_pool.py`, `scripts/sync_wowsims.py`,
`packages/core/src/kael-temp.ts`.

---

## 1. Tags are display and pinning only

### What this means concretely

`PoolEntry.bisTags` (`packages/core/src/pool.ts:26`,
`Array<"BiS" | "Alt" | "Realistic">`) must never be read by any function
that decides **which items exist in the ranking**. Today's readers of
`bisTags` are, per grep of `packages/core/src`, `rank.ts:322`
(`bisTags: entry.bisTags ?? []`, copying the field onto the output
`RankedItem` for display) and whatever renders `rank-report.ts`. Neither of
those is a membership decision — both run after the candidate list is
already fixed. That is the correct shape and sub-phase 6 must keep it that
way: no new code path should read `bisTags` before or during
`filterPoolByPhase`, `filterPoolByZone` (sub-phase 5), or the sim loop in
`rankUpgrades`.

### The proof (success criterion S6)

S6 in the parent plan: "Removing best-in-slot tags does not change the
pool." Prove this with a test that is mechanical, not a code-reading
argument:

```ts
it("removing bisTags does not change pool membership", () => {
  const stripped = curated.entries.map((e) => {
    const { bisTags, ...rest } = e;
    return rest as PoolEntry;
  });
  const before = filterPoolByPhase(curated.entries, 3).map((e) => e.itemId).sort();
  const after = filterPoolByPhase(stripped, 3).map((e) => e.itemId).sort();
  expect(after).toEqual(before);
});
```

Run at the highest `maxPhase` the fixture data supports, so the comparison
covers the largest possible entry set. If sub-phase 5 ships
`filterPoolByZone`, add the same before/after comparison through that
function too, for at least one zone that has entries.

This test belongs next to the existing tests in
`packages/core/test/pool-file.test.ts`, since that file already loads the
real `data/pools/ret.json` and tests properties of the curated pool as
shipped (see the existing "ships no null sources" and "keeps forced P3
chase pieces" tests at lines 15-40 of that file).

---

## 2. Regression tests

Each test below should assert on specific item IDs, per the task
instruction, not on aggregate counts alone — counts can pass by accident
(e.g. 2 wrong items removed and 2 different wrong items added nets zero
count change). Where a specific ID isn't yet knowable because it depends on
sub-phase 1-4 output not yet built, this plan says what the test should
check once that data exists, and flags it as **blocked on** the relevant
sub-phase.

### 2.1 Wowsims' curated ret sets are admitted

**Today's measured failure:** 2 of 16 items per set survive the generator,
the same for preraid, P1, and P2 (parent plan §2, table row 1). Re-run
target for this claim: whatever script produced it — check
`.scratch/handoffs/pool-redesign/diagnosis-and-plan.md` for the exact
command before writing the test, since this plan does not re-derive it.

**Test to add**, once sub-phase 4's universe assembly ships:

```ts
it("admits all items from wowsims' curated ret gear sets", () => {
  const wowsimsIds = new Set<number>();
  for (const file of ["ret_preraid.gear.json", "ret_p1.gear.json", "ret_p2.gear.json"]) {
    const gear = JSON.parse(readFileSync(join(root, "vendor/wowsims", file), "utf8"));
    for (const item of gear.items ?? []) {
      if (item?.id) wowsimsIds.add(item.id);
    }
  }
  const poolIds = new Set(curated.entries.map((e) => e.itemId));
  const missing = [...wowsimsIds].filter((id) => !poolIds.has(id));
  expect(missing, `missing wowsims BiS items: ${missing.join(", ")}`).toEqual([]);
});
```

The exact JSON shape of `ret_preraid.gear.json` etc. should be confirmed
against the vendored file before implementing — this plan describes the
intent (every item in wowsims' own curated sets must be a pool member), not
a verified field path. **Blocked on:** sub-phase 4 (universe must actually
contain these items before this test can pass) — write the test in
sub-phase 6's implementation but expect it red until sub-phase 4 lands, or
land it disabled/todo with a comment pointing at this plan.

### 2.2 No bows or guns in ranged; librams only

Parent plan D7: "Ranged accepts librams only." Test:

```ts
it("ranged slot is librams only", () => {
  const ranged = curated.entries.filter((e) => e.slot === "ranged");
  expect(ranged.length).toBeGreaterThan(0);
  for (const e of ranged) {
    // A concrete negative list is easy to defeat by construction (any
    // non-libram ranged item passes). Assert against the wowsims item
    // record's weapon type instead of an item-name substring check.
    const dbItem = wowsimsDb.get(e.itemId);
    expect(dbItem?.rangedWeaponType, `${e.itemId} ${e.name}`).toBe(
      "RangedWeaponTypeLibram"
    ); // exact enum string TBD — confirm against vendor/wowsims/db.json shape
  }
});
```

The exact enum value name must be confirmed against
`vendor/wowsims/db.json`'s actual field (`scripts/generate_pool.py:51` uses
a numeric constant `RANGED_LIBRAR = 7` against `proto.RangedWeaponType`,
so the TS-side check should use the same numeric/proto source, not a
re-derived string, to avoid the test and the generator silently drifting
apart on what "libram" means).

### 2.3 No Kael'thas encounter-only legendaries; Twinblade is kept

`packages/core/src/kael-temp.ts` already defines
`KAEL_TEMP_LEGENDARY_IDS` (7 IDs: 30318, 30313, 30316, 30317, 30312, 30311,
30314) and `isKaelTempLegendary`. `rank.ts:214` already filters these out
of candidates at rank time. Test both layers, since a pool-level test and a
rank-level test catch different regressions (one catches a bad pool file,
the other catches someone removing the `rank.ts` filter call):

```ts
it("pool excludes Kael'thas temp legendaries, keeps Twinblade", () => {
  const ids = new Set(curated.entries.map((e) => e.itemId));
  for (const kaelId of KAEL_TEMP_LEGENDARY_IDS) {
    expect(ids.has(kaelId), `Kael temp ${kaelId} should not be in pool`).toBe(false);
  }
  expect(ids.has(29993)).toBe(true); // Twinblade of the Phoenix
});
```

This duplicates part of the existing test at
`packages/core/test/pool-file.test.ts:32-40` (`ids.has(30318)` false,
`ids.has(29993)` true) — extend that existing test to loop over the full
`KAEL_TEMP_LEGENDARY_IDS` set by importing it, rather than writing a new
test with the same fixture load. Do not add a second, separately-loaded
copy of `curated`.

### 2.4 Leather and mail items present in body slots

Parent plan D7: ret body slots accept plate, leather, and mail. Named
examples from the task: Belt of One-Hundred Deaths (30106, leather),
Shattrath Leggings (30257, leather), Cobra-Lash Boots (30104, mail).

```ts
it("includes specific leather and mail body-slot items", () => {
  const ids = new Set(curated.entries.map((e) => e.itemId));
  expect(ids.has(30106)).toBe(true); // Belt of One-Hundred Deaths (leather)
  expect(ids.has(30257)).toBe(true); // Shattrath Leggings (leather)
  expect(ids.has(30104)).toBe(true); // Cobra-Lash Boots (mail)
});
```

Belt of One-Hundred Deaths (30106) is already asserted present in
`pool-file.test.ts:34`, so this test adds the other two IDs and should
probably fold into the existing "keeps forced P3 chase pieces" test rather
than duplicate the fixture load — same reasoning as 2.3.

Also worth a slot-armor-type cross-check, not just presence: confirm via
`vendor/wowsims/db.json` that these three items' `armorType` /
`type` fields are actually leather/mail (not plate mislabeled), so the test
proves the armor filter is genuinely open, not just that these three IDs
happen to be in the file for an unrelated reason (e.g. `HAND`/`FORCE`
overrides in `curate_ret_pool.py`).

### 2.5 All 18 ret tier pieces present, attributed to the correct zone

Parent plan: "All 18 ret tier pieces have no source data" today (measured,
§3), covering setIds 626, 629, 680. Task instruction: currently 9 of 18 are
missing. **Blocked on sub-phase 2** (token-to-piece mapping) for the
"present" half and **sub-phase 1/2** for the "correct zone" half.

Two tests, once sub-phase 2 ships the token-to-armor mapping:

```ts
it("all 18 ret tier pieces are present", () => {
  const tierSetIds = new Set([626, 629, 680]);
  // wowsimsDb here means whatever loads vendor/wowsims/db.json item records,
  // keyed by itemId, with a setId field — confirm exact field name before
  // implementing.
  const tierItemIds = [...wowsimsDb.values()]
    .filter((it) => tierSetIds.has(it.setId))
    .map((it) => it.id);
  expect(tierItemIds.length).toBe(18); // sanity: db itself has all 18 defined
  const poolIds = new Set(curated.entries.map((e) => e.itemId));
  const missing = tierItemIds.filter((id) => !poolIds.has(id));
  expect(missing, `missing tier pieces: ${missing.join(", ")}`).toEqual([]);
});

it("tier pieces are attributed to their token's drop zone", () => {
  for (const entry of curated.entries) {
    if (!tierItemIds.has(entry.itemId)) continue;
    expect(entry.source.kind, `${entry.itemId} ${entry.name}`).toBe("token");
    // zone must match the hand-verified token map from sub-phase 2, e.g.
    // T6 pieces -> "Black Temple" or "Hyjal Summit" or "Sunwell Plateau",
    // per scripts/curate_ret_pool.py's existing HAND entries for these IDs
    // (lines 23-43 today) as a starting reference, to be superseded by
    // sub-phase 2's verified mapping.
  }
});
```

The exact 18 item IDs and their zones must come from sub-phase 2's
verified-against-Wowhead mapping, not guessed here — this plan states the
shape of the test, sub-phase 2's deliverable supplies the concrete IDs.

### 2.6 Every pool entry has a source; a missing source fails the build

This already exists, partially. `scripts/curate_ret_pool.py:375-379`
already exits 1 if any generated entry lacks a resolvable source (`HAND`
map or generator-provided). `packages/core/test/pool-file.test.ts:18`
already asserts `expect(e.source, ...).toBeTruthy()` on every shipped
entry.

What is missing: **the build-time check only fires when
`curate_ret_pool.py` is actually run.** If someone hand-edits
`data/pools/ret.json` directly and skips the curation script, the exit-1
guard never runs, only the test does — and the test only catches it on the
next `pnpm test` invocation, not at generation time. Confirm this is
acceptable (the test is a real gate in CI via `pnpm verify`, per
`AGENTS.md`'s Gates section) or add a `pnpm pool:build` step that always
runs `curate_ret_pool.py`'s check as part of `pnpm verify`, not only as
part of regenerating the file. This plan recommends the former (rely on the
existing test as the CI gate) since it is already wired and does not
require a new npm script — but say so explicitly rather than assuming.

No new test needed here beyond what 2.1-2.5 add; the existing
`pool-file.test.ts` assertion already covers this criterion once sub-phase
4's universe is wired through `curate_ret_pool.py`.

---

## 3. Operations: what to do when a new phase launches

### The gap, stated precisely

`scripts/sync_wowsims.py`'s `TRACKED` dict (lines 43-50) is a hardcoded
map from local filename to upstream path:

```python
TRACKED = {
    "db.json": "assets/database/db.json",
    "constants_other.ts": "ui/core/constants/other.ts",
    "ret_p1.gear.json": "ui/paladin/retribution/gear_sets/p1.gear.json",
    "ret_p2.gear.json": "ui/paladin/retribution/gear_sets/p2.gear.json",
    "ret_preraid.gear.json": "ui/paladin/retribution/gear_sets/preraid.gear.json",
    "ret_default.apl.json": "ui/paladin/retribution/apls/default.apl.json",
}
```

Its own comment says: "Adding a file here and re-running `--update` is the
whole process for taking on a new upstream input." That means when a new
phase's gear set file appears upstream (e.g. a hypothetical
`ui/paladin/retribution/gear_sets/p3.gear.json`), nothing in this repo
detects that automatically — `TRACKED` has to be hand-edited first. `db.json`
itself is phase-independent (parent plan §3: it already has all five
phases' items, 8,257 total), so the gap is specifically about wowsims'
**curated gear set files**, which stop at P2 upstream (parent plan §3,
confirmed at the pinned release and current master branch).

The task description states there is already a separate task filed for
this. This plan does not re-file it, and does not attempt to fix
`sync_wowsims.py` — that is explicitly out of scope for sub-phase 6 (and
for the whole raid-scoped-pool plan, per parent plan §10: rewriting
ingestion tooling beyond what sub-phases 1-4 need is not this pass's job).

### What sub-phase 6 should document instead

A short operational runbook, either as a comment block near `TRACKED` in
`sync_wowsims.py` or as a section in a docs file (confirm with the user
which — this plan does not have authority to decide where new docs live;
`AGENTS.md`'s Domain docs section says a single `CONTEXT.md` is created
lazily as needed, so that may be the right home once one exists). Contents:

1. **wowsims gear-set files stop at P2.** Do not expect `TRACKED` to
   auto-discover a P3+ file; check upstream manually
   (`github.com/wowsims/tbc-new` at whatever tag `data/wowsims.lock.json`
   pins) when a new phase's curation work starts, and add the entry to
   `TRACKED` by hand if a corresponding gear-set file exists there.
2. **The raid loot universe (AtlasLoot-derived, sub-phase 1) and the
   Wowhead lists (sub-phase 3) are the sources that actually need refreshing
   per phase**, since they are what determines pool membership going
   forward (parent plan D6), not the wowsims curated sets (which are
   display-tag input only, per D3/D4 and this plan's section 1). Concretely,
   at a new phase launch: re-pin AtlasLoot if the new raid's loot isn't in
   the pinned commit yet, and manually collect a new Wowhead ret list for the
   new phase following sub-phase 3's process.
3. **The token-to-piece tier mapping (sub-phase 2) needs a new entry set**
   for each phase that introduces a new tier (e.g. T6 already needed its own
   verification because token groupings differ from T4/T5, per parent plan
   §5.3 — a hypothetical future tier would need the same manual
   verification against Wowhead, it cannot be assumed to follow the same
   token grouping as the previous tier).
4. **This is a manual, per-phase checklist, not automation**, consistent
   with D9 (no Wowhead scraping in CI; collection is a manual step producing
   committed JSON).

---

## 4. Docstring fix: `scripts/generate_pool.py` lines 10-11

### Current text (measured, read directly from the file)

```
Equippability is armor type + weapon type (R11) — classAllowlist is empty on
most items. Ret: plate; weapons exclude polearm and staff.
```

### What's wrong with it

Paladins can equip polearms in TBC; they cannot equip staves. The docstring
states both exclusions as if they were the same kind of fact (an equip
rule), but only the staff exclusion is an equip rule. The polearm exclusion
is a product scope choice made in this plan (parent plan D8: "Polearms are
excluded as a product scope choice. Paladins can equip polearms in TBC; the
earlier claim that they cannot was wrong and has been corrected in
PLAN.md."). PLAN.md itself has already been corrected, per the task
description — this docstring is the one place that still states the old,
wrong version.

### Fix

Replace the docstring line with wording that separates the two claims
explicitly:

```
Equippability is armor type + weapon type (R11) — classAllowlist is empty on
most items. Ret: plate; weapons exclude staff (paladins cannot equip staves)
and polearm (product scope choice — paladins can equip polearms in TBC, but
this pool excludes them; see PLAN.md D8).
```

The `WEAPON_POLEARM = 6` constant at line 49 and wherever it's used in the
filter logic (grep `WEAPON_POLEARM` in `scripts/generate_pool.py` before
editing, to find the actual exclusion line) should get an inline comment
making the same distinction, since a future reader skimming the filter code
rather than the module docstring would hit the same wrong assumption there.

This is a one-line-ish documentation fix with no behavior change — the
polearm exclusion itself is not being reversed, only the comment describing
why it exists.

---

## 5. Summary of concrete changes for the eventual implementer

| File | Change |
|---|---|
| `packages/core/test/pool-file.test.ts` | Add: bisTags-removal-doesn't-change-membership test (S6). Extend existing Kael/forced-item test to loop `KAEL_TEMP_LEGENDARY_IDS` and add 30257, 30104. Add (blocked on sub-phase 4): wowsims-curated-sets-fully-admitted test. Add (blocked on sub-phase 1/2): ranged-is-librams-only test via db.json weapon type, not name substring. Add (blocked on sub-phase 2): all-18-tier-pieces-present + tier-piece-zone-attribution tests. |
| `scripts/generate_pool.py` | Fix docstring lines 10-11 to describe the polearm exclusion as a product choice, not an equip rule. Add inline comment at the `WEAPON_POLEARM` filter site making the same distinction. |
| `scripts/sync_wowsims.py` or a docs file (confirm location with user) | Add an operational runbook: wowsims gear sets stop at P2 and `TRACKED` needs manual edits for new files; the sources that actually need refreshing per phase are AtlasLoot (sub-phase 1) and Wowhead lists (sub-phase 3), not wowsims' curated sets; tier token mappings (sub-phase 2) need re-verification per new tier, not just per phase. |
| None | No change to `packages/core/src/kael-temp.ts` — it is already correct and already wired into `rank.ts`; this sub-phase only adds test coverage referencing it. |

Everything in section 2 that is marked "blocked on" a numbered sub-phase
should be written now as a real test (not a comment-only TODO) if the data
it depends on already exists in some form (e.g. `KAEL_TEMP_LEGENDARY_IDS`
and the leather/mail IDs already exist today and do not need to wait). Only
the tier-piece and wowsims-curated-set tests are genuinely blocked, because
their expected-ID lists do not exist yet.

---

## What this document did not measure

Added after the writing review. Everything below is unverified and must not be
treated as established.

- **The expected item IDs for the tier-piece test.** All 18 ret tier pieces
  (setIds 626, 629, 680) are confirmed present in `db.json` and confirmed to have
  no source data, but the token that redeems each one has not been verified. The
  existing mapping in `scripts/curate_ret_pool.py` is wrong for 18 of its 24
  token entries, so it cannot be used as the expected values.
- **Whether the wowsims curated-set test threshold should be 16 of 16.** Today 2
  of 16 items per set survive the generator. The target after the rebuild has not
  been agreed. Some items may be legitimately excluded, and that list does not
  exist yet.
- **Run time of the full test suite** after these tests are added.
- **Whether removing best-in-slot tags changes membership.** Section 1 proposes a
  test to prove it does not. The test has not been written or run.
