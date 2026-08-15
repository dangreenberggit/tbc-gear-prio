# Slice 6 handoff — ret p3 data (bisTags refresh, EP weights, PseudoStat fix)

Branch: `feat/ret-p3-data`, worktree
`C:\Users\dgree\Code\lulz\tbc-gear-prio-wt-ret-p3-data`.

## Bottom line

**Deliverable A (bisTags refresh) is blocked, not done — stop and report per
the brief's own instruction.** B (EP weights) is done. C (PseudoStat fix) was
already done by an earlier commit before this slice started; verified, not
re-touched. Full detail below, including a finding that changes the shape of
A: upstream shipped a real ret P3 gear/EP preset **yesterday**, after the
carry-forward tickets that called this gap unfillable were filed.

## Deliverable A — ret p3 `bisTags` refresh: BLOCKED

### What I verified first (facts from the brief, checked against the file)

- `data/universes/ret-p3.json` has 394 `entries` rows (`node -e` count against
  the committed file). Matches the brief.
- 15 of those rows carry `bisTags`. Matches the brief.
- All 15 carry `"bisTags": ["BiS"]`. The brief said `"bisSets": ["p2"]` on
  those rows — checked: correct, all 15 also carry `"bisSets": ["p2"]`, and
  they are the *same 15 itemIds, same names* as the 15 tagged rows in
  `data/universes/ret-p2.json`. So the brief's description of the bug is
  accurate: p3 is displaying p2-era BiS membership verbatim.

### Why this is generated, not editable

`bisTags`/`bisSets` are written by `scripts/assemble_universe.py`
(`entry["bisTags"] = ["BiS"]`, line ~1592), driven from
`SPEC_PROFILES["ret"].gear_sets` — a list of vendored
`vendor/wowsims/ret_*.gear.json` files — via `bis_set_labels_for_max_phase`
(assemble_universe.py:366-403). That function's own docstring names the exact
situation here: "Where no set is vendored for `max_phase`, the newest
available phase is used rather than tagging nothing... the claim degrades to
'the latest curated set we vendor'." Hand-editing the committed JSON would be
silently overwritten by the next regen and would violate the data-pipeline-work
skill's "generated artifact" rule (working tree must match what the generator
produces from committed sources).

### Two carry-forward tickets already cover this exact gap

`.scratch/carry-forward/issues/121-no-upstream-ret-p3-curated-gear-set-to-pin.md`
and `.scratch/carry-forward/issues/153-p3-curated-list-pinned-to-p2-set.md`
(filed 2026-08-11/12) both establish, with `gh api` verification against three
refs of `wowsims/tbc-new`, that **no ret p3 curated gear set existed upstream**
at the time. Ticket 121 names two options: (1) wait for upstream to ship one,
mechanical pin+regen once it does; (2) hand-curate from a community source —
explicitly flagged "**Expensive; do not start without an explicit ask**,"
because it needs "a new tag vocabulary / source-of-truth story and owner
sign-off," not a mechanical data edit. `bisTags` in `packages/core/src/pool.ts`
is a closed union `"BiS" | "Alt" | "Realistic"` and the type's own comment
defines `BiS` as a claim about wowsims's own curated sets specifically — there
is no existing vocabulary for "community-sourced, not-wowsims-curated"
membership, which is exactly the gap ticket 153 says needs a design decision
before any list gets pulled in.

My brief told me to refresh from "a current community/Wowhead P3 ret BiS
list" if I couldn't verify wowsims curation — and to stop rather than
fabricate membership if I couldn't reach a trusted source. Sourcing a
Wowhead/community list unilaterally would be exactly what ticket 153 says
needs sign-off first (new tag vocabulary, provenance story, whether it's
labelled `BiS` at all). I did not do this.

### The finding that actually matters here: upstream now has a real P3 set

Checked `wowsims/tbc-new` at `master` (not the pin) via `gh api`, since the
tickets above pre-date this session by two days and I wanted to know if
anything had moved:

```
gh api "repos/wowsims/tbc-new/contents/ui/paladin/retribution/gear_sets?ref=master" --jq '.[].name'
```

Returns `p1.gear.json, p2.gear.json, p3.gear.json, p3Bulwark.gear.json,
preraid.gear.json` — **a P3 set now exists**. Commit history on
`ui/paladin/retribution/presets.ts` on master:

```
gh api "repos/wowsims/tbc-new/commits?path=ui/paladin/retribution/presets.ts&sha=master&per_page=10"
```

Top commit: `ac0ed034b`, 2026-08-13T18:15:10Z, "RetP3 Gear and Presets" — one
day before this session, three weeks after this repo's `8aa378b3` pin
(v0.0.101, tagged well before). Confirmed absent at the pin itself:

