# Pre-merge review — feat/desktop-transport-gate

Reviewed range: `654a53b648fc6866cf95d6a1003d88d4aaa55a96..44e2aac6d3e49e56ae3929f9a8fb4aca180e406a`

Three axes, each fresh-context on the review lane (Opus, effort medium). The
load-bearing new code is `scripts/check_desktop_tab.py` (the gate) and
`scripts/dev-tab.ps1`; the CDP harness `run-tab-cdp.mjs` and the `data-runner`
tab edit live in the fork repo at commit `eb040855c` (out of the core diff, so
the adversarial and spec axes were pointed at it explicitly).

## Adversarial

The gate is well-defended against the fooling paths the brief named; most are
genuinely closed (the worker-attach race is closed by `waitForDebuggerOnStart`,
`refuse_old_node` fails closed on a parse error, N1/N2 exercise real WASM and a
forced fallback and are refused for the right reasons, `dev-tab.ps1 -Desktop`
passes no `--usefs`). One material silent-failure mode survived.

**M1 (material) — the gate judged a stale readback when the harness crashed
before writing.** `check_desktop_tab.py` `run_harness` called
`subprocess.run(args, check=False)` and discarded the harness's exit code, then
checked only `out_path.is_file()`. The `--out` paths are two fixed gitignored
files (`.scratch/desktop-gate/last-run.json`, `last-run-fallback.json`) that
persist across invocations, and the harness writes `--out` only on a clean
finish. So a harness crash after one green run (Chrome launch fail, CDP timeout,
an unknown-arg throw) left the prior passing JSON on disk and the gate read _that_
and reported a false pass — the "an exit code is not evidence" trap (AGENTS.md),
inverted. Confirmed by reading lines 205–209 (no unlink, no returncode check) and
`ls .scratch/desktop-gate/` (both files present from a prior run).

**m1 (minor) — one-shot force-fallback misfire** is caught by the
`forceFallbackRemaining == 0` assertion plus the N2/twin `raidSimAsync >= 1`
predicate; residual, not a live defect.

**m2 (minor) — T2's top-8 coverage gap is disclosed, not over-claimed.** The gate
prints "rows 1..8 … covered by T3 only". Honest.

## Domain

No blocking findings. Statistics and baselines are sound and sourced, not
remembered.

- The SE/cutoff numbers check against committed sources: `docs/five-seed-spread.json`
  gives ret `meanReportedSe 1.6781`, `recommendedCutoff.absDps 3.4`
  (`max(3.0, 2×1.678)`); the gate's T4 = 3.4 is that bar verbatim, and
  K = 5 × √2 × 1.678 ≈ 12.0 uses the same paired-fold √2 factor `cutoff.ts` uses.
  The gate records the empirical max/median beside K rather than trusting the
  constant — the correct way to hold an unmeasured bound. Not numerology.
- Ret P5 baseline ~2072 WASM is independently corroborated: Chunk-1's committed
  readback recorded 2071.9 for the same WASM run; the gate's 2072.2 matches to
  0.3 DPS. 617 candidates = the committed ret-p5 universe; 601 rows / 33–36 above
  cutoff is internally consistent.

**D-M1 (material) — the 159 DPS Go-native vs WASM baseline gap.** A 7.7% baseline
difference on the loop route (no screening) between two compiles of one Go source
is large. The "cross-compilation artifact" disposition is defensible (it is not
seed choice; the desktop engine is internally reproducible at 1.8 DPS old-vs-tip;
WASM is the corroborated side), but the "two numerically distinct engines" claim
is a hypothesis, not a measured fact — the brief's DoD #4 (parity across
transports) was written expecting agreement and is not met. Settle with one
fixed-gear, fixed-seed native-vs-WASM sim. Not a blocker; the load-bearing check
was correctly re-scoped to same-transport (`baselineDpsDiff 0.0`). → ticket 398.

**D-m1 (minor) — the 2.05× desktop slowdown** is a plausible domain outcome
(the Go bulk path runs multi-stage convergence per chunk), not a red flag; the
DPS numbers are not wrong because the run was slow. Flagged for a ticket. → 397.

