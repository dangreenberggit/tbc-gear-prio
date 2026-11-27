# Pre-merge review — fix/903-tab-review-font-awesome

Diffed against: `dev` `ff4c0e9a`, range `ff4c0e9a..HEAD`. No fork change.

What the branch is for: ticket 903,
`.scratch/carry-forward/issues/903-tab-review-screenshots-depend-on-the-network.md`.
The user's go on 2026-11-27, answering "Q2: start ticket 903?": "sure". The
brief that passed it on added: check whether Font Awesome can be served
without the blocking flags and what the launcher's other callers need; a
trade-off that changes what screenshots show is the user's call.

## What was found

Evidence: `.scratch/agent-reports/2026-11-27-903-tab-review-font-awesome/README.md`
(gitignored). Four captures of one manifest (`mock-balance`, 375 and 1280
px): the `dev` script and this branch's, each in the sandbox and with every
outside resource loading through 902's forward proxy (the desktop stand-in;
no real desktop run was made).

- Before, in the sandbox, the favorite and batch toggles were 28×0 px; with
  everything loading, 28×17.5. After, both runs give 28×17.5, icons 25×0.875
  and 22×0.875, at both widths. The 1280 row clip shows the star and swap
  icons in the sandbox now.
- Font Awesome loads without the blocking flags: CDP `Fetch` answers it inside
  the browser, before the sandbox proxy is reached.
- The desktop stand-in's PNGs are byte-identical before and after (`cmp`), and
  still show the item icon, so other outside requests are not blocked.
- Other launcher callers: the launcher is unchanged. `test-stop.mjs` and
  `scripts/tab-fixtures/record.mjs` measure no icon. `smoke.mjs`'s screenshots
  still lack the toggle icons in the sandbox, but it judges only whether each
  fixture loaded, and nothing judges those PNGs.

## What changed

- `scripts/tab-harness/test-review.mjs`: each page gets Font Awesome from the
  pinned package (`serveFontAwesome`), with no blocking flags. A Font Awesome
  file the package lacks, or an answer the browser did not take, is an error
  on that entry.
- `scripts/tab-harness/outside-requests.test.mjs`: a test that a browser
  launched without the blocking flags gets Font Awesome served.
- `scripts/tab-harness/outside-requests.mjs`, `scripts/tab-harness/README.md`:
  comments only.

## Reviews

- Adversarial: `.scratch/agent-reports/2026-11-27-general-task-903-review-adversarial.md`
  (it re-ran the captures into `.scratch/903-review-adversarial/`: same boxes).
- Standards + Spec: `.scratch/agent-reports/2026-11-27-general-task-903-review-standards-spec.md`
- Domain: not run. The branch touches no TBC, WCL or wowsims fact.

## Check output

Fix check by a fresh agent (Sonnet; the GLM worker stopped on an expired
API key): the new test, copied with `serveFontAwesome` replaced by an empty
record, gave `Tests 1 failed | 10 skipped (11)`,
`AssertionError: expected 0 to be greater than 0` (the width assertion).
`node --version; pnpm exec vitest run scripts/tab-harness` at `9540ecfd`:
`v22.23.2`, `Tests 27 passed (27)`, rc=0.

`pnpm merge-to-dev --check-only` at `6d2aaf8f`, run inside the Claude Code
sandbox. `env | grep -c '^PLAYWRIGHT'` printed 0 first, and node printed
v22.23.2. Log: `checkonly.log` in the evidence folder (gitignored).

- verify: `gates: 1791 ran, 0 skipped`.
- merge-ready, both copies: `merge-ready: ok`,
  `disposition rows: 8 parsed of 8 row-shaped lines in 1 section(s)`.
- layout gate: `tab layout source changed since the last green run
(recorded dd50b7cd847b..., now c950198e5014...) -- running the gate`;
  verdict `"outcome":"measured","pass":true,"failed":0,"a11yFailed":0`, 4
  widths, 11 fixtures, 497 PASS, 0 FAIL.
  `layout gate: PASSED. Advanced the baseline to c950198e5014...`. The lock
  advance is committed on this branch.
- `check-only: ok (not merging)`, rc=0.

## Findings

- **A1 (low, adversarial) / S1 (low, standards).** The new test exercises the
  shared helper, not `test-review.mjs`; reverting the wiring fails no test.
- **S2 (low, spec).** The evidence README did not answer the brief's question
  about the launcher's other callers.
- **N1 (both, note).** The new test sent a real request to Wowhead's CDN and
  rejected `ERR_NAME_NOT_RESOLVED`, so a machine with no DNS could fail it.
- **N2 (adversarial note) / unasked addition (standards).** If the fork's page
  moves to another Font Awesome version, every capture, desktop too, gets an
  entry error until the devDependency follows; before, a desktop capture
  loaded the new version from the CDN.
- **N6 (adversarial) / N2 (standards), notes.** `serveFontAwesome` adds a CDP
  listener per page that is never removed.
- **N5 (adversarial) / N4 (standards), notes.** Hovering an item link may
  differ between sandbox and desktop (Wowhead's tooltip script); unmeasured,
  outside 903's done-when.
- **A-375 (author).** At 375 px the toggles sit past the viewport's edge in
  every run, so the 375 row clip shows none before or after.

## Disposition

| ID    | Axis        | Disposition | Ticket / note                                                                                                                                                                                        |
| ----- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1    | Adversarial | wontfix     | Wiring (one call and one error push), which `~/.claude/AGENTS.md` § Development lets the check skip a test for; the before/after captures are its check. The test's comment now says what it covers. |
| S1    | Standards   | wontfix     | Same as A1.                                                                                                                                                                                          |
| S2    | Spec        | fixed       | Evidence README § Other callers of the shared launcher, and § What was found above.                                                                                                                  |
| N1    | Both        | fixed       | `9540ecfd`: the test asks for nothing from outside. With Font Awesome not served it fails (`expected 0 to be greater than 0`); served, it passes (fix check above).                                  |
| N2    | Both        | wontfix     | Kept on purpose: a silent fallback would bring back 903's sandbox/desktop split. The layout gate's check 24 fails at the same moment. Raised with the user.                                          |
| N6    | Both        | wontfix     | Each listener drops events for other sessions; the run closes its page per entry. No effect on results.                                                                                              |
| N5    | Both        | wontfix     | Outside 903, which names the row toggles; no measurement shows a difference.                                                                                                                         |
| A-375 | Author      | wontfix     | Older than this branch and outside 903.                                                                                                                                                              |
