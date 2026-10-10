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

- In the Bash tool, `cd` returns exit code 1 even when it changes directory: ~/.bashrc runs `fnm env --use-on-cd`, which replaces `cd` with fnm's `__fnmcd`, and fnm cannot find its settings in the agent shell. So `cd X && cmd` never runs `cmd`. Use the command's own directory flag (`git -C`, `pnpm -C`, `npm --prefix`), or separate commands with `;`.

**Fork-gated suites never run in CI.** Every suite that imports
`forkPresent` — among them `fork-set-net.test.ts`,
`fork-meta-repair.test.ts`, `fork-run-staleness.test.ts`, the `bulk-*`
suites and `wowsims-fork-parity.test.ts` — is wrapped in
`describe.skipIf(!forkPresent)` (the parity suite in
`describe.runIf(canRunForkSide)`), and `vendor/` is gitignored, so CI
collects them and skips them. A green CI run is no evidence for them. Run
every one locally with the fork present, in Bash —
`npx vitest run $(grep -l forkPresent packages/core/test/*.test.ts); echo rc=$?`
— and record the command and its rc in the commit or ticket (ticket 478,
item A5). The `grep` lists the suites at run time, so a new fork-gated
suite joins the command without an edit here.

## Before any scripted or generated file edit

**Symptom when armed:** `git diff --stat` shows hundreds of changed lines
for an edit you know was small (a 4-line schema edit staging as ~18k
lines; a 2-hash `sed` rewriting all 182 lines of a file); or a reviewer
reports CRLF where HEAD is LF.

`sed -i` and CRLF-writing editors each flip a whole file's line endings.
Edit text files with the harness Edit tool, which preserves endings. After
any scripted or generated write, read `git diff --stat` before committing:
a line count near the file's length means endings flipped — confirm the
real change with `git diff --ignore-cr-at-eol`, rewrite the file back to
LF, then commit.

The Python generators no longer do this (ticket 283, fixed by 399 on
2026-09-15 across fourteen write sites). **Keep it that way when you add
one:** a Python write to a tracked file needs an explicit `newline=`. Text
mode defaults to the platform's endings, and `pnpm fork-universes:check`
compares bytes on disk, before `.gitattributes` normalizes anything at
staging — so a CRLF write reds that gate on a file whose content nobody
changed. Use `newline="\n"` when your code builds the text
(`generate_item_gem_index.py:281`), `newline=""` when you hand the handle
to `json.dump` or a `csv` writer (`sync_wowsims.py:493`). Both give LF.
Scratch and tempdir writes need neither, and `"wb"` cannot take one.

## Before editing a ported engine file

Applies to anything under the fork's
`ui/features/upgrades/model/engine/` (`rank.ts`,
`view.ts`, and neighbours) — **including comment-only edits**.

**Symptom when armed:** `pnpm verify` fails with
"docs/fork-provenance/engine.md is stale against the fork's ported files".

The full cycle, in order, every time:

1. `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` (E-W3)
   from the repo root — green before any hash moves.
2. Update the file's row in `docs/fork-provenance/engine.md` (in this
   repo, not the fork) with the new sha256 (Edit tool, not sed — see the
   trap above).
3. Fork commit of the ported file. The record change is committed in this
   repo with the re-pin.
4. Re-pin: move `data/wowsims-fork.lock.json`'s `commit` to the new fork
   tip and run `pnpm sim-implemented-effects:generate` (the artifact
   embeds the pin).
5. `pnpm verify`.

A fork commit that touches nothing ported still needs steps 3–5.

## Before moving the wowsims engine pin

**Symptom when armed:** `pnpm fetch:wowsimcli` 404s, or writes into a nested
`vendor/wowsimcli-feature/backend-reforge-.../`; or three fork gates exit 2
with "clone HEAD is X but lock pins Y"; or a regen moves a file nobody
predicted and it gets committed as though it were expected.

Pin a **commit sha, not a branch name**:
`python scripts/sync_wowsims.py --update --ref <sha>`. A branch name contains a
`/`, and both `fetch_wowsimcli.py` and `cli-wiring.ts` build
`vendor/wowsimcli-<tag>-<platform>` from the raw `tag`, so a slash nests the
directory. The branch belongs in `watchedRefs`, via a separate
`--watch-ref --ref <branch>` — `--update` carries the old `watchedRefs`
forward unchanged, so skipping it leaves the watched entry stale while the pin
moves (ADR-0030).

`--update --ref` writes `currentPhase` **and** `defaultMaxPhase` in the same
run, both from upstream's `CURRENT_PHASE`, so a tier move lands in the pin
commit whether or not you meant it to. Let both fields stand as the generator
wrote them, and put the deliberate half of the bump — `ENGINE_VERSION`, the
docs — in its own commit. The acceptance check is
`--update --ref <sha>` again, then `git diff --exit-code` on the lock: it holds
only while the file is purely generated. Nothing in `pnpm verify` reads either
field, so a hand edit there is invisible to every gate.

