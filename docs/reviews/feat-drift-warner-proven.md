# Pre-merge review — feat/drift-warner-proven

Reviewed range: `57fea48bc9565b6da5cc9c79365762f53ea3ed60..f56c4ec10b9f4979e43c0eb063c848a37fa29fcd`

Ticket 245: the upstream-drift warner was unproven in the conditions it exists
to survive. The branch closes its five boxes, and two of them turned out to be
broken rather than merely unconfirmed.

Dispatch: four fresh-context sub-agents on Opus at effort medium (review lane),
`codex` not on `PATH` so no cross-vendor pass. Adversarial and domain via the
`Agent` tool directly; Standards and Spec via the `code-review` skill's own
two-agent split.

Reviewable surface: `scripts/warn_upstream_drift.py` (+23 lines),
`scripts/check_sync_wowsims.py` (+182), `.github/workflows/verify.yml` (+8),
`AGENTS.md` (+2), and the ticket markdown (+198, prose).

Every confirmed finding was reproduced locally before being accepted — the
review lane proposes, it does not get taken on trust.

## Adversarial

Three findings, all confirmed by reproduction, none in the top severity class
(no path produces a confidently-wrong DPS number with no error — the diff
touches no TypeScript and no sim invocation).

**A1 (fixed).** `warn_upstream_drift.py` reported the wrong _cause_ for a
legitimate exit 1. `do_check()` has two `return 1` paths, not one:
`sync_wowsims.py:404` returns 1 with `no data/wowsims.lock.json -- run --update
first` and no `DRIFT:` line, which landed in the did-not-run branch and printed
"usually no `gh` on PATH or no auth". Reproduced in a temp tree with no
lockfile. The verdict ("drift is UNKNOWN") was correct and the real reason was
already echoed one line above, so this was misdiagnosis rather than a false
all-clear. Fixed by not guessing a cause at all — `--check` names its own.

**A2 (fixed).** `check_drift_token_still_matches_what_check_emits` passed by
construction. It matched `inspect.getsource(do_check)` for the literal
`DRIFT:` and for a `print(f"..DRIFT:` regex, neither of which strips comments.
Reproduced: a `do_check` printing `CHANGED:` with a leftover
`# print(f"  DRIFT: legacy")` passed both assertions while the warner matched
nothing — exactly the silent no-op the check exists to catch, and exactly what
its docstring promised to prevent. The original mutation testing missed it
because it only tested renames without a leftover mention.

**A3 (fixed).** `check_check_exit_codes_match_the_warner_branches` was
near-vacuous: it grepped the source for the substrings `return 1` and `return
2`, which are both still present when the two codes are _swapped_. Reproduced —
the check stayed green while the warner would read real drift as a vendor skip.

A2 and A3 shared one root cause: asserting against source text rather than
behaviour. A grep for a literal that the checked code can rename out from under
it is the same rot shape this ticket is about, one level up. Both now run the
real `do_check()` offline through `_DoCheckHarness`, stubbing only the three
functions that reach the network (`latest_tag`, `ref_sha`, `fetch`). Both
mutations are now caught, two failures each.

**Confirmed sound by the same reviewer**, and worth recording because it is the
part most likely to be doubted later: the four behavioural checks are not
theatre — they drive the real `main()` and assert on observable stdout and exit
code, and monkeypatching `subprocess.run` stubs a genuine external boundary (a
subprocess needing network and `gh` auth), not an internal collaborator.
`_run_warner`'s `try/finally` was verified exception-safe by forcing `main()` to
raise and confirming both globals were restored. `${{ github.token }}` is the
ephemeral per-run token, not a PAT, and is only ever used for
`gh api .../compare/`.

**Deferred:** the reviewer noted no `permissions:` block exists in any workflow,
so `GITHUB_TOKEN` takes the repo default rather than a read-only scope. Nothing
in this diff escalates, and it predates the branch — filed as ticket 246.

## Domain

**Domain-neutral. No contradictions.**

