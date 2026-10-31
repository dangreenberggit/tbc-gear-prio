# Known traps

Read the entry for what you are **about to do** — each heading is the
action that arms the trap. The _Symptom_ line doubles as the after-the-fact
index when something already broke. Environment basics live in
`~/.claude/AGENTS.md` § This machine (staged in
`docs/agents/home/AGENTS.md`) — this file covers only what that section
does not. The commands below are for the WSL (Ubuntu) dev host.

## Before running node / pnpm / test commands

**Symptom when armed:** a dozen test suites failing at once with
`Error: No such built-in module: node:sqlite`; or `pnpm verify` stopping at
`preflight:node` with "Node ... is too old"; or `pnpm --version` printing a
version other than `package.json`'s `packageManager`.

The repo needs the Node in `.node-version`, and `pnpm` is corepack's shim,
which runs the version in `package.json`'s `packageManager`. Mass test
failure is a Node-version symptom before it is a code regression. Confirm
`node --version` and `pnpm --version` before diagnosing test output.

How every shell finds `node`, `pnpm`, `go`, `protoc` and `python`, and
when to restart T3 after a PATH change, is in `~/.claude/AGENTS.md`
§ This machine. To upgrade, replace
the files behind a link, with no sudo: repoint `~/.local/node-default`,
unpack a new Go or protoc into its folder, or
`go install google.golang.org/protobuf/cmd/protoc-gen-go@<ver>`.

Check the setup in a new WSL terminal, from the repo root. The `readlink`
lines must print what their comments say, where `<v>` is the
`.node-version` version, and the last two lines must print the same
versions as each other:

```sh
readlink ~/.local/node-default   # /home/<user>/.nvm/versions/node/v<v>
readlink /usr/local/bin/node     # /home/<user>/.local/node-default/bin/node
T='node --version; pnpm --version; go version; protoc --version; protoc-gen-go --version; python --version'
bash -lc "$T" | tr '\n' ' '; echo
env -i HOME=$HOME PATH=/usr/local/bin:/usr/bin:/bin bash -c "$T" | tr '\n' ' '; echo
```

`pnpm --version` must print the `packageManager` version. From Windows,
`wsl.exe -d Ubuntu-22.04 -e go version` and
`wsl.exe -d Ubuntu-22.04 -e node --version` must print the same versions.
Before the Node part of this setup, the WSL host's `/usr/local/bin/node`
points straight at one nvm version folder while nvm's default alias names
another, so `bash -c`, `wsl.exe` and T3's processes get one Node and login
shells another; the second `readlink` line shows which state the host is in.

One-time setup on a new host, after installing nvm, unpacking Go into
`~/.local/go` and protoc into `~/.local/protoc`, and running
`go install google.golang.org/protobuf/cmd/protoc-gen-go@<ver>`: run this
in a login shell (where `nvm` is defined), from the repo root. Only the
`sudo` lines need root.

```sh
V="$(cat .node-version)"
nvm install "$V" && ~/.nvm/versions/node/v"$V"/bin/corepack enable
mkdir -p ~/.local && ln -sfn ~/.nvm/versions/node/v"$V" ~/.local/node-default
for b in node npm npx corepack pnpm; do sudo ln -sfn "$HOME/.local/node-default/bin/$b" /usr/local/bin/$b; done
nvm alias default system
sudo ln -sf -t /usr/local/bin "$HOME/.local/go/bin/go" "$HOME/.local/go/bin/gofmt" "$HOME/.local/protoc/bin/protoc" "$HOME/go/bin/protoc-gen-go"
sudo apt install python-is-python3
```

To change the machine's Node later, bump `.node-version` and run the first
three lines again; they need no `sudo`. To use another Node in one shell
only: `nvm use <v>`.

**Fork-gated suites never run in CI.** Every suite that imports
`forkPresent` — among them `fork-set-net.test.ts`,
`fork-meta-repair.test.ts`, `fork-run-staleness.test.ts`, the `bulk-*`
suites and `wowsims-fork-parity.test.ts` — is wrapped in
`describe.skipIf(!forkPresent)` (the parity suite in
`describe.runIf(canRunForkSide)`), and `vendor/` is gitignored, so CI
collects them and skips them. A green CI run is no evidence for them.
Locally, `pnpm verify` fails when any of them skips (`skipGuard`,
`scripts/verify_fork_guard.mjs`) unless `TBC_VERIFY_WITHOUT_FORK=1`, so a
green local verify without `TBC_VERIFY_WITHOUT_FORK=1` ran them all: its
tail line reads `gates: N ran, 0 skipped` (ticket 478, item A5).

