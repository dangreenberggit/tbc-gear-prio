# Leftovers from the wowsims reforge catch-up

Written 2026-09-10 for a fresh agent. Everything needed to start is here; the
supporting files are named where the detail lives, but you should not need to
reconstruct any of the history.

**State**: `dev` @ `66ab791`. `feat/wowsims-reforge-catchup` merged in `16f8fba`
(`--no-ff`, via `pnpm merge-to-dev`). `pnpm verify` green. **`dev` is not
pushed** — 434 commits ahead of `origin/dev`, which predates this work.

**The fork clone** at `vendor/tbc-new-fork` (gitignored, its own git repo) is
on branch `feat/upgrades-tab`, HEAD `6ef5679888430118895d59043e81e542d61c7527`,
working tree clean, matching `commit` in `data/wowsims-fork.lock.json`. Job 1
runs `make` in that tree; keep it clean, and if you commit there, repin the
lockfile or the fork gates exit 2.

## What just landed, in one paragraph

This repo's wowsims engine pin moved off release tag `v0.0.119` onto commit
`ec5c5f205e61049d730e460967f8488774a7fe2a` on upstream's
`feature/backend-reforge`, and the gitignored fork clone at
`vendor/tbc-new-fork` was merged to that same commit, so the Upgrades tab and
this repo's ranking engine now run one engine rather than two. The default
content tier moved 2 → 3 with it. `scripts/fetch_wowsimcli.py` learned to build
the sim binary from source when the pin is a sha, since GitHub publishes release
assets for tags only. ADR-0030 records the decision.

## Two shells, and a trap that cost real time

Bash (Git Bash) and PowerShell share no state, and each tool call is a fresh
shell.

The shell traps are in `docs/agents/known-traps.md`, which `AGENTS.md` already
points you at — read it rather than trusting this summary. Two lines so you
recognise them when they bite: PowerShell gives Node 20 and every `pnpm`
command dies with `ERR_UNKNOWN_BUILTIN_MODULE node:sqlite` (**run `pnpm` from
Bash**, where fnm gives 22.17.1), and Git Bash prints an `fnm env` error on
stderr that breaks `&&` chains and heredocs (**run commands standalone**; use
`git -C`, `pnpm -C`, `npm --prefix`).

The rest of this section is what `known-traps.md` does **not** yet carry:

- **`make`**: not on either shell's PATH by default. GNU Make **4.4.1** is at
  `C:\Users\dgree\AppData\Local\Microsoft\WinGet\Packages\ezwinports.make_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\make.exe`.
  There is also a GnuWin32 **3.81** at `C:\Program Files (x86)\GnuWin32\bin` —
  **do not use it.** It does not route `$(shell …)` through its own `SHELL` on
  Windows, so the fork's makefile silently resolves *empty* file lists and
  "builds" successfully having tracked nothing. 4.4.1 resolves 506/176/89 files
  for `UI_SRC`/`TS_CORE_SRC`/`ASSETS_INPUT`; if you see zeros, you have the
  wrong make.
- **Exit codes lie here.** A pipe reports the *last* command's status, so
  `make … 2>&1 | tail` returns `tail`'s 0 and hides `make: command not found`.
  This produced a false "build succeeded" report during this work. Append
  `; echo "rc=${PIPESTATUS[0]}"` to the same command, or redirect to a file and
  `tail` it separately. A background-task notification also once reported
  "exit code 0" for a command that exited 1 — **read the artifact, not the
  status.** `AGENTS.md` § Durable claims now carries this rule.
- Windows-native `python`/`node` cannot read `/dev/stdin` or `/c/Users/...`
  paths. Write a real script file and pass `C:/Users/...`.

## Job 1 — build and load the tab (do this first)

**Why first**: it is cheap, and it closes a bigger unknown than either filed
bug. The tab's full production build has **never been run** against the merged
tree. What *has* been verified is narrower than it sounds:

Each line below says where its evidence lives. Where the evidence is a session
transcript rather than a repo file, that is stated — treat those as weaker, and
re-run the check if it matters to you.

- **`tsc --noEmit` in the fork — passes.** Recorded in the fork merge commit
  body (`vendor/tbc-new-fork`, `ab59127d`).
