---
name: data-pipeline-work
description: >-
  Pinning or adding a vendored upstream file, editing a parser, or regenerating
  a committed artifact under data/. Use when the change moves inputs rather
  than logic.
---

# Data pipeline work

This lane moves **inputs**: an upstream file gets pinned, a parser learns a new
table, a committed artifact under `data/` is regenerated. The failure here is
rarely a crash — it is a change that reads as verified and is not.

Rules 2, 3 and 4 guard the same mistake: a check that runs, passes, and could
not have failed. When you record something as verified, name the command that
would have failed.

## What `pnpm verify` already covers

Three gates run on every verify, and all three are **AtlasLoot-only**:

| gate | catches |
| --- | --- |
| `sync:atlasloot:verify-local` | vendored Lua drifting from the lockfile (rule 1) |
| `atlasloot:regen:check` | the three committed parse outputs not reproducing (rule 2) |
| `rep-tables:check` | two faction names collapsing to one key (rule 4, invariant 4 at `check_rep_tables.py:136`) |

On any other input these rules are yours to apply by hand. The trap is a green
`pnpm verify` on a **non-AtlasLoot** change: it says nothing about that input's
pin or its regen, and reads exactly like it does.

## 1. Adding a tracked file is `--restore`, not `--update`

They are different operations:

- `--restore` fetches every `TRACKED` file at the commit the lockfile already
  names — including one you just added that has no lock entry yet
  (`sync_atlasloot.py:147`).
- `--update` resolves the *latest* upstream tag and rewrites the lockfile for
  every tracked file.

So `--update` to add one file folds an uncontrolled bump of every other pin
into your diff. When you do mean to move a pin, `--update --tag <tag>` moves it
somewhere you chose.

A newly tracked file is fetched but **not pinned** until the next `--update`;
the restore output says so per file. It is pinned once the lockfile names it.

## 2. Account for a regen field by field

`git diff --stat` shows the change you meant to make and cannot distinguish it
from the generator being unstable; both arrive as changed bytes.

**Before regenerating**, write down which artifacts you expect to move. A
bucket assigned afterwards just describes the diff you got and rules nothing
out. Then:

```bash
python scripts/assemble_universe.py ...          # or the generator in question
git diff --numstat -- data/                      # every path that moved
git diff -- data/universes/ret-p3.json | head -60  # field level, per changed file
```

Every path in `--numstat` you did not predict is the finding. For each one that
did move, say which fields changed and why: "entry counts unchanged, only
`factionId` added" is the shape of the answer.

## 3. Reproducible and unchanged are different claims

Diffing against `HEAD` asks whether output matches what was committed. Whether
the generator emits the same bytes twice is a separate question, and the answer
is two runs into temp paths and a `cmp`.

A **cross-platform** claim needs a CI log you have read — per AGENTS.md
§ Durable claims, do not predict it from a local run. Ticket 69 is the worked
example: byte identity on Windows stayed open until a Linux CI run confirmed
it.

## 4. Ship a lossy normalisation with its collision check

The prose→faction-id join collapses names to letters: correct until two
factions collapse to one key, at which point it is wrong and nothing fails. The
shortcut and the check that catches its collision go in the same change.
`check_rep_tables.py:136` is the pattern to copy.

## 5. A data change falsifies beliefs in code you never opened

Editing Python and JSON leaves stale assertions in TypeScript, across a package
boundary, where nothing pulls you to look. Ticket 66 (`3f53c81`) is the case: a
comment in `packages/core/src/pool.ts` and an assertion in
`packages/core/test/pool-hardening.test.ts`, both encoding "prose rows have no
id" after the data gained ids.

Grep `packages/core/` for every field name and count your change falsified, and
resolve each hit. A stranded assertion often needs **replacing, not editing** —
66's test was not merely out of date, it asserted the wrong invariant, and the
fix swapped `toBeUndefined()` for the real one.

## Before calling it done

Every box checked, or a line saying why it does not apply:

- [ ] Lockfile diff is the file you added and no other sha moved.
- [ ] Nothing imports from `vendor/` (it is gitignored, so an import that
      reaches into it passes locally and fails on a fresh clone — the reason
      ticket 66 declined to pin `names.ts`).
- [ ] Every artifact that moved was predicted, and has a field-level account of
      what changed and why.
- [ ] Generator run twice, outputs `cmp`-identical.
- [ ] Every lossy step has a check that fails on collision.
- [ ] `packages/core/` grepped for each falsified field name and count, every
      hit resolved.
- [ ] `pnpm verify` green.