> **Orchestrator correction (2026-08-14).** `ac0ed034b` carries the *presets*
> (`P3_EP_PRESET`) but **not** the gear JSONs. Verified:
> `gh api ".../gear_sets?ref=ac0ed034b"` returns only p1/p2/preraid, while the
> same call at `ref=master` returns p1/p2/**p3**/**p3Bulwark**/preraid. The
> gear sets landed 26 minutes later in `5c7491899` ("missed jsons",
> 2026-08-13T18:41:45Z). Consequence: a pin bump aimed at the curated set must
> reach **`5c7491899` or later** — bumping to `ac0ed034b` would get the EP
> weights and still no gear set. Deliverable B's provenance is unaffected
> (the EP values genuinely are at `ac0ed034b`); only the pin-bump target
> changes.

```
gh api "repos/wowsims/tbc-new/contents/ui/paladin/retribution/gear_sets?ref=8aa378b3671a0923fd11fb34b4b3753e53f20c9b" --jq '.[].name'
```
→ `p1.gear.json, p2.gear.json, preraid.gear.json` only. So tickets 121/153
were correct when filed; the situation changed the day before this slice ran.

This is ticket 121's **Option 1 (wait for upstream)**, now available: "if a
ret p3 file appears, the mechanical pin+regen recipe... applies and costs ~an
hour." That recipe needs:

1. Bumping `data/wowsims.lock.json` past the pin (or adding a second pinned
   ref) to reach `ac0ed034b` or later, and vendoring `ret_p3.gear.json` (and
   maybe `ret_p3Bulwark.gear.json` — two ret P3 sets exist upstream now,
   unclear which one this repo should treat as canonical) via
   `scripts/sync_wowsims.py`'s `TRACKED` mechanism.
2. Adding the new file(s) to `SPEC_PROFILES["ret"].gear_sets` in
   `scripts/assemble_universe.py`. `CURATED_SET_PHASE` already maps
   `"p3": 3` (assemble_universe.py:354) — no change needed there.
3. Regenerating `data/universes/ret-p3.json` (and checking p4/p5 — they carry
   over via `carryoverPolicy: "union"` and may also currently show the same
   p2-tagged rows).

Step 1 is `vendor/` and lockfile territory — explicitly **not mine** per this
slice's hard rules ("Do not edit anything under `vendor/`... If your work
seems to require touching them, stop and report instead"). Step 2 touches
`scripts/assemble_universe.py`, shared across specs; PLAN.md D2 keeps the pin
at `8aa378b3` deliberately, with rebase named as a separate PR-checklist item
(§9 slice 7), not this slice's job to schedule unilaterally.

**What I did instead: nothing to the universe file. I am reporting this as a
live, resolvable blocker** — not "no source exists" (my brief's stop
condition), but "the source exists now and the fix is a pin bump + one script
edit outside this slice's file ownership." The orchestrator should decide
whether to fold this into the fork-pin-rebase work already planned (§9 slice
7) or schedule it as a fast-follow before slice 6 is called done. Tickets 121
and 153 should both get a comment linking this finding — I did not edit them;
that felt like the orchestrator's or user's call given they're carry-forward
tickets with their own acceptance criteria.

**Orchestrator verification of set contents (2026-08-14).** The worker flagged
that it had not checked whether the new set is real or a blanked stub — worth
checking, since `85df9a63b` ("Blank out all gearsets") is in this file's own
history. Read at `ref=master`: `p3.gear.json` is a populated 17-slot positional
array with **16 slots filled** (one empty `{}`, the same shape p2 uses), with
enchants and gems, e.g. `{"id": 32235, "enchant": 3003, "gems": [32409, 32193]}`.
So it is a genuine curated set, not a stub. Item names were **not** resolved
against `db.json`, so "these are Black Temple/Hyjal items" remains an inference
from id ranges, not a verified mapping.

**Untested / unverified**: whether `p3.gear.json` vs `p3Bulwark.gear.json` is
the "main" set upstream intends players to see by default, or whether both
should be vendored (feral already has a BiS/Alt split — ret may be gaining a
similar split with `Bulwark` as a defensive variant). I did not read the sets'
contents closely enough to judge — I fetched `p3.gear.json`'s 17-slot array
during investigation (17 items, ids like 32235, 30022, 30055, ...) but did not
cross-check it against `db.json` or resolve item names.

## Deliverable B — ret p3 EP weights: DONE

New file: `data/presets/ret/p3.ep-weights.json` (committed `32571f1`).

### Provenance

Values transcribed from upstream `wowsims/tbc-new`
`ui/paladin/retribution/presets.ts`, `P3_EP_PRESET`, read via:

```
gh api "repos/wowsims/tbc-new/contents/ui/paladin/retribution/presets.ts?ref=master" --jq '.content' | base64 -d
```

read 2026-08-14, at commit `ac0ed034b` (the same "RetP3 Gear and Presets"
commit from Deliverable A, 2026-08-13T18:15:10Z) — **not** this repo's
`8aa378b3` pin; `P3_EP_PRESET` does not exist at the pin (checked the same way
Deliverable A's gear-set absence was checked — the code block simply is not in
the file at that ref). The file's `pin` field says this explicitly rather than
implying pin parity it doesn't have.

