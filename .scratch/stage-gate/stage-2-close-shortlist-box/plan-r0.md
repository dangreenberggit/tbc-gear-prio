# Plan — stage-2-close-shortlist-box

## Goal

PLAN.md §14 Stage 2's last gate box — `☐ ≥3 real characters produce believable shortlists` — is either checked, amended to a named reduced set, or left open with evidence, and `docs/verification-log.md` carries a dated entry that says which and why. The entry quotes fresh SME verdicts produced on rankings regenerated at this tip (engine pin v0.0.119, owner-export feral skeleton), not the stale 2026-08-06/08 verdicts. Ticket 250 is closed or updated with a domain verdict and a corrected DPS pair measured on the current pin. Ticket 227 carries a disposition note. Non-blocking findings are carry-forward tickets. `pnpm verify` is green on the tip.

## Approach

Regenerate the three rankings first, re-measure ticket 250's DPS pair on the current pin second, then spend exactly one `gate-sme` spawn on everything that needs domain judgment: the three shortlists (Q1), ticket 250's rotation-regression verdict (Q2's domain half), and the unprompted healer-row watch (Q3). One SME pass, one handoff, per the stage-gate skill's "the executor spawns `gate-sme` once" rule and the brief's "do not run the SME pass twice". Documentation reconciliation comes last, keyed to the verdict strings.

**Strongest rejected alternative:** three separate SME spawns, one per character. Rejected because the stage-gate pipeline dispositions one SME handoff per plan (a second spawn is reserved for `contested` verdicts), because ticket 250's verdict is a reading of the same feral output and a second pass would duplicate it, and because per-character spawns can return inconsistent caveat thresholds that Gate C then has to arbitrate. The cost — one seat reads three reports — is the cheap side of that trade.

**A second rejected alternative:** trust the existing three SME handoffs and close the box on paper. Rejected because all three predate the engine pin moves (`0c1902e`, `0dc29b4`), the 22-action rotation adoption (`d41c46c`), and the owner-export skeleton (`25e8173`, `b7bcf51`) — the rankings they judged no longer exist, and two of the three verdicts were `do-not-trust` anyway (C7).

### What the stale write-up gets wrong now

The box section in `docs/verification-log.md` (§ around line 1354, dated 2026-08-08) contains statements that are false at this tip; Step 6 corrects them in the new entry rather than editing history:

1. "only shredzepelin was ever put through `sme-rank-review`" — false. `.scratch/handoffs/` holds `sme-rank-judgment-feral-nexess.md` and `sme-rank-judgment-ret-slamaltman.md` (both `do-not-trust`, committed `3c18776`, 2026-08-06) besides shredzepelin's (`trust-with-caveats`, `78ca9af`, 2026-08-08). Verified: `ls .scratch/handoffs | grep sme-rank-judgment` plus `git log -1 --format='%h %ad' -- <file>`.
2. "the count of usable characters is 2, not 3 … closing this box still needs a genuine cat capture for shredzepelin" — resolved. Commit `78ca9af` added `test/fixtures/shredzepelin-cat.raw.json` (Void Reaver, ~98.8% cat, DPS role), and `packages/core/src/cli.ts` routes `--character shredzepelin` to it; the Morogrim fixture is retained only as a regression fixture for the off-tank warning. Phase-2 ticket 06 is closed.
3. PLAN.md:859's "only shredzepelin has been through `sme-rank-review` … Run it after this branch merges to `dev`" — stale on both counts (see 1; the feral universes are long since on `dev`).

### Open questions

**Q1 — does the box close?** Candidates A (close), B (close on a named reduced set — changes what the box asserts), C (leave open) are all retained, win conditions exactly as pre-registered in the brief: A wins if all three verdicts are `trust`/`trust-with-caveats` with every caveat fixed here or SME-agreed-ticketed; B wins if one character is structurally unjudgeable and the other two return `trust`; C wins on any `do-not-trust` or a non-disclosure wrongness finding. **Measurement:** the verdict strings from Step 5's single `gate-sme` handoff, on Step 3's regenerated reports. The committed fixtures cannot pre-measure this — the verdict *is* a judgment, which is the whole reason the box is open — so the plan carries the decision rule, not a predicted winner. Note B's precondition looks weaker than when the brief was drafted: the structural blocker it anticipated (shredzepelin's wrong-fight capture) was fixed by `78ca9af`, so B now needs a *new* structural finding to win.