Out of contact with this diff: WCL-side facts (no gear-reading or spec code
changed), the feral cutoff (ret-only gate), the D7 CRLF `verify` failure
(pre-existing, ticket 283/399 — **not** 211; see the round-2 correction below).

## Standards

**No hard violations.** Both scripts obey the repo's rules.

- Comment policy (why-not-what): the `noqa` markers, the `fnm exec` note, the
  make/POSIX-tools PATH note, the "deliberately without usefs" note, and the
  tolerance-constant rationales all record non-obvious _why_. No what-restating
  comments.
- Durable-claims: every measured constant (`EXPECTED_ELIGIBLE`, `FULL_ROWS`,
  the tolerances) names the command/date/fork sha it was measured on and says to
  re-measure on universe regen. The lock's `pushed:false` + appended `_comment`
  matches `upstream-catch-up.md` § 5/7. Regen moved only `forkCommit`.
- CLI-environment: paths resolved from `$PSScriptRoot` / `Path(__file__)`, no
  cd-then-command chains, `git -C`-style directory flags.

**Judgement calls (baseline smells), neither worth blocking:** a `(spec, phase)`
data clump across three parallel nested dicts (`EXPECTED_ELIGIBLE`/`UNIVERSE_CAP`/
`FULL_ROWS`), and the flat ~18-key `compare_readbacks` result dict (a
`CompareResult` type would document the contract). Both defensible in a
single-caller gate script.

## Spec

The load-bearing deliverable (`check_desktop_tab.py`) is faithful to the plan:
all four modes present, the fork edit is the exact two-statement-plus-comment
shape step 3 specified, the gate's (a)–(h)/N1/N2 match step 7's pass/fail pattern,
and every Paths-manifest file is present with no path outside it. Deviations
D1/D3/D4/D6 each depart from literal plan text but preserve the acceptance's
intent (verified in the Gate C dispositions). Two spec obligations remain open:

**S1 — DoD #9 / step 12 acceptance ("`pnpm verify` rc 0 on the tip") is not
met.** `fork-universes:check` is red. Pre-existing CRLF/LF drift (D7),
commit-independent, ticket 283/399's domain (**not** 211 — see the round-2
correction below) — surfaced, not hidden. Against the
literal spec it is a partial; the honest call is the owner's, not a silent pass.

**S2 — the Q2/C8 ticket the plan's own text says is owed was unfiled.** Plan
step 5 Q2(b): screening-not-a-speed-win "is a finding against parent C8, not a
shrug". Filed as part of this review. → ticket 397.

## Summary

Four axes, one material adversarial finding (M1, fixed in-branch), one material
domain finding (D-M1, ticketed), two spec obligations (S1 inherited/owner's call,
S2 ticketed), the rest minor or clean. No axis blocks the branch on its own
terms; the one genuine gate defect (M1) is fixed and the gate re-verified. The
tip's `pnpm verify` is red on the single inherited `fork-universes:check` gate
(ticket 283/399, **not** 211 — see the round-2 correction below) — a conscious
merge decision, not a defect of this branch. Round 2 note: that gate is now
green; ticket 399 fixed the cause and S1 is retired.

## Disposition