Stat-enum mapping cross-checked against this repo's own
`data/proto/common.proto` (`StatStrength = 0`, `StatAgility = 1`,
`StatSpellDamage = 5`, `StatAttackPower = 17`, `StatMeleeHitRating = 20`,
`StatMeleeCritRating = 21`, `StatMeleeHasteRating = 22`,
`StatArmorPenetration = 23`, `StatExpertiseRating = 24`) — same key set as
`p2.ep-weights.json`, so the shape is a straight value swap, not a new schema.

```json
{
  "source": "wowsims/tbc-new ui/paladin/retribution/presets.ts P3_EP_PRESET",
  "pin": "ac0ed034b (master, 2026-08-13) -- not yet at this repo's 8aa378b3 pin; P3_EP_PRESET does not exist at 8aa378b3",
  "weights": {
    "0": 1.0, "1": 0.73, "5": 0.16, "17": 0.42,
    "20": 2.15, "21": 0.8, "22": 1.22, "23": 0.1, "24": 2.15
  },
  "pseudoWeights": { "0": 5.43 }
}
```

### What I deliberately did NOT do

`scripts/assemble_universe.py`'s `SpecProfile.ep_weights` is a single
hardcoded path per spec (`ROOT / "data/presets/ret/p2.ep-weights.json"` for
every ret phase; same pattern for feral at p1). There is no per-phase EP
weight selection today — p3/p4/p5 universes all currently score
`curationHint` and gem/meta-repair against p2 weights regardless of the new
file. I did not wire `p3.ep-weights.json` into the generator: that means
editing `SpecProfile.__init__`/`SPEC_PROFILES`, a structural change to code
shared with feral, and a decision about whether p4/p5 should also move to p3
weights or get their own files eventually — a design call, not a "produce the
file" data task. The file exists and is ready to be wired in whenever that
decision is made.

**Consequence for the orchestrator:** producing this file alone does not fix
the "p3 rankings scored with p2 weights" half of the plan §7 bug. The wiring
edit is small (change one path per profile, or thread `maxPhase` into a
lookup) but touches a script other slices may also be touching; flagging
rather than doing it unilaterally.

## Deliverable C — `PseudoStatMainHandDps` fix: ALREADY DONE, verified only

`data/presets/ret/p2.ep-weights.json` already carries
`"pseudoWeights": { "0": 5.34 }` in this worktree — it was not missing. Traced
via `git log --follow -p -- data/presets/ret/p2.ep-weights.json`: commit
`2fdad02` ("Score weapon damage, the term ret cares about most"), dated
2026-08-02, added exactly this — `0` is `PseudoStatMainHandDps` per this
repo's own `data/proto/common.proto:260` (`PseudoStatMainHandDps = 0;`, a
separate enum space from `Stat`), matching upstream's
`[PseudoStat.PseudoStatMainHandDps]: 5.34` in `P2_EP_PRESET` (checked live via
`gh api` at the `8aa378b3` pin — value matches exactly). The task brief
("missing `PseudoStatMainHandDps`," citing PLAN.md §16 item 3) describes
PLAN.md's *original* finding from before that commit landed; PLAN.md §16 text
itself was not updated after the fix, which is presumably why the brief still
names it as outstanding.

I made no change here — nothing to fix. I did apply the same enum lookup
(`0` = `PseudoStatMainHandDps`) when transcribing `p3.ep-weights.json` for
Deliverable B, using upstream's matching P3 value `5.43`.

## Before/after counts

| | before | after |
|---|---|---|
| `ret-p3.json` `entries` rows | 394 | 394 (untouched) |
| `ret-p3.json` rows with `bisTags` | 15 | 15 (untouched) |
| `bisTags` values on those 15 rows | all `["BiS"]`, `bisSets: ["p2"]` | unchanged |
| `data/presets/ret/*.ep-weights.json` files | 1 (p2 only) | 2 (p2, p3) |
| `p2.ep-weights.json` `pseudoWeights` | `{"0": 5.34}` (pre-existing) | unchanged |

## Commits

- `32571f1` — "Add ret p3 EP weights transcribed from upstream master"
  (`data/presets/ret/p3.ep-weights.json`, new file, 18 lines).

No other commits — Deliverable A produced no file change (blocked), Deliverable
C required none (already fixed).

## Environment notes for whoever reads this next

This worktree had no `node_modules` and no `vendor/` on first use — both are
gitignored and a fresh `git worktree add` doesn't carry them over from the
source checkout. Ran `pnpm install` (clean, matched `pnpm-lock.yaml`, only
warning was the pre-existing `esbuild` build-script skip under
`onlyBuiltDependencies` — did not run `pnpm approve-builds`, per AGENTS.md) and
`python scripts/sync_wowsims.py --restore` (pulled all 14 tracked files at the
pinned `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`, matched lockfile shas, no
drift). Neither step touched anything under `data/` or `packages/`, and both
are exactly the commands AGENTS.md's "Durable claims" section says a fresh
worktree needs before trusting gitignored generated/vendored inputs are
present.

