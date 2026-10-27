Status: open
Type: process
Origin: r4 wording review of the round-rule patch, `.scratch/agent-reports/2026-10-26-general-task-round-rule-r4-review.md` § "Faults seen but not fixed" (gitignored, owner's checkout), and an owner comment, 2026-10-26
Blocks: none
Blocked by: branch `feat/usage-limit-fixes` merged into dev (the text below is on that branch only)

# The stage-gate rules for later plan chunks have three gaps

The faults are in text on branch `feat/usage-limit-fixes`, which is not
yet on dev. Line numbers are at `feat/usage-limit-fixes` ea5e1b5b, after
the round-2 review fixes (the ticket first cited 54b5e2c9, the r4 patch
applied; the cited text is unchanged since). `.claude/skills/stage-gate/SKILL.md` and its mirror
`.agents/skills/stage-gate/SKILL.md` are identical (`diff` rc 0), so
each SKILL.md line number holds for both copies. Re-find the lines on
dev once the branch has merged.

Every fix here edits the stage-gate skill or an agent file. AGENTS.md §
Writing for agents says to propose those edits in chat and wait for the
owner's approval. This ticket proposes no wording.

## 1. The session can wait for a Gate C that never runs

`SKILL.md:374-375` (step 5): after `K1`, the session plans the next
chunk "When its Gate C passes and the Backburner is not "none"".

`SKILL.md:406-408` (step 5): a chunk goes to Gate C before the next
chunk starts only when its handoff `Status` is not `success` or its
ledger has a `flag` or `stop` row; "an `advisory` row waits for the
final Gate C". `SKILL.md:454-456` (step 6) says the same for a Gate C
between chunks.

So a `K1` that ends in `success` with only `advisory` rows gets no Gate C
between chunks. A session that reads line 375 literally waits for a Gate
C that never runs, or runs one that the other two rules skip. The r4
review found this and did not fix it, because it was outside that
patch's purpose.

## 2. The per-chunk review count may not survive a session restart

`SKILL.md:326-333` (**Review limit per chunk**) caps each chunk at three
reviews and says the session counts the reviews of each chunk
separately. The round number `<n>` counts every review in the stage, so
it is not that count.

`SKILL.md:480-481` (§ Recovery) says a fresh session resumes from
`decision-log.md`. The `spawn` line format at `SKILL.md:153` has a last
field `<mode, part id or chunk id>`, so a reviewer spawn line can name
its chunk, but no rule says it must. If it does not, a fresh session
cannot tell from the log how many reviews each chunk has had, and may
miscount: hypothesis, untested (no restart has been tried).

## 3. Should a planner check its own plan against the size budget?

r4 made the "plan too big, split it" check run only before the first
review in the stage (`SKILL.md:245-249`, `re-split: over budget`). The
planner's stage budget, one chunk with steps and about 350 lines, also
applies only to the first plan (`.claude/agents/gate-planner.md:26-30`).
No rule tells a planner to check its own plan against the budget before
it ends its turn: not in a first plan, not in `next:` mode
(`gate-planner.md` § Next chunk, :129-142), and not in a revision
(§ Revisions, :104-127).

The owner's comment on 2026-10-26, on r4 making the split check run only
before the first review: "Hopefully the planning agent figures this out
by the end of the plan and checks itself, but sure".

Question for the fix: should the planner check its own plan against the
budget before it ends its turn, in every mode? Note for whoever drafts
it: after `K1`, `plan.md` holds the steps of every planned chunk, so a
whole-file line count grows with each chunk; a budget for `next:` mode
may need to count only the new chunk (hypothesis, untested).

## Done when

Each of items 1-3 has a rule change the owner approved and applied, or an
owner ruling not to change it, recorded here.

## Comments

### 2026-10-27: items 1 and 2 applied; item 3 still open

The owner approved the drafted fixes for items 1 and 2 on 2026-10-27 with
the words "plain fixes approved" (relayed by the session). The drafts are
edits 1a, 1b, 2a and 2b in
`.scratch/agent-reports/2026-10-27-general-task-stage-gate-fault-drafts-v2.md`
(gitignored, owner's checkout). They are applied on branch
`feat/stage-gate-open-faults`, not yet merged into `dev`:

- Item 1: `a886eac3` (edits 1a and 1b).
- Item 2: `b0afc857` (edits 2a and 2b). The `spawn` line of an
  **Added-lines check** reviewer is marked `added-lines`, and a fresh
  session leaves those lines out of a chunk's review count, because that
  check does not count toward the three reviews (**Review limit per
  chunk**). `c8737b8a` renamed the check **Unasked-changes check** and
  its marker `unasked-changes` (ticket 712, § Comments, 2026-10-27).

Item 3 is still open. The owner rejected measuring a plan's work in
lines (relayed by the session on 2026-10-27), so the drafted fault 3
option A, which counts lines, is not applied.
