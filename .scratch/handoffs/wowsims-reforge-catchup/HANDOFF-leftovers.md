# Leftovers from the wowsims reforge catch-up

Written 2026-09-10 for a fresh agent. Everything needed to start is here; the
supporting files are named where the detail lives, but you should not need to
reconstruct any of the history.

**State**: `dev` @ `66ab791`. `feat/wowsims-reforge-catchup` merged in `16f8fba`
(`--no-ff`, via `pnpm merge-to-dev`). `pnpm verify` green. **`dev` is not
pushed** — 434 commits ahead of `origin/dev`, which predates this work.

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

- **Node**: PowerShell defaults to Node 20 and every `pnpm` command dies with
  `ERR_UNKNOWN_BUILTIN_MODULE node:sqlite`. Git Bash has fnm supplying
  22.17.1. **Run `pnpm` from Bash.**
- **fnm noise**: Git Bash prints an `fnm env` error on stderr before your
  command. It breaks `&&` chains and heredocs. Run commands standalone; use
  `git -C`, `pnpm -C`, `npm --prefix` rather than `cd X && …`.
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

- `tsc --noEmit` in the fork — passes.
- The DOM layout gate — ran end to end, **37 assertions across widths 375, 653,
  768, 1280, zero failures**. Real WASM run, 6 result rows in 29.3s.
- A browser load of `dist/tbc/paladin/retribution/` — renders, header reads
  "Phase 3 (2.2 - T6) - Alpha", 467 eligible items, `sim-header-container-wrap`
  present exactly once, zero error elements, only console error a `/version`
  404 from the absent `air` dev server.
- Fork Go sim suite — 22 packages, all `ok`, including `sim/core/bulk` and
  `sim/core/reforge_optimizer`.

What has **not** run: `npm run build` (= `make host` → `vite build`) as a
verification step, and no one has exercised the tab interactively — clicking
Run, watching a sim complete, reading the ranked rows.

Do this:

```
# from Bash, with make 4.4.1 on PATH (see above)
make -C /c/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork host > /tmp/host.log 2>&1; echo "rc=$?"
```

`make host` builds and then hands off to `air`, which serves on **:8081** and
does not exit — so the task will look like it is still running when the build
is done. Check `dist/tbc/` timestamps and `lib.wasm.gz`, not the task status.
Then load `http://localhost:8081/tbc/paladin/retribution/`, open the Upgrades
tab, **press Run**, and confirm rows come back with sensible deltas.

Report what you see. If it fails, that is a finding about the merge, not a
chore — say so plainly rather than fixing the tab to make it pass.

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

## Job 3 — ticket 351, live but currently inert

`.scratch/carry-forward/issues/351-weapon-imbue-does-not-follow-candidate-weapon.md`

The weapon imbue does not follow the candidate weapon. Live in the shipped
path, but presently masked by a compensating quirk in the fork engine, so it
produces no visible error today.

**Read the ticket before touching it** — it names its own precondition: the
feral paw-bonus interaction must be settled first, or "the naive fix would rank
sharp and blunt candidates under different damage models." Do not fix it
blind.

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

## Things you should not redo

- **Do not re-measure the feral rotation.** Ticket 353 §4 twice revived a
  "−18 DPS feral regression". It is wrong: superseded **and reversed in sign**
  on 2026-08-21. `docs/verification-log.md:1654-1669` measures the rotation main
  effect at **+42.91 DPS in favour of the new rotation**. Ticket 250 is closed.
  353 is now closed with that struck. If you see −18 again, it is folklore.
- **Do not treat the layout gate's "SKIPPED — tab layout source unchanged" as a
  failure.** It ran, passed, and advanced its own baseline to digest
  `c7289442`. Nothing changed since, so there is nothing to re-test.
- **Do not move `vendor/tbc-new-fork` into WSL.** Measured: `git status` on it
  takes 0.4s from Windows and 30.1s from WSL over `/mnt/c`. Worse, all six
  fork-reading gates in `pnpm verify` resolve a hard-coded
  `ROOT / "vendor/tbc-new-fork"` and **skip cleanly at exit 0 when it is
  absent** — moving it turns six live gates into silent no-ops. See
  `AUDIT-wsl-feasibility.md`.
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
| `EXEC-status-*.md` | executor reports with deviation ledgers |
| `research/R1`–`R5` | the measurements taken before anything moved |

Also: `docs/reviews/feat-wowsims-reforge-catchup.md` (the three-axis pre-merge
review), `docs/adr/0030-*.md` (the pin decision).
