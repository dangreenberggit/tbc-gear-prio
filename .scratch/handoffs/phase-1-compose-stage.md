# Handoff — compose stage design + Phase 1 remainder (`phase-1/five-seed-spread`)

**Date:** 2026-07-27
**From:** Claude Code (Opus) session, continuing the Cursor handoff in
`.scratch/handoffs/phase-1-five-seed-spread.md`
**Paused:** yes — do not land to `dev` unless the user explicitly asks after a
`pre-merge-review` has been written and seen

## Status

partial — compose, meta activation/repair, offline baseline path, and a first
ret pool generator are green. Tip: `60298e9`. `pnpm verify`: 54 tests +
`skeleton:check`. Offline
`pnpm rank --region US --realm dreamscythe --character slamaltman --offline`
prints **baseline 2042.85** (metaAdjusted=false).

**Done this sitting:** §4 APL finding, design C, compose oracle, Stat/epScore,
meta conditions + min-EP repair (R4), `rankUpgrades` baseline
(resolve→gear→compose→sim) with `baseline.metaAdjusted`, offline slamaltman
CLI via CliSimRunner, `pnpm pool:generate` → `data/pools/ret.generated.json`
(168 entries, curation still required for sources).

**Still open:** curate `data/pools/ret.json` (fill sources, trim to ~8/slot),
ranking loop over candidates, disclosure / Substitution[] (tickets 03/04),
ticket 05 proto drift, pool generate diff-against-curated mode.

**Paused:** yes — do not land to `dev` unless the user explicitly asks after a
`pre-merge-review` has been written and seen

## Branch

`phase-1/five-seed-spread` @ `9868b79`. **Not pushed.** `dev` is ahead of
`origin/dev`. No `pre-merge-review` exists for this branch yet.

```bash
git checkout phase-1/five-seed-spread
pnpm install
pnpm verify          # expect 54 tests + skeleton:check green
pnpm issues:open     # expect 03, 04, 05 open (all Blocks: phase-1)
pnpm rank --region US --realm dreamscythe --character slamaltman --offline
                     # expect baseline ~2042.85
```

---

## Everything below is measured, not assumed

Each claim was checked against a file. Where something is unverified it says so
explicitly. **Do not soften these into guesses when re-summarising.**

## 1. What Phase 0's "compose" actually does

`scripts/compose_slamaltman_raid_sim.py` starts from
`test/fixtures/ret-p2.raid-sim-skeleton.json` — which is **already a
`RaidSimRequest`** — and overwrites exactly **three** fields: `name`, `race`,
`equipment`. Verified by diffing skeleton against the committed composed
request: those three differ, nothing else. It never reads
`IndividualSimSettings`.

So "compose" in Phase 0 is a three-field patch over a hand-exported skeleton,
not a message conversion.

## 2. The IndividualSimSettings → RaidSimRequest lift, measured

`data/presets/ret/p2.individual-sim-settings.json` top level:
`{apiVersion, raidBuffs, debuffs, partyBuffs, player, encounter}`
`RaidSimRequest` top level:
`{raid{parties, numActiveParties, buffs, debuffs}, encounter, simOptions, type}`

**Four of five mappings are byte-identical:**

| IndividualSimSettings | RaidSimRequest | identical? |
| --- | --- | --- |
| `raidBuffs` | `raid.buffs` | yes |
| `debuffs` | `raid.debuffs` | yes |
| `partyBuffs` | `raid.parties[0].buffs` | yes |
| `encounter` | `encounter` | yes |
| `player` | `raid.parties[0].players[0]` | **no** |

The rest of the structure is fixed and can be hardcoded:
`type: "SimTypeIndividual"`, `numActiveParties: 5`, five parties of five players
where **24 of the 25 player slots are literally `{}`** and only
`parties[0].players[0]` is real. Raid buffs are declarative — there are no
simulated raid-member bodies. Only `parties[0]` carries a `buffs` object; the
other four have none.

## 3. The `player` delta is TWO things, and they are NOT the same kind

This is the correction that matters most; an earlier read of this got it wrong.

### 3a. The APL fields are pinned upstream data — nothing is invented

