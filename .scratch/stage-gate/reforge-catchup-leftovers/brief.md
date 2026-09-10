# Brief — reforge catch-up leftovers

Branch `feat/reforge-catchup-leftovers`, based on `dev` @
`66ab791f3f6dbad133d264d400a0a24328e71e56`.

## Source, and how much to trust it

Two documents describe this work:

- `.scratch/handoffs/wowsims-reforge-catchup/HANDOFF-leftovers.md`
- `.scratch/handoffs/wowsims-reforge-catchup/AUDIT-open-tickets-tab-relevance.md`

Both were written by the agent whose own work produced these leftovers, and
the owner has asked that they be taken **with a grain of salt**. Treat them as
a map of where to look, never as a source of settled fact.

**Every file:line citation in those two documents is untrusted.** This is
measured, not suspected. Checking three of them from this session:

| Cited as | Actually |
| --- | --- |
| `rank.ts:1100` caps the candidate pool | The cap is at `rank.ts:1180`; :1100 is set-bonus commentary |
| `upgrades_tab.tsx:897` / `:1183` in `upgrades/` | The file is one level up, at `individual_sim_ui/upgrades_tab.tsx` |
| `candidate-order.ts:36-67` orders the pool | `orderCandidatesByEp` is at `candidate-order.ts:54` |

The *findings* in those documents have so far survived checking; their
*locations* have not. **Locate every symbol by grep, never by the line number
you were given.** The same applies to the tickets, whose own text says line
numbers in both engine copies drift.

## What exists when this is done

Four jobs. Jobs 1–3 are investigations that may or may not end in code; job 4
is filing. None of them is "apply a known fix" — if you find yourself writing
a patch before a measurement, re-read the ticket.

### Job 1 — does the merged tab build and run?

The engine pin moved onto a commit of upstream's `feature/backend-reforge` and
the fork clone was merged to it. What has been verified is only: `tsc --noEmit`
in the fork, a DOM layout gate, a browser load of a **pre-existing** `dist/`,
and the fork's Go suite. What has **never run** against the merged tree is the
production build (`make host` → `vite build`), and nobody has exercised the tab
interactively — clicked Run, watched a sim finish, read the ranked rows.

This is first because it is cheap and it gates the other three: if the tab does
not build, every question about ranking correctness is moot.

Report what you see. **A failure here is a finding about the merge, not a chore
— do not fix the tab to make it pass.**

### Job 2 — ticket 350, two-hander swap leaves the worn off-hand

`.scratch/carry-forward/issues/350-two-hander-swap-leaves-worn-offhand.md`

A two-handed candidate is priced against a gear set that keeps the worn
off-hand item — gear the game cannot equip.

**Read the ticket's own "What is NOT claimed" before planning any fix.** It
states plainly that nothing has measured what the fork engine *does* with a
2H+off-hand request: it may silently drop the off hand, in which case today's
numbers are already right by accident. The ticket's step 1 is a single composed
request, run once. That measurement decides which of its two candidate fixes is
correct, and it has not been done.

Confirmed from this session: the guard exists in both engine copies with
different spellings — `packages/core/src/rank.ts:920` inlines `continue`, the
fork's `upgrades/engine/rank.ts:791` returns `{ kind: "skip" }` from
`attemptEligibility`. The files differ by 72 lines overall (2164 vs 2092). **One
patch will not mechanically fit both.**

### Job 3 — ticket 351, weapon imbue does not follow the candidate

`.scratch/carry-forward/issues/351-weapon-imbue-does-not-follow-candidate-weapon.md`

**This ticket names its own precondition and the handoff's one-line summary
loses it.** The ticket establishes that mirroring upstream naively would
*introduce* a sharp-vs-blunt asymmetry rather than remove one, because
`sim/druid/forms.go` hardcodes one stone id. Its step 1 is a reading question —
do a weightstone and a sharpstone give the same melee bonus in TBC — and that
answer decides whether the defect is ours or the fork engine's.

Settle that first. Do not write plumbing before it is answered.

One item in this ticket is unconditional and independent of the above: the
`disclosure.ts` temporary-enchant note over-asserts either way and should be
corrected regardless of which position is chosen.

### Job 4 — two findings that were never filed

File as tickets. Next free number is **362** — verified this session from both
authorities that ticket 352 says to require: `NEXT` reads 362 and no `362-*`
file exists in `.scratch/carry-forward/issues/`. Re-check both before writing,
then write the next free number back to `NEXT`.

1. **No build/runtime evidence for the tab after the merge.** Job 1 answers
   this. If job 1 passes, file it as a closed ticket recording the evidence. If
   job 1 fails, file it as a live defect with what you saw.

2. **The candidate cap can silently drop a real item.** Confirmed live this
   session by symbol: `upgrades_tab.tsx:399` holds `private candidateCap = 0`
   with `readCandidateCap()` at click time, and the engine applies
   `input.candidateCap ?? ordered.length` over a pool ordered by
   `orderCandidatesByEp`. Both defaults are safe today (0 = no cap; the CLI
   sets none), so this is an **exposure, not a live wrong answer** — a user who
   types a cap gets a shortlist ordered by stale Phase-1 feral EP weights
   against a Phase-3 universe, with no warning. Ticket 358 files the docs half;
   nothing files the exposure. File it and say plainly that it is an exposure.

