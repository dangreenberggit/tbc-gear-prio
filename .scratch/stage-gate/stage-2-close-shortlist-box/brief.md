# Brief — close the last Stage 2 gate box

Opened 2026-08-21. Base SHA `9a4b932543e74da9a9a8bb8ce31b55813331f34d`, branch
`feat/stage-2-close-shortlist-box` off `dev`.

## Goal

Close PLAN.md §14 Stage 2's one remaining gate box — **"≥3 real characters
produce believable shortlists"** — or record, with evidence, why it cannot
close yet.

This is the last thing standing between the repo and Stage 3. It is a **domain**
judgment, not pipeline work: the pipeline already ranks three characters end to
end from committed fixtures. What is missing is a subject-matter reading of the
output.

## Why now, and what has shifted since the box was last touched

The box's write-up in `docs/verification-log.md:1354` is dated 2026-08-08. A lot
has landed on `dev` since, and **some of it moved the very rankings an SME must
judge**. The planner must establish current state before planning against that
write-up — several of its statements are expected to be stale.

Known movement, to be verified rather than trusted:

- **The engine pin moved twice** — to `feature/backend-reforge`, then to tag
  **v0.0.119** (`0dc29b4`). Fixtures were re-recorded.
- **Upstream's feral cat rotation was rewritten** (12 → 22 actions) and adopted
  in `d41c46c`. Measured at ~18 DPS *worse* on our skeleton, and it moved the
  ranking more than the DPS: feral's above-cutoff set went 15 → 27 rows,
  feral-p3's 36 → 55. This is open **ticket 250**, and its acceptance criteria
  explicitly suggest `sme-rank-review` on the new above-cutoff set.
- **A feral skeleton was built from the owner's real export** (`25e8173`,
  `b7bcf51`).
- Open **ticket 227** — ten healer-statted items score above the feral cutoff.
  Its blocking ruling (234) was parked `wontfix`, so its actionable scope is
  **disclosure only**; do not re-open the role-relevance product question.
- Open **ticket 241** — nothing validates the raid-sim skeleton, which silently
  determines every ranking.

## Scope

In scope:

- Establishing what the three characters' shortlists *currently* look like on
  this tip, regenerated, not read from a stale report.
- Running the `sme-rank-review` skill to get a domain verdict per character.
  Audience is the **engineering team** (gate and bugs), not player loot advice.
- Ticket 250's domain verdict, because it is the same reading on the same
  output — do not run the SME pass twice.
- Recording the outcome in `docs/verification-log.md` and reconciling PLAN.md
  §14's gate line to it.
- Filing carry-forward tickets for findings that do not block the box.

Out of scope:

- Deciding the role-relevance product question (ticket 234, parked `wontfix`).
- Building `WclGearSource` / going live (PLAN.md §14 Stage 3 flag).
- Any Stage 3 web-shell work.
- Re-running ticket 227's diagnostics to settle 234.

## Open questions

Each carries a candidate that is a genuinely different approach, the result that
would make it win — written down before measuring — and how it gets measured.

### Q1. Does the box close on the three characters as they now stand?

- **Candidate A — close it.** Wins if all three characters return an SME verdict
  of `trust` or `trust-with-caveats` where every caveat is either fixed on this
  branch or filed as a carry-forward ticket that the SME agrees does not make
  the shortlist misleading.
- **Candidate B — close it on a reduced, explicitly named set.** Genuinely
  different: it changes what the box asserts rather than what the evidence is.
  Wins if one character is structurally unjudgeable (e.g. its capture is still
  the wrong fight) *and* the other two both return `trust`, in which case the
  box is amended in PLAN.md to name the two, with the third's blocker recorded —
  the same honesty precedent as Stage 0's ☒ `race` box, which closed as a
  documented "no".
- **Candidate C — leave it open.** Wins if any character returns `do-not-trust`,
  or if a finding shows the ranking is wrong in a way that is not a disclosure
  gap.
- **Measured by:** regenerate each character's ranking on this tip, then one
  `sme-rank-review` pass per character. The verdict strings are the measurement.

### Q2. Is the ~18 DPS feral rotation regression expected, or a mismatch?

- **Candidate A — expected on its own terms.** Their rotation is tuned for gear
  or a tier that is not our skeleton. Wins if the new rotation's actions all
  fire and the DPS gap tracks a gear/tier difference we can name.
- **Candidate B — unmet preconditions.** Parts never fire because our skeleton
  leaves something unset. Wins if a specific action is shown not firing, tied to
  a specific unset input. `scripts/apl_schema.py` reports unknown *fields*, not
  unmet *preconditions*, so this needs a different instrument.
- **Candidate C — mid-rework upstream.** Wins if v0.0.119's rotation — the
  version the live site runs, and our current pin — differs from
  `backend-reforge`'s, making the measured branch not the thing we ship.
  **Note the pin has since moved to v0.0.119**, so the 740.67 / 722.55 pair was
  measured on a binary we no longer pin; re-measuring on the current pin may
  retire this question outright, and that possibility must be checked first.
- **Measured by:** re-measure the pair on the currently pinned binary before
  anything else. Then whichever candidate the new numbers point at.
- A candidate the plan drops carries a stated reason.

### Q3. What is the disclosure scope for ticket 227's healer items?

- **Candidate A — surface the mechanism per row** (why a mana-driven item scores
  where it does). Wins if the SME says the shortlist reads as misleading without
  it.
- **Candidate B — do nothing this branch, keep 227 open.** Wins if the SME reads
  the current output and does not flag those rows as misleading — in which case
  it is a latent presentation gap, not a gate blocker.
- **Measured by:** whether the SME pass on the feral characters independently
  raises the healer rows. Do not prompt for it.

## What done means

`docs/verification-log.md` carries a dated entry that either closes the box or
records why it stays open, with the SME verdicts quoted and their handoff paths
named. PLAN.md §14's Stage 2 gate line matches that entry. Ticket 250 is closed
or updated with its domain verdict. Findings that do not block are carry-forward
tickets. `pnpm verify` is green on the tip.

## Constraints

- Durable claims rule (AGENTS.md): every causal claim in a committed artifact
  points at a re-runnable command or says **hypothesis** / **untested** in the
  same sentence. A property measured against one option is not a comparison.
- Do not run the SME pass on stale output. Regenerate first, and record the
  command.
- `sme-rank-review` is the review lane. Do not substitute a weaker seat.
- Do not merge to `dev`. `pre-merge-review` runs after this, then the user is
  asked.
