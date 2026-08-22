# Execution report — stage-2-close-shortlist-box

Written by the gate-executor seat, 2026-08-21. Base `1ecd2e5`, branch
`feat/stage-2-close-shortlist-box`, shared checkout. Reproduced verbatim; the
orchestrator's Gate C dispositions are in `decision-log.md`.

**Headline: the gate box stays ☐ — a real answer, not a stall.** Q1 resolved to
Candidate C on a pre-registered rule: one of three characters returned
`do-not-trust`. The blocker is pool coverage, is ticketed (253), and is not sim
noise. Separately, ticket 250 is **closed** with its premise refuted in sign.

## Steps

- **Step 1** — binary sha256 `4b60235dcbb0088c9644ba464223fc9f65fcb3fccb2710cfc37fa3c752db97b1`,
  22,305,280 bytes; C1/C2/C3 upheld independently (`priorityList` = 22). Verify
  green: 46 files, 857 passed, 1 skipped, 2 todo. Ticket 240 checked rather than
  assumed — the single skip is `wowsims-fork-parity`, gated on ungenerated protos
  under `vendor/tbc-new-fork`, not on the ranking path. Commit `6c0f6cc`.
- **Step 2** — C16's one-directional coupling re-verified before being relied on.
  Three arms, 20k iterations, seed 42. Commit `893e0c8`.
- **Steps 3–4** — trip-wire did not fire: slamaltman 200 s (p3, 391 candidates)
  against the 15-minute wire; shredzepelin and nexess 144 s each. Transcripts
  carry invocation, resolved fixture path, binary digest and the CLI's
  `gear read from …` line; shredzepelin reads **Void Reaver**. R7's prediction
  held — the report-`meta` fallback was unused and **no production code was
  touched**. Commit `2949a43`.
- **Step 5** — seat 1 cold read; frame backstop clean. Commit `62413b6`.
- **Step 6** — seat 2, coordinator-approved second spawn. Commit `7cf9383`.
- **Step 7** — box left ☐ with the blocker named; PLAN.md:859's two false clauses
  corrected; 125-line verification-log entry; ticket 250 closed; 227 noted;
  tickets 253/254/255 filed.
- **Step 8** — verify 0, porcelain empty, all 13 verify-recipe lines pass.

## SME verdicts

Seat 1 — `.scratch/handoffs/sme-rank-judgment-stage2-close-shortlists.md`:

| character | verdict |
| --- | --- |
| slamaltman | `trust-with-caveats` |
| shredzepelin | **`do-not-trust`** |
| nexess | `trust-with-caveats` |

Seat 2 — `.scratch/handoffs/sme-rank-judgment-stage2-close-ticket-250.md`:
**`trust-with-caveats`** on the re-measurement. Neither seat misfired the
`WRONG_MODEL` guard; the pre-emptive correction in their prompts worked, so
ticket 252 needs no new incident recorded.

## Candidates, and the evidence

**Q1 → Candidate C (box stays open).** shredzepelin's `do-not-trust`. Worn gear
absent from the candidate pool makes a slot score against an *empty slot*,
inflating every candidate in it. Three such slots (neck, back, waist) leave
**4 of 14** above-cutoff rows measured against real gear; nexess, on identical
code, pool and spec, has one and is usable. Confirmed against the artifact:
`ranking.plausibilityWarnings` names all three with `cause: worn-unrankable`.
Not traced to replicate spread, so the ticket-236 clause does not apply. Filed
as **ticket 253**.

**Q2 → premise refuted in sign; ticket 250 closed.** Arm 1 (tip) 782.14, Arm 2
(old package) 740.67, Arm 3 (old rotation + tip consumables) 739.23. Rotation
main effect **−42.91 DPS at 62 σ** against the pre-registered 2×combined-SEM
bound of 1.38 — the new rotation is *better*. Consumables move −1.44, inside the
bound. Arm 2 reproduces the ticket's 740.67 to the cent, so the stale half of its
pair was 722.55. Seat 2 corroborated with cast-count shape (powershifts
39.1→46.8; Shred and Bite up, Rip flat — the correct shape, not an over-Rip
artifact) and a 3× variance ratio (stdev 32.23 vs 91.86), making −42.91
conservative.

**Q3 → Candidate B (227 stays open).** Seat 1 raised no healer/mana row
unprompted: `grep -inE 'healer|mana|intellect|spirit|mp5|caster'` over its
handoff returns nothing, and its input note passed the backstop. Informative
silence — the seat returned a `do-not-trust` on other grounds, so it was reading
closely. The note on 227 records both greps and two limits: the seat read feral
**p2** while 227's measurement is on the **p3** sweep, and unprompted silence is
weaker evidence than a direct question.

