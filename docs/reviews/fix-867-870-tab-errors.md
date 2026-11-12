# Pre-merge review — fix/867-870-tab-errors

Diffed against: main `612140f8...c94b7f31` and fork
`a98a7a6fc...7d5bf8e69` (both bases already merged in). Upstream
footprint: `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 24606be6bae2601e5ca3985431c8c1da2ab422c0 HEAD`
prints only `6	0	ui/app/SimTabsSection.tsx`.

What the owner asked for: tickets 867–874, with 868, 873 and 874 reopened
on the owner's 2026-11-11 words, "generaly we should match what wowsims has
and not try to reinvent new things", and rebuilt to the design's case B
(owner: "tab eerror display: keep going"). The design is
`.scratch/agent-reports/2026-11-11-session-tab-error-display-design.md` in
the main checkout. The wowsims precedent it copies is the bulk sim's
`ui/features/bulk/model/run.ts:301-310` at `24606be6`: `console.error`,
then one error toast with the error's own message, none when the user
cancelled.

One fresh reviewer (Opus `general-task`) with no part in writing the
branch. It ran `pnpm verify` and two probe tests (written into the
worktree, run, and deleted; `git status --porcelain` empty after each).

## Summary

The toast, the one-sentence notes lines and the status line match the
design in every run state the brief names. One defect: when a set
version's gem repair fails during the default set screen, a notes line
gets an `error`. The run then shows an error toast reading "meta repair
exceeded step budget" even though no sim failed (A1). One edge the
implementer named holds up: on a spec page with no Upgrades data, such as
Protection Warrior, Run shows a toast in developer words beside the
status line's plain sentence (A2). `pnpm verify` is green.

## Verify

`node --version; pnpm -C /home/daniel/Code/lulz/tbc-wt/t867-870 verify`
in the foreground, rc taken with `echo "rc=$?"` straight after:

```
v22.23.2
gates: 1660 ran, 0 skipped
layout: skipped -- tab layout source unchanged since the last green run (digest a13b0d41b70c...). Nothing to re-test.
rc=0
```

## Findings

**A1 (medium): a failed gem repair on a set version shows an error toast
for a run with no failed call.**
`ui/features/upgrades/model/engine/rank.ts:1238-1241` (fork), inside
`versionGears`: a `MetaRepairError` from `rebuild` becomes
`out.push({ buildError: errorText(err) })`. A caller that does not pass
`onRepairFailed` cannot tell this from a request that failed to build. The
set screen's `requestsFor` (`rank.ts:2218-2222`) is one such caller. It
reaches `onRequestNotBuilt` (`set-screen.ts:1114-1118`), and that builds
`setScreenSkipSubstitution({ ..., error, notBuilt: true })` with `error`
set to the repair's message. `run_session.ts` then toasts the first line
with an `error`. This breaks the branch's own rule (slice 3,
`SET_BONUS_SKIP_REASONS.metaOff` doc comment, and the 852-R test comment
at `packages/core/test/fork-meta-repair.test.ts:2183-2185`: "A gem repair
that fails is no failed call, so ... `error` stays unset: the run's error
toast shows only a failed call's error").

Evidence: a probe added to a copy of `fork-meta-repair.test.ts` used
852-R's own setup (`repairFault.belowRemaining = -500`,
`brRun(1000, { setScreen })`) and asserted that no substitution has an
`error`. Set screen `off` passed. Set screen `on` failed with:

```
PROBE on [{"field":"Burning Rage set","detail":"The Burning Rage set was kept without the quick check that can skip it, because the check's sim could not be built.","error":"meta repair exceeded step budget"}]
```

The live run uses `setScreen: 'on'` (`ui/features/upgrades/model/run.ts:129`),
so this is the default path. In the same run, the 852-R line for the same
cause says "no gem swap could turn your meta gem on", so the list gives two
different reasons for one failed repair, and the toast shows the repair's
message as an error. 852-R did not catch it because it checks one line with
`toContainEqual`. The other callers that pass no `onRepairFailed` probably
do the same, but they were not probed (hypothesis, untested): the crossing
gate (`rank.ts:2728`), `stepGear` (`rank.ts:2981`, giving `rowsNotBuilt`),
the break split (`rank.ts:3241`) and the worn-1 pair (`rank.ts:3473`).

**A2 (low): a run on a spec page with no Upgrades data shows a toast in
developer words.** `model/run.ts:74-76` throws
`RankError('not-implemented', 'no Upgrades data for spec ' + Spec[...])`
for any spec missing from `SPEC_ID_BY_PROTO_SPEC` (`run.ts:44-56`). The
path can be reached: `ui/app/SimTabsSection.tsx:42,60` mounts the tab on
every page that is not `simDisabled`. Protection Warrior
(`ui/sim/player/specs/warrior.ts:64`), Protection Paladin (`paladin.ts:66`)
and Feral Bear (`druid.ts:109`) are `LaunchStatus.Alpha`, so their pages
are not `simDisabled`, and the Run button waits only for `ready`
(`RunSettingsPanel.tsx`). `run_session.ts` toasts every rejected run's
message unless the run was aborted. Evidence: a probe in a copy of
`run_session.test.ts` failed a run with that `RankError` and printed:

```
PROBE [[{"variant":"error","body":"no Upgrades data for spec SpecProtectionWarrior"}]]
```