Do not run interactive `pnpm approve-builds`; declare builds via
`pnpm.onlyBuiltDependencies`.

## Before any scripted or generated file edit

**Symptom when armed:** `git diff --stat` shows hundreds of changed lines
for an edit you know was small (a 4-line schema edit staging as ~18k
lines; a 2-hash `sed` rewriting all 182 lines of a file); or a reviewer
reports CRLF where HEAD is LF.

The cause, the check after a scripted write, and the rules for generated
artifacts and CI byte-compare gates are in `~/.claude/AGENTS.md` § Shell
and tool habits.

The Python generators no longer flip endings (ticket 283, fixed by 399 on
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

1. `pnpm -C <repo> exec vitest run packages/core/test/wowsims-fork-parity.test.ts`
   (E-W3), where `<repo>` is the main checkout or the pair you are editing —
   green before any hash moves.
2. Update the file's row in `<repo>/docs/fork-provenance/engine.md` (in
   this repo, not the fork) with the new sha256 (Edit tool, not sed — see
   the trap above).
3. Fork commit of the ported file. The record change is committed in this
   repo with the re-pin.
4. Re-pin: move `<repo>/data/wowsims-fork.lock.json`'s `commit` to the new
   fork tip and run `pnpm -C <repo> sim-implemented-effects:generate` (the
   artifact embeds the pin).
5. `pnpm -C <repo> verify`.

A fork commit that touches nothing ported still needs steps 3–5.

## Before moving the wowsims engine pin

**Symptom when armed:** `pnpm fetch:wowsimcli` 404s, or writes into a nested
`vendor/wowsimcli-feature/backend-reforge-.../`; or five fork gates exit 2
with "clone HEAD is X but lock pins Y"; or a regen moves a file nobody
predicted and it gets committed as though it were expected.

`<repo>` below is the main checkout or the pair you are moving the pin in, as
an absolute path (`/home/daniel/...`). Every command names that folder: a bare
`python scripts/<x>.py` or `git diff` acts on whatever folder the shell is in,
which for a subagent is usually the main checkout, not the pair.

Pin a **commit sha, not a branch name**:
`pnpm -C <repo> exec python scripts/sync_wowsims.py --update --ref <sha>`. A
branch name contains a `/`, and both `fetch_wowsimcli.py` and `cli-wiring.ts`
build `vendor/wowsimcli-<tag>-<platform>` from the raw `tag`, so a slash nests
the directory. The branch belongs in `watchedRefs`, via a separate
`pnpm -C <repo> exec python scripts/sync_wowsims.py --watch-ref --ref <branch>`
— `--update` carries the old `watchedRefs` forward unchanged, so skipping it
leaves the watched entry stale while the pin moves (ADR-0030).

"Our pin is an ancestor of that branch" and "we do not have that feature"
are both claims about one ref; neither is evidence until the other
candidates are measured the same way. `watchedRefs` in
`data/wowsims.lock.json` is tracked because a feature was twice called
missing while live on a branch this repo already watched.

`--update --ref` writes `currentPhase` **and** `defaultMaxPhase` in the same
run, both from upstream's `CURRENT_PHASE`, so a tier move lands in the pin
commit whether or not you meant it to. Let both fields stand as the generator
wrote them, and put the deliberate half of the bump — `ENGINE_VERSION`, the
docs — in its own commit. The acceptance check is: stage the lock with
`git -C <repo> add data/wowsims.lock.json`, then `--update --ref <sha>` again, then
`git -C <repo> diff --exit-code data/wowsims.lock.json`: it holds only while the file is purely
generated. The `git add` comes first because `git diff` compares the working
tree with the index: unstaged, the first run's own changes show as a
difference. Nothing in `pnpm verify` reads either field, so a hand edit there
is invisible to every gate.

