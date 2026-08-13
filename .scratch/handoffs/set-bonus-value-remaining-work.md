# Handoff — remaining work on `feat/set-bonus-value`

Written 2026-08-13, after review rounds 5 and 6. For an agent who was not in
that conversation and needs to turn this into a plan.

**Read first:** `docs/reviews/feat-set-bonus-value.md` — rounds 5 and 6 at the
bottom, then the Disposition table. Every item below traces to a row there and
to a ticket under `.scratch/carry-forward/issues/`.

## Where the branch stands

- 174 commits vs `dev`. `pnpm verify` green (39 files, 748 tests, 2 todo).
  `pnpm merge-ready` green.
- Six review rounds done. Rounds 1–4 covered the feature work; round 5 covered
  the previously-unreviewed round-5 commits **and audited the review process
  itself**; round 6 closed two coverage gaps round 5 found.
- **One blocking bug is open (item 1).** Do not merge to `dev` until it is
  fixed, and the merge itself needs the owner to ask — see "Rules that bite"
  at the bottom.

## What kind of bug this branch keeps producing

Three of the items below are the same shape, and it is worth naming because it
predicts where to look:

> The code cannot work something out, so it stays quiet — and the report then
> looks confident and complete.

Not a crash, not a wrong number you could spot. A missing warning, a dropped
row, or a sentence that describes something that is not there. The project
treats this as its worst case, because nothing downstream can catch it. Items
1, 2 and (historically) the two bugs that `cfc77c9` was written to fix are all
this shape.

**Practical consequence for whoever plans this:** a fix for one of these is not
done when the code changes. It is done when a test *fails without the fix*.
Round 6 found that the previous fix for exactly this shipped green because its
tests never built the situation it was supposed to handle.

---

# 1. BLOCKING — two rings can make a gear slot vanish from the report

**Ticket:** `150-dead-slot-classifier-silently-drops-a-slot-with-two-owned-zero-rows.md`
**Review row:** 6-A1 (high)
**Files:** `packages/core/src/dead-slots.ts:140` (`wornRowOf`), `:172` (caller)

**What happens.** The dead-slot analysis groups rows by gear slot, then asks
"which of these rows is the item the player is already wearing?" It answers by
looking for the single row with zero DPS change. If it finds exactly one, fine.
If it finds two, it returns `null` — and the caller then does `continue`,
dropping the whole slot from the output.

So `classifyDeadSlots` returns nothing for that slot and `deadSlotWarnings`
returns an empty list. A slot with a genuine problem (for example a set bonus
being broken by a swap) produces **no warning, no error, and a report that
looks fine**.

**Why two rows tie.** `owned` is recorded per item id (`rank.ts:704`), and the
paired-slot guard (`rank.ts:730`) means an item already worn is only ever tried
in its own slot — so it produces an identity swap, i.e. exactly zero DPS change.
Wear two rings that are both in the item pool and you get two rows that are both
`owned: true, deltaDps: 0`. Same for two trinkets.

**This is not a corner case.** Any character wearing two pooled rings hits it on
every run.

**Reproduced** against `packages/core/dist/`:

    rows = [ {finger, 100, deltaDps: 0, owned: true},
             {finger, 200, deltaDps: 0, owned: true},
             {finger, 300, deltaDps: -300} ]
    classifyDeadSlots(rows, {})  ->  []

**The history matters, and should shape the fix.** This code was *already fixed
once* for this exact class of bug. Round 2 found that it picked an arbitrary
zero row as "the worn one", which could suppress a real warning. Commit
`cfc77c9` fixed that by returning `null` on ambiguity — trading a wrong guess
for silence. The commit message argues `null` is "the honest outcome when the
worn item cannot be identified".

That reasoning is wrong here, and the planner should not preserve it: the
ambiguity is an artifact of grouping by **pool slot** (`finger`) while `owned`
is tracked **per item**. Both rows *are* correctly identified worn items. There
is nothing genuinely ambiguous — the grouping just threw the distinction away.

**Direction (not prescriptive).** Either group by equipped item rather than by
pool slot for paired slots, or emit one dead-slot entry per owned zero row.
Whatever shape is chosen, the hard requirement is: **a slot that cannot be
classified must still produce a warning.** Silence is the failure mode.

**Test requirement.** `cfc77c9`'s own tests never constructed a two-`owned`
slot, which is why it shipped green. The new test must build that situation and
must fail against today's code before the fix goes in.

