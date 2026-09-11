Status: closed
Closed: 21d0b37
Type: chore
Origin: owner question, 2026-09-10 — "we should not be fucking with their code"
Blocks: none
Blocked by: none

# Thirteen upstream files diverge in the fork and nothing records which

## The question this came from

The owner asked whether our Upgrades-tab work has modified **upstream wowsims
code**, as opposed to our own additions. A read-only audit answered it against
the fork at `0b50f402` versus the upstream pin `ec5c5f2`.

**The core worry is unfounded.** Not one change alters sim output. Only a
single Go file is touched (`sim/hunter/item_sets.go`) and its change converts a
panic into a no-op. No arithmetic, no coefficient, no aura change anywhere in
the diff. The DPS figures our rankings rest on still come from an engine that
matches upstream.

**The gap the audit did find is this ticket:** nothing in the repo records
*which* upstream files diverge, or why.

## What diverges

Verified with
`git -C vendor/tbc-new-fork diff --stat ec5c5f205e61049d730e460967f8488774a7fe2a..0b50f402630e0300a83023b299c5ff3733f2cfe4`.
Thirteen upstream paths, none moving sim numbers:

| Path | What changed | Character | Risk on next merge |
| --- | --- | --- | --- |
| `sim/hunter/item_sets.go` | Ten `agent.(HunterAgent)` assertions → comma-ok guards returning no-op | Upstream candidate (ticket 311) | Low |
| `ui/core/components/gear_picker/item_list.tsx` | `getSourceInfo` extracted from private method to exported free function; body moved verbatim | Upstream-shaped refactor | **Highest** — 239 moved lines; git cannot reason about a relocated function |
| `ui/core/components/sim_header.tsx` | Adds `.sim-header-container-wrap` div and a scroll-fade affordance | Local UI fix | **High — already conflicted once** |
| `ui/core/sim.ts` | `makeRaidSimRequest(debug, iterations?)` optional param | Upstream-shaped, **no caller passes a value** | Low |
| `ui/core/individual_sim_ui.tsx` | +6, registers the Upgrades tab | Local | Low |
| `ui/scss/core/sim_ui/_header.scss` | +28, fade mask pairing with `sim_header.tsx` | Local | Low |
| `ui/scss/core/components/individual_sim_ui/index.scss` | +1 import | Local | Nil |
| `test-locales.mjs` | Fixes a Windows `path.join`/glob bug that made the gate exit 0 having validated nothing | **Genuine upstream bug fix** | Low |
| `assets/locales/en/translation.json` | +91, our tab's strings | Additive, our namespace | Low |
| `schemas/translation.schema.json` | +306, schema their gate requires | Additive | Low |
| `package.json` | +1 `test:layout` script | Local tooling | Nil |
| `tsconfig.json` | +1 `allowImportingTsExtensions` | Local | Low |
| `.gitignore` | +3, ignore local WCL credentials | Local | Nil |
| `package-lock.json` | Generated; full regen so native deps record all platforms | Regen, not a dependency change | Low-medium |

Everything under `upgrades/**`, `upgrades_tab.tsx`, `_upgrades_tab.scss` and
`test-layout.mjs` is **ours** — new files, zero upstream lines touched. Not in
scope here.

## Why the missing ledger matters

The risk is not theoretical. The last upstream merge (`ab59127d9`) **conflicted
on exactly one file — `sim_header.tsx`**, one of the thirteen. It was resolved
carefully and the reasoning recorded in the merge commit body. But it was found
by a merge-tree simulation rather than by consulting a list, because no list
exists.

Checked and absent: no ADR names these files; `docs/fork-phase-seams.md` is
scoped to phase seams and mentions `item_sets.go` only to *exclude* it;
`data/wowsims-fork.lock.json` records the pin and its three most recent commits
but not the upstream-edit set; `scripts/check_engine_port_drift.py` and the
`PROVENANCE.md` files cover **our ported `upgrades/engine/**`**, not upstream
files.

A silent clobber is unlikely — git conflicts loudly on overlapping edits. The
realistic failure is subtler: a future merge resolving a conflict *away*
without realising the line was load-bearing. The `sim_header.tsx` wrapper div is
the worked example — deleting it makes a non-null assertion throw at runtime,
and only the merge commit body records that.

## What to do

1. Write a tracked note — `docs/fork-upstream-divergence.md` or an ADR — listing
   the thirteen paths, why each diverges, and **which lines are load-bearing**.
   The `sim_header.tsx` wrapper div is the first entry.
2. Say for each whether it is an upstream candidate (worth a PR) or local-only.
   Three already qualify: the hunter guard, the `item_list.tsx` extraction, and
   the `test-locales.mjs` Windows fix.
3. Decide the dead `iterations` parameter in `ui/core/sim.ts`: wire it up or
   revert it. It is upstream-file divergence buying nothing today and will
   conflict for no benefit.
4. Point the next fork merge at the note before it starts.

## Acceptance

- [x] A tracked file lists every diverging upstream path with its reason —
  `docs/fork-upstream-divergence.md`, fifteen paths at fork HEAD `f90b12a7b`
  (the ticket's own table undercounted at fourteen rows, missing
  `test-layout.mjs`; see that doc's "How this was produced" for the
  reconciliation).
- [x] Load-bearing lines are called out, `sim_header.tsx`'s wrapper
  included — with the `ab59127d9` merge commit's reasoning quoted.
- [x] Each entry says upstream-candidate or local-only.
- [x] The `sim.ts` `iterations` parameter is wired up or reverted — reverted;
  `sim.ts` now has zero diff against upstream `ec5c5f205`.

## Resolution note

The stale-SHA correction and the revert decision for item 3 were settled
before this pass started (see the worker prompt that dispatched this
close-out); this session verified both against the current fork HEAD rather
than re-deriving them. Full detail is in `docs/fork-upstream-divergence.md`.

## Related tickets, both already handling this correctly

- **311** — the hunter guard's origin. The audit confirms its
  "upstream-candidate" claim holds: `applyItemEffects` dispatches by item id
  with no class check, so a mail item a paladin can wear runs hunter code and
  panics. Real upstream bug, minimal fix, encodes nothing about our tab. Note it
  fixes one of eight class packages carrying the same unguarded pattern.
- **364** — proposes editing `sim/druid/forms.go`, and is **the one that would
  move sim numbers**. The ticket says so and refuses to act for that reason,
  requiring a feral re-baseline first. Correctly filed rather than fixed.
- **366** — proposes editing `sim/core/database.go`, and names the concern
  unprompted: "This is upstream's code, not ours." Declines to fix. The real fix
  was on our side and is already done.

## What is NOT claimed

The no-sim-output-change finding rests on **reading** the diff — no arithmetic
is touched anywhere in it — not on running the sim before and after. Ticket
311's blast-radius claim (one confirmed item, other specs `hypothesis,
untested`) is that ticket's own and was not re-measured here.