**Q2 — is the ~18 DPS feral regression expected, or a mismatch?** Short circuit first: the 740.67/722.55 pair was measured on the `feature/backend-reforge` binary (`cbf6b75`) against a skeleton that has since been rebuilt from the owner's export — both inputs are superseded (C5), so the pair is re-measured on the current pin before any explanation is chosen.
- **Candidate C (mid-rework upstream) is retired by evidence at the content level:** the lock's `feral_default.apl.json` entry is pinned at tag v0.0.119 and the synced vendored file carries the same 22-action `priorityList` (C3), so the rotation we adopted *is* the rotation v0.0.119 ships. It is not fully dropped: if Step 2's re-measure reproduces a gap that Step 2's cast metrics cannot attribute, the executor may reopen it — but it cannot win on "the branch differs from the tag" grounds any more. Stated reason for retiring: measured, not assumed.
- **Candidate A (expected on its own terms)** wins if every rotation action fires in the v0.0.119 result and the residual gap tracks a nameable gear/tier difference.
- **Candidate B (unmet preconditions)** wins if a specific action shows zero casts tied to a specific unset skeleton input. Instrument: the `wowsimcli` result JSON's per-action cast metrics (ticket 250 is right that `scripts/apl_schema.py` cannot see this).
- **Measurement:** Step 2's commands. Feasibility is verified, not assumed: the committed skeleton is a directly runnable `RaidSimRequest` — a 100-iteration probe on the v0.0.119 binary returned `raidMetrics.dps.avg = 774.87` (C4), already above the old pair's 740.67, so **hypothesis, untested at 20k:** the regression as originally stated does not survive the re-measure. If that holds, Q2 collapses to "superseded measurement, no regression to explain" and the SME's ticket-250 verdict records exactly that.

