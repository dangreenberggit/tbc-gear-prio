# Known traps

Symptom-led fixes for failures this repo has actually produced, each first
hit during the upgrades-ui-fit pass (2026-08-24). Match the symptom, apply
the move. Environment basics (two shells, backgrounded `cd`, Windows path
forms, read-the-error-first) live in `AGENTS.md` § CLI environment — this
file only covers what that section does not.

## Node vanished mid-session

**Symptom:** `error: We can't find the necessary environment variables to
replace the Node version` from any shell command; or a dozen test suites
failing at once with `Error: No such built-in module: node:sqlite`; or
`node --version` printing nothing.

**Cause:** the shell lost its fnm environment, so commands resolve no Node
or an old one. Mass test failure right after a shell hiccup is a Node
version symptom, not a code regression — this repo needs Node 22
(`node:sqlite`).

**Move:** pin the PATH explicitly and confirm the version before
diagnosing anything else:

```powershell
$env:PATH = "C:\Users\dgree\AppData\Roaming\fnm\node-versions\v22.17.1\installation;" + $env:PATH
node --version   # must print v22.x
```

Bash's `eval "$(fnm env)"` can fail with the same error the commands do;
the PATH pin works in either shell.

## Line endings flipped a whole file

**Symptom:** `git diff --stat` shows hundreds of changed lines for an edit
you know was small (a 4-line schema edit staging as ~18k lines; a 2-hash
`sed` rewriting all 182 lines of PROVENANCE.md); or the pre-merge reviewer
reports CRLF where HEAD is LF.

**Cause:** a tool rewrote every line's ending — `sed -i` on Windows, an
editor writing CRLF, or a Python generator (that one is ticket 283).

**Move:** edit text files with the harness Edit tool, which preserves
endings — that is the positive habit that retires `sed -i` here. After any
scripted or generated write, read `git diff --stat` before committing: a
line count near the file's length means endings flipped. Confirm the real
change with `git diff --ignore-cr-at-eol`, rewrite the file back to LF,
and only then commit.

## Editing a ported engine file ripples

**Symptom:** `pnpm verify` fails with "engine/PROVENANCE.md is stale
against the fork's ported files" after touching
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/`
(`rank.ts`, `view.ts`, and neighbours) — including comment-only edits.

**Move:** the full cycle, in order, every time:

1. `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` (E-W3)
   from the repo root — green before any hash moves.
2. Update the file's row in the fork's `upgrades/engine/PROVENANCE.md`
   with the new sha256 (Edit tool, not sed — see the trap above).
3. Fork commit.
4. Re-pin: move `data/wowsims-fork.lock.json`'s `commit` to the new fork
   tip and run `pnpm sim-implemented-effects:generate` (the artifact
   embeds the pin).
5. `pnpm verify`.

A fork commit that touches nothing ported still needs steps 3–5.

## Filing a ticket

**Symptom:** two open tickets share a number (`pnpm issues:open` lists two
"284"s), because `.scratch/carry-forward/issues/NEXT` was stale and nobody
checked.

**Move:** before writing the file, read `NEXT` **and** list the directory
for the number you're about to use — `NEXT` has been stale before, so the
listing is the authority. After filing, write the next free number back to
`NEXT` and add the map.md line if the ticket came from a review.

## Review Disposition rows are parsed by the merge gate

**Symptom:** `pnpm merge-to-dev --check-only` fails with
`defer with no ticket path` or `defer tickets must be open|claimed`.

**Cause:** `merge-ready` parses every Disposition row in
`docs/reviews/<branch>.md`. A `defer` row must name a ticket path, and
that ticket must still be open — so closing a deferred ticket in a later
round retroactively breaks the earlier round's row.

**Move:** write defer rows as `path — note`, never prose alone. When a
later round closes a deferred ticket, edit the earlier round's row to
`fixed` (with a "superseded in round N" note) in the same commit that
closes the ticket.

## Dev-server ports are contested

**Symptom:** `preview_start` refuses because the port is held — 3333 by a
stray `wowsimtbc.exe`, or 5173 by another session's vite.

**Move:** they differ. **3333** must be exactly 3333 (the frontend
hardcodes the proxy; the entry sets `autoPort: false`) — stop the stray
process and start the managed `wowsims-backend` entry. **5173** held by
another session's vite is serving this same checkout with HMR — use it;
starting a second copy buys nothing. One HMR side-effect: an engine-file
edit reloads the page, dropping in-page run state and sometimes the
browser tab id — re-drive the page rather than debugging the "lost" run.