For a sha pin `fetch_wowsimcli.py` **builds from source** — it needs `go`,
`protoc` and `protoc-gen-go` on PATH (see `~/.claude/AGENTS.md` § This
machine), and it hard-fails without them where it used to
download a zip. CI never runs it, so CI will not tell you.

The fork gates (`equip-eligibility`, `ep-presets`, `meta-conditions`,
`fork-lint`, `fork-tests`) exit 2 until `<repo>/data/wowsims-fork.lock.json` names the clone's
actual HEAD. Between a fork commit and that lock edit they are red **by
design** — read the message before chasing it.

Predict the regen list before running anything, then diff (`data-pipeline-work`
rule 2). Every unpredicted path is a finding to explain, not to absorb: the pin
move that produced ADR-0030 turned up upstream phase corrections, pre-existing
codegen drift and a broken extractor exactly this way.

## Before filing a ticket

**Symptom when armed:** two open tickets share a number (`pnpm
issues:open` lists two "284"s).

Take the number from `.scratch/carry-forward/issues/NEXT`, as
`docs/agents/issue-tracker.md` ("Allocating `<NN>`") says. `NEXT` has been
stale before, so first check that no file uses that number
(`ls .scratch/carry-forward/issues/ | grep '^<NN>-'`); if one does, take the
lowest number above it that no file uses, write that number plus one to
`NEXT`, and say in your report that `NEXT` was behind. A ticket born from a
review also gets its map.md line.

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

**Symptom when armed:** a dev server will not start because its port is
held — 3333 by a stray `wowsimtbc`, or 5173 by another session's vite
(`pnpm tab:dev` exits; `preview_start` refuses); or the load climbs with
leftover `tsc --noEmit --watch`, `vite` or `chrome` processes.

Each port's server builds and serves the fork of the folder that started it,
so first find that folder (`docs/agents/paired-worktrees.md`, "Live tab").
**3333** must be exactly 3333 (the frontend hardcodes the proxy; the entry
sets `autoPort: false`): if the `wowsimtbc` on it was built in your
folder and none of your sessions manages it, stop it and start the managed
`wowsims-backend` entry or `pnpm tab:backend`. **5173** held by your own folder's vite: use it with
HMR; a second copy buys nothing. Either port held by another folder: the live
tab is taken until that session stops its servers. One HMR side-effect: an
engine-file edit reloads the page, dropping in-page run state and sometimes
the browser tab id — re-drive the page rather than debugging the "lost" run.

The layout gate (`pnpm layout-gate:check`) and `pnpm tab-review` need
neither port: the harness serves its own built `dist/`. Neither runs a sim:
the layout gate's post-run checks render the made-up fixtures in
`data/tab-fixtures/` (`pnpm tab-fixtures:mock`), and `pnpm tab-review` refuses
a `post-run` entry that names no fixture.

Looking at a tab fixture (`data/tab-fixtures/`, ticket 504) needs
only `:5173`: open a link from `http://localhost:5173/tbc/tab-fixtures/`, or
run `pnpm tab-fixtures:smoke`, which starts `:5173` when the port is free and
stops only a server it started. Recording a real result by hand
(`pnpm tab-fixtures:record`) needs both ports, because it is a real run. A
fixture load never shows "Took": no run happened, so wait for result rows and
no stale banner instead. See `data/tab-fixtures/README.md`.

**A script or batch that starts the servers** stops each one with its whole
process group: spawn it with `detached: USE_PROCESS_GROUPS` and stop it with
`killTree(child)`, both from `scripts/process-group.mjs`, or start `node
scripts/dev-tab.mjs frontend|backend` and send that SIGTERM. A plain
`kill <server pid>` leaves the server's children running (vite's
`tsc --noEmit --watch` when `TBC_TAB_TYPE_CHECKER=1`, which `dev-tab.mjs
frontend` sets unless the caller sets it to `0`). Wrap every backgrounded
batch in `timeout` (`timeout 3h bash batch.sh`): when the subagent that
started it stops (usage limit, crash), the batch runs on with nobody to stop
it. On 2026-10-25 one such batch ran unattended for hours, leaving a
`tsc --watch` behind for each run. To find
leftovers, run `ps -eo pid,ppid,etime,args | grep -E 'tsc|vite|wowsimtbc|chrome'`
outside the sandbox: a sandboxed Bash call sees only its own processes.

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
