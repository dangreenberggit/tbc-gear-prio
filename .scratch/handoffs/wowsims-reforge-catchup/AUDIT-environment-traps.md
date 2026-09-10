# Audit: is `known-traps.md` a bandage or a real record?

Owner's question, verbatim: "why do these traps even exist. having a growing
'known traps' file to bandaid over stupid environment setup sounds stupid."

Short answer up front: **most of the file is not setup debt.** Five of six
existing entries are irreducible facts about this specific combination
(Windows host, Git-Bash-and-PowerShell, a vendored Go+Node fork, a Python
pipeline). One entry (the fnm PATH loss) is unfixed setup debt with a known
fix. The new `make` trap from this session is a sixth, different case: it's
not this repo's bug at all — upstream's own docs say native Windows isn't a
supported path. Full reasoning below, then a recommendation on what to build
so the file stops growing for the wrong reasons.

## A. Per-trap classification (existing `known-traps.md`)

| # | Trap | Class | Fix |
|---|------|-------|-----|
| 1 | fnm env loss silently resolving wrong/no Node | **Fixable setup** | Put the PATH pin in the shell profile permanently, or better: make `pnpm run preflight:node` (already exists, checked in `package.json` line 13) the thing every entry point runs first, and have it print the exact fix command instead of just failing. It already exists and is wired into `verify` — the gap is that ad hoc `node`/`pnpm` calls outside `verify` don't run it. See recommendation D. |
| 2 | `sed -i` / CRLF-writing editors / Python generators flipping line endings | **Repo bug** (partially) + irreducible constraint | The constraint (Windows tools default to CRLF, Git Bash `sed` behavior is inconsistent) is real. But the *policy* fix already exists and is correct: use the Edit tool, never `sed -i`, check `git diff --stat` after generated writes. This is documented well; nothing further to fix in code short of adding `.gitattributes` `text eol=lf` enforcement for the specific generator outputs, which would catch it at commit time instead of relying on operator discipline. Worth doing once, then this trap shrinks to "the .gitattributes rule caught it" rather than a remembered ritual. |
| 3 | Ported-engine-file edit needing a 5-step provenance/pin/regen cycle | **Irreducible** (given the architecture) | This is a real consequence of vendoring a fork with hash-pinned provenance tracking (ADR-driven, deliberate). Not a Windows/setup problem at all — it would exist identically on Linux. The only "fix" would be automating the 5 steps into one script (`pnpm engine-port:sync` or similar) so the ritual is enforced by tooling instead of memory. That's a real ticket, but it doesn't make the underlying trap go away — it just moves the checklist into code. |
| 4 | Moving the wowsims engine pin: branch-vs-sha, `--watch-ref`, Go/protoc toolchain requirement | **Irreducible** (mostly) + one **repo bug** | The sha-vs-branch nesting bug (`vendor/wowsimcli-<tag>-<platform>` splitting on `/`) is a **repo bug** in `fetch_wowsimcli.py` / `cli-wiring.ts` — a branch name with a slash should be rejected or escaped, not silently misnested. Concrete fix: validate the `--ref` argument in `sync_wowsims.py` and reject any value containing `/` when it's meant to be a sha, with a pointer to `--watch-ref`. The Go/protoc build-from-source requirement for a sha pin is irreducible given how `fetch_wowsimcli.py` is written (documented already as "CI never runs it"). |
| 5 | Ticket numbering collision (`NEXT` file staleness) | **Repo bug** | `.scratch/carry-forward/issues/NEXT` is a cache that can drift from the true state (directory listing). Concrete fix: stop trusting `NEXT` as a source of truth — have `pnpm issues:open`'s underlying tooling (or a `file-ticket` script) compute the next number by listing the directory every time, and have `NEXT` become a byproduct write, not an input. That removes the whole trap; the doc is currently teaching a hand workaround for a tool that could just not be wrong. |
| 6 | `merge-ready` Disposition-table parsing rules (defer rows need ticket paths, ticket must be open) | **Irreducible-ish** (a parser contract) | This is a documented input format for a checker script, not an environment problem. It belongs in the `pre-merge-review` skill or the checker's own `--help`/error text more than in "known traps" — the fix is making `check_merge_ready.py`'s failure message state the row format inline (it already partly does per the Symptom text) so the entry can be deleted once the tool is self-documenting. |
| 7 | Dev server ports (3333 hardcoded, 5173 shared HMR) | **Irreducible** | Real product behavior (frontend hardcodes the proxy port; vite is a shared dev server). Nothing to fix in setup; this is operational knowledge about how the two processes cooperate, correctly placed here. |

Tally: of 7 entries, **3 are irreducible** (3, 4-partial, 7), **1 is a
documentation/self-description gap in a script** (6), **2 are concrete repo
bugs with a stated fix** (4's slash-nesting, 5's `NEXT` staleness), and **1 is
unfixed setup debt** (1, fnm). None of the existing seven are "stupid
environment setup" in the sense of "nobody configured their machine" — they're
mostly consequences of: two shells with different semantics, a vendored
fork's own architecture (provenance pinning), and a couple of scripts that
could be hardened. That's a fair thing to keep a record of. The new trap this
session hit is a different animal — see below.

