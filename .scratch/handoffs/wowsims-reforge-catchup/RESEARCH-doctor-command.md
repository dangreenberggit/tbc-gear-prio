# Should this repo have a `doctor` command?

## Verdict

Yes, build a small one — but call it `pnpm doctor` and keep it to three checks,
run manually, not wired into `verify`. It is not a novel idea worth arguing
about in the abstract: every major package-manager or SDK CLI (Homebrew, npm,
Flutter, React Native, GitLab's GDK, Coder) has converged on the same shape,
and the shape is boring for a reason — it works. This repo's own three
Windows incidents from this session (missing `make`, a 2006 `make` silently
returning empty file lists, PowerShell resolving Node 20 instead of 22) are
each exactly the kind of thing the convention exists to catch: a checkable
precondition that fails confusingly deep inside a build instead of loudly at
the front door.

The honest caveat: a doctor script is worth building only for the three
checks below. It is not worth building as a general catch-all, and it does
not replace `known-traps.md` — it replaces the *subset* of that file that is
actually a "did you remember to check X" precondition rather than a fact
about how the system behaves. See part E for the line between them.

---

## A. Prior art — yes, "doctor" is an established, convergent convention

Every tool below independently arrived at: **a single named command, run
manually, that probes the environment and prints pass/fail plus a fix
instruction, without touching anything by default.**

- **`brew doctor`** (Homebrew). Diagnoses installation problems — permission
  issues on Homebrew's directories, unlinked kegs, broken symlinks, stale
  Xcode Command Line Tools, Git config oddities. It does not repair anything
  itself: it prints warnings and exits nonzero when any are found, leaving
  the fix command to the operator. Runs in a few seconds. Manual only — nothing
  else in Homebrew invokes it automatically.
  [Homebrew Common Issues](https://docs.brew.sh/Common-Issues)

- **`npm doctor`**. Checks npm/Node/git are on PATH and executable, registry
  reachability, directory permissions on the cache and `node_modules`
  (local and global), and cache tarball checksum integrity. Report-only —
  its own docs tell you to run `npm cache clean -f` yourself rather than
  doing it for you. Manual command; not run as part of `npm install` or any
  other npm command.
  [npm-doctor docs](https://docs.npmjs.com/cli/v11/commands/npm-doctor/)

- **`flutter doctor`**. The most elaborate example: platform-specific
  validators (Android SDK, Xcode, Visual Studio, CocoaPods, connected
  devices, web/Chrome, network/proxy), each returning one of five states —
  `success`, `partial`, `missing`, `notAvailable`, `crash` — and each capped
  at a 4.5-minute timeout specifically because some external tool checks
  (looking at Android licensing, emulator enumeration) are known to hang.
  Report-only, no auto-fix logic in the validators themselves. Manual
  command, though IDEs (Android Studio, VS Code plugin) run it in the
  background to populate their own status bars.
  [flutter/doctor.dart source](https://github.com/flutter/flutter/blob/master/packages/flutter_tools/lib/src/doctor.dart)
  I looked for documented false-positive/false-negative complaints
  specifically about `flutter doctor` (not Flutter generally) and did not
  find a strong, citable pattern — GitHub issues exist for individual
  checks being wrong (e.g. not detecting a valid Android toolchain), but I
  did not find evidence of a broad "doctor lies to you" reputation. I am
  flagging that the premise in the prompt ("flutter doctor's reputation for
  false positives") is weaker than assumed — treat it as anecdotal, not
  established, unless you have a specific incident in mind.

- **`react-native doctor`** (`@react-native-community/cli-doctor`, since RN
  0.62). The interesting outlier: it is interactive and **offers to
  auto-fix** some issues (e.g. missing CocoaPods, wrong Xcode command-line
  tools selection) with a yes/no prompt per fix, falling back to a printed
  link when it can't fix something itself.
  [React Native Doctor announcement](https://reactnative.dev/blog/2019/11/18/react-native-doctor)

- **`gdk doctor`** (GitLab Development Kit). Runs preflight checks, warns
  about missing dependencies, flags an out-of-date GDK, checks whether
  required services are running, and checks for pending DB migrations —
  report-only, run manually before starting local dev.
  [GDK doctor MR](https://gitlab.com/gitlab-org/gitlab-development-kit/-/merge_requests/938/commits)

- **`coder-doctor`**. Same pattern applied to a Kubernetes-hosted product:
  checks Kubernetes version, Helm version, RBAC permissions, resource
  availability before install — a pre-install gate, not a post-hoc bug
  report.
  [coder/coder-doctor](https://github.com/coder/coder-doctor)

No "git doctor" or "rustup doctor" exists as a first-class command (rustup
has `rustup check`, narrower — just toolchain-version freshness, not
environment probing), which is itself informative: the convention shows up
specifically in tools that (a) span multiple platforms/shells and (b) have a
build or install step with several external dependencies. A pure
single-binary CLI doesn't need one. This repo matches the pattern that
grows a doctor command: two shells, an OS-dependent Node pin, a vendored
fork with its own toolchain (Go, protoc, make), Python scripts alongside
Node scripts.

**Common shape across all of them:**

| | checks | fixes | exit code | invocation |
|---|---|---|---|---|
| brew doctor | install state, permissions, symlinks | no | nonzero if warnings | manual |
| npm doctor | PATH tools, registry, permissions, cache | no | nonzero on failure | manual |
| flutter doctor | SDKs, IDEs, devices, network | no | 0 even with warnings (advisory) | manual (+ IDE background) |
| react-native doctor | native toolchains | **yes, interactive** | nonzero if unfixed issues remain | manual |
| gdk doctor | deps, services, migrations | partial | nonzero on failure | manual |

None of them run automatically inside the project's main build/test command.
That is a real, consistent signal, not an accident — see part C.

---

## B. What this repo's doctor would actually check

Grounded in `package.json`, `docs/agents/known-traps.md`, the audit at
`.scratch/handoffs/wowsims-reforge-catchup/AUDIT-environment-traps.md`, and
this session's three incidents.

Existing preflight: `pnpm run preflight:node` (in `package.json`) already
checks `process.versions.node >= 22.5.0` and prints a fix hint
(`fnm use`). It only runs as the first step inside `pnpm verify` — nothing
runs it standalone, so an ad hoc `node scripts/foo.mjs` or `pnpm rank`
outside `verify` gets no protection.

Proposed check list for `pnpm doctor`:

1. **Node version** — reuse `preflight:node`'s existing logic verbatim (do
   not duplicate it; extract it to `scripts/doctor.mjs` and have
   `preflight:node` call the same function, or have `doctor` call
   `preflight:node` as its first check). Cheap, deterministic,
   sub-millisecond.
   - Failure message: current one is already good ("Use fnm/nvm: `fnm use`").
   - Cannot auto-fix (shell PATH mutation from a child process doesn't
     stick in the parent shell) — advise only.

2. **pnpm version** — `package.json` pins `packageManager: pnpm@11.24.0`.
   Check `pnpm --version` matches or is compatible (pnpm 11 requires the
   Node 22.13+ that motivated incident 3 in this session — `node:sqlite`).
   Cheap, deterministic.
   - Failure message: name the required pnpm major and point at corepack
     or the install docs.
   - Advise only.

3. **`make` availability and identity, only when relevant** — not "does
   `make` exist" in general (irrelevant to 95% of tasks in this repo,
   per the audit's own finding that most sessions never need to build the
   fork), but a **guard placed where the fork build is actually invoked**:
   before `make host` runs (i.e., inside whatever wraps `npm run build` in
   `vendor/tbc-new-fork`, or as a `pnpm fork:build` wrapper script in this
   repo if one gets added), check:
   - Is this shell WSL/Linux, or native Windows/macOS?
   - If native Windows: fail immediately with "the fork's makefile is
     GNU/POSIX-idiomatic (`uname`, `realpath`, `find` as a coherent set) and
     upstream's own docs say native Windows isn't supported — use WSL,"
     rather than letting `make` run 40 seconds against the wrong `find.exe`
     and produce a build that "succeeds" with zero tracked files.
   - This is the single highest-value check from this session's incidents:
     it would have caught the problem in under a second, before any build
     attempt, instead of after a masked-exit-code pipeline reported false
     success.
   - Advise only (installing WSL isn't something a script should do
     unattended).

4. **(Optional, cheap) `.scratch/carry-forward/issues/NEXT` staleness** —
   compare the cached next-ticket-number file against
   `ls .scratch/carry-forward/issues | sort -n | tail -1`. This is arguably
   better fixed at the source (make `NEXT` a computed byproduct, not an
   input — the audit's own recommendation) rather than added to doctor.
   I'd leave this OUT of doctor v1: it's a repo bug with a real code fix
   available (ticket-worthy on its own), not an environment precondition.
   Don't paper over a fixable bug with a doctor check when the two-line fix
   removes the check's reason to exist.

What I would explicitly **not** put in doctor:

- Git/Python/Go/protoc presence checks "just in case" — nothing in this
  session's incidents was caused by Python or git being missing, and
  scripts that need them already fail with a clear "command not found."
  Checking for tools nobody has actually forgotten is the false-confidence
  failure mode from part D, not a real precondition.
- Registry/network reachability checks (npm doctor's style) — this repo has
  no registry-dependent runtime step that fails confusingly; `pnpm install`
  already reports network failures clearly.
- Anything that touches `vendor/tbc-new-fork`'s dev servers or ports (the
  known-traps.md entry about 3333/5173) — that's runtime state, not a
  toolchain precondition, and is already well-documented as prose. A
  doctor check that says "port 3333 is busy" duplicates what
  `preview_start`'s own refusal message already says.

---

## C. Where it hooks in

**Recommendation: manual only — `pnpm doctor`. Do not wire it into
`pnpm verify` or a git hook.**

Reasoning:

- Every prior-art example is manual-first. None of brew/npm/flutter/RN/GDK
  auto-runs its doctor inside the main build/test/install command. That is
  not laziness — it is the same cost argument the prompt already raises:
  `pnpm verify` runs on every push and in CI, dozens of times a day. Adding
  even a fast WSL-detection-and-`make`-guard check to that path is pure
  overhead for the overwhelming majority of invocations that touch no fork
  build at all.
- The Node-version check already has the right home: it's the first line of
  `verify` today, and that's correct because every subsequent `verify` step
  needs Node 22. Keep it there. Do not generalize "put doctor checks at the
  top of verify" to the other checks — `make`/WSL detection has nothing to
  do with `verify` (verify never invokes `make`), so putting it there would
  be checking an irrelevant precondition on every single push.
- A git hook (pre-commit/pre-push) is the wrong layer for the same reason:
  hooks already run `verify`, and the make/WSL check isn't a precondition
  of committing or pushing — it's a precondition of *building the fork*,
  which is a rare, deliberate action.
- A first-run marker file (run doctor once per clone, skip afterward) is
  the pattern `npm doctor` and `brew doctor` both reject implicitly — they
  stay manual forever because environments drift (a Node version manager
  gets reconfigured, a new machine gets used) and a stale "already checked"
  marker would hide exactly the kind of environment regression this
  session hit.

So: `pnpm doctor` as a new, separate, manual script. Additionally, wrap the
one call site that actually needs the `make`/WSL guard (wherever a fork
build gets triggered from this repo, if that gets scripted at all) with a
call to the same underlying check function — not a call to `pnpm doctor`
itself, but the shared logic — so the guard fires exactly where the failure
would otherwise occur, per the "check what you're about to do" convention
already used in `known-traps.md`'s own heading structure ("Before running
node / pnpm / test commands", "Before editing a ported engine file", etc.).

---

## D. The honest counter-argument

Steelmanning "don't build this":

1. **It's another script to maintain and it can rot.** A doctor check that
   says "Node OK" while some other precondition silently changed is worse
   than no check, because it manufactures confidence. This is real: the
   fnm-PATH-loss trap in `known-traps.md` already shows the failure mode —
   `node --version` can print an old version *while a stale shell alias or
   cached PATH entry makes it look consistent* until you actually run a
   test. A doctor script only checks what its author thought to check; the
   next new trap (the `make` incident was novel this session) won't be
   caught until someone updates doctor after being burned, which is exactly
   the same "record it after the fact" pattern `known-traps.md` already
   does, just with a different file extension.

2. **The real fix for the `make` incident is not "detect GNU Make 3.81
   forever" — it's "know that native Windows isn't a supported build
   platform for the fork and stop trying."** That's a one-time fact you
   put in `known-traps.md`, not a check you run repeatedly. A doctor check
   that says "you're on native Windows, use WSL" is really just
   `known-traps.md`'s prose turned into an `if` statement that fires at a
   slightly more convenient moment. The audit file already reaches this
   conclusion for the `make` case specifically (§B: "do not chase a
   native-Windows make fix... this belongs in known-traps.md as a single,
   short, permanent entry").

3. **Two of the three incidents this session are Windows-vs-POSIX
   incompatibilities, not missing installations** — GnuWin32 `find.exe` vs
   Git Bash's `find`, PowerShell's default Node vs Git Bash's fnm-supplied
   Node. A doctor check can say "you're missing X" but it's much weaker at
   saying "the X you have is shadowing a different X on PATH and Windows'
   PATH-search order is about to bite you" — that class of bug needs the
   specific investigation this session did (`where find`), not a generic
   "make --version" check that would have reported GNU Make 3.81 as
   present and technically not wrong.

4. **A one-time setup doc plus `known-traps.md` might genuinely be
   sufficient**, if the real problem is that new-environment setup isn't
   written down anywhere coherent yet. Nothing in this repo currently says,
   in one place, "on a fresh Windows clone, install: fnm + Node 22, pnpm
   via corepack, Python 3.x, and if you ever need to build the fork, use
   WSL, not native tools." If that page existed and were the thing a new
   contributor reads first, most of what a doctor script would check
   becomes a one-time manual step instead of a repeated probe.

Where I land after weighing this: **counter-argument 2 is right about the
`make`/WSL case specifically** — that one really is "write it down once,"
not "check it forever," because the fact ("fork build unsupported on native
Windows") doesn't change session to session and a static warning is just as
effective as a live probe. But **counter-argument 1 doesn't hold for the
Node-version check**, because that one *does* recur — a shell can lose its
fnm environment mid-session (this is documented as already having happened
multiple times, not hypothetically), so a live, cheap, deterministic check
earns its keep every time it's run, unlike a one-time setup fact. The
distinguishing question is not "is this checkable" in the abstract, it's
**"does this precondition actually drift within an already-set-up
environment, or is it a fact about the platform that's true forever once
stated?"** Node/pnpm version drift is the former. "Fork builds need WSL" is
the latter. That's the real dividing line between what belongs in doctor
and what belongs in prose — sharper than "checkable vs not," which is what
the audit file used and why it slightly overclaimed doctor's value for the
`make` case.

---

## E. Scope: what to actually build

**Build `scripts/doctor.mjs`, wired as `pnpm doctor`, with exactly two
checks in v1:**

1. Node version (extract `preflight:node`'s existing check into a shared
   function; `doctor` and `preflight:node` both call it — do not duplicate
   the version-comparison logic in two places).
2. pnpm version compatibility with the `packageManager` pin.

Roughly 30–40 lines total, matching `preflight:node`'s existing terse,
single-purpose style (it's currently one `node -e` one-liner in
`package.json` — the new script can stay almost as small, just split into
its own file so it can be imported/called from two places and print a
slightly longer, itemized report instead of one inline error).

**Explicitly leave the `make`/WSL guard out of `pnpm doctor` itself.**
Instead:
- Add the single-paragraph entry to `known-traps.md` the audit already
  drafted ("don't try to `make` the fork natively on Windows; use WSL, see
  upstream's own `docs/installation.md`").
- If/when a `pnpm fork:build` wrapper script gets written (it doesn't exist
  yet — right now building the fork means `cd vendor/tbc-new-fork && npm
  run build` by hand), have *that* script run the WSL-detection check
  first, sharing the check function with `doctor.mjs` if useful, but that's
  a guard on a build entry point, not a general-purpose doctor check.

**Leave out entirely:** the `NEXT`-file staleness check (fix the root cause
in `check_merge_ready.py`/`file-ticket` tooling instead — it's a two-line
code fix, not an environment fact), any network/registry check (no incident
motivates it), any Python/git/go/protoc presence check (nothing this
session hit was caused by these being absent), and any fork dev-server
port check (already well-served by `preview_start`'s own error message).

**Do not make `doctor` part of `pnpm verify` or a git hook.** Every piece of
prior art keeps doctor manual, and the two checks that survived scoping
(Node, pnpm version) are both already covered for the one path that matters
(`verify`) by the existing `preflight:node` step. The value of a standalone
`pnpm doctor` is for the ad hoc, outside-of-verify commands (`pnpm rank`,
`python scripts/...`, opening a fresh shell) where nothing currently checks
anything before the underlying tool fails with a confusing error — which is
exactly incident 3 from this session.