The skeleton's `rotation` carries `prepullActions`, `priorityList`, `groups`,
`valueVariables` that the preset lacks. **All four are byte-identical to
`vendor/wowsims/ret_default.apl.json`**, which `scripts/sync_wowsims.py`
already tracks as `ui/paladin/retribution/apls/default.apl.json`, pinned at
commit `8aa378b3` with a sha256 in `data/wowsims.lock.json`.

Verified by direct comparison of all four keys. The wowsims web app merges that
file in during "Export → CLI"; it does not synthesize it.

**Consequence:** generating the skeleton offline is *assembling pinned upstream
data*, not reimplementing wowsims TypeScript. That distinction is the whole
question — see §7.

### 3b. `consumables.potions[]` / `conjuredItems[]` are not derivable, but are inert for ret

- `potions[]` is 13 ids, a strict subset of `db.json`'s 38 `type: 1` records.
  The filter that selects those 13 is unknown.
- `conjuredItems[]` is 5 ids but `db.json` has only 3 `type: 10` records —
  `12662` (Demonic Rune) has `type: None` and `22788` is not type 10. So the
  list does not correspond to any single `ConsumableType`.

**But they are provably inert for this spec:** `ret_default.apl.json` contains
**zero** occurrences of `potion`, `Potion`, `conjured`, `Conjured`, or
`itemId`. Nothing in the rotation consults the menu. The consumables actually
used are the explicit scalar fields (`potId: 22838`, `flaskId: 22854`,
`foodId: 27658`, `conjuredId: 12662`), all of which the preset already carries.

So for ret they can be omitted or copied verbatim without affecting DPS. **Do
not assume this generalises** — a spec whose APL casts potions would make the
menu load-bearing.

## 4. OPEN QUESTION — is `prepullActions` even active? (unverified)

The skeleton's `rotation.type` is **`TypeSimple`** with a
`simple.specRotationJson` payload, while `ret_default.apl.json` declares
`type: "TypeAPL"`. The skeleton carries *both* the `simple` block and the four
APL fields.

**If the Go sim honours `rotation.type` strictly, the APL fields — including
prepull Seal of the Crusader (`spellId 20218`) at `-18.5s` — are dead weight in
the Phase 0 run, and the committed 2042.85 DPS does not include prepull.**

I did not verify this. It is cheap to settle and worth settling before compose
commits to a rotation shape: run the pinned binary twice on the committed
request, once with `prepullActions` stripped, and compare DPS. Identical DPS
means the APL block is inert under `TypeSimple`.

This matters beyond tidiness — if the preset's rotation is silently running as
`TypeSimple`, the tool's whole DPS baseline is built on a rotation nobody
intended.

## 5. Professions are inherited from the preset and are load-bearing

The composed request carries `profession1: Engineering`,
`profession2: Blacksmithing`, plus Engineering-gated consumables
(`superSapper: true`, `goblinSapper: true`, `explosiveId: 30217` Super Sapper
Charge). **None of it is derived from the player** — WCL cannot read
professions, the same class of gap as race (R8).

Held constant across baseline and candidates, so *deltas* survive; the
*absolute* DPS is not the player's. This belongs in the R7 disclosure drawer's
**standing assumptions** tier, not as a per-run substitution.

It also interacts with §6: profession assumptions are exactly what the ring
enchant rule is about.

## 6. Ring enchants — recorded in `d77cba5`, read it before touching normalize

Committed to `PLAN.md` §9 and `packages/core/src/items.ts`. Summary:

The four `Enchant Ring - *` records (effect ids 2928–2931) are the **only four
of 141** in `db.json`'s `enchants[]` carrying `requiredProfession` (`3` =
`Enchanting`, `common.proto:117`). Ring enchants are enchanter-only, so a small
probe is *expected* to show bare rings — the Phase 0 miss was not chance.

**Finger is the one slot where eligibility is a property of the player, not the
item.** `isEnchantable()` answers a static TBC fact and is therefore *not
sufficient* to gate synthesis.

**The symmetry invariant:** we are not policing enchants. What must never
happen is comparing a synthesized enchanted candidate against a bare baseline
slot and attributing the difference to the item — that turns a sidegrade into a
reported upgrade, silently. Observed per-slot presence gates synthesis, for any
profession-gated enchant.

Currently safe **by accident only**: the ret P2 preset has bare
`finger1`/`finger2`, so there is nothing to synthesize. Assert that in tests
rather than relying on it.

