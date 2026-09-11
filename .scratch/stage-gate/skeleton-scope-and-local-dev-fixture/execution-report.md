# Execution report — skeleton-scope-and-local-dev-fixture

Written by `gate-executor` (Opus) 2026-09-10 against `plan.md` revision 1 at
base `43052fb`. Committed verbatim by the orchestrator.

## Status: complete

Steps 1–10 executed in order on `feat/reforge-catchup-leftovers`, base `43052fb`. Ten commits. `pnpm verify` green on the tip.

## What landed

The one idea the stage exists to land is now in writing twice, each carrying its own evidence. **ADR-0031** (`docs/adr/0031-the-raid-sim-skeleton-is-a-cli-harness-input-not-a-product-input.md`) records that the raid-sim skeleton is a CLI-harness input and the Upgrades tab never reads one, with the owner's quote, three measured gates, and the caller census. **CONTEXT.md** gains a `raid-sim skeleton` glossary entry pointing at it — the entry an agent hits before it knows the area, which is where the confusion starts.

All three Step 1 stop-conditions held exactly: the enh rank printed `unknown spec: enh (known: ret, feral)` (rc=2), the ret rank printed `no-qualifying-fight` (rc=1), and the caller census returned exactly 3 call sites. C17 held — ticket 362 is `Status: closed`. The Step 6 guard comment matched C12/C20 verbatim.

The two things I was told not to undo are intact. **Ticket 367 is `Status: open`**, with its "Why `open` and not `wontfix`" section and the reopening condition named; `wontfix` appears twice, both inside that reasoning. **Ticket 350 records option 2 as the mirror case, not an override** — the guard comment is quoted in full, the scope distinction is stated on its own terms, no intent is attributed to its author, and the word "override" appears exactly once in the file, in the sentence denying it.

**The fork tree was present**, so C8, C13, C18, C20 and C21 were all re-verified live rather than downgraded. No "not re-verified in this checkout" caveat was needed anywhere. The fork pin measurement reproduced exactly: remote tip `d49096e9`, pin `0b50f402` on no remote, 211 commits ahead.

Step 6 is comment-only: 9 insertions, **0 lines removed** against base, guard condition untouched, prettier and eslint both rc=0. The fork's copy is untouched — `vendor/` clean, the fork's own `git status` clean, `ticket 350` → 0 there. `engine-port-drift:check` confirms it behaviourally: *33 ported files match PROVENANCE.md*.

## Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| 1 | Commit the three probe files per the Paths manifest | `.gitignore` re-ignores `.scratch/stage-gate/*` and whitelists each stage dir by name; this stage's dir was missing, so `git add` refused all three files and the first commit landed nothing | **adapt + flag** | Every sibling stage has such a line, including `ticket-365-dual-wield-fixture` (Step 7's target, which *is* tracked). An omission, not a decision. Without it Step 1 has no deliverable and ADR-0031 + ticket 367 cite probe paths no reader could open. Added the one whitelist line in **its own commit** (`11c73cb`), since `.gitignore` is outside the manifest. |
| 2/9 | Step 2 acceptance is silent on line numbers; Step 9 requires `.ts:[0-9]` → 0 in the ADR | First draft had 4 hits, all inside fenced blocks as verbatim `grep -n` output | **adapt** | Rewrote the *displayed commands* to use `grep`/`grep -rl`/`grep -c` instead of `grep -n`, so every claim stays re-runnable but the document asserts no line number. No claim changed. |
| 2 | — | My rewording left the same fork comment explained twice in consecutive sentences | **adapt** | Merged into one reading quoting the comment's own words. Separate commit (`c31bb1a`) because the ADR was already committed. |
| 3 | `git diff --stat -- CONTEXT.md` under 12 lines | First draft was 14 insertions | **adapt** | Tightened the prose to 11 lines. Ordering, ADR reference and substance unchanged. |
| 8 | Plan implies one commit per step | Step 8 covers two files (ticket 367 and `NEXT`) | **adapt** | Committed together — the plan explicitly says "write `368` to `NEXT` in the same commit". |
| — | Tree clean at end | Four files remain untracked: `brief.md`, `plan.md`, `plan-review.md`, `decision-log.md` | **flag** | These are **the orchestrator's own artifacts**, outside my Paths manifest. They were untracked because of the same `.gitignore` gap; my line now makes them committable. The orchestrator should commit them alongside `execution-report.md`. I did not touch them. |

