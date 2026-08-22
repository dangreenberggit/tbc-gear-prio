Status: open
Type: task (deferred by owner decision — blocked on an external precondition)
Origin: ticket 257 follow-up, 2026-08-22 — owner asked what deriving
  `SPEC_PREFERRED_METAS` from wowsims would take, then deferred it once the
  "which upstream?" ambiguity surfaced
Blocks: none
Blocked by: none in this repo — see "The precondition" below. This is waiting
  on a state of the world, not on another ticket.

# Derive the meta-preference table from wowsims, once "upstream" means one repo on one branch

## Deferred 2026-08-22 — do not start this yet

**Owner ruling:** *"it seems like the ambiguity of 'upstream' is the kicker for
now, so we'll kick this down the road until we're only looking at one wowsims
code repo on one branch"*.

The investigation into deriving the table was stopped partway on that ruling.
Do not restart it until the precondition below holds — a derivation written
now would harden today's ambiguity into a script.

## The precondition

`SPEC_PREFERRED_METAS` (`packages/core/src/candidate-gems.ts`) is meant to be
read out of upstream's gear presets. But "upstream" is currently **two pinned
sources that have diverged**:

| spec | preset location | pin |
| --- | --- | --- |
| ret, feral (cat) | `vendor/wowsims/*.gear.json` | `data/wowsims.lock.json` (engine pin) |
| feral-tank (bear) | `vendor/tbc-new-fork/ui/druid/feralbear/gear_sets/` | `data/wowsims-fork.lock.json` (fork clone) |

The two pins are known to disagree — `data/wowsims-fork.lock.json`'s own
comment records that the fork sits on `cbf6b75` while the engine pin moved to
v0.0.119, and names ticket 251 as the open decision. So a derivation today
would have to read from both, and would encode "which upstream wins" as a
silent implementation detail of a script.

**Start this ticket when that is resolved**: one wowsims repo, one branch,
holding every spec's presets. Ticket 251 is the likely trigger.

## Why it was raised at all — the drift this table already suffered

Ticket 257 and the block comment in `candidate-gems.ts` both asserted that
upstream records no feral meta gem at all. True for cat — all five vendored
`feral_*.gear.json` presets wear socketless Wolfshead Helm 8345 — and **false
for bear**, whose sets were never consulted because they live in the other
pinned source. 7 of the 11 bear sets socket Relentless Earthstorm Diamond
32409. Re-derive:

```
node -e "for (const f of require('fs').readdirSync('vendor/tbc-new-fork/ui/druid/feralbear/gear_sets')) { const g = require('./vendor/tbc-new-fork/ui/druid/feralbear/gear_sets/' + f); console.log(f, (g.items || []).flatMap(i => i.gems || []).filter(x => x === 32409).length); }"
```

So a hand-copied snapshot of on-disk data drifted from its source, and a
confident comment asserted the opposite of what upstream says. Corrected in
`39eb131` / `b989902`; the table's values are right today. This ticket is
about making that class of drift impossible, not about fixing the values.

## Carried findings — do not re-derive these when this is picked up

**1. The derivation rule is NOT well-defined, and that is the real design
work.** A spec's presets disagree with each other. Bear: 7 of 11 socket
32409, three wear socketless Wolfshead (no meta possible), and `p5` uses
Powerful Earthstorm Diamond 25896 — a different meta, in a phase past this
project's range. So "read it from upstream" needs a tiebreak: most common?
latest in-range phase? exclude socketless sets? Whatever a future
implementation picks, **name the rule in the output rather than letting a
script silently choose a winner among disagreeing presets.** A hardcoded
table with an honest comment beats a derivation that hides a judgment call.
Ret's presets were not checked for the same disagreement — do that first.

**2. A drift CHECK may be the better buy than a derivation, and the precedent
already exists.** `scripts/check_engine_port_drift.py` reads the gitignored
fork clone and **skips cleanly at exit 0 when the fork is absent** (see its
docstring line 31 and the skip messages around lines 87-93). That is exactly
the shape a meta-preference check needs: gate under `pnpm verify`, fail when
the committed table disagrees with the presets, skip when the source is not
on disk. It would have caught this bug, it does not require resolving the
tiebreak rule, and it is far smaller than a generator. **Judge derivation
against this option rather than assuming derivation wins.**

*Untested/unswept, flagged for whoever picks this up:* whether
`scripts/generate_json_literal_types.py` (the repo's existing
generate-committed-code-gated-by-verify pattern, per AGENTS.md) is a natural
host for either option was not established before the investigation stopped.
Nor was the wider sweep for other hardcoded-from-wowsims values — the gem
palette, EP-weight presets, phase tables, and const id arrays in
`packages/core/src/` were all listed as candidates but none were checked. The
owner's framing was general (*"theres absolutely no reason for us to reinvent
the wheel"*), so that sweep is likely the more valuable half of this ticket.

## Acceptance criteria

- [ ] One wowsims source (repo + branch) holds every spec's presets, or the
      two-pin split is deliberately settled — see ticket 251.
- [ ] Ret's presets are checked for internal disagreement, the way bear's
      were.
- [ ] Either the table is derived, or a drift check gates it under
      `pnpm verify` — with the choice justified against the other option.
- [ ] Any tiebreak rule among disagreeing presets is stated in the artifact a
      reader sees, not only in the code that applies it.
- [ ] The wider hardcoded-from-wowsims sweep is run and its findings filed.
- [ ] `pnpm verify` green.