`git diff 57fea48..f56c4ec | grep -niE "currentPhase|specID|talents|permanentEnchant|combatantInfo|slot|race"`
returns only incidental hits on the word "traceback". `currentPhase` is
untouched; `warn_pin_behind_watched_refs()` reads only `commit`, `repo` and
`watchedRefs`.

The `lock["tag"]`-is-a-branch-name hazard (live on
`feat/engine-pin-backend-reforge`) cannot mislead this code:
`warn_upstream_drift.py` never reads `lock["tag"]`, and computes ancestry from
`lock["commit"]` — a SHA — against watched-ref _names_.

Historical assertions in the ticket all trace to committed sources:
`timeToNextEnergyTick` on `feature/backend-reforge` to ticket 244's re-runnable
`curl` and three source locations; the wrongly-declared-absent optimizer to
`sync_wowsims.py:443` and `docs/adr/0025-*.md:55-62`; the CI claims to run IDs
read with `gh run view <id> --log`; retraction commit `294d229` exists.

**D1 (fixed).** One unverified-assumption flag: the ancestor NOTE says features
are "reachable by fast-forward — do not call them absent", and _reachable_ is
not _usable_. Ticket 244 records that `fetch_wowsimcli.py` builds a
`releases/download/<tag>` URL that 404s on a branch, and that `ret_p3.gear.json`
is missing at `cbf6b75`. A reader could take the NOTE as "therefore available
now" — the opposite over-correction to the one the line prevents. Added the
caveat: `Reachable is not the same as usable -- moving the pin to a branch has
its own costs; measure before choosing.`

Also noted, not a defect: when the pin _equals_ a watched ref (the engine-pin
branch case) `ahead=0, behind=0` falls through both branches and prints nothing.
Silent, not wrong.

Unexamined: WCL slot mapping (R17), `permanentEnchant`/`temporaryEnchant`,
meta-gem activation, race inference, spec-from-talent-plurality — no code in
this diff touches WCL parsing or sim invocation. No new WCL field usage
introduced.

## Standards + Spec

### Standards

No blocking violation. `python scripts/check_sync_wowsims.py` green.

**S1 (fixed).** _Primitive Obsession._ `_run_warner` returned a string with a
magic `"__NONZERO_EXIT_{rc}__"` prefix, which four callers parsed back out with
`startswith` + `splitlines()[0]` — a return code and captured stdout smuggled
through one string. Now returns `(problems, output)`.

**S2 (fixed).** _Duplicated Code._ The same "warner must exit 0" invariant was
asserted in four checks with four differently-worded messages. Folded into
`_run_warner`, which already knows the return code.

**S3 (fixed).** House convention: `class _Completed: pass` plus attribute
assignment matched nothing else in `scripts/`. Replaced with
`types.SimpleNamespace`.

