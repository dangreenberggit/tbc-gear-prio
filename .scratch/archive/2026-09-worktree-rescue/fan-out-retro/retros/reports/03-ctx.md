# CTX — context economics (W3)

Scope: CTX-0 … CTX-5 of [`../2026-07-26-phase-1-fan-out.md`](../2026-07-26-phase-1-fan-out.md).
Report only — no shared file was edited. Proposed doc changes are quoted, not applied.

**Base:** my worktree was created at `55b5a51` (an ancestor), not the instructed
`94debea`. I checked out `94debea` and branched `retro/w-ctx` from it before reading
anything. This is **ORCH-1 reproducing a third time** — see _Notes_ at the end.

---

## Answer, before the analysis

**Neither tweak as stated — because both of them intervene at fan-in, and fan-in was the
cheapest line in the budget.** The retro's own attribution table lists fan-in _last_.
Changing who does the merge optimises the smallest item.

My recommendation, in order:

1. **Keep "delegator merges" as the default, but stop deciding it on context.** Decide it
   on a property you can read off the partition plan: hand fan-in to a fresh merger when
   the fan-in is **mechanical** (disjoint files, no cross-slice judgment); keep it with the
   delegator when it is **editorial** (slices interact, claims need checking, or worker
   reports can contradict each other). This needs no measurement and it gives the right
   answer for both fan-outs on record.
2. **Make compaction the routine tool, not the alternative.** It is the only one of the two
   proposals that preserves the judgment that caught the real defects. But you cannot
   _schedule_ it — so the executable form is "keep the literals on disk continuously so
   that compaction is non-destructive whenever it happens."
3. **Spend the real effort upstream.** ~30% of a 200k window was gone before the first line
   of code was read: ~20k of fixed session floor plus **~39k of this repo's own governance
   documents**, of which `PLAN.md` alone is **~23.6k**. That is 3–4× the largest item
   either proposal addresses.

**Is it predictable in advance? No — and yes, but not the thing CTX-5 tries to predict.**
Context burn is not predictable here; CTX-5's six indicators fire on essentially any
mid-phase fan-out in this repo, and a predictor that never says "no" is not a predictor.
**Scope overrun is predictable, for the cost of one `grep`.** Phase 1's gate in PLAN.md §14
is **9 checkboxes; 2 were checked when the session started and 2 when it ended — the
session closed zero of them** while shipping three correct pieces of work. "200k without
finishing Phase 1" is a denominator error, not a context-management failure. Build the
cheap escape hatch; do not build the prediction machinery.

---

## The operational rule

Three checks, all executable mid-session without guessing. Total cost under ~2k tokens.

### A. At phase pickup — size the unit (this is the one that matters)

```bash
# 1. How big is the thing you are measuring yourself against?
awk '/^### Phase N/,/^### Phase N+1/' PLAN.md | grep -o '☐' | wc -l
```

- **> 3 unchecked gate boxes → this phase is not a session.** Name the session's slice
  explicitly, in writing, before starting. Measure the session against _that_.
- Record it in the branch's handoff file as `Session scope: <slice>` so the next session
  does not re-derive it.

Rationale: at `bc148e8` Phase 1 had 7 unchecked boxes and the phase prose names ~8
deliverables (seams ×2 adapters, eight stages, slot mapping, gem solver, pool, `pnpm rank`,
scaffold, protos). No context discipline makes that a one-session unit.

### B. Before reading any document over ~30 kB — map, then seek

```bash
grep -n '^#\{1,3\} ' <doc>          # ~400 tokens for PLAN.md
sed -n '<A>,<B>p' <doc>             # only the 2–3 sections you need
```

**Never `Read` a >30 kB document without a header map first.** I navigated `PLAN.md` this
way in this session — one header grep plus two targeted `sed` ranges, ~1.5k tokens total —
and got everything six findings needed. The retro records the original session reading it
in ~5 chunks plus 2 full-file greps, which I estimate at ~18–20k.

### C. At partition time — decide fan-in ownership on shape, not on percentage

Ask one question about the partition you just wrote:

> **Can the merge be completed correctly by someone who never saw the worker prompts?**

- **Yes** (disjoint files, no claim to check, no cross-report synthesis) → **mechanical**.
  A fresh merger is fine, and cheaper.