The status line already says "This spec has no ranking data yet."
(`utils/format.ts:183`). The toast repeats it, using the proto enum name.
This is the tab's own message, not a sim error, so the wowsims precedent
(a sim error's message) does not cover it.

## Run states against the toast rules

| State                                   | Toast                                    | Status line / list                   | Test                                                              |
| --------------------------------------- | ---------------------------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| Whole run fails                         | one, the error's own message             | "Ranking failed."                    | `run_session.test.ts` "sends a failed run's whole error…"         |
| Run ends with some failed sims          | one, the first `error` in list order     | each line its sentence only          | "shows one error toast with the first failed call's own message…" |
| Stop, then the run rejects              | none (console.error only)                | "Ranking failed."                    | "shows no toast for a failed run that was stopped or superseded"  |
| Stop, partial result with failures      | none                                     | sentences only                       | "shows no toast when no call failed, after Stop…"                 |
| Superseded run (reject or settle)       | none                                     | the newer run's                      | both tests above                                                  |
| Loaded fixture with failures            | none                                     | sentences only                       | "…or for a loaded fixture"                                        |
| Run with no failures                    | none                                     | —                                    | same test, first part                                             |
| Unmount mid-run (`dispose`)             | none, by the same `signal.aborted` check | —                                    | no test (read from `run_session.ts:173-175`)                      |
| Spec with no Upgrades data              | one, developer text                      | "This spec has no ranking data yet." | A2 probe                                                          |
| Version gem repair fails, set screen on | one, false (A1)                          | an extra "could not be built" line   | A1 probe                                                          |

Every pair the brief names is handled. The last two rows are not handled
right.

## Strings on screen

- "Ranking failed.": true in both states it shows (with a toast, or after
  Stop with none).
- Toast body: the raw message, true. Title "WowSims" (the toast manager's
  default).
- Notes lines: each first line is true for its cause, except A1's line,
  which says "the check's sim could not be built" for a failed gem repair.
- No string names the console any more; the removed locale key and schema
  entry match (`assets/locales/en/upgrades.json`,
  `schemas/upgrades.schema.json`).

## Notes (concerns without a failing test)

- N1: the toast body holds a Go panic's whole stack trace. The branch's
  own test asserts it (`run_session.test.ts`, body
  `'sim error (ErrorOutcome): panic\nStack Trace:\ngoroutine 7 [running]:'`).
  Ticket 868's title complaint has moved from the status line to the
  toast. wowsims' bulk sim toasts the raw message the same way
  (`run.ts:304-309` at `24606be6`), so this is within the owner's ruling.
  It is listed so the owner knows what a panic looks like on screen.
- N2: after Stop, wowsims' bulk sim shows a "cancelled" toast
  (`run.ts:318-323`); the tab shows none. This was the same before the
  branch and is not in the design.
- N3: `uniqueSubstitutions` (`rank.ts:4832-4842`) keeps the first line by
  field, slot and first detail line. A line with an `error` that comes
  after a same-text line with none (`measuringSimsNotBuilt` and
  `notBuilt` share a first line) would be dropped, and its error would
  reach neither the console nor the toast. Hypothesis, untested.
- N4: not seen on screen. No live tab run checked the toast or the lines
  (the implementer's report says the same).
- N5: closed ticket 863's "Done when" ("Every set-phase sim failure shows
  the sim's error") no longer describes the tab. The 2026-11-11 ruling
  replaces it, and the implementer's report says so.
- The AGENTS.md commit `c94b7f31` touches only `AGENTS.md` (+6). Its one
  bullet starts "Deciding how the Upgrades tab looks or behaves". Its
  wording was not checked, as the brief asked.

## Added without a ticket or owner request

- `utils/format.ts:125`: `keepMarkWithZone` joined onto one line, which is
  formatter churn with no change in behaviour.
- `SubstitutionsList.tsx:246`: the React key now adds `slot` and `error`.
  This is a small fix for keys that could collide; no ticket asked for it.
- `disclosure.ts:92-94`: `renderDisclosure` appends the `error`. This
  follows from moving the error out of `detail`, so the disclosure text
  stays complete.

Everything else maps to a ticket from 867 to 874.

## Fixes checked

A fresh agent ran each new test with the fix's source files restored from
the fix commit's parent (fails) and on the tip (passes), then `pnpm verify`
on main `9c904866` / fork `817c23d37`: `gates: 1662 ran, 0 skipped`, rc 0.

- A1, fork `5bb832a0f` (main `a758f7bd`): `fork-meta-repair.test.ts`
  "852-R every line ... (set screen off|on)". Before: 1 failed (set screen
  on; a "Burning Rage set" line with `error: "meta repair exceeded step
budget"`). After: 2 passed. The four other callers the reviewer named are
  covered by the `RepairFailure` result type that `tsc` checks; no test
  reaches them.
- A2, fork `10a54e520` (main `9deb6efc`): `run_session.test.ts` "shows no
  toast for a run on a spec with no Upgrades data". Before: toast called
  once with "no Upgrades data for spec SpecProtectionWarrior". After: passes.
- N3, fork `817c23d37` (main `1a27fdce`): `SubstitutionsList.test.tsx`
  "keeps a failed call's error when an earlier line with the same sentence
  has none". Before: the kept line lost its `error`. After: passes.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                      |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `fork-meta-repair.test.ts` "852-R every line" (fork `5bb832a0f`)                                                                   |
| A2  | Adversarial | fixed       | `run_session.test.ts` "shows no toast for a run on a spec with no Upgrades data" (fork `10a54e520`)                                |
| N3  | Adversarial | fixed       | `SubstitutionsList.test.tsx` "keeps a failed call's error when an earlier line with the same sentence has none" (fork `817c23d37`) |
