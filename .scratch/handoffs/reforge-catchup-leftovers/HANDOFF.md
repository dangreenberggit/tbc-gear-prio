# Handoff — `feat/reforge-catchup-leftovers`

Written 2026-09-10 at the end of a long session. Branch tip `195ecfd`, working
tree clean, `pnpm verify` green, **not merged, not pushed**.

Read this file first. Everything needed to resume is here; the supporting files
are named where the detail lives.

## Trust rule for this file and its neighbours

Every `file:line` citation below came from a command run this session. Even so:
**locate by grep, never by line number.** During this session three citations
from the previous handoff were checked and all three were wrong while their
findings held — a moved file, a line number from the wrong copy of a two-copy
file, and a stale range. The findings survive; the coordinates rot.

## What landed

| Commit | What |
| --- | --- |
| `dc72da1` | Pre-merge review of the leftovers work + fixes for two circular citations it found |
| `32e4a3d` | Core test pinning the engine contracts the 362 fix relies on |
| `5265615` | Re-pin the fork to the item-swap fix (`0b50f402`), artifact regenerated |
| `195ecfd` | Ticket 362 closed, 366 filed, `NEXT` → 367 |

**Ticket 362 is fixed and verified in the browser.** The Upgrades tab used to
die on the enhancement page (`No item with id: 30832`). The browser sim's item
registry starts empty, so each request must carry stats for every item involved;
our tab sent worn gear plus the candidate and never the item-swap gear, while
upstream's own `Player.toDatabase` has always merged both. The adapter now does
the same. Route was adapter-only — nothing under `upgrades/engine/` moved, so
the five-step ported-engine cycle stayed unarmed.

Verified live: enhancement runs (954 eligible, rows landing, *Soul Cleaver*
+165.0 DPS); ret unchanged (467 eligible, header `Phase 3 (2.2 - T6) - Alpha`);
feral cat with the swap hand-armed also runs.

## The correction that matters most

**The Upgrades tab does not use `data/presets/*/p2.raid-sim-skeleton.json`.**

`upgrades_tab.tsx:1198` binds `skeleton = currentPageSkeleton(this.simUI)`,
which calls upstream's own `sim.makeRaidSimRequest(false)` — the same request
builder behind the page's Simulate button. The user's gear, talents,
consumables, buffs and rotation, as configured on the page right now. The
adapter's own comment states the rule: *"our sim must match the user's by
construction, so the skeleton is never anything the user did not themselves
configure on the page."* `grep -rn "raid-sim-skeleton"` across the tab
directory returns nothing.

So **all 11 specs work in the tab today.** Earlier in this session I described
the CLI's fixture situation as though it were the product's, and said "eleven
specs listed, two supported". That was wrong and is corrected here.

### Where the skeletons actually matter

They are inputs to `packages/core`, the separate CLI ranking engine
(`cli-wiring.ts:128` builds `data/presets/${spec}/p2.raid-sim-skeleton.json`).
The CLI has no page to read state from, so it needs a canned character — and
can only rank characters it has a recording for (`RECORDED_CHARACTERS`: one ret,
two feral). That is why exactly two skeletons exist.

Measured coverage, so nobody re-derives it:

| Input | Specs covered |
| --- | --- |
| `SpecId` union (`types.ts:21`) | **11** |
| Item universes (`data/universes/`) | **11**, 4 phases each |
| EP weights (`data/presets/*/`) | **11** |
| **Raid-sim skeletons** | **2** — feral, ret |

Note `rank.ts:559-569` already names a skeleton path for all 11
(`enh: "enh/p2.raid-sim-skeleton"` is sitting there), and the comment above
`SpecId` explains the union is total so that a missing per-spec table is a
compile error rather than silent inheritance of ret's numbers. That discipline
was applied to caps, cutoffs, metas and preset ids. The skeleton **files** were
never produced.

## Next thing to do: a default local-dev fixture from wowsims

**Owner's direction, 2026-09-10.** The gap should be closed with a stub/default
for local development, generated from wowsims' own data: **their default
settings plus a gear set at current phase − 1.**

- `CURRENT_PHASE = Phase3` (`ui/core/constants/other.ts:13`), so phase − 1 is
  **p2**.
- The fork ships `p2.gear.json` for enhancement and most specs.
- **Warrior is spec-split** — `p2_fury.gear.json` and `p2_arms.gear.json`. That
  needs a deliberate choice, not a guess. Check the other specs for the same
  split before assuming one file per spec.

**`scripts/build_feral_skeleton.py` already does this shape for one spec.** Read
its docstring before designing anything — it is the pattern, and it records why
each source was chosen:

- encounter block: copied from ret's skeleton (describes the fight, not the
  player; upstream defines it per-spec identically)