## `pnpm verify` result

Ran clean, no redirection truncation — full output observed, exit code
checked explicitly:

```
$ pnpm verify; echo "VERIFY_EXIT=$?"
...
 Test Files  38 passed | 1 skipped (39)
      Tests  757 passed | 2 skipped | 2 todo (761)
...
sync:atlasloot:verify-local -> vendor/atlasloot absent -- skipping (run `pnpm sync:atlasloot:restore`)
atlasloot:regen:check       -> vendor/atlasloot absent -- skipping regen check
rep-tables:check ok: 14 factions, 10 used by db.json, 4 standings in use, 95 rep rows shipped (95 id-checked)
wowhead-prose:check ok: emitted 6 universes, 0 redundant wowhead locus rows
curated-set-phase:check ok: 4 phases in step
mirrors:check ok: skill mirrors match
lock-merge:check ok: lockfile merge preserves foreign blocks (7 checks)
sync-wowsims:unit:check ok: sync_wowsims.py guard rails ok (6 checks)
feral-skeleton-apl:check ok: feral skeleton APL schema gate ok (3 checks)
  [informational only, pre-existing, unrelated to this slice: a temp feral
   APL fixture uses a field ('timeToNextEnergyTick') unknown to the pinned
   proto -- the check still reports ok because it's flagging that condition
   by design, not failing on it]
VERIFY_EXIT=0
```

AtlasLoot gates skip cleanly (no `vendor/atlasloot`, not touched by this
slice, and `--restore`-ing it was never in scope). Every other gate ran and
passed, including the two most relevant to this slice's changes
(`curated-set-phase:check`, `sync-wowsims:unit:check`).

`git status` was clean before and after every commit — no stray dirty files
rode along.

## Summary for the orchestrator

- **B and C: done.** p3 EP weights exist and are truthfully sourced; the
  PseudoStat fix was already in place before this slice started.
- **A: blocked, not fabricated.** The universe file is untouched. The
  underlying "why" (no upstream ret p3 curated set) that tickets 121/153
  documented as unfillable **changed yesterday** — upstream shipped one. Doing
  the actual fix needs a pin bump and an `assemble_universe.py` edit, both
  outside this slice's file ownership (`vendor/`, `data/wowsims-fork.lock.json`
  are explicitly other slices'/the orchestrator's). This is now a "someone
  needs to do the pin+regen recipe" ticket, not a "no source exists" dead end.
- Plan §9.6's done-when ("refreshed p3 tags carry a provenance note, EP files
  exist for p3, and the `sme-rank-review` verdict is filed") is **not met**:
  tags are not refreshed. `sme-rank-review` was never mine to run per the
  brief, and reviewing a ranking still built on p2-era tags would not be
  useful yet regardless.

## Slice 6b handoff — pin+regen executed, EP wiring done, one latent bug found

Branch: `feat/ret-p3-data`, worktree
`C:\Users\dgree\Code\lulz\tbc-gear-prio-wt-ret-p3-data`. Ran ticket 121's
Option 1 recipe against the ref slice 6's orchestrator correction named
(`5c7491899`, not `ac0ed034b`), and wired the resulting EP weights into
`assemble_universe.py`. Bottom line: **deliverable A is now done** —
`data/universes/ret-p3.json`'s 15 previously-p2-tagged rows carry
`bisSets: ["p3"]`, sourced from a real, verified, non-stub upstream set.
p4/p5 degrade to p3 instead of p2. EP scoring for p3+ now uses p3's own
weights. Along the way, regenerating `ret-p2.json` surfaced and fixed a
real (if narrow) pre-existing bug in `assemble_universe.py`'s curated-item
membership logic — detail below.

### Commits (in order)

- `90cd3d8` — **not mine**, made by the orchestrator before this slice
  started (annotation on slice 6's finding, plus the `pin` string
  correction in `p3.ep-weights.json`). Included here only so the SHA list
  below reads as one continuous sequence.
- `621b8af` — "Vendor ret P3 gear set without moving the main pin"
- `7aaff35` — "Wire ret P3 gear set into bisTags, regen p3-p5"
- `896c6d8` — "Score ret p3+ universes with p3 EP weights, not p2's"
- `d96c044` — "Guard curated-item membership by the item's own phase"

### Ref vendored and why that ref, that scope

Vendored `ui/paladin/retribution/gear_sets/p3.gear.json` from
`5c7491899b5d71adecdc8de28d4fb2f77f0571b8` (resolved via
`gh api repos/wowsims/tbc-new/commits/5c7491899`, confirmed date
2026-08-13T18:41:45Z and message "missed jsons" — matches the orchestrator's
correction exactly). Did **not** bump `data/wowsims.lock.json`'s top-level
`commit`/`tag` (still `8aa378b3671a0923fd11fb34b4b3753e53f20c9b` / `v0.0.101`,
per plan decision D2).

