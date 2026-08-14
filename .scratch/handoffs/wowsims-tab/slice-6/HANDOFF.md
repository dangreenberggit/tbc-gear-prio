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
