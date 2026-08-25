# Known traps

Read the entry for what you are **about to do** — each heading is the
action that arms the trap. The _Symptom_ line doubles as the after-the-fact
index when something already broke. Every trap here fired for real during
the upgrades-ui-fit pass (2026-08-24). Environment basics (two shells,
backgrounded `cd`, Windows path forms, read-the-error-first) live in
`AGENTS.md` § CLI environment — this file covers only what that section
does not.

## Before running node / pnpm / test commands

**Symptom when armed:** `error: We can't find the necessary environment
variables to replace the Node version`; or a dozen test suites failing at
once with `Error: No such built-in module: node:sqlite`; or
`node --version` printing nothing.

The shell can lose its fnm environment mid-session, silently resolving no
Node or an old one — this repo needs Node 22 (`node:sqlite`). Mass test
failure right after a shell hiccup is a Node-version symptom, not a code
regression. Confirm `node --version` prints v22.x before diagnosing test
output; when it doesn't, pin the PATH:

```powershell
$env:PATH = "C:\Users\dgree\AppData\Roaming\fnm\node-versions\v22.17.1\installation;" + $env:PATH
```

Bash's `eval "$(fnm env)"` can fail with the same error the commands do;
the PATH pin works in either shell.

## Before any scripted or generated file edit

**Symptom when armed:** `git diff --stat` shows hundreds of changed lines
for an edit you know was small (a 4-line schema edit staging as ~18k
lines; a 2-hash `sed` rewriting all 182 lines of a file); or a reviewer
reports CRLF where HEAD is LF.

`sed -i`, CRLF-writing editors, and the Python generators (ticket 283)
each flip a whole file's line endings. Edit text files with the harness
Edit tool, which preserves endings. After any scripted or generated write,
read `git diff --stat` before committing: a line count near the file's
length means endings flipped — confirm the real change with
`git diff --ignore-cr-at-eol`, rewrite the file back to LF, then commit.

## Before editing a ported engine file

Applies to anything under the fork's
`ui/core/components/individual_sim_ui/upgrades/engine/` (`rank.ts`,
`view.ts`, and neighbours) — **including comment-only edits**.

**Symptom when armed:** `pnpm verify` fails with "engine/PROVENANCE.md is
stale against the fork's ported files".

The full cycle, in order, every time:

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

## Before filing a ticket

**Symptom when armed:** two open tickets share a number (`pnpm
issues:open` lists two "284"s).

`.scratch/carry-forward/issues/NEXT` has been stale before, so the
directory listing is the authority: list the directory for the number you
are about to use, then file, then write the next free number back to
`NEXT`. A ticket born from a review also gets its map.md line.

## Before writing a review Disposition table

**Symptom when armed:** `pnpm merge-to-dev --check-only` fails with
`defer with no ticket path` or `defer tickets must be open|claimed`.

`merge-ready` parses every Disposition row in `docs/reviews/<branch>.md`,
across **all** rounds in the file. Write defer rows as `path — note`,
never prose alone, and the named ticket must be open. When a later round
closes a deferred ticket, edit the earlier round's row to `fixed` (with a
"superseded in round N" note) in the same commit that closes the ticket.

## Before starting the dev servers

**Symptom when armed:** `preview_start` refuses because the port is held —
3333 by a stray `wowsimtbc.exe`, or 5173 by another session's vite.

The two ports differ. **3333** must be exactly 3333 (the frontend
hardcodes the proxy; the entry sets `autoPort: false`) — stop the stray
process and start the managed `wowsims-backend` entry. **5173** held by
another session's vite is serving this same checkout with HMR — use it;
starting a second copy buys nothing. One HMR side-effect: an engine-file
edit reloads the page, dropping in-page run state and sometimes the
browser tab id — re-drive the page rather than debugging the "lost" run.
