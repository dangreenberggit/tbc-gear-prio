# Pre-merge review — feat/chunked-executor

Reviewed range: `6caed2ab0d3349a6e4341f6464b7c9137ee0bd39..7f0805d2c071dc88f326dae3b7335ecbb4e73496`
Reviewed range: `7f0805d2c071dc88f326dae3b7335ecbb4e73496..7ca1f3773c287eab052c494536e0000da81c1b49`
Reviewed range: `7ca1f3773c287eab052c494536e0000da81c1b49..e914e56fc9ced8169734ad35d7b9480a96883aae`
Reviewed range: `e914e56fc9ced8169734ad35d7b9480a96883aae..f74cd7b8460b16baa92da6dcbabe6c080a5e7c9f`
Reviewed range: `f74cd7b8460b16baa92da6dcbabe6c080a5e7c9f..e989a2eb2e4ce892481e5a740e3f27e24af9dbaa`

Dispatch: no `codex` on `PATH`. Every axis ran as a fresh `general-task`
subagent on Opus (review lane), in the foreground, told to write nothing.
Round 1 ran all three axes. Rounds 2–5 reviewed only the fix commits of
the round before, on the adversarial and standards axes. This is a small
docs-only change, so in-scope findings were fixed on the branch and no
tickets were filed.

The change splits the stage-gate Executor into one fresh `gate-executor`
per plan chunk (token audit §3.4, owner-approved 2026-09-25), adds a short
`progress.md` resume file that also records why non-obvious decisions were
made, and adds a `NEEDS_PRIOR_CONTEXT: <question>` return that the
orchestrator routes to the earlier chunk's executor with `SendMessage`.

## Adversarial

Round 1 found no blocking issue and four material ones: `progress.md` was
told to be committed although `.scratch/stage-gate/*` is gitignored (A1);
worktree mode loses earlier chunks' commits (A2); a chunk with a flagged
plan gate did not stop the run (A3); a `NEEDS_PRIOR_CONTEXT` return dropped
the ledger (A4). Minor: A5–A9. Rounds 2–5 (R, T, U ids) found gaps in the
fixes themselves: the progress file path, dirty trees on respawn, the
meaning of "ends `success`", Gate C between chunks, and the last chunk's
status. Round 5 was clean.

## Domain

**Domain: clean.** The diff states no TBC, WCL or wowsims fact and does not
touch `gate-sme` or `sme-rank-review`.

## Standards + Spec

Mirrors are byte-identical (`diff -r .claude/skills/stage-gate
.agents/skills/stage-gate`), no banned words were added, and the commit
subjects meet the house rules. Spec: S1–S4 of audit §3.4 and both owner
additions are present. Findings S1–S13 are below.

## Summary

All findings were fixed on the branch except three wontfix notes. The
final text runs plans without an `Execution chunks` section (or with
"none") as one chunk, `K1`, which is today's behaviour. The rules were
not exercised in a real stage-gate run (hypothesis, untested, until the
next stage-gate plan uses chunks).

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                   |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | progress.md is no longer committed; executor told it needs no ledger row                        |
| A2  | Adversarial | fixed       | a plan with more than one chunk uses the shared checkout                                        |
| A3  | Adversarial | fixed       | any non-success Status or flag/stop row goes to Gate C before the next chunk                    |
| A4  | Adversarial | fixed       | NEEDS_PRIOR_CONTEXT return carries the ledger so far; orchestrator appends it                   |
| A5  | Adversarial | fixed       | manifest exemption for progress.md added to gate-executor.md                                    |
| A6  | Adversarial | fixed       | missing or "none" chunks section means one chunk, K1, covering every step                       |
| A7  | Adversarial | fixed       | each chunk's base SHA is logged with its agent id                                               |
| A8  | Adversarial | fixed       | woken executor is asked to answer only; the most recent agent for the chunk is used             |
| A9  | Adversarial | fixed       | template says dependency wins over chunk size and is named on the chunk line                    |
| S1  | Standards   | fixed       | same fix as A1                                                                                  |
| S2  | Standards   | fixed       | executor: no chunk id means the whole plan; SKILL keeps the missing-or-none rule                |
| S3  | Standards   | fixed       | progress.md called the executor's resume file, not a stage artifact                             |
| S4  | Standards   | fixed       | unsourced causal sentence removed                                                               |
| S5  | Standards   | fixed       | "few tool calls" became "fewer than about 25 tool calls"                                        |
| S6  | Standards   | fixed       | decision-log definition mentions chunk and question lines                                       |
| S7  | Standards   | fixed       | gate-executor description says it implements one chunk                                          |
| S8  | Spec        | fixed       | same fix as A3                                                                                  |
| S9  | Spec        | fixed       | same fix as A2                                                                                  |
| S10 | Spec        | fixed       | rework respawn gets a fresh base SHA                                                            |
| S11 | Spec        | fixed       | answer-only request; Recovery respawns a large executor from progress.md                        |
| S12 | Spec        | wontfix     | interim NEEDS_PRIOR_CONTEXT ledger is not a report; the chunk's final report still runs verify  |
| S13 | Spec        | wontfix     | Gate-C-before-next-chunk rule kept although not in §3.4: it stops a flagged gate reaching K2    |
| R1  | Adversarial | fixed       | executor gets the absolute path of progress.md                                                  |
| R2  | Adversarial | fixed       | orchestrator checks status and HEAD before an executor respawn and names dirty paths            |
| R3  | Adversarial | fixed       | superseded by T1                                                                                |
| R4  | Adversarial | fixed       | final ledger lists only rows added since the NEEDS_PRIOR_CONTEXT return                         |
| R5  | Adversarial | fixed       | SendMessage-or-respawn for the answer uses the same 25-call threshold                           |
| R6  | Adversarial | fixed       | Gate C between chunks returns to step 5; final Gate C covers the rest                           |
| R7  | Standards   | fixed       | long lines rewrapped                                                                            |
| T1  | Adversarial | fixed       | trigger is the handoff Status; a NEEDS_PRIOR_CONTEXT return is not a handoff                    |
| T2  | Adversarial | fixed       | non-success Status is dispositioned; next chunk only when all accepted                          |
| T3  | Adversarial | fixed       | executor finishes named dirty paths or stops blocked (lint-staged commits every dirty file)     |
| T4  | Standards   | fixed       | remaining long lines rewrapped                                                                  |
| U1  | Adversarial | fixed       | every Gate C, including the last, dispositions non-success statuses                             |
| U2  | Adversarial | wontfix     | rework clause says "ledger row" for a status disposition too; reviewer judged the meaning plain |
