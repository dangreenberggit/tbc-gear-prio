# Pre-merge review — `chore/885-pre-pr-cleanup`

Ticket 885 (what to settle before the Upgrades tab goes upstream), with
ticket 544 (fork files fail oxfmt) closed on the way. The coordinator
proposed one action per item (the list is in ticket 885 § Rulings), and the
owner replied, 2026-11-20: "Sure, yes (don't bring a fixture into the fork,
we can leave it in the parent repo)".

Range reviewed:

- Fork (`vendor/tbc-new-fork`, branch `chore/885-pre-pr-cleanup`):
  `6ca79f308..300e10e4b` (`3215ba095`, `1200948d9`, `ac2353f6f`,
  `a46cb03fd`, `300e10e4b`). The review fixes are `294c57a84` and
  `dadfad891`.
- Main repo (same branch name): the change against `29e1c0de`. It was not
  committed while the reviewers read it, because the sandbox cannot write
  this pair's main-repo git index.

Three fresh reviewers, one per axis (Opus `general-task`). Their full
reports are in the pair's `.scratch/agent-reports/` (gitignored):
`2026-11-20-general-task-review-adversarial-885.md`,
`2026-11-20-general-task-review-domain-885.md` and
`2026-11-20-general-task-review-standards-spec-885.md`.

## Adversarial

Removing the engine options changed neither what the tab runs nor its cache
key. Close-calls and the set screen both passed
`includeCombinationOnlyBreaks: true`; the partner-slot map built from `pool`
alone holds the same values as before (both read `firstSlotIndexByItemId`);
the view gives the same credit at `'highest-credit'` with the full view; the
tab never set `partnerRule`, so it was never hashed. On-mode set-screen
coverage stays in 511-SL, 511-SA, 511-SN and 511-SH.

- **A1.** The iterations warning compared the iterations per sim with
  1,000,000, where the Bulk tab compares a batch's combinations times its
  iterations (`CombinationsCount.tsx`). It would almost never show when the
  Bulk tab would.
- **A2.** `check_sync_fork_universes.py` pinned a layout that oxfmt rejects:
  its sample's `oxfmt_json` output fails the fork's `oxfmt --check` (rc 1).
- **A3.** `sync_fork_universes.py --write` wrote sources one by one, so a
  source that does not parse stopped it halfway.
- **A4.** `--check` read sources with newline translation, so a CRLF source
  passed, though oxfmt rejects CRLF.
- **A5.** The moved recording test (an older weakness, moved unchanged) would
  pass with the BiS-only filter broken.

## Domain

The seed and imbue texts are true, the removed options were reached by no
tab path, the 7 moved hashes match the fork files, the 22 data copies parse
equal before and after and match their sources byte for byte, and both
moved `_comment`s appear word for word in `docs/fork-provenance/data.md`.

- **D1.** Same as A1.
- **D2.** `engine.md` said every caller set `includeCombinationOnlyBreaks`;
  only the remaining callers did.
- **D3.** A pool test comment said "both" heroic five-man policies; the code
  has three.

## Standards + Spec

Every ruling is carried out except as noted below, every gate the reviewer
ran passed, and no existing upstream wowsims file changed.

- **S1.** Same as A1.
- **S2.** Ticket 885 said it closes ticket 544, but 544 was still open.
- **S3.** The ep-weights copies' `notes` (some cite ticket 803 and "this
  repo's CLI") and `tier-exchange.json`'s `generatedBy` still cite this repo.
- **S4.** A `set-screen.ts` comment the branch edited still named ticket 886.
- **S5.** The ranking still writes `partnerRule: "close-calls"`, now a
  constant.
- **S6.** `engine.md` said "the rows above" for rows that are below.
- **S7.** The `se.ts` row's label said "byte-for-byte copy" while its note
  said the messages differ from core.

## Fix evidence

- A1 / D1 / S1: fork `294c57a84`. The warning now counts the run's sims as
  the baseline plus the eligible candidates under the candidate cap, times
  the iterations per sim, the same product the Bulk tab weighs. The count is
  a lower bound, so the text's "over" is true whenever it shows. New
  `RunControls.test.tsx` cases (cap 99 vs 299 at 5,000 iterations; an unknown
  count shows nothing; 2,500 vs 2,501 at 399 candidates) failed on the
  per-sim code, 3 failed, and pass on the fix.
- A2: `check_layout_passes_the_forks_oxfmt` runs the fork's oxfmt over the
  laid-out sample; the sample now includes a 150-character string, which the
  old one lacked.
- A3: `check_write_is_all_or_nothing_on_a_parse_error`; failed with the
  one-by-one write, passes with the pre-pass that lays out every source
  before writing any.
- A4: `check_crlf_source_fails_check`; failed with `read_text`, passes with
  sources decoded from bytes.
- A5: the test now checks the trinket pane (1 row without BiS-only, empty
  with "no-upgrades" under it), the neck pane, and the all-slots pane (24
  rows vs 9). It failed when the BiS view was built with BiS-only off.
- D2, S6, S7: `docs/fork-provenance/engine.md` reworded; the `se.ts` row now
  reads "adapted" and the 885 section says the `cmp` check in § Seed spacing
  ported is history.
- D3, S4: fork `dadfad891`; `set-screen.ts`'s hash moved after E-W3 passed.
- S2: ticket 544 closed with a `Verified by:` line.

## Check output