| ID   | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                              |
| ---- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1   | Adversarial | fixed       | `check_desktop_tab.py` `run_harness`: unlink the stale `--out` before running, and fail on a non-zero harness exit. Gate re-run green after the fix.                                                                                       |
| m1   | Adversarial | wontfix     | Misfire already caught by `forceFallbackRemaining == 0` + N2 predicate; residual, not a live defect.                                                                                                                                       |
| m2   | Adversarial | wontfix     | Top-8 coverage gap is disclosed in the gate's own output; honest, not over-claimed.                                                                                                                                                        |
| D-M1 | Domain      | defer       | `.scratch/carry-forward/issues/398-go-native-vs-wasm-baseline-gap.md` — 159 DPS engine gap; disposition defensible, parity claim untested; settle with a fixed-gear native-vs-WASM sim.                                                    |
| D-m1 | Domain      | defer       | `.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md` — 2.05× slowdown.                                                                                                                                               |
| STD1 | Standards   | wontfix     | `(spec, phase)` data clump; defensible in a single-caller script.                                                                                                                                                                          |
| STD2 | Standards   | wontfix     | `compare_readbacks` result-dict data clump; defensible.                                                                                                                                                                                    |
| S1   | Spec        | defer       | Red `pnpm verify` on `fork-universes:check` — pre-existing CRLF drift, ticket 283/399's domain (**not** 211, which is closed), out of this chunk's manifest. **Retired in round 2:** ticket 399 fixed the cause and `pnpm verify` is rc=0. |

---

# Round 2

Reviewed range: `44e2aac6d3e49e56ae3929f9a8fb4aca180e406a..eb360229dd68e652e7f3bc43bd81031ac5d1f161`

Four axes, each fresh-context on the review lane (Opus, effort `medium`). `codex`
and `cursor-agent` are both absent from `PATH`, so dispatch fell to option 2 of
the skill's order — parallel subagents, not a cross-vendor reviewer.

This round chains from round 1's recorded `<through-sha>`, so it covers the five
commits that landed after round 1 was dispatched: `3cfc0b62` (round 1's own M1
fix and review file), `40d19e27`, `9a7e1fec`, and the ticket-399 work in
`871bb748` and `eb360229`. The 19k-line evidence JSON sits in round 1's window
and is deliberately not re-reviewed.

**Caveat on the spec axis, stated up front.** The bulk of this range is ticket
399, whose implementation and whose ticket text were written by the same agent
in one session. The spec reviewer was pointed at the ticket as first committed
(`40d19e27`) rather than its back-written Resolution, and it returned a framing
correction worth recording: the ticket does not predate the work at all — it was
created _inside_ this range. So "faithful to spec" is a weaker instrument here
than usual, and the adversarial axis carried more of the load.

## Adversarial

Two findings, neither a silent-wrong-number risk. No correctness bug, no
unhandled error kind, no test theatre — the range ships no tests and no code
under `packages/core/src`, both listed as unexamined with that reason.

**A1 (material) — a missed committed-artifact write site.**
`scripts/sync_atlasloot.py:122` wrote the tracked `data/atlasloot.lock.json` via
`open(LOCKFILE, "w", encoding="utf-8")` with no `newline=`. Its direct twin in
`sync_wowsims.py` (lines 493, 710, 736) passes `newline=""`, and that file's own
comment cites `393ab4f` fixing "the AtlasLoot artifacts" — so the convention
existed and this site sat outside it. Ticket 399's sweep matched on `write_text(`
and missed it because this is an `open()` call, which makes the "13 sites across
11 scripts" scope claim one short of the rule it states. Latent rather than live
only because the core `.gitattributes` catch-all normalises on staging; the
worktree would still alternate, which is precisely the drift class the ticket was
filed about.

**A2 (minor) — the recorded rationale was false.** The comment added at
`generate_json_literal_types.py:226-228` claimed a CRLF write "would make
`--check` red on every run after a regen" because `have == want` compares against
the file on disk. It would not: `have` comes from `out.read_text(...)`, and
Python's universal-newlines translation converts CRLF to `\n` on read, so the
comparison was already newline-insensitive. The reviewer proved it by writing
`b'a\r\nb\r\n'` and reading back `'a\nb\n'`. The change is still worth keeping —
it stops the worktree alternating for the other consumers — but a comment that
states a false mechanism is worse than none under this repo's comment policy.

**A3 (claim integrity, no defect) — "nothing but line endings changed" holds.**
Verified independently rather than accepted: `git diff 44e2aac6..HEAD --stat --
data/universes` is empty, and a byte scan of all 88 files reports 0 CRLF / 88 LF.
The reviewer also flagged a method trap for anyone re-checking — `grep -c $'\r'`
collapses to an empty pattern in bash and reports bogus nonzero counts; count
bytes in Python instead.