**Related but separate:** open ticket 86 (`piecesAfterSwap` uses `owned` as an
equipped proxy) is a different call site with the same root confusion about what
`owned` means. Worth reading together; do not assume fixing one fixes the other.

---

# 2. A set-bonus line describes the contents of a number that does not exist

**Ticket:** `152-selfconfound-backfill-stamps-rows-that-have-no-figure.md`
**Review row:** 6-A3 (medium)
**File:** `packages/core/src/rank-report-rules.ts:238` (`withSelfConfoundDisclosed`)

**What happens.** This function adds a disclosure to 4-piece set-bonus rows,
saying the figure includes a 2-piece effect that cannot be separated out. It
decides based on the threshold and whether the sibling 2-piece row is
unmeasurable — but it **never checks whether the 4-piece row has a figure at
all**.

So a 4-piece row that is itself unmeasured (not enough pieces in the pool, not
implemented in the sim, sim failed, gem repair failed) still gets the
disclosure stamped on it. The CLI then prints:

    Crystalforge 4pc (1 worn) — [includes the unmeasured 2pc effect, can't be
    separated from it] not enough pieces in the pool to build the package

It claims a figure "includes" something, immediately before saying there is no
figure.

**The deeper problem.** The live path in `rank.ts` gets this right — it only
sets the flag on the measured result, after the unmeasured branches have already
bailed out. So **two code paths that are supposed to agree do not**, and this
function's own docstring claims it "derives the exact condition `rank.ts` checks
live". The docstring is false.

**Why only the CLI leaks it.** The HTML renderer happens to return early for
unmeasured rows, so it never displays the bad line. That is luck, not a
safeguard — worth stating plainly in whatever fix lands, so nobody later
"simplifies" the renderer and exposes it.

**Direction.** Add the unmeasured check to the guard so it matches the live
path, then pin the agreement with a test on an unmeasured 4-piece row — so the
docstring's claim is backed by a test rather than by prose.

---

# 3. Gem-swap notes are missing on set-completion rows

**Ticket:** `144-ticket-107-disclosure-does-not-reach-the-package-arm.md`
**Review row:** 5-S1 (low)
**File:** `packages/core/src/rank.ts:1197`

**What happens.** When the code has to move gems around to make a swap work, it
tells the reader which gems moved. That disclosure was added for the ordinary
single-item rows. The set-completion package rows still go through
`equipmentForCandidateSwap`, which throws the swap list away — so those rows
carry no note.

**Impact is mild and worth stating honestly:** nothing false is printed. Those
rows are simply silent where the policy says they should speak. This is
narrower than the bug the disclosure was originally written for, where rows
carried an actively wrong claim.

**Note for the planner:** `PLAN.md` section 9 policy item 5 is written over
adjustments generally, so the shipped behaviour is narrower than its own policy.
Check the interaction with item 1's ticket and with ticket 139's fix (already
merged) — all three touch what a row claims about the gems it was priced with.

---

# 4. A tie count nobody reads, and a fallback that still guesses

**Ticket:** `151-dead-slot-owned-fallback-and-unread-tied-candidates.md`
**Review rows:** 6-A2 (medium), 6-A4 (low)
**File:** `packages/core/src/dead-slots.ts:95, 141, 183, 226`

Two loose ends from the same commit as item 1. Lower severity, same area — a
planner may want to fold them into item 1's work rather than schedule
separately.

**4a — the tie count is never shown.** `cfc77c9` added a `tiedCandidates` field
specifically to carry information the report is otherwise "silent about by
construction". Verified: outside `dead-slots.ts` itself, the only reference in
the whole repo is one assertion in `dead-slots.test.ts:164`. No renderer reads
it, `plausibility.ts`'s `deadSlotMessage` does not read it. The count never
reaches a human. The stated reason for adding the field was not delivered.

Worse in combination: when all candidates tie, the runner-up gap is 0 and the
row is classified "benign — nothing better", which produces no warning. That is
the same suppression round 2 filed, now resting on a field nobody reads.

**4b — the no-ownership fallback still guesses.** `dead-slots.ts:141`:

    const candidates = owned.length > 0 ? owned : slotRows;

If no row carries ownership info, the code falls back to exactly the guessing
behaviour that was supposed to have been removed. Today `rank.ts:924` always
sets `owned`, so the live path is safe. The exposure is re-rendering an older
saved JSON report from before that field existed — which is precisely the
scenario the sibling backfill function exists to serve.

