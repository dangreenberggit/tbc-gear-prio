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
(the Go bulk path runs a costly refinement pass per chunk), not a red flag; the
DPS numbers are not wrong because the run was slow. Flagged for a ticket. → 397.
Mechanism corrected 2026-09-15: the driver is the Go **finalist** stage, 72.9% of
wall clock, which never converges because our client passes the full 25-candidate
chunk as `topResults`. The culling pipeline named here is skipped at 25. Fix is
ticket 403.

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

| ID   | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1   | Adversarial | fixed       | `check_desktop_tab.py` `run_harness`: unlink the stale `--out` before running, and fail on a non-zero harness exit. Gate re-run green after the fix.                                                                                                                                                                                                                                                                  |
| m1   | Adversarial | wontfix     | Misfire already caught by `forceFallbackRemaining == 0` + N2 predicate; residual, not a live defect.                                                                                                                                                                                                                                                                                                                  |
| m2   | Adversarial | wontfix     | Top-8 coverage gap is disclosed in the gate's own output; honest, not over-claimed.                                                                                                                                                                                                                                                                                                                                   |
| D-M1 | Domain      | defer       | `.scratch/carry-forward/issues/398-go-native-vs-wasm-baseline-gap.md` — 159 DPS engine gap; disposition defensible, parity claim untested; settle with a fixed-gear native-vs-WASM sim.                                                                                                                                                                                                                               |
| D-m1 | Domain      | defer       | `.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md` — 2.05× slowdown.                                                                                                                                                                                                                                                                                                                          |
| STD1 | Standards   | wontfix     | `(spec, phase)` data clump; defensible in a single-caller script.                                                                                                                                                                                                                                                                                                                                                     |
| STD2 | Standards   | wontfix     | `compare_readbacks` result-dict data clump; defensible.                                                                                                                                                                                                                                                                                                                                                               |
| S1   | Spec        | fixed       | Round 1 recorded this as `defer` — red `pnpm verify` on `fork-universes:check`, pre-existing CRLF drift, ticket 283/399's domain (**not** 211, which is closed), out of that chunk's manifest, owner's merge call. **Retired in round 2:** ticket 399 fixed the cause, and `fork-universes:check` and full `pnpm verify` are both rc=0. Re-dispositioned to `fixed` because the deferral no longer describes reality. |

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

---

# Round 3 — ticket 403, the Track C loop switch

Reviewed range: `eb360229dd68e652e7f3bc43bd81031ac5d1f161..ee31569d1b2ecfc8178e0ccbf9412111e2842476`

20 commits, 67 files, +9697/-226. Fork side: `cfbd7fced7a3c7f94feb68071639eaa09650f94b`
(2 files), which is not in the core diff and was reviewed separately.

Dispatched 2026-09-16 as three parallel fresh-context axes on the review lane
(Claude Code, Opus at effort medium). No axis had access to the session that
wrote the code. Each was told it writes nothing.

## Adversarial

Three material findings, one minor. All three materials are in tooling added or
changed on this branch, not in the Track C change itself.

**A4 (material) — `--full --update-golden` writes a golden nothing can read.**
`check_desktop_tab.py:640` sets `candidates = 0` under `--full`; `:657` writes
`golden_path(...)` which interpolates the cap, producing
`golden-ret-p5-cap0.json`; but `:660` makes `--full` skip check (h)
unconditionally, so that file is never read. The flags are not mutually
exclusive. Failure: after a fork re-pin a developer runs the combination, sees
"golden written", commits it, and believes the gate is refreshed — while the
real cap-40 golden stays stale and enforced. That is the reflexive-regeneration
failure the golden's own `_note` and README warn about, reachable through a flag
combination nobody blocked.

**A5 (material) — the verify gate counter miscounts in both directions.**
Sharp because ticket 400 exists to make this count trustworthy. Three defects:
`run_verify.mjs:139-156` credits a step to `stepsRan` only when no skip line is
found, but `check_equip_eligibility.py` prints a skip line _alongside real work_,
so a step that worked scores as a pure skip; `verify_summary.mjs:76` counts skip
_lines_ not steps, and `sync_fork_universes.py` emits two (verified by
`grep -c`); and the matcher is substring-based, so the prose sentence
"nothing was skipped -- all gates ran" is extracted as a skip reason — the
reviewer reproduced that false positive by running the extractor.

**A6 (material) — a fixture version guard became tautological.**
`bulk-screen-http-fixture.test.ts:62` derives `RECORDED_SIM_VERSION` from
`CURRENT_API_VERSION`, `:128` stamps the recordings with it, and `:172` asserts
the two are equal — a value compared to itself. The header claims the derivation
makes a proto bump fail the test; the opposite now holds, and the committed DPS
numbers (measured at proto 15) would silently become numbers from a different
engine version. The change did correctly kill an older `api-v14` collision, so it
must not be reverted wholesale.

