# Engineering workflow

How work gets done in this repo. `AGENTS.md` carries the summary every
agent session should read; this is the detail behind it.

Everything here is designed to be **harness-agnostic** — it runs the same
whether the driver is Claude Code, Cursor, Codex, or a human at a terminal.
The gates are scripts and git hooks, not prompts. Agent-facing docs only
ever say "run `pnpm verify`" — none of them describe _how_ to satisfy it,
because that would need updating every time a tool changes.

## Branch model

- **`main`** — gated state. Receives a merge only when a PLAN.md §14 phase
  gate is fully checked off in [`docs/verification-log.md`](verification-log.md),
  tagged `phase-1`, `phase-2`, etc. Direct commits are refused by
  `.githooks/pre-commit`.
- **`dev`** — integration branch. Takes direct commits for small workflow/doc
  changes; feature work branches off it.
- **`feat/<slug>`** (or `phase-N/<slug>` for PLAN.md phase work) — one
  feature, branched off `dev`, merged back with `--no-ff` so it stays one
  revertable unit in history.

## The loop

1. Branch off `dev`.
2. Red → green, one slice at a time (see the `tdd` skill). Commit regularly
   — a commit per green slice, not one commit at the end.
3. `pnpm verify` before every push. This runs typecheck, lint, format check,
   and tests in one command — it's the thing every gate below actually
   calls, so there's one definition of "passing," not a different one per
   tool.
4. Run the `pre-merge-review` skill. Three independent axes review the
   diff, each with fresh context (no memory of writing the code):
   - **Adversarial** — correctness bugs, silent-failure modes, test theatre
     ([`.agents/reviews/adversarial.md`](../.agents/reviews/adversarial.md))
   - **Domain** — TBC/WCL/wowsims facts checked against
     [`phase0-findings.md`](phase0-findings.md) and
     [`verification-log.md`](verification-log.md)
     ([`.agents/reviews/domain.md`](../.agents/reviews/domain.md))
   - **Standards + Spec** — the existing `code-review` skill, unchanged

   Findings land in `docs/reviews/<branch>.md`. **Tickets are the source of
   truth for deferred work** — every `defer` creates
   `.scratch/carry-forward/issues/<NN>-<slug>.md` and the Disposition table
   only links it. See [`docs/agents/issue-tracker.md`](agents/issue-tracker.md).
   List anytime: `pnpm issues:open`.

5. **`pnpm land`** — the only supported door into `dev`. Runs verify, checks
   the review + deferred tickets, then `git merge --no-ff` into `dev`. Do
   not merge into `dev` by hand. On `phase-N/*`, open `Blocks: phase-N`
   tickets require `--ack-open-blockers` (or close / re-block them first).
   Check without merging: `pnpm land --check-only` (or `pnpm merge-ready`).

6. When a phase gate closes, merge `dev` → `main` and tag it.

### Parallel fan-out (optional)

When a feature or phase branch has independent slices, use the
`parallel-phase` skill instead of serializing everything in one checkout.
Workers get their own worktree or clone; they merge **into the feature
branch** (the delegator prefers to merge — it already planned the fit; a
dedicated merger is the fallback). After fan-in, `pnpm verify` on that tip,
then the same pre-merge-review / `pnpm land` door into `dev`. The skill is
harness-agnostic: plain git plus optional Cursor / Claude Code / Codex
adapters. See [`.agents/skills/parallel-phase/SKILL.md`](../.agents/skills/parallel-phase/SKILL.md).

## Gates — what's enforced vs. advisory