## B. The `make` situation

**Investigated, not assumed.** Read `vendor/tbc-new-fork/makefile`,
`package.json`, `README.md`, `docs/installation.md`, and
`.github/workflows/{run_tests,deploy}.yml`.

Findings:

- **CI builds exclusively on `ubuntu-latest`** (`run_tests.yml`,
  `deploy.yml`) — every job that runs `make` does so on Linux, with Go,
  protoc, and Node installed via GitHub Actions' standard Ubuntu setup
  actions. There is no Windows or macOS CI job at all.
- **Upstream's own `docs/installation.md` says, verbatim**: *"If you want to
  develop on Windows, we recommend setting up a Ubuntu virtual machine (VM)
  or running Docker... If you prefer working natively: ... Install make (you
  can also install it through Chocolate)."* Native Windows is explicitly the
  third-choice, unsupported-by-default path, and even that path assumes the
  reader installs a modern `make` themselves (not GnuWin32's 2006 build,
  which happens to be what's on this machine's PATH already, unused).
- **The makefile is GNU/POSIX-idiomatic, not just "uses `make`.**` It calls
  `$(shell uname -s)`, `$(shell realpath ...)`, `$(shell find ... )`,
  `ifeq (...)` with shell substitution, `rm -rf`, `cp -r`, and shells out to
  `bash -c` inside a recipe (`update-tests` target). None of that is
  Windows-native-tool compatible regardless of which `make.exe` you put on
  PATH — you'd need a POSIX-ish environment (Git Bash's toolset, MSYS2, or
  WSL) providing `uname`, `realpath`, `find`, `cp`, `rm`, `gzip`, `awk`, `sed`
  as a coherent set, not just `make` in isolation.
- **GnuWin32 (2006, GNU Make 3.81) is the wrong fix even if PATH'd
  correctly.** It's abandoned upstream, its `find.exe` is a different program
  from Git Bash's `find` (from `usr/bin`, which already wins over Windows'
  `FIND.EXE` per this session's PATH resolution — confirmed:
  `where find` returns `Git\usr\bin\find.exe` before `System32\find.exe`),
  and GnuWin32's own `find.exe` isn't even reachable from Bash without the
  `/c/...` path form, which nobody uses day to day. Modern GNU Make (4.x) is
  trivially available via `choco install make` or `scoop install make` and
  would still not fix the missing `uname`/`realpath`/coherent POSIX toolset
  problem underneath it.

**Conclusion: this is not this repo's bug, and not really "fixable setup" in
the sense of "install one package and move on."** The fork's build system is
correctly described by its own maintainers as Linux/Docker/WSL-first. `npm
run build` = `make host` working "out of the box" on native Windows was never
a real contract — it's an artifact of the fork also technically running on a
Windows filesystem path, which invites the assumption that its build does
too.

**Recommendation for B specifically:** do not chase a native-Windows make
fix (no modern make, no shim, no hand-picked PATH order gets you a working
`make host` without also solving `uname`/`realpath`/POSIX `find` coherently,
and even then you're maintaining an unsupported configuration upstream
explicitly warns against). The two real options are:

1. **WSL** for anything that needs `make` — matches upstream's own CI
   platform exactly, so success there is a real signal, not a coincidence of
   a workaround. This is the option to standardize on for **fork builds**
   specifically.
2. **Don't build the fork at all for day-to-day work in this repo** if the
   task doesn't need to (e.g. the frontend `pnpm tab:dev` may only need the
   already-published `dist/` build or a running dev server, not a from-source
   `make host`). Check whether the actual task at hand needed a build, or
   whether it was reached for out of habit — this session's traps 1-3 were
   all encountered *trying to build the fork*, not because a real task
   required rebuilding it. Worth confirming with the owner whether "build the
   fork on Windows" is actually a supported workflow this repo wants, or
   whether every fork build should route through WSL/CI by policy, with
   native Windows reserved for editing the vendored files and running the
   TypeScript/Vitest-side tooling that doesn't need `make`.