**Direction.** Decide explicitly whether the no-ownership case should classify
or refuse, and say so in the code rather than leaving a silent fallback. Either
surface `tiedCandidates` to a reader or delete the field.

---

# 5. A research document's conclusion contradicts its own findings

**Ticket:** `143-meta-gem-research-verdict-contradicts-its-closed-gaps.md`
**Review row:** 5-D3 (low)
**File:** `.scratch/handoffs/issue-1-upstream-gem-cleanup/meta-gem-research.md`

The document investigated two open questions about meta gems and answered both
against committed data. Line 117 records that they are closed, and the commit
(`23df60f`) says so.

But the **Verdict section at the bottom still states both as unresolved**, in
the present tense. Anyone who scrolls to the conclusion — the normal way to read
a document like this — gets the stale answer.

**Why this is worth fixing rather than shrugging at:** files under `.scratch/`
are agent-facing under this repo's writing rules. A superseded conclusion
sitting in the summary position is a live trap for the next agent that reads it,
not just untidiness.

**Direction.** Strike the superseded text or mark it closed in place, citing the
verification pass that closed each question.

---

# 6. A lookup table that is safe only by accident

**Ticket:** `142-socketbonusactive-socketless-behaviour-is-new-and-unasserted.md`
**Review rows:** 5-D2 (low), 5-D4 (informational)
**Files:** `packages/core/src/meta.ts`, `packages/core/src/candidate-gems.ts:139`

Two small things in one ticket.

**6a — a predicate quietly gained a third behaviour.** Commit `2f32a2b` merged
two near-identical functions into one `socketBonusActive`, described as
one-definition-from-two. The merged version opens with `if (sockets.length === 0)
return true`. One predecessor had that; the other returned `false` for an item
with no sockets. So one call path flipped from false to true.

Harmless today — an item with no sockets has an all-zero bonus that scores
nothing — but it is a third behaviour neither original had, with no test and no
comment. Add a test pinning "no sockets means vacuously active, contributes
zero" so a future change to socket-bonus scoring cannot silently credit a bonus
to an item with nowhere to put a gem.

**6b — the meta-preference table has one row.** `SPEC_PREFERRED_METAS` lists a
preferred meta gem for `ret` only. The comment justifies this with "a spec the
pipeline cannot detect cannot reach this code", which is true: the detectable
specs are `ret`, `feral`, `feral-tank`.

The safety rests entirely on that list staying short. If a caster spec ever
becomes detectable, it silently falls into "no preference recorded" and gets an
empty meta socket — a quiet quality regression rather than a loud error. Not a
bug now. Add a line to the comment saying what to do when the list grows.

---

# 7. PROCESS — reviews systematically skipped the fix commits

**Ticket:** `145-review-rounds-chain-to-the-review-sha-not-the-fix-sha.md`
**Review row:** P1 (high)

**This is the most valuable item on the list.** It is why items 1, 2 and 4
survived to now.

**The mechanism.** Each review round set its starting point to the commit the
*previous round reviewed*. But a round's fixes are written *after* that commit.
So every round's fix commits fell in the gap between "where the last review
looked" and "where this review starts", and no round ever read them.

Three windows on this branch, each confirmed with `git merge-base --is-ancestor`:

- **Gap A** — `a38fbf4..5d5dffa`, 19 commits. The round-5 feature work. Its only
  coverage was an execution log written by the same agent that wrote the code.
  **Closed by review round 5.**
- **Gap B** — `3adbe4f..3f5e21b`, 13 commits. Round 4 claims "rounds 1–3 covered
  `dev..3f5e21b`". That claim is false — five round-3 fix commits sit in the
  gap. **Closed by review round 6.**
- **Gap C** — `cfc77c9` itself, the commit that fixed round 2's two
  silent-failure bugs. Round 3's range excluded its own lower bound.
  **Closed by review round 6.**

**The payoff proves the point.** Gap C's single commit — a fix for two
silent-failure bugs, never reviewed — contained item 1, a new silent failure of
the same class. A fix commit is exactly where a reviewer is most needed, and
exactly what the rule skipped.

**The gaps are now closed. The rule is not fixed.** That is the remaining work.

**Two parts:**

1. Change the chaining rule in `.agents/skills/pre-merge-review/SKILL.md` **and
   its `.claude/skills/` mirror** (they are byte-compared by
   `pnpm mirrors:check`, so both must move together). Simplest form: each round
   records the sha it reviewed *through*, and the next round starts there.

