Status: open
Type: hardening (defence in depth; no known exploit path)
Origin: pre-merge review of `feat/drift-warner-proven`, 2026-08-21 — adversarial
  axis, finding A4
Blocks: none
Blocked by: none

# No workflow declares a `permissions:` block

## The finding

`grep -n "permissions" .github/workflows/*.yml` returns nothing. With no
`permissions:` key at job or workflow level, `GITHUB_TOKEN` takes the
repository default rather than an explicitly narrowed scope.

This became visible while reviewing the branch that first passes a token to a
step at all:

```yaml
- run: pnpm run verify
  env:
    GH_TOKEN: ${{ github.token }}
```

## Why it is not urgent

`${{ github.token }}` is the ephemeral per-run `GITHUB_TOKEN`, not a PAT. It is
scoped to this repository and expires when the run ends. The only thing the
`verify` chain does with it is `gh api repos/<repo>/compare/<a>...<b>` — a read.
Nothing in the chain writes through the API.

The condition also predates the branch that surfaced it: every workflow has
always run on the repo default. Adding the token did not widen anything; it made
an existing default worth looking at.

## What to do

Add the narrowest scope that keeps `verify` green:

```yaml
permissions:
  contents: read
```

Then confirm the drift step still reports real drift rather than falling back to
`CHECK DID NOT RUN` — that line is the tell that `gh` lost its credentials. Read
a real run with `gh run view <id> --log`; do not predict it from local output,
because locally `gh` uses the developer's own auth and cannot exercise this at
all.

## Acceptance

- [ ] `permissions: contents: read` declared, and the tightest scope that works
      is the one committed (not a broader one that merely passed first try).
- [ ] A real CI run read, showing the `upstream-drift:warn` step still printing
      `DRIFT:` lines and not `CHECK DID NOT RUN` — run ID recorded here.
- [ ] `pnpm verify` green.