**S4 (fixed).** Comment policy (`AGENTS.md`: "If a comment restates the code,
delete it"). Two docstrings restated their assertions rather than the _why_ —
`check_check_exit_codes_match_the_warner_branches` and
`check_warner_reports_clean_only_on_exit_zero`. Both trimmed. The reviewer
explicitly judged the `warn_upstream_drift.py` did-not-run comment, the
`DRIFT_TOKEN` comment and the `verify.yml` `GH_TOKEN` comment **load-bearing**
and said keep — all three name an external-system quirk or a non-obvious
cross-file coupling. Kept.

**S5 (fixed).** Fragile coupling: `check_warner_skips_on_absent_vendor` asserted
`"vendor" not in out`, grepping a literal printed by `warn_upstream_drift.py:76`
that it does not own — the rot shape the ticket is about. Rewritten to assert
the branch is distinguishable from the other two rather than to pin its wording.

Durable claims: **no violation found.** The reviewer called this "the diff's
strongest part" — the five boxes each name a command, and the CI claims cite
real run IDs and state they were read, not predicted.

### Spec

Reviewed against `git show 57fea48:.scratch/.../245-*.md` — the ticket as
written _before_ this work.

Verify-chain confirmation: `package.json:10` ends
`... && pnpm run sync-wowsims:unit:check && ... && pnpm run upstream-drift:warn`,
and line 22 maps that to `python scripts/check_sync_wowsims.py`, where all
checks are registered in `CHECKS`. **Acceptance box 2 genuinely closed** — the
contract is asserted inside `pnpm verify`, not merely written.

**P1 (fixed).** Box 4 was closed by an argument without naming a command, while
the acceptance criterion says "each naming the command run". Added
`pnpm verify 2>&1 | wc -l` and `| tail -8`.

**P2 (fixed).** Box 4 credited the `NOTE:` line as this ticket's remedy, but
`git show 57fea48:scripts/warn_upstream_drift.py | grep -c "NOTE: the pin"`
returns 2 — it predates the branch. Corrected in the ticket, which now states
the box is closed on a measurement and an argument rather than on a change made
for it, and names the one line this branch _does_ add to that argument (D1).

**Scope creep: none.** `verify.yml`'s `GH_TOKEN` is the minimal fix for box 3
("confirm the warning is visible in a real CI run"). The `AGENTS.md` addition is
authorised by acceptance box 4, and the approval is recorded in the artifact
rather than assumed — the ticket states "approved by the owner 2026-08-21" and
commit `f56c4ec` says so in its message. The shipped rule is broader than the
ticket's sketched `watchedRefs` wording; the ticket justifies the generalisation
explicitly, so it is a documented widening, not silent creep.

**P3 (defer).** `_run_warner` stubs `warn_pin_behind_watched_refs`, so the
`NOTE:` path — the one box 4's content argument leans on — is the single path
the contract checks do not guard. Ticket 247.

## Summary

Ten findings across four axes. Eight fixed on the branch, two deferred to
tickets. Nothing blocking.

The two that matter are **A2 and A3**: the checks written to stop this ticket's
failure recurring were themselves defeatable, in the same shape as the failure
they guard — asserting against text rather than behaviour. They now execute the
real `do_check()`. That the review found them is the strongest evidence in this
branch that the fresh-context requirement is doing real work; the author's own
mutation testing had passed them.

Worst per axis: Adversarial — A2 (a guard that passes by construction). Domain —
D1 (unverified assumption, no contradictions). Standards — S1 (primitive
obsession). Spec — P2 (a remedy credited to this ticket that predates it).

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                 |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A2  | Adversarial | fixed       | token check now runs `do_check()` via `_DoCheckHarness`; comment-defeat mutation reproduced, then caught                      |
| A3  | Adversarial | fixed       | exit-code check now runs `do_check()` in each state; swapped-codes mutation reproduced, then caught                           |
| A1  | Adversarial | fixed       | did-not-run branch no longer guesses a cause; missing-lockfile path reproduced                                                |
| A4  | Adversarial | defer       | no `permissions:` block on any workflow — `.scratch/carry-forward/issues/246-workflows-have-no-permissions-block.md`          |
| D1  | Domain      | fixed       | added "reachable is not the same as usable" caveat to the ancestor NOTE                                                       |
| S1  | Standards   | fixed       | `_run_warner` returns `(problems, output)`; `__NONZERO_EXIT_` sentinel removed                                                |
| S2  | Standards   | fixed       | exit-0 invariant asserted once in `_run_warner`, not four times                                                               |
| S3  | Standards   | fixed       | `types.SimpleNamespace` replaces the ad-hoc `_Completed` class                                                                |
| S4  | Standards   | fixed       | two restating docstrings trimmed; three load-bearing comments kept on the reviewer's judgement                                |
| S5  | Standards   | fixed       | vendor-skip check no longer greps a literal it does not own                                                                   |
| P1  | Spec        | fixed       | box 4 now names `pnpm verify 2>&1 \| wc -l` and `\| tail -8`                                                                  |
| P2  | Spec        | fixed       | box 4 no longer credits the pre-existing `NOTE:` line to this ticket                                                          |
| P3  | Spec        | defer       | `NOTE:` path unguarded by the contract checks — `.scratch/carry-forward/issues/247-note-path-unguarded-by-contract-checks.md` |