For a sha pin `fetch_wowsimcli.py` **builds from source** — it needs `go`,
`protoc` and `protoc-gen-go` on PATH, and it hard-fails without them where it
used to download a zip. CI never runs it, so CI will not tell you.

The fork gates (`equip-eligibility`, `ep-presets`, `meta-conditions`) exit 2
until `data/wowsims-fork.lock.json` names the clone's actual HEAD. Between a
fork commit and that lock edit they are red **by design** — read the message
before chasing it.

Predict the regen list before running anything, then diff (`data-pipeline-work`
rule 2). Every unpredicted path is a finding to explain, not to absorb: the pin
move that produced ADR-0030 turned up upstream phase corrections, pre-existing
codegen drift and a broken extractor exactly this way.

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

Write defer rows as `path — note`, never prose alone, and the named
ticket must be open. When a later round closes a deferred ticket, edit the
earlier round's row to `fixed` (with a "superseded in round N" note) in the
same commit that closes the ticket.

**`merge-ready` parses every round — since 2026-09-13 (tickets 85, 381).**
Every `## Disposition` section is read, including headings carrying trailing
text like `## Disposition (round 3)`. Before that fix it read only the first
bare-headed section, so a reviewer who appended a second table got a green
gate over rows nobody checked — worst case in this repo, 9 rows parsed of 61. Appending a later round as its own section is now safe.

The gate prints `N parsed of M row-shaped lines in S section(s)`, so an
under-read is visible rather than silent: `disposition rows: 9` used to read
identically whether it was 9 of 9 or 9 of 61. Two things now fail loudly and
name what to look at. A row-shaped line the parser cannot read — a 3- or
5-column table, which a human reads as rows — fails with its line number and
text. A disposition word outside `fixed`, `defer` and `wontfix` fails naming
the row id, so a single mistyped `deferred` among good rows can no longer
pass unnoticed.

**An axis with no findings writes no row.** A Disposition row disposes of a
finding; "this axis found nothing" disposes of nothing. Say it in that
axis's prose (`**Spec: clean.**`) and leave the table to the findings. A
concern that was raised and then checked and found not to be a defect _is_ a
finding: dispose of it as `wontfix` with the reason.

Still write the header row and its separator even when there are no
findings. A section with a header and zero body rows passes and prints
`(no findings)`; a heading with no table at all fails, because the header is
the only signal separating "nothing to report" from "forgot the table".

Not handled, and zero instances in `docs/reviews/` today: a pipe-containing
line inside a fenced code block within a Disposition section (it would be
counted as a row-shaped candidate and fail), and a `###` subheading inside
one (the section runs to the next `## `, so a subsection's tables are
swallowed into it).

## Before starting the dev servers

**Symptom when armed:** `preview_start` refuses because the port is held —
3333 by a stray `wowsimtbc.exe`, or 5173 by another session's vite.

Each port's server builds and serves the fork of the folder that started it,
so first find that folder (`docs/agents/paired-worktrees.md`, "Live tab").
**3333** must be exactly 3333 (the frontend hardcodes the proxy; the entry
sets `autoPort: false`): if the `wowsimtbc.exe` on it was built in your
folder and none of your sessions manages it, stop it and start the managed
`wowsims-backend` entry. **5173** held by your own folder's vite: use it with
HMR; a second copy buys nothing. Either port held by another folder: the live
tab is taken until that session stops its servers. One HMR side-effect: an
engine-file edit reloads the page, dropping in-page run state and sometimes
the browser tab id — re-drive the page rather than debugging the "lost" run.

The layout gate (`pnpm layout-gate:check`) and `pnpm tab-review` need
neither port: the harness serves its own built `dist/`. The layout gate runs
no sim since ticket 520 — its post-run checks render a recorded fixture.
`pnpm tab-review` runs the WASM in the browser only for a `post-run` entry
that names no fixture.

Looking at a recorded tab fixture (`data/tab-fixtures/`, ticket 504) needs
only `:5173`: open a link from `http://localhost:5173/tbc/tab-fixtures/`, or
run `pnpm tab-fixtures:smoke`, which starts `:5173` when the port is free and
stops only a server it started. Recording one needs both ports, because it is
a real run. A fixture load never shows "Took": no run happened, so wait for
result rows and no stale banner instead. See `data/tab-fixtures/README.md`.

## Before writing a `pnpm tab-review` manifest

**Symptom when armed:** in a `pane: false` entry with a hover, every clip
after `capture[0]` shows the tab's nav bar instead of its target, and
`index.json` reports no error (ticket 536's row clips, `*-1.png`).

`capture[0]` is clipped where it stands, so a hovered tooltip stays open
for it. Each later capture goes through the scroll branch of `captureClip`
in `scripts/tab-harness/test-review.mjs`, which offsets the clip by `window.scrollY`.
Hypothesis, untested: the page scrolls an inner container, so
`window.scrollY` stays 0 and the clip is taken at the top of the page. Make
each element `capture[0]` of its own entry: one entry for the popover, one
for the row. The row entry in
`.scratch/stage-gate/494-set-hover-redo/out/current-popover/manifest-rows.json`
(gitignored) hovers the row's first cell and captures only the row.