- **No** (slices interact, workers assert properties you cannot see in a diff, or the
  outputs must be reconciled into a single position) → **editorial**. **The delegator
  merges**, and compaction — not delegation — is the context tool.

Then, regardless of answer, at the moment the last worker is spawned:

- [ ] Write the fan-in brief now (partition, base SHA, path ownership, conflict policy).
- [ ] Add the two sections the current template lacks: **acceptance criteria per slice**
      and **claims requiring independent verification, with the command that checks each**.
- [ ] **Put a `git rev-parse HEAD` in it, generated, not typed** — see CTX-3 below for why.
- [ ] Do not fill context while waiting. Idling is correct.
- [ ] Before merging: append each handoff verbatim to the brief. The file carries the
      literals; whatever survives compaction carries the judgment.

**Fallback if the delegator runs out anyway:** spawn the merger pointed at the brief, and
state explicitly that the brief's claim table is a **required checklist, not context** —
each row must be run, not read.

---

## Findings

### CTX-0 — Attribution: verified in direction, wrong in ordering · my P0

**Verified.** Fan-out was context-protective. Two workers at 147,944 and 151,940 subagent
tokens against two ~1.2k handoffs entering the parent is a ~99.2% reduction. Nothing I
found contradicts this, and the owner's framing ("delegating and reassembling has
overhead") is compatible with it: the overhead is real and it is _small relative to what
isolation avoided_. Both statements are true and they reconcile by magnitude, not by
argument.

**What the retro missed.** Its table is ordered "roughly in order" and puts
_pre-exploration_ second and _PLAN.md reads_ sixth. I think that ordering is inverted, and
it matters because it drives the "cheapest single mitigation" ranking.

Measured sizes (`wc -c`), converted at **~3.8 chars/token** — _these are estimates_:

| Document                        |  Bytes | Est. tokens |
| ------------------------------- | -----: | ----------: |
| `PLAN.md`                       | 89,674 |     ~23.6 k |
| `docs/verification-log.md`      | 13,792 |      ~3.6 k |
| `docs/phase0-findings.md`       | 12,599 |      ~3.3 k |
| `docs/workflow.md`              |  9,992 |      ~2.6 k |
| `docs/agents/model-policy.md`   |  5,206 |      ~1.4 k |
| 5 carry-forward tickets         |  5,110 |      ~1.3 k |
| `AGENTS.md` (injected ×2)       |  4,243 |  ~1.1 k ×2  |
| `parallel-phase/SKILL.md`       |  3,905 |      ~1.0 k |
| `tdd/SKILL.md`                  |  3,249 |      ~0.9 k |
| `adapters/claude.md` (paid ×2)  |  1,387 |  ~0.4 k ×2  |
| `handoff-template.md`           |    881 |      ~0.2 k |
| **Phase-1 governance read set** |        | **~39.4 k** |

Plus an estimated **~16–24k fixed floor** (base tool schemas; a deferred-tool roster of
~250 entries; a skills listing covering 44 project skills plus plugins; system and safety
text). Call it ~20k.

So **~59k — roughly 30% of a 200k window — is consumed by the floor and by reading the
project's own documents**, before any code, any probe, and any worker.

Re-estimating the two "avoidable" blocks the retro ranks 1st and 2nd:

- **`PLAN.md` navigation:** ~5 chunk reads covering most of a 23.6k-token file, plus 2
  full-file greps → **~18–20k**. Roughly ~4–6k of that was genuinely needed; **~12–15k was
  navigation waste**.
- **`db.json` pre-exploration (CTX-1):** 6 probes over a 3,105,094-byte file (size from
  `data/wowsims.lock.json`). Each probe costs the inlined script, the output, and a
  reasoning turn; two errored on `None` sorting and were re-run. → **~6–14k, call it
  ~10k**.

**Conclusion:** doc navigation was plausibly the larger avoidable block, by ~1.5×. CTX-1 is
still real and still worth its rule — but "largest avoidable block" belongs to a finding
the retro does not have. See **CTX-6**.

One measured example of the same cost: the retro's DOC-1 cites the testing-strategy text as
"PLAN.md §5 (~line 431)". It is actually **§6, "Testing strategy"** (§6 begins at line 416;
§5 ends at 415). A wrong cross-reference is paid for in re-reads. Flagging for W5, who owns
DOC-1.

