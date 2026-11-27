# Pre-merge review — fix/902-layout-gate-outside-resources

Diffed against: `dev` `5cba058e`, range `5cba058e..HEAD`. No fork change.

What the branch is for: ticket 902,
`.scratch/carry-forward/issues/902-layout-gate-page-loads-outside-resources.md`.
The user's request on 2026-11-26: "send out a session to knock out 902".
The brief that passed it on added: if blocking outside requests would change
what the gate measures compared with a desktop run, that trade-off is the
user's decision; if the resources do not touch the tab's geometry, pick the
simplest fix that makes every run see the same page.

## What was found

Evidence: `.scratch/agent-reports/2026-11-26-902-outside-resources/README.md`
(gitignored). Outside resources were loaded from inside the sandbox through a
local forward proxy that adds the sandbox proxy's credentials, with the same
headless shell. Every outside request then answered 200.

- Only Font Awesome moves the tab's geometry. The favorite and batch toggles
  in each result row use wowsims' `Icon`, which renders Font Awesome classes.
  Without its CSS those buttons are 0 px tall. 2528 of 21405 boxes differ
  (1198 `BUTTON`, 1286 `I`, 44 `SPAN`); nothing else moves, and the pre-run
  page is identical.
- `@fortawesome/fontawesome-free@6.0.0` from npm is byte-identical to the
  cdnjs files the page loads, and matches the page's SRI hash.
- With the fix, the gate's setup equals the run where everything loaded: all
  21405 boxes; and over the whole gate, all 496 checks with their measured
  details, the 11 axe violations, 44 facts and 15 axe lines.

So the brief's decision rule is not triggered: the fix keeps the geometry and
the axe results a run with every outside resource gets.

## What changed

- `scripts/tab-harness/outside-requests.mjs` (new): the browser flags that
  block every request to a host other than this machine
  (`--proxy-server=direct://` and a `~NOTFOUND` resolver rule; the headless
  shell ignored `--no-proxy-server`), and `serveFontAwesome`, which answers
  any Font Awesome URL from the pinned package over CDP `Fetch`. A Font
  Awesome URL with no local copy, or an answer the browser did not take, is
  recorded; `fontAwesomeServed` turns that into a check result.
- `scripts/tab-harness/test-tab-harness.mjs`: `launchChrome({ offline })`;
  `attachPage` also returns the session id.
- `scripts/tab-harness/test-layout.mjs`: the gate launches offline, serves
  Font Awesome, and adds check 24 (every Font Awesome file was served).
- `scripts/check_layout_gate.py`: hashes `outside-requests.mjs` and the fork's
  `ui/index_template.html` (the page names the resources it loads), so the
  digest moves once.
- `package.json`, `pnpm-lock.yaml`: devDependency
  `@fortawesome/fontawesome-free` `6.0.0`, exact. `pnpm-workspace.yaml`:
  `allowBuilds` marks its postinstall (an attribution notice) as not run.
- `scripts/tab-harness/README.md`: one entry for the new module.
- Other harnesses (`test-review.mjs`, `test-stop.mjs`, the fixture scripts)
  are unchanged and still load or fail outside resources by network.

## Reviews

- Adversarial: `.scratch/agent-reports/2026-11-26-general-task-902-review-adversarial.md`
- Standards + Spec: `.scratch/agent-reports/2026-11-26-general-task-902-review-standards-spec.md`
- Domain: not run. The branch touches no TBC, WCL or wowsims fact.

## Check output

`pnpm merge-to-dev --check-only` at `f7d2bedd`, run inside the Claude Code
sandbox. `env | grep -c '^PLAYWRIGHT'` printed 0 first, and node printed
v22.23.2. Log: `checkonly.log` in the evidence folder (gitignored).

- verify: `gates: 1790 ran, 0 skipped`.
- merge-ready, both copies: `merge-ready: ok`,
  `disposition rows: 12 parsed of 12 row-shaped lines in 1 section(s)`.
- layout gate: `tab layout source changed since the last green run
(recorded fdec1d674a26..., now dd50b7cd847b...) -- running the gate`;
  verdict `"outcome":"measured","pass":true,"failed":0,"a11yFailed":0`, 4
  widths, 11 fixtures, 497 PASS (the 496 before plus `PASS (24) {}`), 0
  FAIL. `layout gate: PASSED. Advanced the baseline to dd50b7cd847b...`. The
  lock advance is committed on this branch.
- `check-only: ok (not merging)`, rc=0.