## Deviation ledger

| # | Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | Commit artifacts under `.scratch/…` | Both directories gitignored by `.gitignore:40`; `git add` refused | **adapt** | Steps 1/2/4/5/6 acceptance all say "committed" and the log entry cites these paths as evidence. `.gitignore` documents the `!` re-include idiom for exactly this. |
| 2 | 1 | (manifest lists no `.gitignore`) | Edited `.gitignore`, outside the manifest | **flag** | Unavoidable consequence of row 1. Scoped narrowly; a blanket re-include swept in 16 prior sessions' scratch dirs, so it was reset and narrowed. |
| 3 | 2 | Noise bound = 2× the SE "reported in the two results" | Result JSON reports per-iteration `stdev`, no SE field | **adapt** | Step 2d names this fallback. Used SEM = `stdev/√iterations`; basis recorded in `commands.md`. |
| 4 | 2 | Branches cover Arm 3 ≈ Arm 1, Arm 3 materially **above**, or arms unrunnable | Arm 3 materially **below** by 42.91 — material with the opposite sign, matching no branch | **flag** | A plan gate: the branch selects ticket 250's ruling, so an unlisted exit is the orchestrator's call. Took the non-branching work (the corrected measurement) and left attribution to seat 2. **Also refutes C14.** |
| 5 | 2 | Fourth arm if effect material *and* seat 2 needs consumables priced | Effect material, but Arm 3 − Arm 2 already prices consumables at −1.44 with rotation held constant | **adapt** | Step 2e makes the fourth arm conditional on need. Skip recorded in `commands.md`. |
| 6 | 4 | C11: feral above-cutoff 20 (p2) / 43 (p3), baseline 2145.6 | Live: shredzepelin 14, nexess 12; baselines 2266.9 / 2302.5 | **adapt** | C11 was non-load-bearing and the plan required re-observation before any artifact cited it. Supersession recorded. No p3 feral run this branch, so the 43 has no counterpart. |
| 7 | 6 | Second `gate-sme` spawn deviates from spawn-once | As planned | **flag (pre-approved)** | Separation enforced: seat 2 ran only after seat 1's handoff was committed, on different inputs, instructed not to re-issue shortlist verdicts. It complied. |
| 8 | 6 | — | Seat 2 corrected a claim the executor had written into `commands.md` (that zero-cast branches mean tip understates its DPS) | **adapt** | Verified in the rotation JSON before accepting: `22788` is guarded by `selectedConjured == 22788` (pick is `12662`); `31677` appears only inside a `not selectedPotion(31677)` guard; `22105` has zero rotation references. Selecting one would *replace*, not add. Ticket 255 filed. |
| 9 | 7 | Tickets "zero or more" | Filed 253, 254, 255 | (within plan) | Listed for the diff check. |
| 10 | 7 | — | `.scratch/carry-forward/issues/NEXT` read `246` while tickets through `252` existed | **adapt** | Pre-existing drift from earlier sessions. Allocated 253–255 from the max on disk and set `NEXT` to 256 per the issue-tracker doc's same-commit rule. |
| 11 | 5/6 | Correct a spurious `WRONG_MODEL` via SendMessage | Neither seat misfired | (no action) | Both prompts carried the pre-emptive correction. |
| 12 | 7 | — | Seat 1 called two slamaltman rows an "internal inconsistency" | **adapt** | Too strong; not passed through. The cutoff is an OR of `absDps: 3.4` and `pct: 0.15`; both rows clear the percentage arm (0.164, 0.162). Recorded as a presentation issue in ticket 254 with the correction stated. |

Nothing was **stopped**: no finding refuted a load-bearing register claim, and the
`do-not-trust` demands no code fix on this branch — the pre-registered rule turns
it into "box stays open", so no loop-back was triggered.

## Verify

**Exit 0.** `git status --porcelain` empty. `git diff --stat 1ecd2e5..HEAD` →
37 files, +55,667/−9, all within the Paths manifest except the four ledgered
additions (`.gitignore`, tickets 253/254/255, `NEXT`). No production code
changed — `packages/core/src/cli.ts` and its test untouched, as R7 predicted.

## Handover

- `pre-merge-review` and the merge ask are the orchestrator's; neither was run and
  `dev` was not touched.
- **Ticket 253 is the gate's critical path.** Its two suspected causes (holiday
  loot invisible above id 100000; heroic-dungeon drops excluded — 177 items at
  difficulty 1 vs 1 at difficulty 2) are seat 1's measurements, marked in the
  ticket as not yet independently re-derived. Worth confirming against the
  pool-building code before scheduling the fix.
- The `.html` reports add ~20k lines. They are committed per the plan, but if the
  gate should cite the `.json` alone that is a cheap trim.