**Classification: MIXED.** _General:_ measure attribution before prescribing, and expect the
fixed floor plus mandatory reading to be the largest single block in any doc-heavy agent
project. _Project-specific:_ the magnitude, which is an artifact of an 89 kB `PLAN.md`.

---

### CTX-1 — "Delegator must not pre-explore delegated territory" · holds, but is not the top item

**The rule is right and I endorse it.** The evidence is strong and it is the good kind —
the worker not only re-derived the same enum, it derived it _better_, cross-checking two
ways (item names _and_ self-describing `enchants[].type` names), which is how the
enchantability bug surfaced. The delegator paid ~10k for output that was superseded by a
better derivation it had already planned to commission.

The retro's practical test is the useful part and I would keep it verbatim:

> _"Will this output appear in a worker prompt as a fact, or am I about to ask a worker to
> derive it anyway?"_ If the latter — **don't run it**.

**Where I disagree: "the single largest avoidable block."** By my arithmetic (CTX-0) it is
second to doc navigation, at roughly 10k vs ~12–15k of recoverable waste. This is not a
reason to drop the rule — it is a reason not to let it absorb the attention that CTX-6
deserves.

**A caveat the retro does not state.** Taken too literally the rule under-explores.
Partitioning _requires_ knowing where slices overlap, and this session's one merge conflict
(`package.json`, ORCH-3) was an overlap failure, not an over-exploration failure. The rule
should be bounded: **explore enough to know file ownership and collision surface; never
enough to know schemas, enums, or edge cases.** The first is partitioning; the second is
design, and design belongs to whoever holds the acceptance criteria.

**Classification: GENERAL.** _Rule:_ a delegator explores only far enough to partition —
if an output would be re-derived by the worker anyway, do not produce it; name the
uncertainty in the prompt instead.

---

### CTX-2 — Output hygiene · uncontroversial, and the estimate is modest

**Correct, cheap, no downside — adopt as written.** I used it throughout this session
(`tail`, `--stat`, targeted `sed`) and it cost nothing.

**Calibration, so it is not oversold.** ~6 `pnpm verify` runs at 30–60 ANSI-escaped lines
is ~600–1,000 tokens each; tail-limiting to 15 lines recovers maybe **3–4k total**. The
duplicated 41-path listing is ~500 tokens twice — **~1k**. So CTX-2 is worth roughly **4–6k
of a 200k session, ~2–3%.** It is a pure win and should be a standing habit, but it is not
a lever on the 200k outcome, and ranking it #2 in "cheapest mitigations" overstates it
relative to CTX-6 and to scope sizing.

The one rule here with leverage beyond token count:

> Never print a diff to inspect _whether_ there is one — `git diff --stat` or
> `git diff --quiet; echo $?` first.

This is also what would have short-circuited the proto-drift confusion (ENV-2/RSN-2), so it
buys reasoning clarity, not just tokens.

**Classification: GENERAL.** _Rule:_ every command whose output can grow with repo size
gets a bound (`--stat`, `tail`, `wc -l`, exit code) before it gets run.

---

### CTX-3 — Fan-in trigger and the merger role · right diagnosis, unexecutable threshold, and the artifact does not do its job

Three separate claims. They do not survive equally.

#### (a) "The merger role exists but has no trigger" — correct and useful

Verified in `SKILL.md`: the Merger row fires when "the delegator's context is full", with
`Default: the delegator merges. Fallback: spawn a merger.` No threshold, no detection
method, and no statement of _when the decision is made_. That is a genuine gap and the
retro is right to name it.

#### (b) "Delegator context was load-bearing three times" — one of the three is backwards

This is the load-bearing argument against flipping the default, so I tested each.

