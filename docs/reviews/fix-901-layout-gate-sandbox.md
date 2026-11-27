# Pre-merge review — fix/901-layout-gate-sandbox

Diffed against: `dev` `f4d6c65b`, range `f4d6c65b..HEAD`. No fork change.

What the branch is for: ticket 901,
`.scratch/carry-forward/issues/901-layout-gate-skips-in-the-sandbox.md`.
Ticket 861 (`861-layout-gate-chromium-aborts-in-the-sandbox.md`, filed
2026-11-08) is the same bug and names this fix as one way in. The user's
request on 2026-11-26: "have a session handle fixing this please". The
brief that passed it on added: settle with evidence whether the headless
shell lays out like full Chromium, and if it can differ, do not quietly
swap browsers outside the sandbox; bring that to the user as a decision.

## What changed

- `scripts/tab-harness/test-tab-harness.mjs` `launchChrome`: reads the
  browser's stderr. A browser that exits before its DevTools endpoint comes
  up is reported at once, with its exit code and the last 4000 characters
  of its stderr. A timeout quotes the stderr too. The wait for the last
  stderr is capped at 1 s. `launchChrome({ exe, timeoutMs })` lets the tests
  pass a fake browser.
- `scripts/tab-harness/chromium.mjs`: every tab harness now launches
  Playwright's headless shell (`chromium-headless-shell`), found through
  playwright-core's registry, in place of full Chromium. `--build` prints the
  headless shell's browsers.json entry, so the layout digest changes once.
- `data/desktop-gate/README.md` and `scripts/tab-harness/README.md`: say
  why, and that `PLAYWRIGHT_BROWSERS_PATH` must stay unset.
- Ticket 902 filed (the page's outside resources load on a desktop run and
  fail in the sandbox).

## The browser question (for the user)

The headless shell does not lay the tab out exactly like full Chromium.
Both pass every check. Evidence:
`.scratch/agent-reports/2026-11-26-901-layout-compare/README.md`
(gitignored).

- Both ran the full gate: 4 widths, 11 fixtures, the same 496 PASS ids,
  0 FAIL (`shell.log`, `full2.log`).
- Of 21405 element boxes, 9301 moved by more than 2 px. The same web font is
  used in both, but text widths differ (284 px vs 286.51 px for one string),
  which moves wrap points.
- Full Chromium ran in the sandbox only through a throwaway `LD_PRELOAD`
  socket shim and `--no-proxy-server`. That is not part of the branch.

So this branch changes the browser on desktop runs too, not only in the
sandbox. Every recorded sandbox pass already used the headless shell (the
pwshim), including the current baseline `8cb2f52c`.

## Reviews

- Adversarial: `.scratch/agent-reports/2026-11-26-general-task-901-review-adversarial.md`
- Standards + Spec: `.scratch/agent-reports/2026-11-26-general-task-901-review-standards-spec.md`
- Domain: not run. The branch touches no TBC, WCL or wowsims fact.

## Check output

PENDING

## Findings

- **F1 (medium, adversarial).** Notes told agents to set
  `PLAYWRIGHT_BROWSERS_PATH` to the pwshim, which has no headless shell. With
  this branch that makes `chromium.mjs` exit 2, and the layout gate skips.
  Sources: `data/desktop-gate/README.md:30-33`, a memory note.
- **F2 (low, adversarial).** `launchChrome` waited for stderr to close with
  no limit. A fake browser that left a child holding stderr made the error
  arrive after 8017 ms against a 2000 ms timeout.
- **F3 (low, adversarial).** No test for the F2 case or for a browser file
  that cannot start.
- **S1 (medium, standards).** The `chromium.mjs` comment said one browser
  "keeps every run's geometry the same". Ticket 902 shows that is not true
  (outside resources differ).
- **S2 (low, standards).** `chromiumBuild`'s JSDoc still said "the
  `chromium` entry".
- **S3 (low, standards).** `run-tab-cdp.mjs:184-221` keeps its own launcher
  with `stdio: "ignore"`.
- **P1 (medium, spec).** Ticket 861 is the same bug and was not mentioned.
- **P2 (medium, spec).** The browser change applies outside the sandbox
  too. That is the user's decision (above).
- **P3 (low, spec).** 901's "Untested" question was answered but not
  written into 901.
- **P4 (low, spec).** Nothing yet showed `pnpm merge-to-dev` measuring in
  the sandbox.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                            |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | Adversarial | fixed       | `f46b7cb4`: `data/desktop-gate/README.md` says to leave `PLAYWRIGHT_BROWSERS_PATH` unset; the memory note `feedback-agents-run-long-gates.md` says the same once this branch is on `dev`. Old review files keep their historical commands.                               |
| F2  | Adversarial | fixed       | `f46b7cb4`; test "does not wait past its timeout for a child that keeps stderr open" failed on `530cab08` (`expected 8008 to be less than 4000`) and passes on `f46b7cb4` (1167 ms).                                                                                     |
| F3  | Adversarial | fixed       | `f46b7cb4` adds that test and "says it could not start a browser file that is missing" (fails on `dev`, passes since `b3667d82`).                                                                                                                                        |
| S1  | Standards   | fixed       | `f46b7cb4`: the comment now says every run measures with one browser's text metrics, with the 284 vs 286.51 px measurement.                                                                                                                                              |
| S2  | Standards   | fixed       | `f46b7cb4`: the JSDoc names the `chromium-headless-shell` entry.                                                                                                                                                                                                         |
| S3  | Standards   | wontfix     | That launcher now starts the headless shell too, so the startup abort this branch reports can no longer happen there. It stops Chrome with `killTree` (ticket 710), unlike `test-tab-harness.mjs`, so merging the two launchers is separate work and not what 901 asked. |
| P1  | Spec        | fixed       | 861 is listed under `Related:` in 902 and closed with 901 on this branch.                                                                                                                                                                                                |
| P2  | Spec        | wontfix     | Not a defect in the code: the browser change outside the sandbox is the user's decision, set out in "The browser question" above and asked before the merge.                                                                                                             |
| P3  | Spec        | fixed       | 901's closing note records the answer and the evidence folder.                                                                                                                                                                                                           |
| P4  | Spec        | fixed       | "Check output" above: `pnpm merge-to-dev --check-only` in the sandbox with no environment variable.                                                                                                                                                                      |