**A7 (minor) — `run_verify.mjs:132-137` reports success after failing to read
vitest's report**, carrying on with `{ran: 0, skipped: 0}` and exiting 0. The
file's own header records that this exact failure already happened once and was
caught only by grepping a log. The catch block preserves the property rather
than fixing it.

**Cleared after investigation**, each worth recording because they were the
things most likely to be wrong: the golden gate is real coverage, not theatre —
exact `rows` comparison catches rank order, DPS, slot, source and cutoff status,
and the portability argument holds because the harness reads _rendered_ text at
0.1 DPS granularity; no dangling `--force-fallback` reference survives in the
core (it remains a working flag in the fork harness, which is correct); the fork
change is sound — `simRunnerPromise ??= (async () => this.sim)()` still memoises,
and the `data-runner` attribute degrades honestly to always `WasmSimRunner`,
which the gate's own docstring states.

The axis also corrected the dispatch brief: the six bulk vitest files are in
`packages/core/test/`, not the fork, and they exercise the engine seam, which is
still live code. Dead at the tab, not dead at the engine — consistent with 406.

## Domain

**Clean. No blocking findings.** All 40 golden rows cross-checked
programmatically against `data/universes/ret-p5.json`: **40/40 slot assignments
agree**, and drop sources read correctly for TBC (Shard of Contempt from Heroic
Magisters' Terrace, Blackened Naaru Sliver from M'uru, Berserker's Call from
Zul'jin, Madness of the Betrayer from the Illidari Council). The shape is right
for phase-5 ret: Sunwell tier and Sunwell drops at the top, Karazhan/T4-era
leftovers deep in the negatives. Nothing absurdly ranked, no known-BiS item
conspicuously missing.

**D2 (minor, resolved in the reviewer's own analysis) — the 3.3 DPS SE does not
undermine the 3.4 DPS cutoff.** This looked like the sharp problem and is not.
`cutoff.ts` records that 3.4 was itself derived as `max(3.0, 2x mean reported SE
1.678)`, and that 1.678 is an _independent_ SE — so the bar was always calibrated
against loop-precision values. The branch restores the precision regime the
cutoff was designed for rather than undercutting it. The pre-fix 0.65 DPS SE was,
as the plan puts it, a property nobody asked for and the web tab never had.

**D3 (minor) — ticket 404's concern is instantiated in this golden, at Neck.**
Hard Khorium Choker (20.9) and Clutch of Demise (17.3) are global ranks 9 and 10,
both outside `PAIRED_REPLICATE_TOP_N = 8`, so both carry the unreplicated
~1.8-2.3 DPS SE. A 3.6 DPS gap against a combined ~2.6 DPS SE is about 1.4 sigma
— not a confident ordering. Player stakes are modest (one is crafted, one is a
Brutallus drop, so they are not competing for the same acquisition effort), and
the same exposure existed on the web path all along. Not a reason to hold the
branch; it is 404's scope, now with a concrete instance.

**D4 (material, and the most useful thing this round produced) — the 398
baseline gap is not a gear, buff or consumable difference.** Both readbacks
capture the rendered character sheet, and the two runs differing by 159.3 DPS
report **identical stats**: AP 3895, Melee Crit 286 (51.65%), Melee Hit 66
(10.19%), Expertise 73 (4.50%), Strength 632, Agility 551, Stamina 766. Character
stats are downstream of gear, gems, enchants, raid buffs and consumables, so that
whole family is eliminated at once. What remains must be invisible on the sheet:
fight length (ret is cooldown- and mana-shaped, so duration moves DPS several
percent), target count or target armour, or encounter defaults. Seed noise alone
cannot account for it — 159.3 DPS is far outside a 3000-iteration run's ~3.3 DPS
SE. Appended to ticket 398; it narrows the search, it does not close it.

## Standards + Spec

**Spec: clean.** Every "Done when" clause of 403 verifies against the committed
artifacts, re-derived by the reviewer rather than accepted: finalist spend
removed (`c-cap40-desktop.json` `bulkSimAsync` 0, `elapsedS` 19, against
`prefix-cap40-screened.json` at 3 and 263); ranking unchanged by byte-equality
rather than a noise bound; capped runs only; lever 1 taken (fork commit is
exactly two TypeScript files, no Go, no proto); the cap-150 determinism that
licenses the zero-tolerance gate holds (134 rows, 40 s, equal twice); and the
golden's `forkCommit` is the corrected post-fix sha. `ls-remote` confirms the
fork branch is still at `e94d927af`, so `pushed: false` is accurate.

No scope creep in the Track C change. Deviation #3 (also cutting the
`makeSimRunner` field comment) is outside the plan's literal instruction but
required — leaving it would have left a comment describing a probe that no longer
exists, which is exactly what ticket 405 was filed about.

**Standards: five minor findings, no material or blocking.**

- **S3** — `check_desktop_tab.py:98-106` stacks two near-identical comment
  paragraphs above `EXPECTED_ELIGIBLE`. A comment restating another comment is
  worse than one restating code. Keep the second (it carries the date and path).
- **S4** — `check_desktop_tab.py:110-113` asserts a cause ("16 screened-out
  candidates do not land as rows") measured on the _screened_ path. Since 403
  nothing screens, so the stated mechanism no longer applies to the path the gate
  exercises. Not cheaply re-measurable (constraint 5), so the fix is to label it
  measured pre-403 and untested since.
- **S5** — `assert_gate(rb, candidates, spec, phase)` at `:531` never reads
  `candidates`; (e) derives everything from `rb["candidatesRequested"]`.
- **S6** — three commit subjects exceed 50 characters (`3cfc0b62` at 63,
  `d56aaec3` 56, `10cfed48` 55), plus four at 51-54. Not fixable without a
  rewrite; noted for the next branch.
- **S7** — four commit bodies wrap at 73-80 rather than 72. Two others wrap
  correctly, so this is drift, not misunderstanding.

**Cleared:** the fork comment cut is compliant — 29 lines to 4 carrying a why
(263 s vs 19 s), a constraint (`topResults` must equal the chunk size) and a
pointer (403), with no replacement essay anywhere in the branch. The long module
headers on `run_verify.mjs` and `verify_summary.mjs` each state a non-obvious
why, which the policy explicitly allows. No `cd X && cmd` in any committed
script. No pipe masking an exit code; output bounded. Durable claims cite
re-runnable commands, and the full-pool projection is labelled **hypothesis,
untested** in all three places it appears. Ticket headers on 403-406 are valid.
No TypeScript type derived from a JSON import.

## Summary

The Track C change itself reviewed clean on all three axes. Its "Done when" is
met and independently re-derived; the domain output is correct item-by-item; the
golden gate is genuine coverage rather than theatre.

Every material finding is in **tooling**, not in the shipped behaviour change:
a flag combination that writes an unreadable golden (A4), a gate counter that is
neither an upper nor a lower bound (A5), and a version guard that can no longer
fail (A6). None blocks the merge — each is a defect in a check, and in every case
the check's _other_ paths still work. But A5 is pointed: ticket 400 exists to
make the ran/skipped count trustworthy, and it is not yet.

The round's most valuable output is not a defect at all. The domain axis
eliminated gear, buffs and consumables as explanations for the 398 baseline gap
by observing that the two disagreeing runs report identical character stats —
which no prior investigation had checked, and which narrows 398 substantially.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                         |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A4  | Adversarial | defer       | `.scratch/carry-forward/issues/407-full-update-golden-writes-an-unreadable-golden.md`                                                                                                                                 |
| A5  | Adversarial | defer       | `.scratch/carry-forward/issues/408-verify-gate-counter-miscounts.md` — sharp against ticket 400's purpose                                                                                                             |
| A6  | Adversarial | defer       | `.scratch/carry-forward/issues/409-fixture-version-guard-tautological.md` — a regression from ticket 390's own fix; do not revert wholesale, and do not "fix" the harmless sibling at `bulk-screen-driver.test.ts:35` |
| A7  | Adversarial | defer       | `.scratch/carry-forward/issues/408-verify-gate-counter-miscounts.md` -- folded in as a fourth defect; same file, same class (reporting success without evidence).                                                     |
| D2  | Domain      | wontfix     | Not a defect. `cutoff.ts` records 3.4 as 2x an _independent_ SE of 1.678, so the bar was always calibrated for loop precision. The branch restores that regime rather than undercutting it.                           |
| D3  | Domain      | defer       | `.scratch/carry-forward/issues/404-paired-replication-is-global-top-8-not-per-slot.md` -- the Neck instance (ranks 9/10, 3.6 DPS gap, ~1.4 sigma) is its first concrete case.                                         |
| D4  | Domain      | fixed       | Appended to `.scratch/carry-forward/issues/398-go-native-vs-wasm-baseline-gap.md` as a dated domain finding. 398 stays open; the cause is narrowed, not found.                                                        |
| S3  | Standards   | defer       | `.scratch/carry-forward/issues/407-full-update-golden-writes-an-unreadable-golden.md` -- folded in; same file, same pass.                                                                                             |
| S4  | Standards   | defer       | `.scratch/carry-forward/issues/407-full-update-golden-writes-an-unreadable-golden.md` -- folded in; the fix is a label, not a re-measurement.                                                                         |
| S5  | Standards   | defer       | `.scratch/carry-forward/issues/407-full-update-golden-writes-an-unreadable-golden.md` -- folded in.                                                                                                                   |
| S6  | Standards   | wontfix     | Historical commits; fixing needs a rewrite of landed history. Noted for the next branch.                                                                                                                              |
| S7  | Standards   | wontfix     | Same. Drift, not misunderstanding — two bodies on this branch wrap correctly.                                                                                                                                         |
