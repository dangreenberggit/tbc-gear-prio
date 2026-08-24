# Sub-brief — pool listing and its gate

Nested planning brief for Step 4 of
`.scratch/stage-gate/phase-item-pool/plan.md`. Plan a single deliverable: a
re-runnable, committed listing that explains phase-3 candidate-pool
membership item by item, cross-checked against the wowsims fork's own item
database, plus the `pnpm verify` gate that keeps it honest.

The parent plan's acceptance wins over anything invented here. Read that
plan's Step 4 before planning.

## Goal

`scripts/list_phase_pool.py` regenerates two committed Markdown listings,
`data/pool-listings/ret-p3.md` and `data/pool-listings/feral-p3.md`. A new
`pool-listings:check` script regenerates and byte-compares them, appended to
the `verify` chain.

Each listing carries:

- a source inventory with pins (which db.json, which universe, which fork
  commit — whatever the script actually read),
- the membership rules stated in the header, in the listing's own words,
- the full membership table with per-item source and origin,
- the wowsims cross-check: phase disagreements, and ids absent from the fork
  DB,
- the classified symmetric difference between the two memberships,
- an "unexplained" section,
- a count of phase-3 raid drops lacking a reason.

## Precedence rule (Q1, verbatim from the parent plan)

> *membership and source metadata* — local universe; *phase* — wowsims DB
> (audited: the listing fails loudly on any disagreement; today there are
> zero, C11); *zone vocabulary* — wowsims `zones[].name` (already true by
> construction, C13); *completeness* — wowsims DB is the reference the
> universe is audited against.

## The wowsims-primary membership definition (verbatim from the parent plan)

> items with `phase <= maxPhase`, `quality == Epic (4)`, spec-eligible per
> the assembler's own `SPEC_PROFILES` (class allowlist, armor type,
> weapon/hand rules, relic type). **Legendary (`quality == 5`) is
> deliberately excluded**: the fork DB holds 18 legendaries, two of them
> phase 3 (the Warglaives, 32837/32838 — reviewer-verified), and none is
> ret/feral-usable under the same spec rules (1H sword/dagger; ret excludes
> 1H weapons, feral cannot use swords or daggers); the engine additionally
> strips the Kael'thas temporary legendaries (`isKaelTempLegendary`,
> `upgrades_tab.tsx:405`). The listing states both rules in its own header.
> Rare-and-below is excluded from the *audit* because the measured Rare
> phase-3 gap is zero for both specs.

## Reason categories for the symmetric difference

Every wowsims-only item is classified into exactly one of these:

- **a.** per-spec weapon/hand exclusion from `SPEC_PROFILES`
- **b.** `eligible_d7` False
- **c.** stub-only effect id
- **d.** class allowlist
- **e.** has a fork-DB source but excluded by a local assembler rule
- **f.** no recognized source route
- **g.** unexplained

Categories a–d overlap by construction (`eligible_d7` itself applies the
class allowlist and the weapon/hand rules). Decide and state a deterministic
precedence order so each item lands in exactly one category, and say in the
listing what that order is.

## Do not re-implement the rules

Import `SPEC_PROFILES`, `eligible_d7`, and the stub-list loader
(`stub_only_effect_ids`) **from `scripts/assemble_universe.py`** rather than
re-implementing them. One model of eligibility, not two — a second copy
would drift from the assembler and the listing would then explain a pool
that is not the pool. `scripts/check_rep_tables.py` already imports from the
assembler this way; follow that precedent.

## Inputs

- `vendor/wowsims/db.json` — pinned via `data/wowsims.lock.json`, restored by
  `pnpm sync:wowsims:restore`. CI restores it before `pnpm verify`, so a
  verify step may read it.
- `data/universes/ret-p3.json`, `data/universes/feral-p3.json` and their
  `.report.json` siblings.
- `vendor/tbc-new-fork/assets/database/db.json` — the fork's own DB. The
  clone is gitignored and is NOT restored in CI.

The check must **fail loudly** naming the restore command when
`vendor/wowsims/db.json` is absent — do not skip. Note for the planner: the
parent plan cites `check_rep_tables.py` as the fail-loud precedent, but that
script actually soft-skips on a missing db.json and names no restore
command. Take the parent plan's instruction (fail loudly, name the command)
as the requirement and do not copy that script's absence handling.

Decide, and state the reason for, how the listing handles the fork clone
being absent — the generator may need it, but `pnpm verify` runs in CI where
it does not exist.

## Acceptance (parent plan, property-based — this wins)

- `pnpm pool-listings:check` exits 0.
- In both listings the phase-disagreement count is 0.
- In both listings the "raid drops lacking a reason" count is 0.
- Every symmetric-difference item carries exactly one category a–f or
  appears under "unexplained".
- Every "unexplained" item is one that no category a–f explains. There is no
  fixed item list.
- `pnpm verify` green.

**No expected counts are given to you, deliberately.** The listing
establishes the numbers; do not write a predicted count into the plan, and
do not make any acceptance criterion a numeric match against a figure
guessed in advance. The two zero-counts above are properties the rules must
produce, not measurements to reproduce.

## Constraints

- Repo conventions: `AGENTS.md` at the repo root. Comments explain why, not
  what. Durable claims cite a re-runnable command or say hypothesis.
- The listings are committed artifacts regenerated from committed sources;
  the working tree must match after a regen.
- Nothing about ranking math changes. No pool membership changes — an item
  the audit cannot explain is reported, never added.
- Paths you may create or edit: `scripts/list_phase_pool.py`,
  `data/pool-listings/*.md`, `package.json`. Anything else is out of scope
  for this step — say so rather than widening.

## Deliverable

An implementation plan for this step in the stage-gate plan format: goal,
approach, claims register with verification commands, ordered steps with
per-step acceptance, paths manifest, verify recipe, out of scope.