Fix check by a fresh agent (Sonnet; the GLM worker stopped on an expired
API key): the four tests for A1, A2 and A4/N2, copied with the code of
`6347da9c` (before the fixes), gave `Tests 4 failed | 6 passed (10)`; with
`e2c02d10`, `Tests 10 passed (10)`.
`node --version; pnpm exec vitest run scripts/tab-harness` at HEAD:
`Tests 26 passed (26)`. Logs: `.scratch/fixcheck-902/before.log`,
`after.log`.

## Findings

- **A1 (medium, adversarial).** Only cdnjs Font Awesome URLs were
  intercepted. A page that moved Font Awesome to another host had it blocked
  at name lookup with nothing recorded, and the gate passed with 0 px icons.
- **A2 (medium, adversarial).** A missing Font Awesome file ended the run as
  `unmeasured`, which `check_layout_gate.py` reports as SKIPPED without
  blocking the merge.
- **A3 (low, adversarial).** The lock comment `write_baseline` writes did not
  name the two newly hashed files.
- **A4 (low, adversarial).** No test for the catch on answers to paused
  requests.
- **N2 (adversarial note) / N1 (standards note).** That catch swallowed every
  rejected answer, so a failure mid-run would leave the page on a fallback
  font with nothing said.
- **S1 (medium, spec) / N1 (adversarial note).** Only geometry was compared;
  blocking tooltips.js and the item icons might change the axe results.
- **S2 (low, standards).** The comment "Not Unmeasured: that skips one
  fixture" was wrong where it was used.
- **S3 (low, standards).** The harness README did not list the new module.
- **V1 (low, author).** `pnpm verify` at `6347da9c` failed in "loads the
  stylesheet and its font, and fails every other outside request at name
  lookup": under parallel load the image's failure event had not arrived
  after a fixed 300 ms sleep (`expected undefined to be
'net::ERR_NAME_NOT_RESOLVED'`, `verify.log` in the evidence folder).
- **N3 (adversarial note).** `test-tab-harness.mjs` resolves the Font Awesome
  package at import, so every harness fails at import without it.
- **N3 (standards note).** `docs/agents/known-traps.md:81-82` says
  `pnpm.onlyBuiltDependencies`; this repo uses `allowBuilds` in
  `pnpm-workspace.yaml`.
- **N4 (both).** The tab-review screenshots (`test-review.mjs`) still differ
  between sandbox and desktop runs.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                     |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `e2c02d10`: interception patterns `*font-awesome*` and `*fontawesome*` on any host. Test "records Font Awesome asked for from another host" (fix check below).                                                    |
| A2  | Adversarial | fixed       | `e2c02d10`: check 24 (`fontAwesomeServed`) is a failed check, so the verdict is `measured`, `pass: false`, which blocks. Tests under `describe("fontAwesomeServed")`.                                             |
| A3  | Adversarial | fixed       | `e2c02d10`: the lock comment names `ui/index_template.html` and `outside-requests.mjs`.                                                                                                                           |
| A4  | Adversarial | fixed       | `e2c02d10`: test "records the request it could not answer, without an unhandled rejection".                                                                                                                       |
| N2  | Adversarial | fixed       | `e2c02d10`: a rejected answer goes to `unanswered`, which fails check 24. Same test as A4.                                                                                                                        |
| S1  | Spec        | wontfix     | Checked, not a defect: the whole gate run with every outside resource loading and as committed gave identical checks (with details), violations, facts and axe lines (`verdict-diff.txt` in the evidence folder). |
| S2  | Standards   | fixed       | `e2c02d10`: the comment and the throw it described are gone (check 24 replaces them).                                                                                                                             |
| S3  | Standards   | fixed       | `e2c02d10`: `scripts/tab-harness/README.md` lists `outside-requests.mjs`.                                                                                                                                         |
| V1  | Author      | fixed       | `e2c02d10`: the browser tests wait for the events (`waitFor`, up to 10 s) in place of fixed sleeps; three runs in a row passed, and `pnpm verify` passed (check output above).                                    |
| N3  | Adversarial | wontfix     | A devDependency that `pnpm install` puts in place, like `playwright`, which `chromium.mjs` also resolves at import.                                                                                               |
| N3s | Standards   | wontfix     | Older than this branch and not about 902; `known-traps.md` is an agent doc, so its edit goes through its own review. Raised with the user.                                                                        |
| N4  | Both        | wontfix     | Outside 902, which names the layout gate. The review screenshots show item icons on a desktop, and blocking them there is a trade-off for the user. Raised with the user.                                         |