## 7. The design fork — needs a user decision, contradicts PLAN.md §8.2

[PLAN.md:494](../../PLAN.md) says the **`compose` stage owns the lift** at
runtime, from `IndividualSimSettings`.

Given §3a, three shapes are viable. §8.2's real constraint is *"do not port
`presets.ts` and keep it in sync"* — i.e. do not reimplement wowsims logic in
our codebase. It is **not** a preference for manual work; the web-UI step is a
means to that end. Assembling from pinned upstream files does not violate it.

- **A. Runtime lift in compose (as §8.2 literally says).** Compose reads the
  preset and builds the request, merging the pinned APL json. Keeps presets
  reproducible via `decodelink`; no manual browser step. Requires deciding what
  to do about the `potions[]` menu (§3b).
- **B. Pinned skeleton, compose patches only.** Promote
  `ret-p2.raid-sim-skeleton.json` out of `test/fixtures/` into `data/presets/`
  and have compose patch equipment/race/name. Smallest, safest code; but the
  skeleton is a 945-line artifact obtainable **only by manual browser export**
  and re-derivable by nothing. Already flagged as unowned scope creep in
  `docs/reviews/phase-0-close-gates.md:110`.
- **C. Build-time generator script + golden file.** A script assembles the
  skeleton from preset + pinned APL; CI diffs it against the committed manual
  export. Compose stays a pure patch (as B) while the lift becomes verifiable
  (as A).

**Recommendation: C**, with A as the eventual end state once the `potions[]`
filter is understood. C is the only option that makes the lift *checkable* —
and given §4 is still open, a golden-file diff is what would have caught the
`TypeSimple` discrepancy in the first place.

Whatever is chosen, **keep the `IndividualSimSettings` preset committed
regardless.** It is the reviewable, `decodelink`-reproducible,
share-link-traceable artifact §8.2 asks for. A 945-line exported request is not
a substitute for it.

### The test oracle to use (this is the valuable part)

`compose(<preset or skeleton>, slamaltman-gear)` must equal the committed
`test/fixtures/slamaltman.raid-sim-request.json` **minus `simOptions`**.

That fixture was produced by a different toolchain (Python + a hand export) and
is known to sim to **2042.85 DPS** on the pinned binary. So the assertion is
**not tautological** — it is a genuine independent oracle. This is the single
best thing available to anchor compose, and it is why compose should be built
before tickets 03/04 rather than alongside them.

Additionally assert the four byte-identical mappings from §2 between preset and
skeleton. That test is what catches a preset refreshed after a balance patch
without a matching re-export — it fails loudly and names the drifted field.
Leave `player` deliberately unchecked with a comment pointing at §3.

## 8. Ticket 03 is a namespace mismatch with NO conversion table

Bigger than "wire it up". All four facts verified:

- WCL's `temporaryEnchant` is an **enchant effect id** (slamaltman MH = `2639`).
- The sim wants `ConsumesSpec.mhImbue_id` / `ohImbue_id`
  (`data/proto/common.proto:591-592`) — declared `int32`, and it is an **item
  id**, not an effect id.
- `2639` appears **nowhere** in `db.json` as an exact numeric value. Confirmed
  by a full recursive walk of every dict/list; the three `grep` hits are
  substrings of longer numbers.
- `db.json` has **zero** `ConsumableTypeImbue` (`type: 8`) records. All 107
  consumables are types {1,2,3,6,7,9,10,11}.
- The ret P2 preset sets no imbue at all.

Same shape as R14/R19 (effectId vs itemId) but **without `db.json` to resolve
it**. Needs an external effectId→itemId source, or the imbue is dropped and
disclosed as a standing assumption. Decide which before writing code — and note
that dropping it is defensible under the §6 symmetry logic, since it is
constant across baseline and candidates.

## 9. Seam boundaries — already correct, do not break

`CliSimRunner.run` injects `simOptions` itself
(`packages/core/src/seams/cli-sim-runner.ts:39-46`), so **compose must not emit
`simOptions`**. Cache keys hash the *pre-injection* request (PLAN.md §7 / R6).
Phase 0's Python script sets `simOptions` only because it invokes the binary
directly.

`simCacheKey` does a sorted-key stable stringify, so compose's key insertion
order is irrelevant to cache hits.

