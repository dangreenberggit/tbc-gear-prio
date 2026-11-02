# Pre-merge review — chore/pnpm-12.16.1

Reviewed range: `acbc1033561501b7f451f7f67d671da030049e7b..e9cd61f983a2b1cae3c3f24d362a415f6f991c9f`

Dispatch (round 1): full axes, not the small-change lane.
`git diff --shortstat dev...HEAD` gave `3 files changed, 163 insertions(+),
2 deletions(-)`: 165 changed lines, over the lane's 150. `git diff
--name-only dev...HEAD` listed `.github/workflows/verify.yml`,
`package.json`, `pnpm-lock.yaml`; `python scripts/check_merge_ready.py
--product-files` printed the same three, so the branch is product work, not
tooling. `codex` is not on PATH (`which codex`, rc=1), so each axis ran as a
fresh `general-task` subagent on Opus (review lane), in one parallel batch:
Adversarial, and the `code-review` skill's Standards and Spec sub-agents.
**Domain skipped:** the diff has no game-domain content (a pnpm version
pin, the lockfile's pnpm self-entry, a CI action tag). Each axis was told
it writes nothing.

The branch: `package.json` `packageManager` goes from `pnpm@11.24.0` to
`pnpm@12.16.1` (npm's `latest` dist-tag on 2026-11-01). pnpm 12 adds a
first YAML document to `pnpm-lock.yaml` recording itself; without it
`pnpm install --frozen-lockfile` failed with
`ERR_PNPM_FROZEN_LOCKFILE_WITH_OUTDATED_LOCKFILE ... Cannot update
packageManagerDependencies with "frozen-lockfile"` (run with only the pin
changed, recorded in the session's evidence file
`.scratch/agent-reports/2026-11-01-subagent-pnpm-12-bump.md`, step 3). The
rest of the lockfile is unchanged (+158 / -0). CI moves from
`pnpm/action-setup@v4` to `@v6.1.0`: the v6.1.0 release notes
(`https://api.github.com/repos/pnpm/action-setup/releases`) list "feat:
support pnpm v12" (PR 288), and `git ls-remote
https://github.com/pnpm/action-setup 'refs/tags/v6^{}' 'refs/tags/v6.1.0^{}'`
gives `0977fd99` for `v6` and `ea17c68d` for `v6.1.0`, one commit apart
(the compare API gives `ahead 1`), so `@v6` lacks pnpm 12 support.

## Adversarial

No silent failure and no gate that passes while checking nothing. CI as
written: v6.1.0's `src/install-pnpm/run.ts` reads `12.16.1` from
`packageManager` (no `version:` input, no `devEngines` in `package.json`)
and takes the pnpm 12 native path; `pnpm store path --silent` under 12.16.1
prints one path, so `actions/setup-node` `cache: pnpm` works (hypothesis
for CI itself, untested: the branch is not pushed, no CI run exists). No
script parses the lockfile; no other file pins pnpm 11.

- **A1 — the pair script's install fails across pnpm pins.**
  `scripts/worktree_pair.py:592` ran `corepack pnpm -C <target> install
--frozen-lockfile` from the caller's directory. Corepack picks the pnpm
  version from the working directory, not `-C`, so from a checkout pinning
  pnpm 11 the install into a pnpm 12 pair exits 1 ("This project is
  configured to use 12.16.1 of pnpm. Your current pnpm is v11.24.0").
  Loud failure; the branch's pin change is what makes it happen.
- **A2 — `engine-strict=true` in `.npmrc` is ignored** (raised as predating
  the branch). Checked: a `$TMPDIR` project with `engines.node` `>=99`
  installs with rc=0 under both pnpm 11.24.0 and 12.16.1 when the setting is
  in `.npmrc`, and fails (rc=1, "Unsupported engine") under 12.16.1 when it
  is `engineStrict: true` in `pnpm-workspace.yaml`. Predates this branch.
- **A3 — `pnpm -C <other checkout>` across differently pinned checkouts**
  (the remainder of the adversarial's A1). `docs/agents/paired-worktrees.md`
  lines 30 and 74 tell agents to run `pnpm -C <pair>` from their own
  checkout; during the switch to pnpm 12 that fails the same loud way.
  Not the merge path: `scripts/merge_to_dev.py` runs the branch's gates with
  `cwd` set to the branch's worktree (line 397), so the version matches.
  The corepack behaviour and the doc pattern predate this branch, and it
  recurs with any later pnpm bump.

## Domain

Skipped: no game-domain content (see dispatch note).

## Standards + Spec

### Standards

No hard violation; no baseline smell.

- **S1 — commit d36f6974's body makes a causal claim with no command**
  ("a --frozen-lockfile install fails until the lockfile has that entry").
  Judgement call under global `AGENTS.md` § Durable claims.
- **S2 — the new `verify.yml` comment states the tag gap with no command
  that checks it.** Judgement call, same rule. Moved to `## Code quality`
  as Q1.

### Spec

Met; no scope creep; nothing implemented wrong. pnpm 12.16.1 is npm's
`latest`; v6.1.0 is the newest pnpm/action-setup release and the one that
added pnpm 12; its inputs are all optional and the workflow passes none.

- **SP1 — pinning style.** The brief said "pinned the way the workflow pins
  other actions"; the others use major tags (`@v4`), this step uses the
  exact tag `@v6.1.0`. Checked: the `v6` tag is one commit behind v6.1.0, so
  a major-tag pin would not install pnpm 12. Cost: later v6 fixes need a
  manual tag bump.

## Code quality

| ID  | Row                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------- |
| Q1  | `.github/workflows/verify.yml:19-21`: add the `git ls-remote` command that shows the `v6` / `v6.1.0` gap (from S2). |

## Summary

Round 1 found one loud failure this branch triggers (A1, fixed in
a642ae6a: the pair install now runs with `cwd` set to the pair), two
problems that predate it (A2, A3: tickets 740, 741), and one comment row
(Q1, fixed in 834013d9 by a fresh workhorse agent). S1 and SP1 are
`wontfix` with reasons below.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                           |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | a642ae6a: `run()` takes `cwd`, and the pair install runs `corepack pnpm install --frozen-lockfile` with `cwd=target`. Live check from the pnpm-11 main checkout: old form rc=1 with the version error, new form printed 12.16.1. `python scripts/check_worktree_pair.py`: 27 checks ok. |
| A2  | Adversarial | defer       | `.scratch/carry-forward/issues/740-engine-strict-in-npmrc-is-ignored.md` — predates the branch (same rc=0 under pnpm 11.24.0)                                                                                                                                                           |
| A3  | Adversarial | defer       | `.scratch/carry-forward/issues/741-pnpm-c-across-checkouts-with-different-pins.md` — corepack behaviour and the `pnpm -C <pair>` doc pattern predate the branch; not on the merge path                                                                                                  |
| S1  | Standards   | wontfix     | Rewording d36f6974 would rewrite the commits this file's round 1 range names; the command and error text behind the claim are recorded in this file's dispatch note.                                                                                                                    |
| SP1 | Spec        | wontfix     | Checked, not a defect: `@v6` resolves to the commit before pnpm 12 support (`git ls-remote` above), so the exact tag is required.                                                                                                                                                       |
| Q1  | Standards   | fixed       | 834013d9: the comment now names the `git ls-remote` check.                                                                                                                                                                                                                              |