The existing `sync_wowsims.py` machinery (`--update --tag`, `--update --ref`,
`--restore`) has no notion of "fetch this one file from a different ref than
everything else" — `do_update` always resolves one `sha` and fetches every
`TRACKED` entry at it. Bumping to `--ref 5c7491899` to pick up `p3.gear.json`
would have force-moved `db.json`, both TS sources, every other gear set, and
every feral file to that ref in the same lockfile write, none of which
changed between the two commits and none of which D2 said to move. That is
exactly the "wholesale bump... NOT obviously correct" case the brief warned
about.

Added a `PER_FILE_PIN` dict (`scripts/sync_wowsims.py`) mapping a `TRACKED`
key to a commit that overrides the main pin for that file only. `do_update`
fetches each file at `PER_FILE_PIN.get(local, sha)` and records the override
as that entry's own `"commit"` field in the lockfile only when it differs
from the top-level pin; `do_restore` reads the same field back
(`meta.get("commit", sha)`). Verified: running `--update --tag v0.0.101`
(the pin's own tag) produced a lockfile diff containing **only** the new
`ret_p3.gear.json` entry — every other file's sha256 unchanged, top-level
`commit`/`tag` untouched. Verified round-trip: deleted the vendored file,
ran `--restore`, got the same bytes back with checksum verification passing.
Both `check_sync_wowsims.py` and `check_lock_merge.py` still pass (6 and 7
checks respectively) — neither exercises `PER_FILE_PIN` directly, but
neither regressed either.

This is a small, reviewable schema extension in the spirit of `watchedRefs`
(tracking one thing outside the main pin) rather than a new mechanism; a
file listed in `PER_FILE_PIN` should be removed from it once a future
`--update` naturally reaches its commit or later, at which point the
override becomes a no-op diff. **Untested**: whether a *second* `PER_FILE_PIN`
entry (two files each needing their own override commit) round-trips
cleanly — only one entry (`ret_p3.gear.json`) was exercised here.

### p3 vs p3Bulwark: vendored p3 only, not Bulwark

Read both files at `5c7491899` directly. They differ in exactly one slot
(index 4, chest): `p3.gear.json` has item `30905` (Midnight Chestguard),
`p3Bulwark.gear.json` has `28485` (Bulwark of the Ancient Kings) — everything
else byte-identical, enchants and gems included.

Read `presets.ts` at the same commit: `P3_GEAR_PRESET` (built from
`p3.gear.json`) is wired into `P3_PRESET_BUILD_RET`, the group's default P3
build (`makePresetBuild('P3', { group: 'Retribution', phase: Phase.Phase3,
gear: P3_GEAR_PRESET, ... })`). `P3BULWARK_GEAR_PRESET` exists as a
selectable named preset (`makePresetGear('Bulwark', ...)`) but has **no**
`PresetBuild` of its own — nothing wires it into a default build. This
settles the "which is mainline" question definitively rather than by
inference: upstream's own build wiring says `p3.gear.json` is the set
players get by default; Bulwark is an alternative gear preset a user can
pick, not a second curated recommendation upstream endorses equally.
Followed the brief's conservative-default instruction and vendored only
`p3.gear.json`. No new `bisTags` vocabulary was needed or considered.

### Before/after counts

| universe | entries before | entries after | tagged rows | bisSets before | bisSets after |
|---|---|---|---|---|---|
| ret-p2.json | 240 | 241 | 0 (p2 tags apply at p2's own max_phase only... n/a, see note) | n/a | n/a |
| ret-p3.json | 394 | 394 | 15 | `["p2"]` ×15 | `["p3"]` ×15 |
| ret-p4.json | 441 | 441 | 15 | `["p2"]` ×15 | `["p3"]` ×15 |
| ret-p5.json | 534 | 534 | 15 | `["p2"]` ×15 | `["p3"]` ×15 |

ret-p2.json note: ret-p2 was never in scope for bisTags refresh (p2 tags
against p2's own set were already correct), but its *membership* is affected
too — `wowsims_curated_item_ids` unions `gear_sets` across every phase
regardless of `max_phase`, so adding `ret_p3.gear.json` to the profile widens
every ret universe's candidate pool, p2 included. Net after both the
membership widening and the phase-guard fix (see below): **+1** row
(`33122` Cloak of Darkness, phase 1) with no `bisTags` (p2's max_phase
excludes a p3-only set from the current-phase claim). A second candidate,
`32574` Bindings of Lightning Reflexes (phase 3), was briefly admitted by
the same widening and then correctly excluded again by the phase-guard fix
— see below.

**The headline number**: ret-p3.json's 15 tagged rows moved from
`bisSets: ["p2"]` to `bisSets: ["p3"]`, matching 15 of `p3.gear.json`'s 16
populated slots. The 16th (`27484` Libram of Avengement) is not tagged
because it is not in the universe **at all** — confirmed present-vs-absent
against `HEAD~1` (pre-slice-6b) before touching anything: it was already
absent. It is a phase-1 heroic-dungeon drop with no raid/zone/rep source
this repo's membership rules currently admit through; **untested** why
exactly (not investigated further — out of scope, a membership question
for a different ticket, not a regression from this slice).

Field-level account (all four universes, done programmatically by loading
both the pre- and post-regen JSON and diffing every entry's keys): the
**only** fields that ever changed were `bisTags`, `bisSets`, `curatedSets`,
and (ret-p3/p4/p5 only, from the EP-weights slice below) `curationHint`.
No entry's `itemId`, `slot`, `sources`, or any other field moved. Generator
run twice for ret-p2 and ret-p3, diffed byte-identical (JSON-equal; the
only literal byte differences across separate runs were platform line
endings, not content).

### The latent bug found and fixed: phase-unguarded curated membership

While regenerating `ret-p2.json`, `packages/core/test/pool-file.test.ts`
("loads ret-p2.json" / `pool.every(e => e.phase <= phase)`) failed for real
reasons, not staleness: `32574` Bindings of Lightning Reflexes is `phase: 3`
in `db.json` (a Leatherworking-crafted item, no raid/heroic/rep source) and
is a member of `ret_p3.gear.json`'s curated set. `wowsims_curated_item_ids`
in `assemble_universe.py` builds curated-item membership as a **union across
all vendored gear sets regardless of `max_phase`**, and the
`curated_unsourced`/`curated_list_only` admission path
(`assemble_universe.py`, the `curated = ...` line) had **no phase guard at
all** — unlike the parallel `in_heroic`/`in_rep_phase` checks a few lines
above it, which both explicitly gate on `int(it.get("phase") or 99) <=
max_phase`. So `32574` was silently admitted into `ret-p2.json` even though
its own phase (3) exceeds that universe's max_phase (2).

This is not cosmetic: `packages/core/src/cli.ts`'s `loadUniversePool` loads
`data/universes/{spec}-p{maxPhase}.json` directly and **never calls
`filterPoolByPhase`** on it — the universe file's own membership is trusted
as already phase-scoped by construction. Grepped `cli.ts` for
`filterPoolByPhase` to confirm this: zero call sites. So without the fix, a
p2-max-phase player's ranking would have shown a phase-3-only crafted item
with nothing downstream to catch it — a real, if narrow (one item, this
phase, so far), user-facing leak.

Root cause: the "no phase guard" comment at that call site was written for
the *other* direction — an earlier-phase persistent item still relevant
later (`Everbloom Idol`, phase 1, "still what a cat wants at phase 2" per
the original comment) — and had never been exercised the other way, because
no previously-vendored ret or feral curated-unsourced/list-only item
happened to have a `phase` higher than the set it belonged to, until
`ret_p3.gear.json` introduced one. Fixed by adding the same guard
`in_heroic`/`in_rep_phase` already use:
`curated = (iid in curated_unsourced or iid in curated_list_only) and
int(it.get("phase") or 99) <= max_phase`.

**Consequence for ret** (fixed, committed): `ret-p2.json` 242 → 241 entries
(only `32574` removed; `33122`, phase 1, correctly stays admitted).
ret-p3/p4/p5 unchanged — `32574` is phase 3, so it legitimately belongs at
those tiers and the guard is a no-op there.

**Consequence for feral (found, NOT fixed here — flagged for the
orchestrator)**: the same guard changes `feral-p2.json`'s generated output,
256 → 253 entries. Three phase-3 items leak the same way:
`33881` Vindicator's Dragonhide Bracers, `33716` Vengeful Gladiator's Staff
(both PvP), `29301` Band of the Eternal Champion (rep). Verified by
generating `feral-p2.json` with and without the fix and diffing (isolated
from the pre-existing staleness below by stashing/restoring cleanly).
**Deliberately not regenerated**: this slice's brief is explicit that
feral's *committed* output must be untouched, and — separately —
`feral-p2.json` was already stale against `HEAD` before this slice touched
anything at all (see next section), so folding an unrelated bugfix
regeneration into that same file would conflate two different changes in
one diff and make both harder to review. The fix in `assemble_universe.py`
is spec-agnostic and already shipped (commit `d96c044`); only the feral
*artifact* regeneration is deferred.

> **Orchestrator verification (2026-08-14) — the 256 needs one clarification.**
> Measured independently, and the deferral decision is right, but the numbers
> read as if the guard alone moves feral-p2 from 256 to 253. It does not.
>
> - The **committed** `feral-p2.json` already holds **253** entries. So against
>   what is on disk, the guard is a **no-op on entry count** — it does not
>   remove three rows from the shipping artifact.
> - Regenerating feral-p2 **at the base commit** (`3673b24`, none of slice 6b's
>   changes present, run from the main checkout) also yields **256 vs 253** and
>   the *same* five differing entries — `29994`, `8345`, `30627`, `29383`,
>   `30106`. The 256 is therefore the **pre-existing staleness**, not this
>   slice's guard.
> - The five differences are `curatedSets` values, not membership. Example
>   `29994`: regen `['p2_6p', 'p3_6p']` vs committed `['p2_6p']`. Item id sets
>   are **identical** between regen and committed.
>
> Net: feral-p2 has been stale since before this branch, and the guard's effect
> on it is not separately visible in the committed file's entry count. The
> deferral stands and the fix stays spec-agnostic; only the arithmetic in the
> paragraph above should not be quoted as "the guard drops three feral rows".
>
> Reproduce (from the main checkout, base commit):
> `python scripts/assemble_universe.py --spec feral --max-phase 2 --out <tmp>`
> then compare to `data/universes/feral-p2.json`.

### Pre-existing, unrelated finding: `feral-p2.json` was already stale

Independent of anything in this slice: `data/universes/feral-p2.json` does
not match what `assemble_universe.py` produces from the currently-vendored
inputs, **even at `HEAD` before any of this slice's commits**. Confirmed by
stashing all of this slice's changes, checking out to commit `7aaff35`
(which touches only ret's `gear_sets` list and a docstring — nothing feral
reads), regenerating `feral-p2.json`, and diffing against the committed
file: it differs (new `curatedSets: p3_6p/p3_9p` labels appear on rows that
don't have them committed, plus a new row, `29301`). `git log --follow -- 
data/universes/feral-p2.json` shows it was last regenerated at `4d07e11`
(2026-08-08), and nothing touched `scripts/assemble_universe.py` or the
feral-relevant vendored inputs between then and this slice's start
(`git log 5be6a81..aa74368 -- scripts/assemble_universe.py` returns no
commits). So something changed the *effective* generator output (a vendored
input drifting, most likely, since vendor/ is gitignored and per-worktree)
without anyone regenerating the committed artifact. **Untested / unverified**:
what specifically changed — not investigated further, since diagnosing it
would mean touching feral's committed output, which is out of scope here.
Flagging for the orchestrator to schedule as its own ticket; the fix is
probably just "run `--restore` cleanly and regenerate," but that should be
verified by whoever owns feral, not assumed.

### EP-weights wiring: done, feral verified unchanged

Added `SpecProfile.ep_weights_by_phase: dict[int, Path] | None = None`
(defaults to `{}`) alongside the existing `ep_weights: Path`, plus
`ep_weights_path_for(profile, max_phase)`: picks the highest phase key
`<= max_phase` in `ep_weights_by_phase`, falling back to `profile.ep_weights`
when the map is empty or has no entry at or below `max_phase`. ret's profile
now sets `ep_weights_by_phase={3: .../p3.ep-weights.json}`; feral's profile
sets nothing, so `ep_weights_path_for` always falls through to
`profile.ep_weights` for feral — the exact same value it resolved to before
this function existed.

**Feral byte-identity, proven not asserted**: generated `feral-p2.json` and
`feral-p3.json` from `HEAD` (before any EP-weights code existed, commit
`7aaff35`) and again from the working tree with the EP-weights change
applied (stashed/popped to isolate), and `cmp`'d the outputs.
`feral-p3.json`: byte-identical both ways (also identical to the committed
file — no pre-existing drift there, unlike p2). `feral-p2.json`: identical
to *each other* (proving the EP-weights change itself has zero effect on
feral), independently different from the committed file for the unrelated
pre-existing reason above. So: EP-weights wiring is confirmed to not move
feral's output by even one byte; feral-p2's staleness is a separate,
pre-existing problem this slice did not cause and did not fix.

**Which universes changed scoring**: `ret-p2.json` — unchanged, still scores
against `p2.ep-weights.json` (`curationHint` untouched on every shared row,
confirmed field-by-field). `ret-p3.json`, `ret-p4.json`, `ret-p5.json` — now
score against `p3.ep-weights.json`. `curationHint` moved on 303/339/423 rows
respectively; membership (`added`/`removed` itemId sets) empty on all three
— only the score itself moved. Deltas are small and consistent with the
P2→P3 weight deltas being a few hundredths per stat (mean |delta| ≈ 1.2,
max ≈ 15, on scores in the 600–900 range). Both feral universes: unchanged
(see above).

### Tests updated (falsified assertions, not skill/logic changes)

`packages/core/test/pool-hardening.test.ts`: `wowsimsCuratedItemIds()` and
`specSets.ret` both hardcoded the file list `[preraid, p1, p2]` — added
`ret_p3.gear.json`. That moved the "curated ID union" count from 36 to 44
(re-measured, not guessed) and `WOWSIMS_ADMITTED_IN_P3`/
`WOWSIMS_NOT_YET_ADMITTED` from 24/12 to 40/4 (re-measured against the
regenerated `ret-p3.json`; the remaining 4 not-admitted are still phase-1
items with no phase-2+-resolvable source — same shape as before, smaller
set). Three assertions hardcoded "p2 is the current curated phase" as a
literal `["p2"]`/`.includes("p2")` — updated to `["p3"]`/`.includes("p3")`,
since p3 is now genuinely the newest vendored set. Swapped the "ticket 12"
test's example item from `30098` (Razor-Scale Battlecloak, p2-only, now
correctly un-tagged) to `32235` (Cursed Vision of Sargeras, in
`ret_p3.gear.json`, correctly tagged) so the test demonstrates the rule it's
named for rather than its former exception.

`packages/core/test/pool.test.ts`: the running audit-trail comment
(`240 -> ...`) for `ret-p2.json`'s entry count got one more line (`240 ->
241`), explaining both the legitimate new member and the phase-guard fix in
the same style as the six prior entries in that comment.

All four affected test files (`pool-hardening.test.ts`, `pool.test.ts`,
`pool-file.test.ts`, `view-gate.test.ts`) pass cleanly; nothing was skipped
or loosened to make them pass — every changed assertion now encodes the
*current* true state, re-measured, not a guess.

### Acceptance criteria (ticket 121)

- [x] "Ret max-phase-3 BiS tags come from a genuinely-P3 list" — met.
      `ret-p3.json`'s 15 tagged rows are sourced from `ret_p3.gear.json`,
      vendored from `5c7491899`, verified populated (not a stub) and
      verified as upstream's own default P3 build via `presets.ts`.
- [x] "`CURATED_SET_PHASE` (both the Python source and the gate-checked TS
      mirror) covers the new label if one is introduced" — no new label was
      introduced (`p3` already existed in the map before this slice, per
      slice 6's own finding); `curated-set-phase:check` passes (4 phases in
      step).
- [x] "`pnpm verify` green" — met, see below.

Ticket 153's parallel concerns: the `bisStale`-placement and
absent-vs-stale-detection critiques (its points 1–2) are unaddressed — this
slice was data/pipeline scope only, no `rank-report.ts` changes. Its point 3
("box shows 3 items where p2's set has ~15 members" — unmeasured) is now
moot for p3 specifically, since p3 has its own real set; whether the
original p2-era "3 items" observation itself still needs investigating is
unchanged by this slice.

### `pnpm verify` — full tail, exit status

```
$ pnpm verify; echo "VERIFY_EXIT=$?"
...
 Test Files  38 passed | 1 skipped (39)
      Tests  757 passed | 2 skipped | 2 todo (761)
...
rep-tables:check ok: 14 factions, 10 used by db.json, 4 standings in use, 95 rep rows shipped (95 id-checked)
wowhead-prose:check ok: emitted 6 universes, 0 redundant wowhead locus rows
curated-set-phase:check ok: 4 phases in step
mirrors:check ok: skill mirrors match
lock-merge:check ok: lockfile merge preserves foreign blocks (7 checks)
sync-wowsims:unit:check ok: sync_wowsims.py guard rails ok (6 checks)
feral-skeleton-apl:check ok: feral skeleton APL schema gate ok (3 checks)
  [informational only, pre-existing, same note slice 6 already flagged: a
   temp feral APL fixture uses a field ('timeToNextEnergyTick') unknown to
   the pinned proto -- the check still reports ok because it's flagging
   that condition by design, not failing on it]
VERIFY_EXIT=0
```

`sync:atlasloot:verify-local` / `atlasloot:regen:check` skip cleanly
(`vendor/atlasloot` absent, unrelated to this slice, never in scope).
`git status` was clean before and after every commit.

### Summary for the orchestrator

- **Deliverable A (bisTags refresh) is now done.** `ret-p3.json` (and p4/p5's
  degrade) carry genuine p3 provenance, sourced and verified against
  upstream, not fabricated and not a community-list workaround. Plan §9.6's
  done-when is now met for the tags/EP-file half; `sme-rank-review` has since
  been run, verdict trust-with-caveats, filed at `859eab5` in
  `.scratch/handoffs/sme-rank-judgment-ret-p3-refresh.md` (that verdict notes
  no ranking was reviewed — see its own scope caveat).
- **EP-weights wiring is done** and proven not to touch feral.
- **Two things found mid-slice, handled differently on purpose**: the
  phase-guard bug is fixed (small, correct, in scope — my own file,
  `assemble_universe.py`, directly caused by the artifact I was
  regenerating). The pre-existing `feral-p2.json` staleness is flagged, not
  fixed (not caused by this slice, not in scope, needs its own owner to
  verify what actually drifted before regenerating).
- No blockers remain on ticket 121's acceptance criteria. Ticket 153's
  display-side concerns (bisStale placement/absent-detection) are still
  open and untouched.