- **Fork Go sim suite — 22 packages, all `ok`**, including `sim/core/bulk`
  (1.4s) and `sim/core/reforge_optimizer` (11.0s), `sim/core` 34.9s,
  `sim/druid/feralcat` 53.4s. Run on the merged tree during the catch-up
  session, **but never written into a repo file**, which is why
  `AUDIT-fork-testing.md:18` still lists it as "not run" — that audit predates
  the run. Command: `go test --tags=with_db ./sim/...` from
  `vendor/tbc-new-fork` with `C:/Users/dgree/go/bin` on PATH. Cheap to repeat;
  do so if you want repo-durable evidence.
- **The DOM layout gate — 37 assertions across widths 375, 653, 768, 1280,
  zero failures**, with a real WASM run behind it. Recorded in commit
  `4dcafcd`'s body. Note `AUDIT-12-tickets.md:60` and tickets 310/312/325/327
  carry the same "37 assertions" figure from **before** this branch, so the
  number alone does not distinguish runs — `4dcafcd` is the one against the
  merged tree.
- **A browser load of the built tab** — rendered, header read
  "Phase 3 (2.2 - T6) - Alpha", zero error elements, only console error a
  `/version` 404 from the absent `air` dev server. Observed live in the
  catch-up session via the in-app browser against a static server on the built
  `dist/`; **not recorded in any repo file.** The `467` figure quoted elsewhere
  for eligible items matches the CLI's `universe=467`
  (`EXEC-status-slices-C-D-E.md:90`) — do not treat agreement between the two
  as independent confirmation without re-reading both.

What has **not** run at all: `npm run build` (= `make host` → `vite build`) as
a verification step, and nobody has exercised the tab interactively — clicking
Run, watching a sim complete, reading the ranked rows.

**A stale `dist/` already exists**, so "the files are there" proves nothing.
As of writing, the newest artifact in `vendor/tbc-new-fork/dist/tbc/` is dated
**13:12** and the merge commit `16f8fba` is **13:25** — the tree predates the
merge. Record the timestamps *before* you build and compare after:

```
ls -la --time-style=+%H:%M /c/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork/dist/tbc/lib.wasm.gz /c/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork/dist/tbc/index.html
```

Then build, from Bash, with make 4.4.1 on PATH (see above):

```
make -C /c/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork host > /tmp/host.log 2>&1; echo "rc=$?"
```

`make host` builds and then hands off to `air`, which serves on **:8081** and
never exits — so the task keeps looking "running" long after the build is done.
Judge it by the artifact timestamps moving past your recorded baseline, never
by the task status.

**Two failure modes to expect.** If `air` is not installed the build dies early
with "Missing air dependency. Please run `make setup`" (`makefile:155`) — run
`make setup` and retry. If `UI_SRC`/`TS_CORE_SRC`/`ASSETS_INPUT` resolve to
zero files you are on the wrong make; see the make bullet above.

Then load `http://localhost:8081/tbc/paladin/retribution/`, open the Upgrades
tab, and **press Run**.

**Done means all four:** the header reads "Phase 3 (2.2 - T6) - Alpha"; the tab
reports **467 eligible items** for ret (this matches the CLI's `universe=467`,
so a different number is itself the finding); a Run completes without an error
banner and returns a ranked table with a nonzero row count; and the browser
console shows no errors other than a `/version` 404, which is `air`'s own
endpoint and harmless under a static server.

**If any of that fails, that is a finding about the merge, not a chore.** Write
down what you saw and stop — do not edit the tab, the baseline, or the ranking
to make it pass.