Compose is a **stage inside the deep module, not a seam.** Per AGENTS.md, tests
go at `GearSource` / `SimRunner` / `Store` only, unless agreed. Pure-function
stage tests are the established precedent — follow `slots.ts`, `spec.ts`,
`items.ts`. **Do not invent a fourth seam for compose.**

`rankUpgrades` in `packages/core/src/rank.ts` is still a stub that throws
`not-implemented`. Its `Progress` union names `resolving`, `reading-gear`,
`building-pool`, `simming`, `ranking` — **compose is not in that list.** Decide
whether it is implicit in `simming` or needs its own stage before wiring.

## 10. Ticket 04 has an unstated hard blocker

**No stat-id → name enum exists anywhere in the repo yet.** `stats` and
`socketBonus` ship as raw stat-indexed numeric arrays in both
`data/items/index.json` and `data/gems/palette.json`.

Ticket 04's cost function must price forfeited socket bonus by EP (PLAN.md §9
R4), which is impossible without knowing which array index is which stat. The
enum exists in `data/proto/common.proto` now that protos are pinned — extracting
it is a prerequisite slice, not part of 04.

## 11. Gotchas — do not re-learn these

- **The Bash tool's cwd persists across calls.** An earlier `cd packages/core`
  silently scoped later `git` commands to that subtree, which led to a wrong
  conclusion that `PLAN.md` did not exist. Always
  `cd "C:/Users/dgree/Code/lulz/tbc-gear-prio"` in git commands.
- **Python is not on PATH** as `python`/`python3` in the Bash tool. Use
  `/c/Users/dgree/AppData/Local/Programs/Python/Python312/python`. `pnpm`
  scripts that shell out to `python` work fine.
- **14 files under `packages/core/src/proto/` show as ` M` with zero content
  diff** — CRLF bookkeeping noise, verified via `git diff --stat`. Do not "fix"
  it, do not commit it as a change.
- **`git worktree` + vitest collide.** Parallel workers left worktrees under
  `.claude/worktrees/`, vitest picked their test files up as part of the
  workspace, and `pnpm verify` produced phantom `cli-sim-runner` ENOENT
  failures (2 failed / 94 passed). Remove worktrees before running verify. On
  Windows `git worktree remove` may partially fail and leave `node_modules`
  behind, needing a manual `rm -rf`.
- **`stash@{0}`** ("phase-1 wip before model-policy tweak") is fully superseded
  by `cb1f580`. Safe to drop; a permission classifier blocked dropping it.
- **`.scratch/handoffs/` and `.scratch/retros/` are untracked.** Including this
  file. Decide whether they should be committed.
- **buf codegen is not byte-stable across platforms** (ticket 05) — trailing
  whitespace on blank generated doc-comment lines flips between Windows and
  Linux. CI regenerates and diffs on `ubuntu-latest`, so a Windows-regenerated
  commit can fail CI for a reason unrelated to the change. Types are identical.

## 12. Process constraints (AGENTS.md — do not violate)

- `pnpm verify` before every push. Never `--no-verify` on `dev` or `main`.
- When the branch looks done: run `pre-merge-review` → `docs/reviews/<branch>.md`,
  commit it on the feature branch, **then stop**.
- **Ask before landing.** A combined "review and land" request is *not*
  sufficient — finish the review, stop, wait for a separate land ask.
  `pnpm land` is the only supported door into `dev`.
- Tickets **03, 04, 05 are all open and all `Blocks: phase-1`**, so landing
  today would require `--ack-open-blockers` or closing them first.
- Workers never merge to `dev`/`main` and never run `pnpm land`.

## Verification

- `pnpm verify` → green, 8 files / 39 tests (run at `d77cba5`)
- `pnpm issues:open` → 03, 04, 05 open
- `pnpm rank --region US --realm dreamscythe --character slamaltman --offline`
  → exits 1 `not-implemented` (expected; `rankUpgrades` is a stub)

## Suggested next steps, in order

1. Settle §4 (strip `prepullActions`, re-sim, compare DPS). Cheap, and it
   changes what compose should emit.
2. Get the §7 decision from the user; amend PLAN.md §8.2 to match reality
   whichever way it goes.
3. Extract the stat-id enum from `common.proto` (§10) — unblocks 04.
4. Build compose TDD-style against the §7 oracle.
5. Then 03 (needs the §8 decision) and 04.
