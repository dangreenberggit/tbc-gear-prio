# Brief — skeleton scope, and whether a local-dev fixture is worth building

Base SHA `43052fb924cea939559131970c8894af97c05d3c`, branch
`feat/reforge-catchup-leftovers`, tree clean at stage open.

## Why this stage exists

Three tickets (350, 365, and an unfiled piece of work) rest on a conflation
that nobody wrote down, so every fresh agent re-derives the confusion and
reaches for an expensive build. The owner named the distinction on
2026-09-10:

> skeletons may have just been for the tbc gear prio app and not the wowsims
> upgrade tab that should be able to get settings from how the user uses the
> app or the defaults before they touch it

That is the reframe this stage must land in writing.

**The raid-sim skeleton is a CLI-only concept.** `packages/core` (the CLI
ranking engine) has no page to read from, so it loads a canned character from
`data/presets/<spec>/p2.raid-sim-skeleton.json` (`cli-wiring.ts:128`). The
Upgrades tab has a page: it binds `skeleton = currentPageSkeleton(this.simUI)`,
which calls upstream's own `sim.makeRaidSimRequest(false)` — the user's live
gear, talents, consumables, buffs and rotation as configured right now, or
wowsims' own defaults before the user touches anything. `grep -rn
"raid-sim-skeleton"` across the tab directory returns nothing.

So the two-of-eleven skeleton shortage is a **CLI harness limitation**. It is
not a product gap, and it never blocked the tab.

## Decision deliverable

This stage ends in a **recommendation plus committed ticket edits**, not a
built generator. The open questions below decide whether the generator is
worth building at all. Do not assume it is.

## What is already established — do not re-derive

Measured this session. Cite these rather than re-running them, except where a
step's own gate requires a re-run.

**The tab reaches ticket 350's case without any skeleton.** Verified by code
read: `DUAL_WIELD_SPECS` in the fork's `upgrades/engine/pool.ts` includes
`enh`; `itemFitsSimSlot` for mainhand is `handType !== HandTypeOffHand` so a
two-hander passes; the off-hand guard keys on the *candidate's* target slot so
a mainhand candidate never trips it; `swapItemAt` is a pure `map()` so the worn
off-hand survives; `compose.ts` sends the equipment verbatim. Both the WASM and
CLI builds compile the same `github.com/wowsims/tbc/sim` core. Ticket 362 —
which 365 cites as the reason the tab could not substitute — was fixed and
verified live this session (enhancement page runs, 954 eligible).

**Owner decision on ticket 350, 2026-09-10:** measuring what the sim does with
an impossible 2H+off-hand set is not wanted ("sounds like a waste of
processing"). **Option 2 is chosen** — clear the off-hand slot when a
two-hander lands in the main hand, and price that swap honestly. Option 1
(skip the attempt) is rejected: two-handers are a genuine upgrade path for
enh/warrior/hunter and hiding them is worse than disclosing a two-item change.

**Per-spec inventory of the fork's preset data** (measured 2026-09-10; cite,
do not re-glob unless a step needs a specific file):

| Spec | fork dir | `p2*` gear files | APL files |
| --- | --- | --- | --- |
| `balance` | `ui/druid/balance/` | `p2_a.gear.json` | `default.apl.json` |
| `feral` | `ui/druid/feralcat/` | `p2_6p`, `p2_9p`, `p2_alt_6p`, `p2_alt_9p` | `default.apl.json` |
| `hunter` | `ui/hunter/dps/` | **none** — nested `gear_sets/phase_2/{bm,sv}/*` (6 files) | `default.apl.json` |
| `mage` | `ui/mage/dps/` | `p2Arcane.gear.json` | **4 files, no `default`** |
| `ret` | `ui/paladin/retribution/` | `p2.gear.json` | (skeleton already exists) |
| `shadow` | `ui/priest/dps/` | `p2.gear.json` | `default.apl.json`, `test.apl.json` |
| `rogue` | `ui/rogue/dps/` | `p2.gear.json` | **`swords.apl.json` only, no `default`** |
| `ele` | `ui/shaman/elemental/` | `p2.gear.json` | `default.apl.json` |
| `enh` | `ui/shaman/enhancement/` | `p2.gear.json` | `default.apl.json` |
| `warlock` | `ui/warlock/dps/` | **none** — tier-named (`t4`/`t5`/`t6`/`za`/`swp`) | **5 files, no `default`** |
| `warrior` | `ui/warrior/dps/` | `p2_arms`, `p2_fury` | `arms.apl.json`, `fury.apl.json` |

`CURRENT_PHASE = Phase3` (`ui/core/constants/other.ts`), so phase − 1 is p2.
`PRESET_ID_BY_SPEC` (`rank.ts:559-569`) already names a skeleton path for all
11 specs; only feral and ret have files. `data/presets/<spec>/` holds
ep-weights for every spec and a skeleton for exactly those two.

**`scripts/build_feral_skeleton.py` does not generalize.** It is hardcoded
end-to-end for feral: talent string, race, professions, `ClassDruid`, the
`feralCatDruid` oneof key, and — decisively — it reads rotation and consumables
from `data/presets/feral/owner-p2.settings-export.json`, the **owner's personal
export**, which has no counterpart for any other spec. What generalizes is
structure only: copy ret's encounter block, blank the 17 equipment slots,
validate APL field names against the pinned proto schema via
`scripts/apl_schema.py`. That APL gate is generic and must be kept — the pinned
binary unmarshals with `DiscardUnknown: true`, so an unknown APL field is
silently dropped and yields a plausible but wrong rotation with no signal.

**`scripts/extract_sim_defaults.mjs` covers one spec.** Its `SPECS` table has
exactly one entry (`feral` → `vendor/wowsims/feral_sim.ts`), and
`vendor/wowsims/` vendors no other spec's `sim.ts`. Extending it needs both
table entries and new `sync_wowsims.py` `TRACKED` files. ADR-0022 records why
copying ret's buff blocks to another spec was wrong, so per-spec extraction is
not optional if skeletons are generated.

## Open questions

Each needs a candidate that differs in kind (not the same approach with
different constants), the result that makes it win stated **before**
measurement, and a measurement or the reason committed fixtures cannot supply
one. A dropped candidate carries a stated reason.

### Q1 — Is a generated local-dev skeleton set worth building at all?

The owner's direction was "close the gap with a stub/default for local
development, generated from wowsims' own data: their default settings plus a
gear set at current phase − 1." The inventory above shows that is materially
harder than it sounded: three specs have no unambiguous default APL, warlock
has no phase-numbered gear, hunter's p2 gear is nested and doubly split
(bm/sv × 2h/dw × 6p/9p), and the per-spec buff extraction is missing plumbing.

Candidates, which must differ in kind:

- **Build the generalized generator** for all 9 missing specs.
- **Build it for the subset with unambiguous inputs** (the specs with one
  `p2.gear.json` and one `default.apl.json`), and record the rest as blocked on
  a per-spec judgement call.
- **Build none.** State plainly that the CLI ranks only `RECORDED_CHARACTERS`
  (one ret, two feral) and that adding a skeleton without a recorded character
  buys nothing runnable — which is the question below.
- **Something else the planner finds.**

**Winning condition must be stated before measuring.** Name what a local-dev
skeleton actually unlocks that is not already reachable, and for whom.

### Q2 — Does a skeleton alone make a spec rankable by the CLI?

`RECORDED_CHARACTERS` (`cli-wiring.ts:158`) gates which characters the CLI can
rank offline. If a skeleton without a recorded character still cannot produce a
ranking, then generating nine skeletons delivers nothing runnable and Q1's
answer is forced. **Establish this before pricing any generator.** This is the
cheapest question here and it sizes everything else.

### Q3 — Which pinned source may a generated skeleton read from?

The repo's provenance discipline runs through the pinned mirror
`vendor/wowsims/` (at `ec5c5f2`, per `data/wowsims.lock.json` and
`sync_wowsims.py`). The live fork checkout `vendor/tbc-new-fork` sits at
`0b50f402` and is gitignored. Generating from the fork checkout would sidestep
the pinning mechanism entirely. Decide which source is legitimate and say why;
if it is the mirror, the missing files must go through `TRACKED` +
`--update --tag`, not a hand copy.

### Q4 — Where should the CLI/tab distinction be recorded so it stops rotting?

It must survive past this branch. Candidates: a CONTEXT.md section, an ADR, a
comment at the `cli-wiring.ts` load site plus the tab adapter, or the ticket
bodies alone. Pick one and say why the others lose.

## Deliverables — required regardless of how Q1–Q4 resolve

These encode decisions the owner has already made. They are not in question;
only their wording is.

1. **Rewrite ticket 365**
   (`.scratch/carry-forward/issues/365-no-committed-dual-wield-raid-sim-request-fixture.md`)
   as what it actually is: a **CLI-only test-coverage gap**. Its current title
   and body assert it blocks 350; that is false. Delete or correct the stale
   line "the enhancement page cannot substitute for this today — its Upgrades
   run aborts on an item-swap item (ticket 362)"; 362 is fixed. State that the
   tab reaches the case without a fixture, and that the remaining value is
   CLI-side reproducibility.

2. **Mark the parked plan superseded.**
   `.scratch/stage-gate/ticket-365-dual-wield-fixture/plan.md` carries a header
   saying it awaits an owner decision on scale. That decision is made: the
   skeleton-building machinery in its Steps 1–4 is not being bought to unblock
   350. Rewrite the header so no agent reads the nine steps as live work.

3. **Unblock ticket 350.** Remove `Blocked by: 365`. Record option 2 as the
   chosen fix with its reasoning, explicitly against the position recorded in
   the comment above the existing off-hand guard in `packages/core/src/rank.ts`
   (locate by grepping the guard condition, not by line number) — that comment
   rejects pricing a two-item swap under a one-item row, and option 2
   contradicts it, so the contradiction must be resolved in writing rather than
   left silent. Note the row must disclose the off-hand loss, and that
   `statDeltaBetween` currently never debits the off-hand stats.
   **No code lands in this stage** — 350's implementation is its own ticket,
   touching a ported engine file and requiring the known-traps cycle.

4. **File ticket 367** for the local-dev fixture question, scoped by whatever
   Q1–Q3 conclude, and explicitly marked **CLI-only, not a tab concern**.
   `NEXT` is 367; bump it. If Q1/Q2 conclude the generator is not worth
   building, 367 records that finding and its reasoning rather than proposing
   the build.

5. **Record the CLI/tab distinction** per Q4.

## Constraints

- **`pnpm` is currently broken in both shells.** Node 20.18.1 against pnpm
  11.24.0's `>=22.13` floor; it dies on `ERR_UNKNOWN_BUILTIN_MODULE node:sqlite`.
  This is ticket 268. `pnpm verify` therefore cannot run as the shells are
  configured, and Gate C requires it green on the tip. The planner must decide
  whether restoring Node 22 is a step of this plan or a precondition reported
  back — it is not optional to ignore. Do not paper over a gate that cannot run.
- **Documentation-only stage.** No engine file is edited. Nothing under
  `upgrades/engine/` moves, so the five-step ported-engine cycle stays unarmed.
- **Locate by grep, never by line number.** Three citations from the previous
  handoff were checked this session and all three were wrong while their
  findings held.
- **Environment traps** (`docs/agents/known-traps.md`, AGENTS.md § CLI
  environment): Git Bash's fnm stderr breaks `&&` chains and heredocs — use
  `git -C`, `pnpm -C`, `npm --prefix`, and real script files. Shell `cd`
  persists across Bash calls and drifted the working directory three times this
  session; use absolute paths. Exit codes lie through pipes; append
  `; echo "rc=${PIPESTATUS[0]}"` or redirect and read separately. Confirm the
  artifact, never the status.
- **Ticket 355 is adjacent and must not be silently widened.** The fork branch
  `feat/upgrades-tab` exists on the personal remote at `d49096e9`, but the
  pinned commit `0b50f402` is on no remote — measured this session, correcting
  the lockfile's blanket `pushed: false`. Any step that reads the fork checkout
  should note this rather than assume the pin is fetchable.

## What done looks like

- `plan.md` answers Q1–Q4, each with its candidate set, pre-registered winning
  condition, and measurement or a stated reason none is possible.
- Deliverables 1–5 are specified precisely enough to execute without
  re-litigating the owner's decisions.
- The plan says what happens to `pnpm verify` given the Node floor.
- No code change is proposed for ticket 350 in this stage.