- buff/debuff/individual-buff blocks: that spec's **own** upstream defaults, via
  `scripts/extract_sim_defaults.mjs` reading upstream's `sim.ts`. ADR-0022
  records why copying ret's was wrong.
- class, talents, options, consumables, race, professions: from the pinned
  upstream `presets.ts`
- rotation: merged from the pinned APL JSON

**Do not skip the APL schema gate.** The pinned binary unmarshals with
`DiscardUnknown: true`, so an APL field the proto pin does not know is silently
dropped and yields a plausible but wrong rotation with no signal at all. The
feral builder refuses to write a skeleton containing an unknown field name; keep
that.

How much of that builder generalizes across specs has **not been measured**.
That is the first bounded question for whoever picks this up.

## Open tickets from this work

- **365** — no committed dual-wield request fixture; blocks 350. Its plan is on
  disk at `.scratch/stage-gate/ticket-365-dual-wield-fixture/plan.md`, **parked,
  not executed**, with a header saying so. Nine steps, because it builds an
  enhancement skeleton before it can measure anything. **Reconsider its shape
  first:** the tab now composes dual-wield enhancement requests from real user
  state and actually runs, so 350 may be answerable through the tab without any
  skeleton. Nobody has measured that.
- **350** — two-hander swap leaves the worn off-hand equipped. `Blocked by: 365`,
  no fix chosen, zero acceptance boxes ticked. The engine's actual behaviour is
  still unmeasured; the ticket's own "What is NOT claimed" says today's numbers
  may be right by accident.
- **366** — the fork's `NewItem` panics instead of erroring on an unknown id.
  Upstream's code; fixing it turns a crash into a tidy failure, nothing more.
- **363** — candidate-cap exposure. Defaults are safe (0 = no cap); a user who
  types a cap gets a shortlist ordered by stale Phase-1 feral EP weights.
- **364** — `sim/druid/forms.go` grants the paw imbue bonus for the weightstone
  id only. Provenance measured as upstream (via `origin/master` containment, not
  the circular check the first draft used).
- **355 — the standing risk, and it grew this session.** The fork branch
  `feat/upgrades-tab` exists on exactly one machine (`pushed: false`), and the
  lock now pins `0b50f402`, which `git branch -r --contains` finds on no remote.
  `data/sim-implemented-effects.json` embeds it. Every ported-engine fix widens
  this, because the cycle requires a fork commit. Owner decision: push, bundle,
  or accept explicitly.

## Before merging

The pre-merge review at `docs/reviews/feat-reforge-catchup-leftovers.md` covers
through `0d339c2`. **Three commits have landed since** (`32e4a3d`, `5265615`,
`195ecfd`). Re-run the review over `0d339c2..HEAD` before any merge ask, then
**ask** — `pnpm merge-to-dev` only, never a raw merge, and never without an
explicit ask after the owner has seen the summary.

## Environment traps that actually fired this session

Read `docs/agents/known-traps.md` and `AGENTS.md` § CLI environment; these are
the ones that cost real time here.

- **Git Bash's fnm stderr breaks `&&` chains and heredocs.** It ate a
  `cd X && git checkout`, a `cd && pnpm verify` (which returned rc=1 with no log
  written, and briefly looked like a red gate), an `npx prettier` and a
  `python <<EOF`. Use `git -C`, `pnpm -C`, `npm --prefix`; write real script
  files.
- **Exit codes lie through pipes** — a pipe reports the last command's status.
  Append `; echo "rc=${PIPESTATUS[0]}"` or redirect and read separately. Confirm
  the artifact, never the status.
- **`make`:** GNU Make **4.4.1** at
  `C:\Users\dgree\AppData\Local\Microsoft\WinGet\Packages\ezwinports.make_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\make.exe`.
  The GnuWin32 3.81 on PATH silently resolves empty file lists and "succeeds"
  having built nothing. `make host` hands off to `air` and never exits — use
  `make dist/tbc/.dirstamp`.
- **`SendMessage` is disabled in this session.** A subagent that stops early
  cannot be resumed; it must be respawned with its context reconstructed in the
  prompt. A planner here dispatched four researchers, ended its turn waiting,
  and lost the fan-in — their reports reached the parent session instead.
- Shell `cd` persists across Bash calls and drifted the working directory three
  times. Use absolute paths.

## Supporting files

- `.scratch/stage-gate/reforge-catchup-leftovers/` — brief, plan, plan-review,
  decision-log, research-notes, `probe/results.md`
- `.scratch/stage-gate/ticket-362-item-swap-database/` — brief + plan (executed)
- `.scratch/stage-gate/ticket-365-dual-wield-fixture/` — brief + plan (parked)
- `docs/reviews/feat-reforge-catchup-leftovers.md` — the three-axis review
- `.scratch/handoffs/wowsims-reforge-catchup/HANDOFF-leftovers.md` — the
  previous session's handoff, which this work consumed