The round-1 **M1** fix was re-verified as real and complete, and the fork-side
`.gitattributes` was confirmed live (`check-attr` returns `text: set` / `eol: lf`
against the fork's own git repo).

## Domain

**No domain contradictions.** The range is line-ending plumbing plus
documentation and contradicts nothing in `docs/stage0-findings.md` or
`docs/verification-log.md`. No WCL field usage is introduced anywhere in it.

The two domain-adjacent worries both came back clean, each settled by a command
rather than by accepting the claim:

- **Pool membership cannot have moved.** No `data/universes/` file is in this
  range at all — zero of 23 changed files. The reviewer re-ran
  `python scripts/assemble_universe.py --max-phase 2 --spec ret` and found the
  result byte-identical to `HEAD`, which also rules out drift in the inputs
  (db.json, AtlasLoot, rep tables, curated set phases) that a "formatting only"
  change could otherwise have hidden.
- **221/451 is correct and is not new here.** `data/sim-implemented-effects.json`
  already carried `implementedEffectItemIdsCount: 221` at `44e2aac6`; only the
  embedded `forkCommit` moved. The `218` in the fork lock's `_comment` was wrong
  when written, and ticket 399 records that rather than rewriting the lock's
  history — the right call.

**D1 (minor) — a stale ticket attribution in this file.** Round 1 blamed the
recurring red gate on ticket 211 in four places. `211` is `Status: closed`
(2026-08-23); it _built_ the gate and does not own the drift. The owner is `283`,
as ticket 399 states. Found independently by the domain and standards axes from
different directions — domain by reading 211's status, standards by noticing that
later commits in the range correct the pointer while this file keeps it.

## Standards

**No hard violations.**

The 13 near-identical `newline=` comments were held against the comment policy
and pass: the fix repeats but the rationale does not. Each names the specific
gate or comparison that site feeds — `assemble_universe.py` names the
byte-comparing fork gate, `generate_json_literal_types.py` names its own
self-comparison, `generate_sim_implemented_effects.py` names the full-file diff
against HEAD — and each ends in the ticket pointer the policy explicitly
endorses. The paired sites say "here and on the below" once rather than
repeating, so 13 call sites carry 11 comments. Not a Duplicated Code smell
either: the duplication is a keyword argument the language requires per call,
with no shared shape to extract short of a wrapper that would obscure
`write_text`.

Durable claims hold across the commit messages, the lock `_comment`, ticket 399's
Resolution, and the gitignored fork `PROVENANCE.md`; claims point at re-runnable
commands and nothing asserts an environment the author did not observe. Two
self-corrections were checked specifically and judged correct: the stale
"218/451" figure and the "14 scripts" grep are both _recorded_ rather than
quietly rewritten. The exclusion list was verified independently —
`check_sim_implemented_effects_classifier.py:100`, the one bare `write_text` not
in the changed set, is indeed a `TemporaryDirectory` write.

One mild Divergent Change noted and dismissed: `check_desktop_tab.py` takes both
the stale-readback fix and a `newline` change in this range, but across two
commits with distinct rationales — correctly split.

## Spec

**Faithful to ticket 399 as originally filed.** Both claimed options landed,
option 3 was rejected on the ticket's own stated grounds, and the ticket's
"consider scoping it to `upgrades/data/`" note was honoured — the
`.gitattributes` sits at `ui/core/components/individual_sim_ui/upgrades/data/`,
not the fork root.

Option 2's coverage was verified by a paren-aware scan rather than a line grep
(a plain `grep -v newline=` reports 17 false positives, because the fixed calls
are now multi-line). Only five `write_text` calls still lack `newline=`, and all
five are exactly the ones the Resolution names as deliberate.

**Not scope creep.** The brief asked whether the eight scripts outside the
fork-universes path were creep. They are not: option 2 is defined class-wide in
the ticket — _"Fixes the class, including ticket 167's sibling gate."_ Editing
only `assemble_universe.py` would have been the partial. Leaving the five CRLF
files and the ~294 `.scratch/` files is likewise consistent; the ticket never
asks for repo-wide renormalization.

**S2 (minor) — Option 1's claims are not re-runnable from a fresh clone.** The
`.gitattributes` and the `--renormalize` live in `vendor/tbc-new-fork`, which is
gitignored and outside the diff. The ticket's verify block offered only
`git -C vendor/tbc-new-fork check-attr …`, which passes on this machine and
cannot run anywhere else. Per the durable-claims rule that needs the sync/clone
command and how to verify.

**Round 1's S1 is retired.** `sync_fork_universes.py --check` is rc=0 and full
`pnpm verify` is rc=0.

The **M1** fix (`3cfc0b62`) closes the mode it describes and adds none: the
`unlink(missing_ok=True)` precedes the run so a crash cannot leave a readable
stale file regardless of exit code, the non-zero-exit `SystemExit(2)` is
independently sufficient, `missing_ok=True` makes the first run safe, and the
`is_file()` check is retained for a harness that exits 0 without writing.

## Summary

Four axes, four findings, all fixed in-branch; nothing deferred and no new ticket
filed. The one material finding (A1) is a real gap in this branch's own work —
a committed lock file left outside the convention the branch was enforcing,
missed because the sweep matched `write_text(` and the site is an `open()` call.
A2 corrects a comment that stated a false mechanism. D1 corrects a stale ticket
pointer that two axes found independently. S2 adds the clone command that makes
Option 1's claim checkable by someone other than this machine.

Two things a reader should carry forward. The fork half of ticket 399 lives in a
commit that is `pushed: false` and three commits ahead of
`origin/feat/upgrades-tab`, so it exists on one disk and a fresh clone cannot
verify it — disclosed accurately in the lock and accepted by ADR-0030
Consequence 4, but it means A1's fix and the `.gitattributes` are confirmable
only here until the fork is pushed. And the spec axis is structurally weak on
this range, because the ticket was written alongside the code rather than before
it.

## Disposition — round 2

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial | fixed       | `sync_atlasloot.py:122` now passes `newline=""`, matching the `sync_wowsims.py:493` twin; comment records that the ticket-399 sweep missed it because it matched `write_text(` and this is an `open()` call. **Not covered by a gate** — see the note below. |
| A2  | Adversarial | fixed       | Comment at `generate_json_literal_types.py:226` rewritten — `--check` was never at risk (`read_text` translates CRLF on read, reproduced locally); the pin exists for the other consumers of those files.                                                    |
| A3  | Adversarial | wontfix     | Not a defect: the "line endings only" claim verified under a byte-level check. The `grep -c $'\r'` method trap is recorded above for anyone re-checking.                                                                                                     |
| D1  | Domain      | fixed       | Four stale "ticket 211" cites in this file corrected to 283/399 (211 is closed and built the gate). Found independently by the domain and standards axes.                                                                                                    |
| S1  | Spec        | fixed       | Round 1's deferred S1 retired: `fork-universes:check` and full `pnpm verify` are both rc=0.                                                                                                                                                                  |
| S2  | Spec        | fixed       | Ticket 399's verify block now carries the clone-and-checkout commands, and states plainly that the pinned fork commit is unreachable from any remote until the fork is pushed.                                                                               |

**A1's fix is unproven by any gate, and this is untested.** `pnpm verify` runs
`sync:atlasloot:verify-local`, which dispatches to `do_verify_local()` and only
_reads_ the lock; the write site is in `do_update()`, reachable only via
`--update`, which fetches from the network. So verify shows the edit broke
nothing, not that the write path now emits LF. The evidence for the fix is that
it compiles, and that it now matches the convention its twin at
`sync_wowsims.py:493` has carried since `393ab4f`. Proving it needs a real
`python scripts/sync_atlasloot.py --update` run, which nothing in this branch
performed.
| S2 | Spec | fixed | Q2/C8 ticket owed by the plan's text — filed as `.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md`. |