2. Consider making `check_merge_ready.py` verify that the reviewed ranges
   actually cover `dev..HEAD`. Today the gate passes if a review *file exists*
   — it has no idea whether anyone reviewed the code. All three gaps passed
   green. `AGENTS.md` already warns the gate "does not run the review"; this is
   that warning's concrete failure.

**Approval note:** editing skill files and `AGENTS.md` requires proposing the
change in chat and waiting for the owner's approval. Do not edit them directly.

---

# 8. PROCESS — two different tickets both numbered 100

**Ticket:** `146-ticket-100-id-collision-and-uncommitted-work.md`
**Review row:** P3 (medium)

Two files in `.scratch/carry-forward/issues/` both begin with `100-`:

- `100-set-potential-panel-is-default-off-...md` — **closed**, an old bug about
  a report panel being hidden by default.
- `100-p3-curated-list-pinned-to-p2-set.md` — **open**, about P3 reports showing
  P2 gear in the curated list. The owner committed this on 2026-08-13
  (`9e36b25`); it was untracked before that.

They are unrelated problems that happen to share a number.

**Why it matters practically:** the review file's Disposition table, commit
messages, and `pnpm merge-ready` output all refer to tickets by number. When
any of them says "ticket 100", a reader cannot tell which problem is meant. The
Disposition row `2-S1` points at the closed one; nothing distinguishes them at a
glance.

**Fix.** Rename the newer one — the next free number is **153**. Update any
references to it.

**Second, larger half.** The P3 ticket substantially overlaps open **ticket
121** (`no-upstream-ret-p3-curated-gear-set-to-pin`), which covers the same
upstream gap. The 100 file adds material 121 lacks: a critique of where the
stale-set warning sits (below the checkbox it is correcting, so subordinate to
the claim it contradicts), and the observation that the staleness check can
detect *older* but never *absent*. Decide whether to merge them or cross-link;
one problem tracked in two places will drift.

---

# 9. PROCESS — two open tickets are invisible to the merge check

**Ticket:** `147-merge-ready-status-regex-misses-body-status-lines.md`
**Review row:** P4 (medium, latent)

`check_merge_ready.py:35` finds a ticket's status with a pattern anchored to the
start of a line: `^\s*Status:\s*(\S+)`.

Tickets **88** and **89** write theirs as `**Status:** open` — bold markdown —
so the pattern does not match and both tickets report as having no status. The
open count reads 36 when it is really 38.

**Why it matters:** a ticket the tooling cannot see is a ticket that cannot
block a merge or appear in `pnpm issues:open`. It is silent under-reporting —
the same shape as open ticket **85** (`merge-ready parses only the first
disposition table`), which is worth reading alongside this.

**Fix.** Normalise the two tickets **and** widen the pattern. The important half
is the third change: **a ticket file whose status cannot be parsed should be an
error, not silently treated as absent.** Otherwise the next unusual format
disappears the same way.

**Related hygiene found in the same audit, lower priority:** about 36 closed
tickets cite no commit sha anywhere, and 17 use a non-standard `resolved` status
with no `Closed:` field, so their closures cannot be audited. No fake closing
sha was found — ten suspicious-looking hex strings were all legitimately
upstream pins or content digests.

---

# 10. PROCESS — one round skipped review, and two rounds have no record

**Ticket:** `148-round-5-ran-no-review-axes-and-rounds-4-5-have-no-dispatch-log.md`
**Review row:** P5

Four separate observations, each independently actionable:

- **Round 5 ran no review at all.** 19 commits of behavioural change shipped
  with only a self-authored execution log — written by the agent that wrote the
  code. No opt-in recorded, no label in the review file, both of which the
  review skill requires. This is how the meta-socket disclosure bug (since
  fixed) reached the branch tip.
- **No dispatch log covers rounds 4–5.** `agent-usage-log.md` stops at
  2026-08-11; both rounds are 2026-08-12. Their claims about which models ran
  which axis are self-reported and unverifiable. The review lane is exactly
  where an unbacked claim matters, because independence is the whole point.
- **Round 2's "the domain axis died mid-stream and was re-run"** has no
  corroborating evidence anywhere. Plausible and probably true, but it is a
  causal claim in a committed document with nothing a reader can re-run —
  which is the standard `AGENTS.md` sets.
