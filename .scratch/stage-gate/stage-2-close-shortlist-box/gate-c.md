# Gate C — dispositions

2026-08-21. Every deviation-ledger row and every out-of-manifest path, dispositioned
by the orchestrator. Verified against the artifacts rather than accepted on the
executor's word where a check was cheap.

## Independent verification before dispositioning

| claim | how checked | result |
| --- | --- | --- |
| Arm DPS 782.14 / 740.67 / 739.23 | read `raidMetrics.dps.avg` out of the three committed result JSONs | **confirmed to the cent** |
| All arms at 20k / seed 42 | `grep` the three request JSONs | **confirmed** |
| Rotation effect 42.91 vs a 1.38 bound | recomputed SEM = stdev/√20000 per arm, combined in quadrature | **arithmetic confirmed, estimator wrong** — see the correction below |
| Consumables contrast inside the bound | same method on Arm 3 − Arm 2 | **confirmed** (−1.44 against a 1.636 bound) |
| Arm 2 reproduces ticket 250's 740.67 | direct comparison | **confirmed** — this is what validates the whole rig |
| shredzepelin's three `worn-unrankable` slots | read `ranking.plausibilityWarnings` from the committed JSON | **confirmed** — neck, back, waist |
| nexess has one, on identical code/pool/spec | same read | **confirmed** — wrist only. This is what makes 253 a pool bug, not a spec-wide flaw |
| `.gitignore` scoped narrowly | read the diff; `git ls-files .scratch/` | **confirmed** — re-includes only this stage-gate dir and `stage2-close-*`; no other session's scratch swept in |
| Tree, diff scope | `git status --porcelain`, `git diff --name-only` | **confirmed** — clean; `.gitignore` the only out-of-manifest path |

**One orchestrator error worth recording.** A first pass read
`plausibilityWarnings` at the JSON top level, where it does not exist, and the
`.get(...,[])` default silently returned zero warnings for all three characters —
contradicting an earlier query that had found six. Rather than pick the convenient
answer, the structure was dumped: the field lives under `ranking`. The zero was an
artifact of the query, not of the data. Noted because a silent default that
returns "nothing wrong" is exactly the shape of a check that passes by not looking.

## Ledger dispositions

| # | Row | Disposition | Reason |
| --- | --- | --- | --- |
| 1 | Scratch dirs gitignored, `git add` refused | **accepted** | The plan's acceptance criteria say "committed" and the log entry cites these paths as evidence. Adapting was right; the alternative was evidence that `git clean -fdx` would delete. |
| 2 | `.gitignore` edited, outside the manifest | **accepted** | Unavoidable consequence of row 1, and the executor caught its own over-broad first attempt and narrowed it rather than committing 16 other sessions' scratch. Verified narrow. |
| 3 | SEM fallback (no SE field in the result JSON) | **accepted, with the reason corrected below** | Step 2d names this fallback explicitly and the basis is recorded. The original reason cited independent recomputation, which does not detect a wrong *estimator* — see the correction. The fallback stands because its bound is the conservative one. |
| 4 | Material effect with the **opposite sign** — matched no pre-registered branch | **accepted, and this is the run's best moment** | The executor hit a genuine gap in the plan and did not improvise a ruling. It took the non-branching work, recorded both arms, and escalated attribution to seat 2. That is exactly the adapt-vs-flag-vs-stop judgment this seat exists for. It also refutes C14, the plan's own hypothesis — recorded as such rather than quietly dropped. |
| 5 | Fourth arm skipped | **accepted** | Step 2e made it conditional on need; Arm 3 − Arm 2 already prices consumables with the rotation held constant. Skipping avoided the reverse splice the plan warns silently disarms branches. |
| 6 | C11's 20/43 superseded by live 14/12 | **accepted** | C11 was flagged non-load-bearing precisely so a live re-observation could supersede it, and the plan required re-observation before any artifact cited it. The plan's own discipline working. |
| 7 | Second `gate-sme` spawn | **accepted (pre-approved)** | Authorised at Gate B. Separation was enforced and verified: seat 2 ran only after seat 1's handoff was committed, on different inputs. |
| 8 | Seat 2 corrected the executor's own written claim | **accepted** | The executor re-verified the correction in the rotation JSON before accepting it rather than deferring to the seat. Ticket 255 filed. Correct handling in both directions. |
| 9 | Tickets 253/254/255 filed | **accepted** | Within the plan's "zero or more". |
| 10 | `NEXT` counter drift (read 246, tickets existed through 252) | **accepted** | Pre-existing drift from earlier sessions, not introduced here. Allocated from the max on disk and reset the counter per the issue-tracker doc. Fixing it was cheaper than routing around it. |
| 11 | Neither SME seat misfired `WRONG_MODEL` | **accepted, and it is evidence** | The pre-emptive correction carried in both prompts worked. Recorded on ticket 252 as a workaround that holds, not as a fix. |
| 12 | Seat 1's "internal inconsistency" not passed through | **accepted** | The executor checked the claim against the cutoff rule (an OR of `absDps: 3.4` and `pct: 0.15`; both rows clear the percentage arm at 0.164 and 0.162) and downgraded it to a presentation issue with the correction stated. Refusing to launder an overstated SME finding into a committed artifact is the right call. |

## Out-of-manifest paths

`.gitignore` — the only one. Dispositioned at row 2 above.

## Orchestrator change at this gate

The three `.html` reports (~20k lines of generated markup) were dropped from
tracking in `1139926`. The log entry's own verification command reads the
`.json`, so the HTML was never the cited evidence, and it would churn on every
regeneration. The `.json` and `.stdout.txt` files — which carry the provenance
line, resolved fixture path and binary digest — remain tracked. `pnpm verify`
re-run after the change: **exit 0**, tree clean.

## Correction, 2026-08-21 — after the pre-merge adversarial axis

The row above originally read "confirmed … 62.3 σ", and the justification given
for accepting ledger row 3 was that "the orchestrator recomputed the statistic
independently". That defence does not hold, and the reasoning is worth keeping.

**Recomputation confirms arithmetic, not the choice of estimator.** All three
arms share `randomSeed = "42"`, so they are paired rather than independent, and
combining SEMs in quadrature is the independent-sample formula. Re-deriving the
same wrong formula's output more carefully cannot detect that. The sigma count
is withdrawn from every artifact that carried it (verification log, `commands.md`,
ticket 250); the effect size, the bound and the conclusion stand, because 42.91
DPS survives any plausible SE and the quadrature bound is the conservative one.

The general lesson matches the two orchestrator errors already in
`decision-log.md`: checking that a computation is internally correct is not the
same as checking that it is the right computation.

## Gate C outcome

**PASS.** Every ledger row and the single out-of-manifest path dispositioned;
no row required rework or escalation. `pnpm verify` exit 0 on the tip; tree
clean. Proceed to `pre-merge-review`.