| Gate                                                                           | Enforcement                                                                             | Escape hatch                                                  |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `pnpm verify` before push                                                      | `.githooks/pre-push` refuses the push on failure                                        | `git push --no-verify`                                        |
| No direct commits to `main`                                                    | `.githooks/pre-commit` refuses the commit                                               | `git commit --no-verify`                                      |
| `pnpm verify` on every push/PR                                                 | GitHub Actions (`.github/workflows/verify.yml`)                                         | none — this is the backstop                                   |
| Purity of `packages/core/src` (no fs/net/`process`/`console` outside `seams/`) | ESLint (`eslint.config.js`), runs inside `pnpm verify`                                  | none, short of disabling the rule inline                      |
| Land on `dev`                                                                  | `pnpm land` + pre-commit refuses merge commits on `dev` without `TBC_ALLOW_DEV_MERGE=1` | `TBC_ALLOW_DEV_MERGE=1 git merge …`; `git commit --no-verify` |
| Deferred findings filed as tickets                                             | `pnpm land` / `merge-ready` — every `defer` links an open carry-forward ticket          | `wontfix` with a reason, or fix on branch                     |
| Phase open-blockers seen                                                       | `pnpm land` on `phase-N/*` fails if `Blocks: phase-N` tickets are open                  | `--ack-open-blockers`                                         |
| Comment policy (why, not what)                                                 | Not mechanically enforced — a `pre-merge-review` finding                                | —                                                             |

**The escape hatch is real and intentional** — spikes and throwaway
exploration shouldn't be blocked by the full gate. It's safe specifically
because it only skips the _local_ hook: a branch pushed with `--no-verify`
still hits CI, which has no bypass. Never use `--no-verify` / `land --no-verify`
/ `TBC_ALLOW_DEV_MERGE=1` on `dev` or `main` for real work. Never land on
`dev` with a raw `git merge` when `pnpm land` exists — that bypasses the
ticket check (the pre-commit hook blocks it unless the escape env is set).

## Why no coverage threshold

A global percentage gate contradicts the `tdd` skill's own rule — "test
only at pre-agreed seams" — and in practice it reliably produces exactly
the tautological tests `tdd`'s `tests.md` warns against, written solely to
move the number. Coverage is collected and reported (`vitest.config.ts`)
so a regression is visible, but it doesn't fail the build. The actual
sturdiness argument is narrower and stronger: PLAN.md §6 already commits to
testing the whole engine at its one real interface (`rankUpgrades`) using
recorded fixtures at all three seams, so the full pipeline runs
deterministically offline in a unit test. That's the thing worth protecting
— not a line-coverage percentage.

## Why a lint rule instead of a design pattern for purity

PLAN.md §4 states the rule directly: "enforced by lint rule, not by good
intentions." `packages/core/src` has zero filesystem, network, `process`,
or `console` access outside `seams/` and `cli.ts` — everything crosses one
of the three seams (`GearSource`, `SimRunner`, `Store`). This is what makes
the fixture-replay test possible at all: if I/O could leak in anywhere,
"runs offline from fixtures" would need auditing on every change instead of
being true by construction.

## CI

`.github/workflows/verify.yml` runs `pnpm install --frozen-lockfile && pnpm run verify`
on every push and on PRs into `dev`/`main`. It needs **no secrets and no
native binary** — not an oversight, a consequence of the seam design above.
Green CI is the standing proof that the recorded-fixture path still works.

## Pre-merge review, in more detail

Each of the three axes is dispatched with **no context beyond the diff and
its own brief** — that's deliberate. A reviewer that remembers writing the
code stops finding the code's mistakes; a fresh one doesn't have that
blind spot. The skill degrades gracefully depending on what's available in
the current environment: `codex exec` if installed (genuine cross-vendor
review), otherwise parallel subagents on whichever harness is running
(Sonnet by default), otherwise the brief and diff command are printed for
manual dispatch into a separate fresh session.

The domain axis exists because PLAN.md and its findings docs carry a lot of
hard-won, non-obvious facts (the 19→17 slot mapping, which enchant ID
namespace WCL actually uses, why race can't be read from a log) that are
easy to silently contradict weeks later without anyone noticing until the
numbers come out wrong.

## Adding a spec phase / closing a gate

1. Do the work on `phase-N/<slug>` branches off `dev`.
2. Check off PLAN.md §14's gate items as they're actually verified — with
   evidence, in `docs/verification-log.md`, not just checked.
3. Once every item for that phase is checked, merge `dev` → `main`,
   `git tag phase-N`.
4. The next phase doesn't start until that tag exists.