1. **The `package.json` ownership collision — this is evidence _against_ the claim, not
   for it.** Per ORCH-3, the delegator _read_ the inherited constraint ("give `package.json`
   to protos worker only") and then instructed the item worker to edit `package.json`
   anyway. The conflict happened. Delegator context did not catch it — it _caused_ it, and
   the "catch" was resolving a conflict that `git` prints in your face. A cold merger
   resolves that identically, with no context at all. **CTX-3 lists a context failure as a
   context success.**
2. **Re-verifying the ring-enchant claim — genuine, and the best call of the session.** It
   confirmed a real PLAN.md §9 bug. But note what actually produced it: _skepticism, a
   checkable claim, and a fixture_. Not ambient context. And per the fan-in brief's own
   Known Defects, the correction shipped with a **wrong stated cause** that `d77cba5` later
   had to fix. Delegator context bought the catch, not the explanation.
3. **Noticing "verified idempotent" did not reproduce — genuine**, and again pure claim
   checking: run the generator twice.

So of three exhibits, one is inverted and two are instances of the same activity — checking
claims — which the retro _itself_ proposes to convert into an artifact. **The value was
skepticism, not context.** Skepticism is a prompt property. A cold merger explicitly told to
distrust every worker assertion, and handed the commands, would plausibly do (2) and (3)
_better_, having no attachment to a partition it did not design.

**But this does not license flipping the default**, because there is one delegator-only
function the retro never isolates: **knowing what was asked for.** A handoff reports what a
worker _did_. Only the delegator knows the delta against what it _commissioned_. The
`handoff-template.md` says `Status: success` only if every acceptance criterion is met — but
the merger is never given the criteria, so it cannot audit that claim. **Completeness is the
real delegator-only function; claim verification is not.** That is a narrower and much more
defensible reason to keep the default than the one the retro gives.

#### (c) The "> ~40% context remaining" threshold — not agent-executable

An agent in this harness does not reliably observe its own token count; it learns it is near
the limit from a warning, at which point the decision is moot. **A rule whose trigger the
agent cannot read is not an operational rule.** This is the same defect the retro correctly
identifies in `SKILL.md` ("no way to detect full") — CTX-3 reproduces it one level down with
a number attached.

Replace it with the **mechanical vs editorial** test in _Operational rule §C_. That test is
decidable from the partition plan, at the moment the retro correctly identifies as the quiet
point, and it needs no introspection. Sanity-checking it against both fan-outs on record:

| Fan-out                        | Files      | Claims to check | Verdict                        | Matches what worked? |
| ------------------------------ | ---------- | --------------- | ------------------------------ | -------------------- |
| `phase-1/five-seed-spread` (2) | 1 collision | 3               | **editorial** → delegator      | Yes                  |
| retro deep-dive (5)            | disjoint   | 0 in the merge  | **mechanical** merge, editorial _synthesis_ | Partly — see below |

#### (d) The fan-in brief this session produced — tested, and it would not carry a cold agent

This is the one claim I could test empirically, since `00-FAN-IN.md` exists. Two verifiable
defects:

1. **Three mutually inconsistent base SHAs.** The brief was written against `d77cba5`.
   Commit `94debea` ("Fix fan-in brief base SHA…") updated the `## Base` section to
   `968400f` — and left **line 75, `Rules given to every worker` item 1, still saying
   `d77cba5`**. Meanwhile the actual SHA workers were spawned against is `94debea`, which
   appears nowhere in the file. A cold agent following the brief's own rules would assert
   the wrong base.
2. **Its stated quality gate does not exist.** The brief tells every worker (rule 8) to run
   prettier "or fan-in `format:check` fails", and its checklist calls `format:check` "the
   meaningful gate". But `.prettierignore` contains `.scratch/`, and `format:check` is
   `prettier --check .` — **`.scratch/retros/reports/` is never checked.** Confirmed
   empirically, not just inferred: `npx prettier --write` on this very report prints
   **nothing** (zero files processed), while the same command on a tracked file prints
   `docs/agents/domain.md 66ms (unchanged)`. The brief promises a backstop that is switched
   off, and instructs five workers to run a command that silently does nothing.

Both defects share a mechanism and it is the direct counter-argument to "write the brief
early while it is cheap": **an artifact written early goes stale as the base advances, and
the party responsible for refreshing it is the delegator whose context you are economising.**
Writing it early is still right — but it must be paired with a rule that makes staleness
impossible to introduce:

> Never type a SHA into the fan-in brief. Generate it
> (`git rev-parse HEAD >> brief.md`) at the moment of the last spawn, in exactly one place,
> and have every worker prompt read it from there.

**Third defect, structural.** The brief covers only the mechanical merge — which for five
disjoint report files was never the hard part. It is silent on the editorial half: five
workers were each licensed to "re-rank with justification", so contradictions between
reports are _expected_, and no one is named to arbitrate them. **It automates the part that
was not the problem.** A brief that discharges the risk it was written for needs the two
sections listed in _Operational rule §C_ — per-slice acceptance criteria, and a named
owner for cross-report reconciliation.

**Classification: MIXED.** _General:_ decide fan-in ownership from the partition's shape
(mechanical vs editorial), never from a context percentage the agent cannot read; and never
hand-type a SHA into a handoff artifact. _Project-specific:_ this repo's `.prettierignore`
covering `.scratch/`, and the particular shape of these two fan-outs.

---

### CTX-4 — Compaction · the better of the two proposals, with a harness caveat the retro omits

**I agree with the retro's core insight and it directly answers the owner's question.** The
two options are not alternatives at the same level:

- **Compaction is a context operation** — cheap, preserves the narrative (decisions, claims
  to distrust, why this partition), loses exact literals.
- **A fresh merger is an organisational operation** — expensive, loses the narrative
  entirely, and _requires_ a correct artifact to work at all (which, per CTX-3(d), is not a
  given).

Since the narrative is precisely the merger's blind spot, **compaction is the right primary
tool and the fresh merger is the fallback** — which is what `SKILL.md` already implies.

**The caveat the retro misses, and it is operationally decisive.** Compaction is generally
**not something the agent can invoke on itself** in this harness — `/compact` is a
user-level command and auto-compaction fires on its own schedule. So "the delegator should
compact instead" is, as written, not an instruction an agent can follow. The executable
restatement:

> You cannot schedule compaction. You can only be **ready** for it. Keep every literal you
> would need after a memory wipe — SHAs, branch names, path ownership, the exact wording of
> a worker's concern, the commands that check each claim — **on disk, continuously**, so
> that compaction whenever it occurs is non-destructive rather than lossy.

That converts CTX-4 from an action into a **readiness invariant**, which is both agent-
executable and strictly more robust: it also covers the session dying, the harness
restarting, and the delegator being interrupted.

The retro's 4-step sequencing is otherwise sound and I would keep it, with step 3 amended
from "then **compact**" to "then **request compaction, or proceed — the file is now the
source of truth either way**."

Its step 2 deserves explicit praise: _"do not fill context with speculative work; idling is
correct."_ This is genuinely counter-intuitive for agents, which are biased toward looking
busy, and the original session got it right.

**Classification: GENERAL** (with a harness-specific footnote). _Rule:_ treat compaction as
an event you cannot schedule — keep literals on disk continuously so that losing the
conversation costs you nothing but judgment.

---

### CTX-5 — Predictability · claim substantially true, conclusion not supported

The retro claims six leading indicators and that "this session hit all six." I checked each
for (i) whether it fired, and (ii) whether it is _leading_ (knowable before the cost is
paid) or _lagging_ (only knowable after).

| # | Indicator                                     | Fired?                                                  | Leading? | Verdict                                     |
| - | --------------------------------------------- | ------------------------------------------------------- | -------- | ------------------------------------------- |
| 1 | ≥ 3 PLAN.md sections                          | **Verified** — §8.1, §8.3, §9, §14 confirmed by commits  | Leading  | Fires on almost anything here. No specificity |
| 2 | > 2 large documents read in full              | Transcript-only; plausible                              | **Lagging** | You have already paid                      |
| 3 | Investigation > ~6 calls unresolved           | Transcript-only (RSN-1, ~10)                            | **Lagging** | Useful as a _circuit breaker_, not a predictor |
| 4 | Probing a data file you will hand to a worker | Transcript-only (CTX-1)                                 | **Lagging** | This is just CTX-1's rule restated          |
| 5 | ≥ 2 tickets blocked on an unbuilt component   | **Verified** — 03 and 04 both `Blocks: phase-1`, both assume `compose` | Leading | Real — but not checkable until DOC-2 adds `Depends:` |
| 6 | Fan-out + delegator follow-on work            | True by construction                                    | Leading  | True of every mid-phase fan-out             |

**So the claim is substantially supported — and that is the problem.** Four of the six
(1, 2, 4, 6) fire on essentially _any_ mid-phase fan-out in a repo with an 89 kB `PLAN.md`.
I cannot construct a plausible session here that scores below four. **A predictor with no
negative case carries no information**; "hit all six" is not evidence of a bad session, it
is evidence of a mis-specified instrument. And indicator 5 is not currently evaluable at
all, since `Depends:` does not yet exist.

Two of the six are worth keeping, but not as predictors:

- **#3 becomes a circuit breaker:** _an investigation past ~6 calls without a named
  mechanism must stop and be written down or handed off._ That is actionable at the moment
  it fires. (It also pairs with RSN-1's rule that an investigation ending in "strange,
  anyway —" is unfinished.)
- **#4 is already CTX-1.** It should not be double-counted as an indicator.

I also do not think the **pre-flight formula** should be adopted. Its dominant term is
`investigation_slack ≈ 15k` — the unknown-unknowns line — and this session's actual
unknown-unknowns (the `cd` spiral, the stale worktree base, the proto drift, the
enchantability bug) plainly exceeded that. A formula whose largest term is the one you
cannot estimate produces false confidence, which is the same failure mode RSN-2 flags in a
different register.

**The negative result, stated plainly:** you cannot usefully predict context burn here, and
attempting to will cost more than it saves. **But you can predict scope overrun almost for
free, and that is what actually explains the session.**

Phase 1's gate in PLAN.md §14 has **9 checkboxes**. At the session's start commit
(`bc148e8`) **2 were checked**. At its end (`d77cba5`) **2 were checked** — I verified both
counts directly. **The session closed zero gate criteria** while shipping three correct,
non-trivial pieces of work (generated protos, the item/gem index, the spec classifier),
because those are _enablers_ and none of them is a gate criterion. The phase prose names
~8 deliverables; the session completed roughly two.

**Phase 1 was never a session-sized unit, and this was knowable at pickup for the cost of
one `grep`.** "We hit 200k without finishing Phase 1" describes a mis-set denominator far
more than it describes a context leak. That is the honest anticipation heuristic, and it
replaces all six indicators.

**Classification: MIXED.** _General:_ before measuring a session against a goal, count the
goal's acceptance criteria — if there are more than about three open, the goal is not the
session, and say so in writing first. _Project-specific:_ that indicators 1 and 2 are
degenerate here is a consequence of one very large planning document.

---

### CTX-6 — Large-document navigation (new; not in the retro) · my P0

**The finding the retro is missing, and by my arithmetic the largest recoverable block.**

`PLAN.md` is 89,674 bytes / 899 lines ≈ **23.6k tokens — ~12% of a 200k window for one
file.** It has 38 headings across 17 top-level sections and **no table of contents**. The
retro records it being read "in ~5 separate chunks plus 2 full-file greps" (~18–20k), which
is what hunting through an unindexed document looks like.

The fix is not "read less of PLAN.md" — the phase genuinely depends on it. The fix is to
stop paying for search:

- **Agent-side (general, free, works today):** `grep -n '^#\{1,3\} '` then `sed -n` the two
  or three ranges you need. I did exactly this and covered §5, §6, §8.x, §9 and §14 for
  ~1.5k tokens.
- **Repo-side (project-specific, one-time):** add a TOC with line anchors to the top of
  `PLAN.md`, or split §14 (phases and gates) into its own file, since it is the section
  every session must consult and it is currently buried at line 770 of 899.

Estimated recovery: **~12–15k tokens per phase session**, which exceeds CTX-1, CTX-2, and
the entire fan-in cost combined.

I am _not_ proposing the edit (out of scope, and it touches `PLAN.md`). Quoting it for
whoever owns the decision:

Add to the top of `PLAN.md`, after §0:

```markdown
**Navigating this file:** it is ~900 lines. Run `grep -n '^#\{1,3\} ' PLAN.md` for a
section map and read only the ranges you need. §14 (phases and gates) is the section
every session needs.
```

**Classification: MIXED.** _General:_ never `Read` a document over ~30 kB without extracting
a heading map first. _Project-specific:_ that this repo has a 900-line un-indexed plan is a
local fact, and the repo-side fix (TOC / split §14) only applies here.

---

### CTX-7 — The floor is the budget (new) · framing

Combining CTX-0's measurements: **~20k fixed floor + ~39k governance corpus ≈ 30% of a 200k
window** is spent before productive work begins, and it is spent _again in every session_.
This is the strongest argument for something neither the retro nor the owner's two proposals
raise: **the cheapest context intervention is not any in-session tactic, it is reducing what
every session is obliged to load.**

Two observations, offered without a prescription since they touch files I do not own:

- 44 project skills are enumerated in the session floor. Most have nothing to do with this
  repo (`writing-beats`, `teach`, `obsidian-vault`, `to-questionnaire`, `wizard`,
  `edit-article`). Pruning or archiving the unused ones is a permanent, every-session
  saving.
- ENV-3's `adapters/claude.md` misinjection means that file is paid for twice, every session
  in which it is read. That is small (~0.8k) but it is pure waste and W1 already owns the
  fix.

**Classification: MIXED.** _General:_ audit the per-session fixed cost (tool roster, skill
listing, always-injected instruction files) before optimising in-session behaviour — it is
paid every time and it compounds. _Project-specific:_ which 44 skills and which docs.

---

## Classification table

| ID    | Finding                                          | Class            | The one-sentence rule                                                                                             |
| ----- | ------------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| CTX-0 | Attribution: floor + docs dominate               | **MIXED**        | Measure where context went before prescribing; expect the fixed floor plus mandatory reading to be the largest block. |
| CTX-1 | Don't pre-explore delegated territory            | **GENERAL**      | Explore only enough to partition — if a worker would derive it anyway, don't produce it; name the uncertainty instead. |
| CTX-2 | Bound command output                             | **GENERAL**      | Any command whose output scales with the repo gets a bound before it is run.                                       |
| CTX-3 | Fan-in ownership trigger                         | **MIXED**        | Decide fan-in ownership from the partition's shape (mechanical vs editorial), never from a context % the agent cannot read. |
| CTX-3d| Fan-in brief goes stale                          | **GENERAL**      | Never hand-type a SHA into a handoff artifact — generate it, in exactly one place.                                  |
| CTX-4 | Compaction over cold handoff                     | **GENERAL**\*    | You cannot schedule compaction, only be ready for it: keep every literal on disk continuously.                      |
| CTX-5 | Predictability indicators                        | **MIXED**        | Count a goal's open acceptance criteria before measuring a session against it; don't try to predict context burn.    |
| CTX-6 | Large-document navigation _(new)_                | **MIXED**        | Never read a >30 kB document without extracting a heading map first.                                                |
| CTX-7 | The per-session fixed floor _(new)_              | **MIXED**        | Audit what every session is obliged to load before optimising what it does.                                         |

\* GENERAL rule, harness-specific mechanism — whether an agent can self-compact varies.

**Revised "cheapest single mitigation" ranking** (the retro's, corrected for CTX-0's
ordering error):

1. **CTX-5/scope** — size the phase at pickup. One `grep`; fixes the denominator.
2. **CTX-6** — heading-map before large reads. ~12–15k/session.
3. **CTX-1** — don't pre-explore delegated territory. ~10k.
4. **CTX-7** — prune the fixed floor. Permanent, every session.
5. **CTX-2** — bound output. ~4–6k, zero downside, adopt regardless.
6. **CTX-3/4** — brief at spawn + readiness for compaction; merger as fallback.

---

## What I could not verify

- Anything sourced from the session transcript rather than the repo: the 147,944 / 151,940
  subagent token counts, the ~1.2k handoff sizes, the "~6 `pnpm verify` runs", the "~5
  PLAN.md chunks", the "~6 db.json probes", and the ~10-call `cd` spiral. I took these as
  given and reasoned about their _relative_ magnitudes; my token figures are estimates at
  ~3.8 chars/token, not measurements.
- The exact fixed-floor size. I can see its components but cannot count my own prompt, so
  ~16–24k is an informed estimate.
- Whether the original delegator could in fact have invoked compaction — I reason from how
  the harness exposes it, not from an observed attempt.

## Status

success

## Branch

retro/w-ctx

## What I did

- Corrected a stale worktree base (`55b5a51` → `94debea`) and branched `retro/w-ctx` from
  the instructed commit.
- Verified CTX-0's attribution by measuring the repo's doc corpus; found its ordering
  inverted and identified a missing finding (CTX-6, doc navigation) that is plausibly the
  largest recoverable block.
- Tested CTX-3's "delegator context was load-bearing three times" argument; found one of
  the three exhibits inverted, and reframed the delegator-only function as _completeness_
  rather than claim-checking.
- Empirically tested this session's own fan-in brief and found two verifiable defects.
- Checked all six CTX-5 indicators for firing and for lead/lag; returned a negative result
  and replaced them with a gate-checkbox scope count, verified against `bc148e8`/`d77cba5`.
- Wrote `.scratch/retros/reports/03-ctx.md` with the up-front recommendation, a three-check
  operational procedure, per-finding analysis, and the classification table.

## Paths touched

- `.scratch/retros/reports/03-ctx.md` (created)

## Verification

- `git log -1 --format=%H` → `55b5a51…`, **not** the instructed base; corrected via
  `git checkout -b retro/w-ctx 94debea…` → HEAD now `94debea42976e6e6ff67f58a9fcd911b9a178146`
- `wc -c` over `PLAN.md`, `docs/**`, `.claude/skills/**`, `.scratch/**` → sizes in CTX-0
- `awk '/^### Phase 1/,/^### Phase 2/' PLAN.md | grep -c '☐'` → 7 unchecked / 2 checked
- `git show bc148e8:PLAN.md | … grep -c '☑'` → 2 checked at session start (⇒ zero closed)
- grepping the brief for 7-hex-digit SHAs → `968400f` at line 11 vs `d77cba5` at line 75
- `git show 94debea -- .scratch/retros/reports/00-FAN-IN.md` → confirms the partial SHA fix
- `npx prettier --write .scratch/retros/reports/03-ctx.md` → **no output** (0 files); control
  `npx prettier --write docs/agents/domain.md` → `docs/agents/domain.md 66ms (unchanged)`.
  Proves `.scratch/` is prettier-ignored, so `format:check` does not gate these reports.
  Report formatting was therefore hand-checked, not tool-enforced.
- Full suite deliberately not run (`vendor/` absent per brief rule 6)

## Notes / concerns

- **ORCH-1 reproduced a third time.** My worktree was spawned at `55b5a51` — the *same*
  stale ancestor that hit the protos worker in the original session. This is now 2-of-2
  observed occurrences of that exact SHA, which argues it is deterministic behaviour of the
  worktree isolation, not the "non-deterministic" flake ORCH-1 describes. W2 owns ORCH-1 and
  should know the base-SHA assertion is not belt-and-braces; it is load-bearing.
- **The fan-in brief instructs workers to assert the wrong SHA** (line 75, `d77cba5`). Any
  worker that followed the brief rather than its prompt is on the wrong base.
- **The brief's stated quality gate does not exist** — `.scratch/` is prettier-ignored, so
  `format:check` never sees these reports. Rule 8 and the fan-in checklist are both wrong.
- **Disagreement with the retro (CTX-3):** the `package.json` collision is cited as evidence
  that delegator context was load-bearing. It is the opposite — the delegator had the
  constraint, dropped it, and caused the conflict.
- **Disagreement with the retro (CTX-0/CTX-5 ranking):** pre-exploration is called the
  largest avoidable block; I estimate doc navigation is ~1.5× larger.
- **Disagreement with the retro (CTX-3 threshold):** a "> 40% context remaining" trigger is
  not readable by the agent it governs, reproducing the very gap it was written to close.
- Minor, for W5: the retro's DOC-1 cites the testing-strategy passage as "PLAN.md §5
  (~line 431)"; it is §6, which begins at line 416.

## Suggested follow-ups

- Decide who reconciles contradictions between the five reports — the brief names no one,
  and workers were licensed to re-rank findings.
- Consider a `PLAN.md` TOC or splitting §14 into its own file (CTX-6); ~12–15k tokens per
  phase session.
- Consider pruning the ~44 project skills to those this repo actually uses (CTX-7).
- If reports under `.scratch/` are meant to be format-gated, either un-ignore that subtree
  or drop the claim from the brief and handoff template.
</content>
</invoke>