One non-deviation worth recording: git warned `CRLF will be replaced by LF` on ticket 350. Checked rather than assumed — 0 CR characters in both the working copy and the committed blob, and `--ignore-cr-at-eol` gives an identical 91/11 stat. No endings flipped.

## Commits

```
$ git -C C:/Users/dgree/Code/lulz/tbc-gear-prio log --oneline 43052fb..HEAD
656755b File 367: generated skeleton set has no consumer
4b72595 Mark the parked dual-wield fixture plan superseded
7be347b State the off-hand guard's scope in its comment
5dde65a Unblock 350 and record option 2 as the mirror case
049bf4b Rescope 365 as a CLI-only test-coverage gap
c31bb1a Merge two duplicate readings of the same comment
b24bb1d Add raid-sim skeleton to the CONTEXT glossary
632c745 Record ADR-0031 on raid-sim skeleton scope
d35f10f Record the skeleton-reachability gate measurements
11c73cb Track this stage's directory under .scratch/stage-gate
```

Ten commits against the plan's "≥ 7" floor: eight steps (Step 9 creates no files), plus the `.gitignore` prerequisite and the ADR duplication fix.

`git diff --stat 43052fb..HEAD` covers 12 files, 641 insertions, 34 deletions — every path in the Paths manifest, plus `.gitignore`. No path outside it was edited.

## Verify

`node --version` → `v22.17.1`, `pnpm --version` → `11.24.0`, run from Bash.

```
$ pnpm -C C:/Users/dgree/Code/lulz/tbc-gear-prio verify > verify-tip.log 2>&1
rc=0
```

Tail — `upstream-drift:warn` is the last check and the only non-empty output, as C1 predicted:

```
$ python scripts/list_phase_pool.py --check
pool listings check ok: both listings match a fresh regeneration
$ python scripts/warn_upstream_drift.py
upstream drift (warning only -- does not fail the build):
  DRIFT: new release available: ec5c5f205e61049d730e460967f8488774a7fe2a -> v0.0.134
  a watched ref that moved may have gained a feature we treat as absent;
  see .scratch/carry-forward/issues/244-engine-pin-predates-timetonextenergytick.md
```

`Test Files 62 passed (62)`, `Tests 1271 passed | 1 skipped | 2 todo (1274)`. `grep -c 'PROVENANCE.md is stale'` → **0**; `engine port drift check ok: 33 ported files match PROVENANCE.md`. Two lines matching `failed` are passing tests whose names contain the word ("degrades a failed screening pass"), not failures.

## Final status

```
$ git -C C:/Users/dgree/Code/lulz/tbc-gear-prio status --porcelain
?? .scratch/stage-gate/skeleton-scope-and-local-dev-fixture/brief.md
?? .scratch/stage-gate/skeleton-scope-and-local-dev-fixture/decision-log.md
?? .scratch/stage-gate/skeleton-scope-and-local-dev-fixture/plan-review.md
?? .scratch/stage-gate/skeleton-scope-and-local-dev-fixture/plan.md
```

No tracked file is dirty. The four untracked entries are the orchestrator's stage artifacts (ledger row 6) — now committable thanks to the `.gitignore` line, and yours to commit with the report.

Not done, by instruction: no merge to `dev`, no `pre-merge-review`. Ticket 268 stays open — PowerShell still resolves Node 20.18.1 and dies on `node:sqlite`; the Bash path is a workaround, not a fix.
