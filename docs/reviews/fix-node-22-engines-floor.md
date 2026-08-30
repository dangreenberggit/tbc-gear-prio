# Pre-merge review — fix/node-22-engines-floor

Reviewed range: `670fa382783c0601b3f5c99aea042ad8ed3bdce5..e97384d8fa22d50ad3f3ea5ef47a4d4f8b1a9d33`

Dispatch: one fresh-context reviewer on the review lane (Opus, effort medium),
proportionate to a small config-only branch (11 files: package manifests, dotfiles,
docs, ticket markdown — no source logic). `codex` not on `PATH`.

## Review

**Verdict: clean and mergeable. No blockers.**

Verified against the diff:

- **Preflight guard is correct.** `package.json scripts.preflight:node` parses
  `process.versions.node` numerically and rejects `maj<22 || (maj===22 &&
min<5)`. Run across boundaries: 20.18.1 / 22.0.0 / 22.4.9 reject; 22.5.0 /
  22.10.0 (two-digit minor, no lexical bug) / 22.17.1 / 23.1.0 accept. Matches
  the stated `>=22.5.0` floor with no off-by-one, and is prepended to `verify`
  so it runs first (fails fast before the `node:sqlite` path).
- **Engines floor is internally consistent** — `>=22.5.0` in all three
  package.json (root, apps/web, packages/core); `.node-version` 22.17.1
  satisfies it; `.npmrc` `engine-strict=true` present.
- **pnpm config is coherent.** `packageManager` bumped to `pnpm@11.24.0`; the old
  `pnpm.onlyBuiltDependencies` is fully removed from package.json (grep across all
  four manifests returns nothing); `pnpm-workspace.yaml` carries a valid
  `allowBuilds:` block with real booleans (`@bufbuild/buf: true`, `esbuild: true`),
  no leftover stub, and does not also carry `onlyBuiltDependencies`.
- **CI is safe.** `.github/workflows/verify.yml` uses `pnpm/action-setup@v4` with
  no pinned version, so it reads `packageManager` — the 11.24.0 bump flows through
  automatically. `node-version: 22` resolves to a ≥22.5.0 22.x. Nothing depends on
  pnpm 10 or the old config location.
- **Durable-claim hygiene is honest.** Ticket 268's "exits 1 under Node 20.18.1"
  is framed as observed; ticket 337 and `docs/fork-phase-seams.md` cite live
  `gh`/file:line measurements and say "re-run the diff to re-verify"; the 337↔seams
  cross-links are reciprocal and correct.

The reviewer's one flagged-untested path — `pnpm install` under `engine-strict`
on Node 22 — was **subsequently run by the owner on pnpm 11.24.0 / Node 22.17.1
and completed clean** (it is what surfaced and then confirmed the fix of the
`ERR_PNPM_IGNORED_BUILDS` warning). So that path is now observed, not outstanding.

## Summary

A well-constructed, config-only fix in three coherent parts: the Node ≥22.5.0
floor (ticket 268, with a verified fail-loud preflight), the pnpm 10→11 bump with
`onlyBuiltDependencies` relocated to `allowBuilds`, and the tier-Phase-3 docs
(ticket 337 deferred + `docs/fork-phase-seams.md` seam map). No source logic
touched; nothing touches the wowsims fork's dependencies. Clean yes to merge.

## Disposition

| ID  | Axis         | Disposition | Ticket / note                                                                                     |
| --- | ------------ | ----------- | ------------------------------------------------------------------------------------------------- |
| R1  | Correctness  | wontfix     | Preflight version logic verified correct across boundaries; no defect.                            |
| R2  | Config       | wontfix     | pnpm 11 config coherent, old location removed, no duplicate keys, CI reads packageManager.        |
| R3  | Standards    | wontfix     | Durable claims framed as observed vs untested honestly; cross-links correct.                      |
| R4  | Verification | fixed       | The one untested path (`pnpm install` under engine-strict on Node 22) was run clean by the owner. |