**Q3 — disclosure scope for ticket 227's healer rows?** Candidate A (surface the per-row mechanism) wins if the SME, unprompted, calls the feral shortlists misleading because of those rows; Candidate B (do nothing this branch, 227 stays open) wins if the SME does not raise them. **Measurement:** whether Step 5's handoff raises the healer rows without being prompted — the `gate-sme` prompt must not mention ticket 227, healer items, or mana. The committed fixtures cannot measure this any other way: it is defined as an unprompted-judgment observation. Pre-registered consequence: A → the disclosure need becomes a Q1 caveat, handled under Q1-A's rule (fix here only if the SME says the shortlist misleads without it; otherwise a carry-forward ticket the SME signs off on); B → Step 6 adds a dated note to ticket 227 and it stays open.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | The engine pin at tip is tag v0.0.119, commit `3267f8d` | yes | `grep -E '"(tag|commit)"' data/wowsims.lock.json` |
| C2 | The pinned binary exists locally at `vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe`; `vendor/` is gitignored, so a fresh worktree regenerates it with `pnpm fetch:wowsimcli` (works for a real tag) and `pnpm sync:wowsims` | yes | `ls vendor/wowsimcli-v0.0.119-win32-x64/`; gitignore: `git check-ignore vendor/wowsims/db.json` |
| C3 | v0.0.119 ships the same 22-action feral APL that `d41c46c` adopted: the lock pins `feral_default.apl.json`, the synced file's sha256 matches the lock, and its `priorityList` has 22 entries | yes (retires Q2-C) | `python -c "import json;print(len(json.load(open('vendor/wowsims/feral_default.apl.json'))['priorityList']))"` → `22`; `pnpm sync:wowsims:check` |
| C4 | `data/presets/feral/p2.raid-sim-skeleton.json` is directly consumable by the pinned binary (`sim --infile`), after setting `simOptions.iterations`/`randomSeed`; 100-iteration probe returned dps 774.87 | yes | `./vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe sim --infile <skeleton+simOptions> --outfile <out>` (run 2026-08-21, planner scratchpad) |
| C5 | The 740.67/722.55 pair predates both the v0.0.119 pin (`0dc29b4`) and the owner-export skeleton (`25e8173`, `b7bcf51`); no literal CLI invocation for it is recorded anywhere in the repo | yes | `git log --oneline -4 -- data/wowsims.lock.json`; `git log -1 d41c46c --stat`; ticket text in `.scratch/carry-forward/issues/250-*.md` |
| C6 | `pnpm rank` (`tsx packages/core/src/cli.ts`) is offline-only (hard-errors without `--offline`), deterministic, and routes slamaltman→`slamaltman.raw.json`, shredzepelin→`shredzepelin-cat.raw.json` (Void Reaver), nexess→`nexess.raw.json`; `--report` writes `.html` (+`.json`, `.run.log`) | yes | `pnpm rank --help`; routing in `packages/core/src/cli.ts`; run Step 3's commands |
| C7 | All three characters have prior SME handoffs — nexess `do-not-trust` (2026-08-06), slamaltman `do-not-trust` (2026-08-06), shredzepelin `trust-with-caveats` (2026-08-08) — and all three predate the pin/rotation/skeleton changes, so none is usable for the gate | yes | `git log -1 --format='%h %ad' -- .scratch/handoffs/sme-rank-judgment-{feral-nexess,ret-slamaltman,feral-shredzepelin}.md` vs `git log -1 --format=%ad 0c1902e d41c46c b7bcf51` |
| C8 | The verification-log box section's three statements listed under "What the stale write-up gets wrong" are false at tip | yes | the commands cited per item above |
| C9 | PLAN.md line 857 still carries `☐ ≥3 real characters produce believable shortlists`; line 859's prose is stale per C7/C8 | yes | `grep -n '☐ ≥3 real characters' PLAN.md` |
| C10 | `pnpm verify` includes `feral-skeleton-apl:check` (`scripts/check_build_feral_skeleton.py`), which since `b7bcf51` gates the skeleton against the owner's export, so a green tip pins skeleton↔rotation parity | no | `grep 'feral-skeleton-apl:check' package.json`; `pnpm run feral-skeleton-apl:check` |
| C11 | At tip the feral above-cutoff sets are 20 rows (p2) and 43 (p3), baseline 2145.6, per `b7bcf51`'s commit message — superseding ticket 250's 27/55 | no | reported in `git show -s b7bcf51`; **re-observed by Step 3's regenerated reports before any artifact cites it** |
| C12 | The pre-rewrite rotation is retrievable for an A/B comparator: `git show d41c46c^:data/presets/feral/p2.raid-sim-skeleton.json` | yes | that command exits 0 and the JSON differs from tip's in its rotation block |
| C13 | Tickets 227, 241, 250, 251 are open; 234 is parked `wontfix`; phase-2 ticket 06 is closed | no | `pnpm issues:open` |
| C14 | Re-measured on v0.0.119 with the owner-export skeleton, the ~18 DPS regression does not reproduce as stated | no | **hypothesis, untested at 20k** (C4's 100-iteration probe is directional only) |
| C15 | The recorded SimRunner fixtures at tip were re-recorded on v0.0.119 (`simVersion: v0.0.119` in `packages/core/test/fixtures/synthetic-roster-recordings.json`, commit `b7bcf51`) | no | `grep -o '"simVersion":"[^"]*"' packages/core/test/fixtures/synthetic-roster-recordings.json \| head -1` |

## Steps

Serial; single writer; no fan-out. Commit per green slice (steps 2, 3, 5, 6 each end in a commit).

**1. Baseline.** Run `git rev-parse HEAD` (must be `9a4b932…` or a descendant on `feat/stage-2-close-shortlist-box`) and `pnpm verify`. If `vendor/` is missing (fresh worktree): `pnpm fetch:wowsimcli && pnpm sync:wowsims` first — do not assert vendored files exist without `ls` (C2).
*Done when:* `pnpm verify` exits 0. *Depends:* C1, C2, C10.

**2. Q2 re-measure (short circuit).** Files: create `.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/` holding two request JSONs, two result JSONs, and a `commands.md` with the literal invocations (ticket 250's pair had none recorded — C5 — so this time the command is the artifact).
 a. Current arm: tip `data/presets/feral/p2.raid-sim-skeleton.json` with `simOptions.iterations=20000`, `randomSeed="42"`, run through `vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe sim --infile … --outfile …` (C4).
 b. Old-rotation arm: same tip skeleton but with its rotation/APL block replaced by the one from `git show d41c46c^:data/presets/feral/p2.raid-sim-skeleton.json` (C12) — only the rotation varies, isolating it from the owner-export skeleton change.
 c. Record both `raidMetrics.dps.avg` values. If the new rotation is no longer materially worse (gap within ~2× stdev-of-mean), C14 held: ticket 250's pair is superseded and the "regression" is an artifact of superseded inputs. If a real gap remains, extract per-action cast counts from arm (a)'s result JSON; zero-cast actions decide Candidate B (name the unset input), otherwise Candidate A (name the gear/tier difference, or mark it `hypothesis` if unnameable).
*Done when:* both arms' request+result files and `commands.md` are committed, and `commands.md` states which Q2 candidate the numbers picked and why. *Depends:* C2, C3, C4, C5, C12, C14.

**3. Regenerate the three shortlists.** Run, on the tip:
```
pnpm rank --region US --realm dreamscythe --character slamaltman   --offline --spec ret   --max-phase 3 --report .scratch/rank-reports/stage2-close-slamaltman.html
pnpm rank --region US --realm dreamscythe --character shredzepelin --offline --spec feral --max-phase 2 --report .scratch/rank-reports/stage2-close-shredzepelin.html
pnpm rank --region US --realm dreamscythe --character nexess       --offline --spec feral --max-phase 2 --report .scratch/rank-reports/stage2-close-nexess.html
```
(Exact flags per C6; if the CLI rejects a flag, read `--help` and adapt, logging the deviation.) Note each feral report's above-cutoff row count next to C11's 20/43.
*Done when:* three `.html`+`.json` reports committed under `.scratch/rank-reports/`, each `.run.log` naming its source fixture and fight (shredzepelin's must say Void Reaver, not Morogrim). *Depends:* C6, C11.

**4. Assemble the SME input note.** One short file, `.scratch/stage-gate/stage-2-close-shortlist-box/sme-input.md`: the three report paths, the regen commands, ticket 250's path plus Step 2's re-measured pair, and the per-character pool files. **It must not mention ticket 227, healer items, or mana** — Q3 is measured by unprompted judgment.
*Done when:* file committed and contains no string matching `grep -iE '227|healer|mana|intellect|spirit|mp5'`. *Depends:* C7.

**5. One SME pass.** Spawn `gate-sme` once (model `opus`, per the stage-gate skill), pointing at Step 4's note. Ask for: a verdict (`trust`/`trust-with-caveats`/`do-not-trust`) **per character**, and a ticket-250 verdict on the new above-cutoff set. Handoff: `.scratch/handoffs/sme-rank-judgment-stage2-close-shortlist-box.md`. Commit it verbatim. A second spawn only if the executor's ledger marks a verdict `contested`.
*Done when:* handoff committed with three per-character verdict strings and a ticket-250 section. *Depends:* C6, C7; Q1/Q2/Q3 decision rules.

**6. Disposition and documentation.** Apply the pre-registered rules:
- Q1: pick A/B/C from the verdict strings. A → check the box; B → amend the gate line to name the trusted set and record the third's blocker (Stage 0 ☒ `race` precedent); C → box stays ☐ with the blocking finding named.
- Update `docs/verification-log.md`: new dated entry (do not rewrite the 2026-08-08 section; correct it by reference) quoting the verdicts, their handoff path, the regen and re-measure commands, and the three stale-statement corrections from "What the stale write-up gets wrong", each with its citing command (durable-claims rule).
- Update PLAN.md line 857 (and the stale prose at 859) to match the entry exactly.
- Ticket 250: close (or update) with the domain verdict; the 740.67/722.55 pair explicitly superseded by Step 2's numbers and command — its third acceptance checkbox.
- Ticket 227: Q3-B → dated note, stays open; Q3-A → handle as a Q1 caveat (fix on-branch only if the SME says the shortlist misleads without it; else a carry-forward ticket the SME agreed to).
- File carry-forward tickets for any other non-blocking SME findings; link them from the log entry.
*Done when:* `grep -n '≥3 real characters' PLAN.md` shows the amended line; the new log entry exists; ticket 250's acceptance boxes are all resolvable by reading it. *Depends:* C8, C9, C13, Step 2, Step 5.

**7. Final gate.** `pnpm verify` on the tip; `git status --porcelain` clean; `git diff --stat 9a4b932..HEAD` touches only Paths-manifest files (anything else becomes a ledger row).
*Done when:* verify exits 0 and the diff-stat check passes. *Depends:* C10.

## Paths manifest

Create:
- `.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/` (requests, results, `commands.md`)
- `.scratch/stage-gate/stage-2-close-shortlist-box/sme-input.md`
- `.scratch/rank-reports/stage2-close-slamaltman.{html,json,run.log}`
- `.scratch/rank-reports/stage2-close-shredzepelin.{html,json,run.log}`
- `.scratch/rank-reports/stage2-close-nexess.{html,json,run.log}`
- `.scratch/handoffs/sme-rank-judgment-stage2-close-shortlist-box.md`
- `.scratch/carry-forward/issues/<new-number>-*.md` (zero or more, from Step 6)

Modify:
- `docs/verification-log.md`
- `PLAN.md` (lines 857 and 859 area only)
- `.scratch/carry-forward/issues/250-feral-rotation-regression-unreviewed.md`
- `.scratch/carry-forward/issues/227-healer-role-items-score-above-the-feral-cutoff.md` (note only)

No partition — the work is serial and single-writer; no `parallel-phase` fan-out.

## Verify recipe

```
pnpm verify
git status --porcelain                      # must be empty
git diff --stat 9a4b932..HEAD               # only manifest paths
grep -n '≥3 real characters' PLAN.md        # line matches the new log entry's disposition
grep -n 'stage2-close' docs/verification-log.md
pnpm issues:open                            # 250 closed or updated per Step 6
grep -iEc '227|healer|mana' .scratch/stage-gate/stage-2-close-shortlist-box/sme-input.md   # 0
```

## Out of scope

- The role-relevance product question (ticket 234, parked `wontfix`) — no re-opening, no re-running 227's diagnostics to settle it.
- Ticket 241 (skeleton validation) and ticket 251 (stale `watchedRefs`) — named here so the executor does not absorb them; they stay open.
- `WclGearSource` / going live; any Stage 3 web-shell work.
- Editing the historical 2026-08-08 verification-log section in place — corrections land in the new entry.
- Merging to `dev`; `pre-merge-review` and the merge ask happen after this pipeline, per the normal loop.
- Changing the skeleton, the rotation, the pool, or any ranking code — if a `do-not-trust` verdict demands a code fix, that is a loop-back to the gatekeeper, not silent scope growth.