`node --version; pnpm verify` in the pair after all fixes (fork `dadfad891`,
main working tree with the lock at `dadfad891`): `v22.23.2`, `fork tests
check ok at fork commit dadfad891b40 ... Tests  911 passed (911)`, `gates:
1744 ran, 0 skipped`, rc 0. The layout gate is not a verify step ("layout:
would run").

`pnpm run fork-lint:check`: "fork lint check ok at fork commit dadfad891b40:
oxlint clean ..., fork type-check clean, oxfmt clean over the 247 files
changed since 24606be6bae2". `npx oxfmt --check .` in the fork: "All matched
files use the correct format" (1512 files).

The fix check (a fresh Opus agent,
`.scratch/agent-reports/2026-11-20-general-task-check-fixes-885.md` in the
pair, both trees left byte-identical):

- A1, with `RunControls.tsx` and `RunSettingsPanel.tsx` at fork `300e10e4b`:
  `Tests  3 failed | 12 passed (15)`; at HEAD: `Tests  15 passed (15)`.
- A3, the sync script without the pre-pass: `FAIL: --write must change
nothing when a source does not parse`; with it: 9 checks ok.
- A4, the sync script reading with `read_text`: `FAIL: a CRLF source must
fail --check with rc 1, got 0`; with the bytes decode: 9 checks ok.
- A2: a sample with a short array, rebuilt from the review notes (the old
  sample was never committed), fails the fork's oxfmt with `oxfmt_json`'s
  layout (rc 1); the new sample with a 150-character string passes (rc 0).
- A5, a copy of the test with the BiS view built with BiS-only off:
  `Tests  1 failed (1)`; the real file: `Tests  1 passed (1)`.
- Check command: `check_sync_fork_universes.py` 9 checks ok,
  `sync_fork_universes.py --check` 22 copies byte-match, `fork-lint:check`
  ok, and set-net, set-fixtures, the recording test and E-W3: `Tests  130
passed (130)`, each rc 0.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                               |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | Fork `294c57a84`; new `RunControls.test.tsx` cases failed on the per-sim code, pass on the fix.                                                                                                                                                             |
| A2  | Adversarial | fixed       | `check_layout_passes_the_forks_oxfmt` in `scripts/check_sync_fork_universes.py`.                                                                                                                                                                            |
| A3  | Adversarial | fixed       | `check_write_is_all_or_nothing_on_a_parse_error`; failed before the pre-pass.                                                                                                                                                                               |
| A4  | Adversarial | fixed       | `check_crlf_source_fails_check`; failed before the bytes decode.                                                                                                                                                                                            |
| A5  | Adversarial | fixed       | `packages/core/test/fork-results-view-recording.test.ts`; fails with BiS-only off.                                                                                                                                                                          |
| D1  | Domain      | fixed       | Same as A1.                                                                                                                                                                                                                                                 |
| D2  | Domain      | fixed       | `engine.md`: "every remaining caller set to true".                                                                                                                                                                                                          |
| D3  | Domain      | fixed       | Fork `dadfad891`: "the exclude and include heroic five-man policies".                                                                                                                                                                                       |
| S1  | Standards   | fixed       | Same as A1.                                                                                                                                                                                                                                                 |
| S2  | Standards   | fixed       | Ticket 544 closed with a `Verified by:` line.                                                                                                                                                                                                               |
| S3  | Spec        | wontfix     | The ruling named JSON `_comment`s; `notes` and `generatedBy` are data fields the ruling did not cover. Left for the owner as a question in this branch's report, with a recommendation to reword them in the `data/` sources so both sides stay byte-equal. |
| S4  | Standards   | fixed       | Fork `dadfad891`: the comment no longer names a ticket.                                                                                                                                                                                                     |
| S5  | Spec        | wontfix     | The stored tab recordings and mock fixtures carry the field; dropping it changes the stored ranking shape for no change a player or the PR reviewer sees. The value is true: the tab's rule is close-calls.                                                 |
| S6  | Standards   | fixed       | `engine.md`: "the rows in § Ported files".                                                                                                                                                                                                                  |
| S7  | Standards   | fixed       | `engine.md`: the row reads "adapted", and the 885 section retires the `cmp` check.                                                                                                                                                                          |

## Notes

- Ticket 578 (every tab file must pass wowsims' `oxfmt . --check`) is
  closed too: its done-when is met at fork `dadfad891` with `.oxfmtrc.json`
  unchanged.
- The warning shows nothing in the downloaded sim. The Bulk tab shows the
  same text there above 10,000,000, but the text advises downloading the
  sim, which is untrue there. It departs from "match upstream", so the owner
  should confirm it. With the total reading, a default run (3,000
  iterations) shows the warning once more than about 333 candidates are
  eligible.
- `tools/` and the fixture dev path stay on the fork branch, because
  removing them now breaks `pnpm equip-eligibility:check` (a `verify` step),
  the layout gate, `pnpm tab-review` and `pnpm tab-fixtures:smoke`. Ticket
  889 holds the file list for the PR cut.
- `check_fork_lint.py`'s oxfmt step: if every changed file were on oxfmt's
  ignore list, oxfmt would exit 2, a false failure; with no changed file it
  checks the whole tree. Neither happens on this branch.
- Fork commit subjects `1200948d9` and `ac2353f6f` mention "our" and "the
  outer repo"; they reach the upstream PR's history unless it is squashed.
- 511-SR's name says only the screen's sims ask for per-iteration values,
  while its assertions check only with and without the screen; 511-SL covers
  the rest.