**Output**: write `.scratch/handoffs/wowsims-reforge-catchup/EXEC-status-tab-build.md`
(this directory's convention is `AUDIT-`, `EXEC-status-`, `RESEARCH-` prefixes).
Record the before/after timestamps, the four done-conditions with what you
actually observed for each, and anything that surprised you.

## Job 2 — ticket 350, the one real tab bug

`.scratch/carry-forward/issues/350-two-hander-swap-leaves-worn-offhand.md`

A two-handed candidate is priced against a gear set that leaves the worn
off-hand equipped — a set the game cannot actually produce. The swap is costed
as a one-item change when it is really two, so the delta is overstated.

Confirmed **live and reachable**: the cited symbols exist verbatim in the
fork's own `ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` and
`pool.ts`, not gated off, hit by enhancement shaman, warriors and hunters in
every shipped phase. It is also live in this repo's `packages/core` copy — the
two engines share the defect, so a fix likely needs applying in both places.
Check whether they have diverged before assuming one patch fits.

**If the two copies have diverged**, or a fix in one breaks a gate on the
other, stop and write down what you found rather than patching both blind —
`engine-port-drift:check` exists precisely to police that boundary, and a fix
that quiets it without understanding it is worse than the bug. Editing the
fork also moves its HEAD, so `data/wowsims-fork.lock.json` must be repinned or
the six fork gates in `pnpm verify` exit 2.

## Job 3 — ticket 351, live but currently inert

`.scratch/carry-forward/issues/351-weapon-imbue-does-not-follow-candidate-weapon.md`

The weapon imbue does not follow the candidate weapon. Live in the shipped
path, but presently masked by a compensating quirk in the fork engine, so it
produces no visible error today.

**Read the ticket before touching it** — it names its own precondition: the
feral paw-bonus interaction must be settled first, or "the naive fix would rank
sharp and blunt candidates under different damage models." Do not fix it
blind.

**If you cannot settle the paw-bonus question from the repo**, that is the
expected outcome, not a failure — say so and leave 351 open with what you
learned appended. It is inert today; shipping a half-understood fix to it is
strictly worse than leaving it.

## Job 4 — two findings that were never filed

Both are real and sit only in scratch files. File them as tickets (take the
number from `.scratch/carry-forward/issues/NEXT`, currently **362**, **and**
check the directory for a collision — `.scratch/carry-forward/issues/` — because
ticket 352 records that this repo's two docs give contradictory numbering rules
and the safe procedure is the conjunction).

1. **No build/runtime evidence for the tab after the merge.** Source:
   `AUDIT-fork-testing.md`. Job 1 above may close this outright — if the build
   and interactive run both pass, file it as a closed ticket recording the
   evidence, or skip filing and note it in the map. If Job 1 fails, file it as
   a live defect with what you saw.
2. **The tab's "Candidates" cap can silently drop a real item.**
   Source: `SME-353-feral-verdict.md` verdict D. `candidate-order.ts:36-67`
   orders the whole candidate pool by EP and `rank.ts:1100` caps it, so on a
   capped run **stale Phase-1 feral EP weights decide which items are never
   simmed at all**. Both defaults are safe today (the CLI sets no cap; the tab's
   Candidates field defaults to 0 = no cap), and displayed rank is always
   measured `deltaDps` — so this is an exposure, not a live wrong answer.
   Ticket 358 files the *docs* fix for the false scope note; nothing files the
   exposure itself.

**Done for this job**: two ticket files exist (or one, if Job 1 closed the
first outright), `NEXT` reads **364** if you filed both and **363** if you
filed one, each new number checked against the directory before use, and
`.scratch/carry-forward/map.md` carries a one-line entry per ticket in the
style of the entries already there.

**If a number you take from `NEXT` already exists as a file**, do not silently
pick the next free one — that collision is the subject of ticket 352, and the
procedure is to report the disagreement rather than absorb it.

## Things you should not redo

- **Do not re-measure the feral rotation.** Ticket 353 §4 twice revived a
  "−18 DPS feral regression". It is wrong: superseded **and reversed in sign**
  on 2026-08-21. `docs/verification-log.md:1654-1669` measures the rotation main
  effect at **−42.91 DPS, and the new rotation is the better one**. Quote the
  sign as the log states it: the arms are tip 782.14, whole old package 740.67,
  old-rotation-on-tip-consumables 739.23, and −42.91 is arm 3 minus arm 1
  against a pre-registered 2×combined-SEM bound of 1.38. Flipping it to `+42.91`
  to make "better" read naturally is how the sign confusion started. One caveat
  the log adds at line 1678: all three arms ran an unequipped druid, so **do not
  cite −42.91 as the gain a geared feral would see.** Ticket 250 is closed.
  353 is now closed with that struck. If you see −18 again, it is folklore.
- **Do not treat the layout gate's "SKIPPED — tab layout source unchanged" as a
  failure.** It ran, passed, and advanced its own baseline to digest
  `c7289442`. Nothing changed since, so there is nothing to re-test.
- **Do not move `vendor/tbc-new-fork` into WSL.** Measured: `git status` on it
  takes 0.4s from Windows and 30.1s from WSL over `/mnt/c`. Worse, the
  fork-reading gates resolve a hard-coded `ROOT / "vendor/tbc-new-fork"` and
  **skip cleanly at exit 0 when it is absent** — moving it turns live gates
  into silent no-ops. See `AUDIT-wsl-feasibility.md`.

  Seven scripts read the fork this way. **Six run inside `pnpm verify`**:
  `check_ep_presets`, `check_equip_eligibility`, `check_meta_conditions`,
  `check_engine_port_drift`, `check_sim_implemented_effects`, and
  `sync_fork_universes`. The seventh, `check_layout_gate.py`, is **not** in the
  verify chain (`package.json:14`) — it is exposed as `layout-gate:check` and
  invoked only by `merge_to_dev.py:166`. So a green `pnpm verify` says nothing
  about the layout gate, and the tab's geometry is checked only at merge time.
- **Do not fix `known-traps.md` by growing it.** See
  `AUDIT-environment-traps.md` and `RESEARCH-doctor-command.md`: the
  recommendation is a ~30–40 line `pnpm doctor` covering only Node and pnpm
  versions (things that drift inside a working setup), manual-only, not wired
  into `verify`. Platform facts like the make/WSL situation stay as prose.

## Standing risk, unowned

`data/wowsims-fork.lock.json` has `pushed: false`. The fork branch
`feat/upgrades-tab` — now carrying a merge commit, a conflict resolution that
exists nowhere else, and the source that this repo's committed
`data/sim-implemented-effects.json` was derived from — **exists on exactly one
machine.** If that disk dies, those committed artifacts become unre-derivable
and their gates exit 2 with no path back. Ticket 355 tracks pushing or
archiving it. This is the largest risk in the project and it is not a code bug.

## The rules that bite here

From `AGENTS.md`, the ones this work actually tripped over:

- **Predict before you regenerate.** Write the expected artifact list down
  *before* running a generator, then `git diff --numstat -- data/`. Every
  unpredicted path is a finding to explain, not absorb. Three real findings came
  out of this during the catch-up.
- **`git add <paths>` does not scope a commit.** Pre-commit runs `lint-staged`
  against `*`, so every dirty file rides along. `git status` must be clean of
  work you did not do before each commit.
- **Never merge to `dev` without an explicit ask** from the owner, after the
  review file is written and he has had a chance to read the summary. A combined
  "review and merge" request is not enough.
- Commit per green slice, not once at the end.

## Map of the supporting files

All under `.scratch/handoffs/wowsims-reforge-catchup/`:

| file | what it holds |
| --- | --- |
| `AUDIT-open-tickets-tab-relevance.md` | which open tickets touch the tab (the basis for Jobs 2–4) |
| `AUDIT-fork-testing.md` | what was and was not verified about the fork |
| `AUDIT-12-tickets.md` | the post-merge advisory triage; 9 of 12 were filename coincidence |
| `SME-353-feral-verdict.md` | the domain verdict, and the EP-cap exposure in Job 4 |
| `AUDIT-wsl-feasibility.md` | the WSL measurement and the make diagnosis |
| `AUDIT-environment-traps.md` | trap-by-trap classification |
| `RESEARCH-doctor-command.md` | `pnpm doctor` prior art and scope |
| `PLAN-catchup.md`, `REVIEW-plan.md` | the plan and its adversarial review |
| `PROCESS.md` | the orchestration brief and the owner's gate decisions |
| `REVIEW-agents-edits.md` | review of the `AGENTS.md` edits; load-bearing for the layout gate's `None`-verdict fallback |
| `EXEC-status-*.md` | executor reports with deviation ledgers |
| `research/R1`–`R5` | the measurements taken before anything moved |

Also: `docs/reviews/feat-wowsims-reforge-catchup.md` (the three-axis pre-merge
review), `docs/adr/0030-*.md` (the pin decision).