- **Five implementation workers ran on the most expensive model tier** by
  inheriting it rather than being assigned one. `docs/agents/model-policy.md`
  names this exact scenario as the thing to avoid. Partly addressed already by
  commits `d8b0698` / `ff5ca69`; verify the fix covers the path those workers
  took.
- **The parallel fan-out had no written disjointness check.** `AGENTS.md` calls
  this "a claim to verify, not eyeball". The slices *were* disjoint in fact, but
  two of them wrote files outside their declared paths — so disjointness held by
  luck of the partition's shape, not by the required check.

**Not a violation, recorded so it is not re-flagged:** the round-4 delegator ran
on Fable. The policy restricts *review axes* to Opus, and those did run Opus;
aggregating findings and applying fixes is a sanctioned use.

---

# 11. PROCESS — six leftover repo checkouts

**Ticket:** `149-six-worktrees-still-registered-after-fan-out.md`
**Review row:** P6

`git worktree list` shows six beyond the main checkout, left from parallel work
that was never torn down. **No work is lost** — every branch involved is already
merged into HEAD. This is debris.

Two are worth more than tidiness:

- `.scratch/wt-fan-out-retro` — a stale full checkout **inside `.scratch/`**,
  which is where the test runner scans. The parallel-phase skill warns about
  this explicitly; it can cause confusing test-collection behaviour.
- `.claude/worktrees/terminology-cleanup-plan-82f471` — its branch merged into
  HEAD at `4f8081a`, so it has no remaining purpose.

Also roughly 70 unpruned branches.

**Caution for whoever does this:** check `git -C <path> status` on each worktree
before removing it. These were never formally torn down, so one may hold
uncommitted work.

---

# 12. Cosmetic

- **Commit `4562efc` has a stray `@` as the first line of its message** — a
  shell quoting slip when the round-5 review was committed. Fixing it means
  rewriting two commits of history. Left alone deliberately; do not rewrite
  history without the owner asking.
- **`.claude/launch.json` stays untracked** — owner's explicit decision. It is a
  local dev-server config pointing at gitignored scratch output. Do not commit
  it, and do not add it to `.gitignore` without asking.

---

# Rules that bite (read before planning)

These are repo rules that will trip an agent who does not know them. All are in
`AGENTS.md`; this is a pointer, not a replacement.

- **Never merge to `dev` without the owner asking.** A combined "review and
  merge" request is explicitly *not* enough — the review has to finish, the
  owner has to see it, and then they ask separately. `pnpm merge-to-dev` is the
  only supported route. Never set `TBC_ALLOW_DEV_MERGE=1`.
- **`git add <paths>` does not scope a commit.** The pre-commit hook runs
  `lint-staged` against everything, so any dirty file rides along. Check
  `git status` is clean of other people's work before each commit.
- **Commit per green slice**, not once at the end.
- **`pnpm verify` before every push.** It runs typecheck, lint, format, tests,
  and about a dozen data-integrity gates.
- **Editing `AGENTS.md`, `CLAUDE.md`, or any skill file requires in-chat
  approval first.** Propose, wait, then edit. This affects item 7.
- **Skill files are mirrored** between `.agents/skills/` and `.claude/skills/`
  and byte-compared by `pnpm mirrors:check`. Edit both.
- **Durable claims rule.** In anything committed — commit messages, tickets,
  ADRs, docs — a causal claim must either point at a command a reader can re-run
  or say "hypothesis"/"untested" in the same sentence. This applies to whatever
  you write while doing this work.
- **A stray file in the repo breaks `pnpm verify`.** Probe and scratch files
  must be deleted before finishing, or prettier fails on them. Use the session
  scratchpad directory outside the repo instead.

# Suggested shape (the planner may disagree)

- **Merge-blocking:** item 1 alone.
- **Cheap and worth bundling with item 1:** item 4 — same file, same commit's
  leftovers.
- **Small correctness batch:** items 2, 3, 6.
- **Documentation:** item 5.
- **Process, highest leverage:** item 7. It is the reason several of the others
  existed. Items 8 and 9 are quick and make the ticket tooling trustworthy.
- **Housekeeping:** items 10, 11.

One caution on sequencing: items 1 and 4 touch the same file, and items 2 and 3
both touch what a row claims about itself. Do not fan these out as parallel
slices without checking the file lists first — `AGENTS.md` requires verifying
disjointness before spawning parallel workers, and item 10 records what happened
last time that check was skipped.