## Open questions the plan must answer

Per stage-gate step 1, each needs a candidate approach that is not the same
approach with different constants, the result that would make it win written
down *before* measuring, and a measurement — or the reason the committed
fixtures cannot measure it.

**Q1. What does the fork engine do with a 2H + off-hand equipment spec?**
Candidates: it silently drops the off hand / it counts both / it rejects the
set. Ticket 350's two fixes (skip the attempt vs clear the slot) are selected
by this answer, and the ticket records a codebase position at
`packages/core/src/rank.ts` (grep the two-item-swap comment above the off-hand
guard) that argues against clearing. Say which result picks which fix before
running it.

**Q2. Do a weightstone and a sharpstone give the same melee bonus in TBC?**
If yes, `forms.go`'s id-equality check is a fork-engine bug and our missing
adjustment is cosmetic. If no, the pinned stone is a preset question. This is a
reading task, not a sim run.

**Q3. Does the merged tab build and run?** Binary. The measurement is job 1.

## Constraints

- **Shells.** Bash and PowerShell share no state; each tool call is a fresh
  shell. Run `pnpm` from **Bash** (PowerShell defaults to Node 20 and dies with
  `ERR_UNKNOWN_BUILTIN_MODULE node:sqlite`). Git Bash prints an `fnm env` error
  on stderr that **breaks `&&` chains and heredocs** — this session already lost
  a `cd X && git checkout` to it. Run git standalone with `git -C`, use
  `pnpm -C` / `npm --prefix`, and write real script files instead of heredocs.
- **`make`.** Not on either PATH. Use GNU Make **4.4.1** at
  `C:\Users\dgree\AppData\Local\Microsoft\WinGet\Packages\ezwinports.make_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\make.exe`
  (verified 4.4.1 this session). The GnuWin32 3.81 at `C:\Program Files (x86)\GnuWin32\bin`
  **silently resolves empty file lists** and "succeeds" having built nothing.
  4.4.1 resolves 506/176/89 files for `UI_SRC`/`TS_CORE_SRC`/`ASSETS_INPUT`; zeros
  mean the wrong make.
- **Exit codes lie here.** A pipe reports the *last* command's status, so
  `make … 2>&1 | tail` returns `tail`'s 0 and hides `make: command not found`.
  This produced a false "build succeeded" report during the work that generated
  these leftovers. Append `; echo "rc=${PIPESTATUS[0]}"` to the same command, or
  redirect to a file and `tail` it separately. **Read the artifact, not the
  status** — check `dist/tbc/` timestamps and `lib.wasm.gz`, not the task state.
  `make host` hands off to `air` on :8081 and does not exit, so it looks like it
  is still running when the build is done.
- **Ported engine files.** Any edit under the fork's `upgrades/engine/`,
  including comment-only, requires the full cycle in
  `docs/agents/known-traps.md` § "Before editing a ported engine file" —
  E-W3 green first, then `PROVENANCE.md` sha, fork commit, re-pin, `pnpm verify`.
- **Generated/scripted writes.** Use the Edit tool, not `sed -i`; check
  `git diff --stat` for a whole-file line-ending flip before committing.
- **Commits.** `git add <paths>` does not scope a commit — pre-commit runs
  `lint-staged` against `*`. `git status` must be clean of work you did not do
  before each commit. Commit per green slice.

## Out of scope

- **Do not re-measure the feral rotation.** The "−18 DPS feral regression" is
  folklore: superseded and reversed in sign on 2026-08-21.
  `docs/verification-log.md:1654-1669` measures the rotation main effect at
  **+42.91 DPS in favour of the new rotation**. Tickets 250 and 353 are closed.
- **Do not treat the layout gate's "SKIPPED — tab layout source unchanged" as a
  failure.** It ran, passed, and advanced its own baseline.
- **Do not move `vendor/tbc-new-fork` into WSL.** Measured at 0.4s from Windows
  vs 30.1s over `/mnt/c`, and all six fork-reading gates in `pnpm verify`
  resolve a hard-coded `ROOT / "vendor/tbc-new-fork"` and **skip cleanly at exit
  0 when it is absent** — moving it turns six live gates into silent no-ops.
- **Do not grow `known-traps.md`** to fix the environment traps. The standing
  recommendation is a small manual `pnpm doctor`; platform facts stay as prose.
- **Ticket 355 (push or archive the fork branch) is not this work.** It is the
  largest standing risk in the project — the fork branch `feat/upgrades-tab`
  exists on exactly one machine, carrying a merge commit and a conflict
  resolution that exist nowhere else — but it is the owner's call, not a code
  fix. Leave it open and do not act on it.
- Do not merge to `dev`. Do not run `pre-merge-review`; the orchestrator owns
  the gates.

## Done when

- Job 1 has a stated, evidenced answer: the tab builds, or it does not, with
  what was observed either way.
- Q1 and Q2 are answered and written down, each with the measurement or the
  reason the fixtures cannot measure it.
- Tickets 350 and 351 have their decisions recorded with reasons — code only if
  the measurement supports it.
- Job 4's two tickets exist, numbered without collision, with `NEXT` advanced.
- `pnpm verify` green on the branch tip.