Either way, **this belongs in `docs/agents/known-traps.md` as a single,
short, permanent entry** ("don't try to `make` the fork natively on Windows;
it isn't supported upstream — use WSL"), not as a growing set of workaround
attempts (GnuWin32 PATH, `find` collision, etc.). The workaround attempts
this session made are dead ends and should not be preserved as if they were
partial progress toward a native fix.

## C. The exit-0 masking is a distinct, more dangerous failure mode — name it separately

AGENTS.md already has: *"An exit code is not evidence that work happened. A
stopped background task reports exit 0, and a command that ran in the wrong
directory succeeds at nothing."* Both of its examples are cases where the
**exit code is honest but insufficient** — the command that ran really did
exit 0, it just didn't do the thing you meant.

What happened this session is different in kind: **the exit code reported by
the tool was 0 while the actual command (`make`) exited nonzero (127,
"command not found")**, because the pipeline was `cmd 2>&1 | tail`, and in
both Bash and PowerShell a pipeline's exit status is normally the *last*
command's exit status — `tail` (or `Select-Object`) exits 0 regardless of
what upstream in the pipe did. That's not "insufficient evidence," that's
**actively false evidence** — the tool surface said success and the
underlying fact was failure. AGENTS.md's existing sentence doesn't cover this
case; it covers exit codes that are true but don't mean what you assumed.

**Concrete rule to add** (this is a recommendation, not applied — the audit
is read-only): a new bullet under the "Durable claims" / exit-code section of
AGENTS.md, distinct from the existing one:

> **A piped command's exit code is the last command's, not the first's.**
> `risky_cmd | tail`, `risky_cmd | head`, `risky_cmd 2>&1 | grep ...` all
> report success whenever the pipe-final command succeeds, regardless of
> `risky_cmd`'s real result. In Bash, either avoid the pipe for anything
> whose exit code you intend to check (redirect to a file and read the file,
> or check `$?`/`${PIPESTATUS[0]}` immediately after), or turn on `set -o
> pipefail` for the invocation. In PowerShell, check `$LASTEXITCODE`
> immediately after the native call, before any pipe. Never infer a build,
> install, or test result from a truncated pipeline's exit code alone —
> confirm the artifact (per the existing rule) even when the exit code looked
> clean.

This is the sharper, more specific case of "confirm the artifact" — worth
stating explicitly because a masked-but-clean-looking exit code is *more*
convincing than a missing artifact, and this session proves it produces a
false "build succeeded" report that a human would have to catch by hand.

## D. Recommendation

**Does `known-traps.md` deserve to exist?** Yes, but narrower than it is
heading, and it should stop being the only mechanism.

Breaking down what's actually in it: of the 7 current entries, 3 are
irreducible facts about the architecture (engine provenance pinning, wowsims
pin toolchain requirements, dev server ports) that any new contributor needs
to be told once, in prose, somewhere — that's a legitimate use of a
"known traps" style doc, because there's no command that makes those facts
disappear. The other 4 are either fixable in code (ticket numbering, the
slash-nesting bug, self-documenting error messages) or fixable by one-time
setup that should be automated rather than remembered (fnm PATH).

**Concrete answer: split the file's job in two.**

1. **A `pnpm doctor` (or `pnpm preflight`) script** that checks the things
   that are currently "remember to verify this before you start" prose:
   - `node --version` is 22.x (this already half-exists as
     `preflight:node`, gated only inside `verify` — promote it to a
     standalone script contributors/agents run first, and have `verify`
     depend on it as it does now).
   - Whether `vendor/tbc-new-fork` exists and, if a fork build is about to
     be attempted, whether the invoking shell is WSL/Linux vs native
     Windows — if native Windows, print the "use WSL, see known-traps.md"
     message *before* `make` is invoked and fails 40 seconds in.
   - Whether `.scratch/carry-forward/issues/NEXT` matches
     `ls .scratch/carry-forward/issues | sort -n | tail -1` and warn if
     stale, rather than requiring the operator to remember to check.
   This would have caught the `make` problem **immediately**, deterministically,
   before any build was attempted, instead of after a masked-exit-code
   pipeline produced a false success report. This is the single highest-value
   fix from this session's findings.

2. **`known-traps.md` keeps only the entries that are irreducible facts about
   this environment/architecture** — no command can check for them because
   they're not "is X installed," they're "here is how this system behaves."
   That's entries 3, 4 (the toolchain-requirement half), 6, 7, plus the new
   make-on-Windows entry from this session. Everything that reduces to "run
   this check first" moves into the doctor script and gets deleted from the
   prose file once the script exists and is proven to catch it.

**What to do first, concretely:**

1. Write `scripts/doctor.py` (or `.mjs`, matching the repo's existing
   script-language split) with the three checks above, wired as `pnpm
   doctor`, and have it print exact fix commands (not just pass/fail) —
   mirroring `preflight:node`'s existing style, which already does this
   well.
2. Add the make-on-Windows entry to `known-traps.md` under a new heading
   ("Before building the fork natively") stating: not supported upstream,
   use WSL, link to the fork's own `docs/installation.md`. One paragraph,
   not a workaround log.
3. Add the pipeline-exit-code rule to AGENTS.md (drafted in §C above) since
   it's a general shell-invocation discipline, not fork-specific — propose
   it in chat per this repo's own rule that AGENTS.md changes need approval
   before editing.
4. File the two concrete repo-bug fixes (slash-nesting validation in
   `sync_wowsims.py`; `NEXT`-file staleness) as tickets if they aren't
   already tracked — they're real, small, and each permanently deletes one
   "remember to" line from the traps file once fixed.

This doesn't make the file go away, but it answers the owner's actual
complaint: right now the file mixes "eternal facts you must be told" with
"things a five-second script could have checked for you," and growth has
been concentrated in the second category. Separating them means the file
stops growing every time someone hits a checkable precondition, and only
grows when the architecture itself grows a new irreducible constraint — which
is a much slower, and legitimate, rate.
