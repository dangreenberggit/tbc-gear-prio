# W4 — agent epistemic discipline (RSN-1, RSN-2, DOC-4)

Deep-dive on [`../2026-07-26-phase-1-fan-out.md`](../2026-07-26-phase-1-fan-out.md), scope
per [`00-FAN-IN.md`](00-FAN-IN.md). Report only — no shared file was edited; all proposed
corrections are quoted here.

Base: `94debea4` (`Fix fan-in brief base SHA to the commit that carries the retro`). The
spawning worktree was at `55b5a51`; branched `retro/w-rsn` from `94debea4` and reported it.

**Headline: the investigation found a defect the retro did not know existed.** RSN-2 is not
only "an untested cause was written down". The commit that carried the untested cause,
`c0acbfc`, is itself the commit that **introduced** the CI breakage it claimed to be
documenting. The proto output was correct before `c0acbfc` and is corrupt after it. Ticket
05 is therefore wrong about the cause, wrong about the remedy, and wrong about which side of
the diff is authoritative.

## Summary table

| # | Finding | Retro's claim | Verified verdict | Class |
| --- | --- | --- | --- | --- |
| RSN-2a | `c0acbfc` "Linux/WSL run" | Cause "very probably wrong" | **Wrong, and worse than stated.** No Linux run; `c0acbfc` *caused* the drift by committing output generated from CRLF-contaminated input over correct output | GENERAL |
| RSN-2b | `119c0b7` ring-probe cause | Superseded by `d77cba5` | **Confirmed.** `d77cba5`'s account verified against `db.json`: 141 enchants, exactly 4 carry `requiredProfession` (3 = Enchanting), all four are Enchant Ring | GENERAL |
| RSN-2c | Retro repeats 2b's wrong cause | Flagged in fan-in brief | **Confirmed** at retro L695-696, inside _"Friction that earned its keep"_ | GENERAL |
| RSN-2d | — | Not identified as a pattern | **The whole retro has it.** Other workers overturned the *mechanism or remedy* on ORCH-1, DOC-1, DOC-2 and the fan-in brief's own `format:check` instruction, while confirming each symptom | GENERAL |
| RSN-1 | `cd` spiral + wrong postmortem | `git ls-tree` is cwd-scoped; postmortem false | **Confirmed.** From `packages/core`: 41 paths, `PLAN.md` absent. From root: 357. Postmortem claim is false | MIXED |
| DOC-4 | Prompt asserted gitignored input present | Self-contradictory and false | **Confirmed.** `.gitignore:13:vendor/`, untracked, absent from a fresh worktree | GENERAL |
| — | Ticket 05 remedy | "may not fix the actual cause" | **Correct — remedy targets the wrong layer.** Corrected text below | PROJECT |
| — | CI "plausibly red on next push" | Untested | **True, and now proven.** Simulated: 14/16 files match, `api_pb.ts`/`common_pb.ts` do not | PROJECT |

---

## RSN-2 — inferred causes written into durable artifacts

The pattern: *an inferred cause written into a commit message, ticket, or plan doc as though
it were established fact.* Three confirmed instances, and the damage compounds at each step
because each artifact outlives the session that produced it.

### Instance 1 — `c0acbfc`, the proto drift

`c0acbfc` states the diff was

> versus what was committed from the worker's **Linux/WSL** run

Ticket 05 then built its entire **Done when** on that Windows-vs-Linux hypothesis.

**Both workers ran on the same Windows machine**, under
`C:\Users\dgree\Code\lulz\tbc-gear-prio\.claude\worktrees\`. There was no Linux/WSL run. The
retro correctly doubted the claim but guessed the wrong replacement — it proposed
"intra-platform nondeterminism in buf's comment emission, or first-commit normalization".

#### What actually happened (controlled experiment, not inference)

I generated from two variants of the same 16 `.proto` sources on one Windows machine, buf
1.72.0, same session — the only variable being the line endings of the **input**:

| Input | CR bytes in generated output |
| --- | --- |
| LF sources | **0** |
| CRLF sources | **474** |

474 is exactly the CR total across the 16 files in the dirty working tree
(105 + 155 + 78 + 56 + ... = 474). The drift is reproduced precisely.

Regenerating twice from identical sources produced byte-identical output — **the generator is
deterministic**. Both the commit's hypothesis and the retro's replacement hypothesis are
wrong.

The mechanism, verified end to end:

1. No `.gitattributes` exists and `core.autocrlf=true`, so `data/proto/*.proto` — committed
   as **LF** (verified: `spell.proto` 0 CRLF / 73 LF in the blob) — is checked out **CRLF** on
   Windows (working copy: 73 CRLF / 0 LF).
2. `protoc-gen-es` copies leading comments out of the `.proto` **verbatim** into generated
   JSDoc, carrying the `\r`. Verified: of 105 CR-bearing lines in `api_pb.ts`, **104 are
   comment content and 1 is a blank `*` line; zero are non-comment lines.**
3. A blank comment line becomes `   * \r` — star, space, CR.
4. On commit, `autocrlf` strips the `\r` and leaves an **orphan trailing space** that no clean
   generation ever produces.

Step 4 is why the original observer saw "blank `*` lines flip a trailing space". They were
looking at a stripped `\r`, and `git diff` renders that as an invisible trailing space. The
observation was accurate; the interpretation was not.

#### The part nobody had found

`c0acbfc` is not a commit that *documented* pre-existing drift. It is the commit that
**created** it:

```
$ git show c0acbfc -- packages/core/src/proto/api_pb.ts
-   *
+   * 
```

- `c0acbfc^` (before): `api_pb.ts` and `common_pb.ts` are **byte-identical to clean LF
  generation**. Trailing-space blank comment lines: **0 and 0**.
- `HEAD` (after): **1 and 6**. Seven corrupted lines, in exactly the two files the commit
  message named.

The committed output was correct. The agent regenerated it in a contaminated environment, saw
a diff, assumed its own fresh output was authoritative, committed the corruption, and then
invented a cause for the diff — an environment (Linux/WSL) that never existed.

The contamination direction is itself positive evidence against the commit's claim: a genuine
Linux/WSL generation reads LF sources and emits `   *` with no trailing space. The committed
bytes could only have come from a CRLF checkout.

#### CI: the landmine is live

`.github/workflows/verify.yml` runs on `ubuntu-latest`:

```yaml
- run: pnpm run proto:generate
- run: git diff --exit-code -- packages/core/src/proto data/proto
```

On Linux the `.proto` sources check out LF, generation yields `   *`, and the committed bytes
carry `   * `. Simulated against every file: **14/16 identical, `api_pb.ts` and
`common_pb.ts` differ → the check fails.** The retro's "plausibly red on the next push" was
right, for a reason it had not identified.

#### The reasoning defect, precisely

Three separable errors, only the first of which the retro caught:

1. **Invented an environment.** "The worker's Linux/WSL run" was never checked against
   `git log`, the worktree path, or anything else. It was a plausible-sounding filler for
   "I don't know why these differ."
2. **Assumed the fresh output was correct.** When two versions of a generated file disagree,
   regenerating and committing silently asserts *mine is right*. That question was never
   posed, and the answer was *no*.
3. **Institutionalized the guess.** The ticket inherited the invented cause as a premise, so
   its remedy aims at a layer where nothing is broken.

Error 2 is the one that caused actual damage and it is the one no rule in the repo currently
addresses.

### Instance 2 — `119c0b7`, the ring probe (the instructive one)

`119c0b7` explains a Phase-0 gap as:

> The Phase 0 two-character probe never happened to log an enchanted ring

`d77cba5` refutes it directly — *"That is not why it missed them."* — and I verified
`d77cba5`'s account against the pinned `db.json` (sha256 matches
`data/wowsims.lock.json` exactly: `6018ba76…34a8`):

- `enchants[]` has **141** records.
- Exactly **4** carry `requiredProfession`, all `= 3` (Enchanting).
- All four are `Enchant Ring - Spellpower / Striking / Healing Power / Stats`, `type: 11`
  (finger).
- The `type` histogram has **no** neck, waist, or trinket entries — so the underlying
  correction (the non-enchantable set is neck/waist/trinket) is right.

So bare rings in a two-character probe are the **expected** observation, not an unlucky
sample. Most characters cannot have a ring enchant at all.

**This is the most instructive instance because the agent did everything right except the
last step.** It independently re-verified a worker's claim, ran a real query, and got a real
answer: *are rings enchanted in the fixture? yes, 14/50.* It was **right about the fact** and
**wrong about the cause** — and the cause is what it wrote down.

Verification stopped at the observation. One more query — *what distinguishes ring enchants
from the other 137 records?* — was available at the same cost and would have surfaced
`requiredProfession` immediately.

The consequence is material and `d77cba5` states it: finger is the one slot where enchant
eligibility is a property of the **player**, not the item, so an `isEnchantable(itemId)`
check is **structurally insufficient**. "Unlucky sample" implies no design change. "Gated on
profession" implies a different gate. A wrong cause propagates into a wrong interface.

Note also that `d77cba5` records the invariant is *"currently safe only by accident"* — the
ret P2 preset has bare fingers, so there is nothing to synthesize. That is the right way to
write down a belief: the mechanism, the consequence, and the reason it has not bitten yet.

### Instance 3 — the retro repeats instance 2's wrong cause

Retro L693-698, in *"Friction that earned its keep"*, praising the verification:

> confirmed a real documentation bug (PLAN.md §9's non-enchantable set is
> neck/**waist**/trinket, not neck/**finger**/trinket — the Phase-0 two-character sample
> never happened to include an enchanted ring; the 25-combatant fixture shows 14/50 finger
> slots enchanted). Best call of the session.

Confirmed present. `d77cba5` predates the retro by ~9 hours and was in the retro's own
history.

This is the most alarming instance, because a retro is the artifact whose entire job is to
correct the record. The wrong cause survived *specifically* because it was attached to a
success story — the section is about what went well, so the claim was re-transcribed rather
than re-checked. **Praise suppresses scrutiny.** Anything recorded as a win should be
verified at the same bar as anything recorded as a failure; it is more likely to be copied
forward.

The corrected bullet should read:

> - **Independent re-verification of a worker claim.** Cost a few calls; confirmed a real
>   documentation bug (PLAN.md §9's non-enchantable set is neck/**waist**/trinket, not
>   neck/**finger**/trinket — the fixture shows 14/50 finger slots enchanted). Note the
>   *cause* recorded at the time was wrong and was corrected in `d77cba5`: ring enchants are
>   enchanter-only (the only 4 of 141 `enchants[]` records with `requiredProfession`), so a
>   small probe showing bare rings is expected, not unlucky. Verification of the observation
>   was the right call; stopping before the mechanism was not.

### Instance 4 — the pattern is the whole retro, not three findings in it

The three other completed workers each reported the same shape independently: **the retro's
findings are real, and its diagnoses and remedies are wrong on nearly every one.** Reported
by the other workers and relayed to me; I did not re-verify these myself, and they are
credited to their owners:

| Finding | Retro asserts | Actually (per owning worker) |
| --- | --- | --- |
| ORCH-1 | Worktree basing is "non-deterministic across two identical spawns" | **Deterministic** — basing on the default branch. 7/7 auto-branches at `main` (`55b5a51`) |
| DOC-1 | Testing carve-out is at "PLAN.md §5 (~line 431)" | It is **§6**, beginning line 416 — and the wrong cite was baked into the proposed replacement text |
| DOC-2 | Proposes a new `Depends:` ticket field | `Blocked by:` **already exists** (`docs/agents/issue-tracker.md:57`) |
| CTX / fan-in brief | Instructs five workers to satisfy a `format:check` gate | That gate **does not exist** for their files — `.scratch/` is in `.prettierignore` |

ORCH-1 is the closest structural twin to my instances 1 and 2. The retro observed a real
symptom (a worker at a stale base), then explained it with a mechanism it had not tested —
"non-determinism" — reached by reading **a single `git worktree list` snapshot** in which one
worker had already self-corrected, and inferring inconsistency from the resulting mismatch.
One observation, one inferred cause, written down as fact. The real mechanism is not merely
different, it is the opposite: perfectly deterministic, and therefore fixable by a rule rather
than by defensive re-checking.

The `format:check` item deserves note because I was myself instructed to run
`npx prettier --write` on this report, and my prompt asserted that fan-in would fail without
it. `.scratch/` is in `.prettierignore`; the command is a silent no-op. **An instruction
issued to five workers, asserting a consequence, that nobody had tested.** The pattern
reproduced itself in the very act of dispatching the workers sent to study it.

**What this implies, stated plainly:** a first-pass retro written from a transcript is a list
of _symptoms worth investigating_, not a list of _diagnoses worth acting on_. Every finding
in this document was real. Almost none of the mechanisms survived contact with the repo, and
because remedies are derived from mechanisms, the remedies did not survive either — ticket
05's fix aims at the wrong layer, DOC-2's proposes a field that exists, DOC-1's bakes in a
wrong cite, ORCH-1's defends against non-determinism that isn't there. Applying this retro's
prescriptions directly would have produced four wrong changes from four correct observations.

The generalizable rule is not "retros are unreliable". It is that **the transcript is
sufficient evidence for what happened and insufficient evidence for why**, and a retro
written only from a transcript must mark its causal claims accordingly. The fan-in brief
already half-knew this — it warned workers that "where it says _Evidence_, it may be
transcript-only" — but it applied the warning to individual findings rather than recognising
it as a property of the whole document.

This also validates the fan-out itself. Five workers each verifying one slice against the
repo found, between them, wrong mechanisms in ORCH, DOC, CTX, and RSN. No single reviewer
reading the retro top-to-bottom would plausibly have caught all of them, because each one
reads as reasonable until you run the command.

---

## RSN-1 — the `cd` spiral and the wrong postmortem

### The git behaviour, tested

The postmortem concluded that `git ls-tree -r HEAD --name-only` *"always lists from repo root
regardless of cwd"*. **This is false.** Measured at `94debea4`:

| Invocation | cwd | Paths returned | `PLAN.md` present |
| --- | --- | --- | --- |
| `git ls-tree -r HEAD --name-only` | repo root | 357 | yes |
| `git ls-tree -r HEAD --name-only` | `packages/core` | **41** | **no** |
| `git ls-tree -r --full-tree HEAD --name-only` | `packages/core` | 357 | yes |
| `git ls-tree -r HEAD --name-only -- ":/"` | `packages/core` | 357 | yes |
| `git ls-files` | `packages/core` | 41 | no |

`git ls-tree` resolves relative to the current prefix inside the working tree; `--full-tree`
is the documented flag that makes it behave as if run from the root. `git ls-files` is
cwd-scoped the same way — worth knowing, since it is the natural next thing to reach for.

The retro says the spiral saw "20 files"; it is 41 at this commit. The file count grew
between the incident and now — the mechanism is unchanged.

### Why the second-order failure is the real finding

The first-order error is cheap and recoverable: a stale cwd, ~10 calls to unwind. What makes
it a P0 is that the investigation **terminated in a false mechanism and a reassurance**:
*"everything actually resolved fine."*

An investigation that ends without a correctly identified mechanism does not just fail to
help — it **arms the trap**. The next session inherits an explicit, confident, wrong belief
about `git ls-tree`, which is worse than inheriting nothing, because it will be used to rule
out the correct hypothesis next time. A wrong postmortem is a negative-value artifact.

The escalation itself is also worth naming. The conclusion cascade —
"PLAN.md does not exist" → "different repo structure" → "a different, unrelated repo" →
"nested git repo" — is a sequence in which each step raises the extraordinariness of the
claim while the evidence stays constant. Ten calls were spent elaborating a hypothesis and
zero were spent on `pwd`. The cheapest question ("where am I?") went unasked longest because
it was the least interesting.

The tell: **when a hypothesis requires the environment to be bizarre, the environment is
usually fine and the observation is scoped.** Two identically-named repos with different
histories is a far larger claim than a stale cwd, and it was reached without ever testing the
smaller one.

### Fixes

The retro's fix 1 (never `cd`; use `git -C`, root-relative paths) is correct and I have
nothing to add. Its fix 2 (an investigation ending in "strange, anyway —" is unfinished) is
correct but under-specified; see the rules section for a testable form.

Worth noting for harness authors: this agent thread's own tooling documents that *"Agent
threads always have their cwd reset between bash calls"*, while the main-session Bash tool
documents that *"Working directory persists between calls."* The trap exists in the main
session and not in subagents, which is exactly the kind of asymmetry that makes it hard to
learn from experience.

---

## DOC-4 — a prompt asserted a gitignored input was present

The delegator prompt said `db.json` was

> already in the repo, gitignored — do not read it at runtime

Verified: `git check-ignore -v` → `.gitignore:13:vendor/`; `git ls-files --error-unmatch` →
not tracked; and my own fresh worktree has **no `vendor/` directory at all**.

"Already in the repo, gitignored" is self-refuting — gitignored and untracked means *not in
the repo*, which is precisely why it is absent from a fresh worktree. The sentence contains
its own disproof, and no tool call was needed to catch it.

Same family as RSN-2, pointed outward: a belief the author held loosely ("I have this file")
was written into a durable artifact as an assertion of fact, and a downstream consumer had to
discover it was false. The delegator was describing **its own machine's state** and
generalizing it to a worktree that had never had the file.

The worker handled this exactly right — refetched from the pinned SHA with sha256
verification and flagged the discrepancy rather than fabricating, explicitly citing the
user's `feedback_missing_referenced_file` memory. That memory is load-bearing and working.
I independently re-confirmed the pin holds: the file in the main checkout matches
`data/wowsims.lock.json`'s recorded sha256 exactly.

The retro's proposed fix is correct as written; `pnpm sync:wowsims` exists and is the right
command to cite.

---

## The verification-depth question

Instance 2 poses it sharply: the agent verified an observation, was right, and still recorded
a false cause. So what is the stopping rule?

Always demanding mechanism would be its own failure mode — it is unbounded, and most
observations are load-bearing only as observations. The rule cannot be "go deeper".

**The rule that works: verify to the depth of the claim you are about to make, not the depth
of the question you started with.**

- Verifying an **observation** licenses you to state the observation.
- Stating a **cause** requires verifying the mechanism.
- Prescribing a **remedy** requires verifying the mechanism, because a remedy is a bet on it.

Instance 2 satisfies this test and fails it in one move. The question was *"is PLAN.md §9
wrong?"* — an observation-level question, correctly answered at observation level. But the
commit message answered a *different, larger* question it had not investigated. The bar rose
the moment the word "because" was typed, and nothing prompted a re-check.

Ticket 05 is the same error one level worse: it prescribed a remedy on an unverified
mechanism, so the remedy points at the wrong layer.

### Signals that force mechanism-level verification

1. **You are about to write "because", "due to", "caused by", or "versus" into something
   durable.** The strongest and most checkable signal.
2. **You are prescribing a remedy.** Every fix encodes a causal theory. If you cannot state
   it, you cannot pick the fix.
3. **You are explaining an absence.** Both wrong causes here explained something that did
   *not* happen — "never happened to log an enchanted ring", "versus what was committed from
   Linux". Absence has many possible causes and no natural evidence trail, so it is the
   single highest-risk site for confabulation. Treat "explains why X didn't happen" as an
   automatic escalation.
4. **A number is small, round, or structured.** 4 of 141. 2 of 16 files. 7 lines. Structure
   implies a mechanism; a random sample would not cluster.
5. **The result will gate an interface or an invariant.** Instance 2 determined whether
   `isEnchantable(itemId)` is sufficient. It isn't.

### When the observation genuinely suffices

When the action is reversible and local, when you are not writing the cause down, and when
the remedy does not depend on the cause. Answering "is this test flaky?" with "I ran it 20
times and it passed" is fine — until you file a ticket saying *why* it was flaky.

### Cost

Mechanism verification was cheap in both cases here: ~2 tool calls for the `enchants[]`
query, ~6 for the full proto experiment including a controlled two-variant generation. Set
against one corrupted commit, one misdirected ticket, one red CI check, and a wrong claim
copied into a retro, this is not a close call. The expensive part was never the verification
— it was the confident sentence written without it.

---

## Rules to adopt

Written as directives, suitable for `AGENTS.md` or a global agent config.

### Durable-artifact discipline

> **A causal claim in a durable artifact must be tested or labelled.** Commit messages,
> tickets, plan docs, ADRs, code comments, and retros outlive the session that wrote them.
> Before writing "because", "due to", "caused by", "versus", or "this happens when" into one,
> name the command whose output established it. If there is no such command, write the word
> **hypothesis** or **untested** in the same sentence. Chat is free to speculate; anything
> committed is not.

> **Never attribute an observed difference to an environment you did not observe.** "Generated
> on Linux", "committed from another machine", "the CI version" are claims about history —
> check `git log`, the worktree path, or the CI run. "I don't know why these differ" is an
> acceptable and useful thing to commit.

> **Explaining an absence requires a mechanism.** Any claim of the form "X never happened
> because the sample didn't include it" is a guess unless you have checked whether X *could*
> have occurred. Query the source of truth for what makes X possible before attributing it to
> chance.

> **Findings recorded as successes get the same scrutiny as findings recorded as failures.**
> A claim attached to praise is more likely to be copied forward unchecked, not less.

> **A retro or postmortem written from a transcript states symptoms, not causes.** A
> transcript is sufficient evidence for _what happened_ and insufficient for _why_. Mark every
> mechanism in such a document as unverified until someone has run a command against the repo,
> and do not apply its prescribed remedies before that pass — a remedy inherits the
> correctness of the mechanism it was derived from.

> **Do not put an untested claim in the instructions you hand someone else.** A prompt,
> brief, or ticket that asserts "X is already present", "Y will fail without this", or "run Z
> or the gate breaks" is a causal claim with a victim. Test it, or write it as an expectation
> the recipient should check.

### Generated artifacts

> **When regenerating a committed artifact produces a diff, establish which side is correct
> before committing either.** Regenerating and committing silently asserts that the fresh
> output is authoritative. Ask it explicitly. Check whether your input matches the input the
> committed version was generated from — for text inputs on Windows, that includes line
> endings.

> **A byte-compare CI check must be reproduced with CI's inputs, not just CI's command.**
> Running the same generator locally proves nothing if the source files check out differently.

### Investigation discipline

> **An investigation ends when the mechanism is named and demonstrated, not when the symptom
> disappears.** Before closing, state the mechanism in one falsifiable sentence and point at
> the command that shows it. "Strange, anyway —", "everything resolved fine", and "must have
> been a glitch" are markers of an unfinished investigation, and a wrong postmortem is worse
> than none — it arms the trap for the next session.

> **A claim about tool behaviour must be tested with the tool.** These are one command. Do not
> reason about what `git ls-tree`, `find`, or a shell builtin "always" does; run it both ways.

> **When your hypothesis requires the environment to be bizarre, test the boring one first.**
> Escalating from "file missing" to "wrong repo" without running `pwd` inverts the cost
> ordering. Cheapest and most mundane hypothesis first, always.

> **Never `cd` in a shell whose working directory persists between calls.** Use `git -C
> <path>`, absolute paths, or root-relative invocations. Path-scoped commands (`git ls-tree`,
> `git ls-files`, `git status`, `find`, globs) silently change meaning with cwd — they do not
> error, they just answer a different question.

### Prompt authoring

> **Never assert that a gitignored or generated input is present.** Give the regeneration
> command and its verification step instead. A fresh worktree or clone has none of your
> untracked files, and describing your own machine's state as the repo's state is a defect
> the recipient pays for.

> **Re-read any prompt sentence containing both a claim and a qualifier.** "Already in the
> repo, gitignored" is self-refuting and needed no tool call to catch.

---

## Ticket 05 — what needs correcting

`.scratch/carry-forward/issues/05-proto-codegen-cross-platform-drift.md` needs its title,
Problem, and Done-when replaced. **Every substantive claim in the current version is wrong**:
the platform framing, the direction of the error (it says the committed output was the
Linux-generated one and the Windows regen revealed drift — in fact the committed output was
correct and the Windows regen corrupted it), and both prescribed remedies.

The filename is also now misleading (`cross-platform-drift`); the drift is not cross-platform.

Proposed replacement content:

```markdown
Status: open
Type: bug
Origin: phase-1/five-seed-spread merge (parallel-phase fan-in)
Blocks: phase-1

# c0acbfc committed proto output generated from CRLF-contaminated sources; CI byte-compare fails

## Problem

`c0acbfc` regenerated `packages/core/src/proto/` on Windows and committed the
result over output that was already correct. It introduced 7 corrupted lines —
`api_pb.ts` (1) and `common_pb.ts` (6) — each a blank doc-comment line that
changed from `   *` to `   * ` (orphan trailing space).

Mechanism (verified by controlled experiment, not inferred):

1. No `.gitattributes` exists and `core.autocrlf=true`, so `data/proto/*.proto`
   — committed as LF — is checked out CRLF on Windows.
2. `protoc-gen-es` copies leading comments from the `.proto` verbatim into
   generated JSDoc, carrying the `\r`. In `api_pb.ts`, 105 of 105 CR-bearing
   lines are inside comments; zero are generator-emitted code lines.
3. A blank comment line becomes `   * \r`.
4. `autocrlf` strips the `\r` on commit, leaving a trailing space that no clean
   generation produces.

Controlled test, one Windows machine, buf 1.72.0, same session:

- generate from LF sources   -> 0 CR bytes; byte-identical to `c0acbfc^`
- generate from CRLF sources -> 474 CR bytes; reproduces the drift exactly
- generate twice from identical sources -> identical output

So this is neither cross-platform generator variance nor generator
nondeterminism. The generator is deterministic. The *input* is contaminated.

`.github/workflows/verify.yml` (ubuntu-latest) runs `pnpm run proto:generate`
then `git diff --exit-code -- packages/core/src/proto data/proto`. On Linux the
sources check out LF, generation yields `   *`, the committed bytes have `   * `
-> the check fails. Simulated locally against all 16 files: 14 match,
`api_pb.ts` and `common_pb.ts` do not.

## Done when

- `.gitattributes` pins generator input and output to LF:

      data/proto/**              text eol=lf
      packages/core/src/proto/** text eol=lf

- The 7 corrupted lines are removed by regenerating from LF sources and
  committing. `git add --renormalize .` does NOT fix them: the trailing space
  is file content, not a line ending.
- `pnpm proto:generate` on Windows leaves `git status --short` clean.
- The CI proto step passes on a real run. Read the run; do not assert it.

## Notes

- Depends on ENV-2 (`.gitattributes`), but ENV-2's proposed
  `packages/core/src/proto/** -text -diff` is not sufficient here. `-diff` only
  changes how a diff is *displayed*; `git diff --exit-code` still fails on
  differing content. Neither ENV-2 nor the original version of this ticket
  removes the already-committed trailing spaces, which is the step that
  actually turns CI green.
- The original version of this ticket attributed the drift to "the worker's
  Linux/WSL run". There was no Linux/WSL run — both workers ran on the same
  Windows machine, and the contamination direction proves the committed bytes
  came from a CRLF checkout. That claim was never tested.
```

### Knock-on corrections outside my edit scope

- **The retro's RSN-2 fix block** prescribes running `pnpm proto:generate` twice on one
  machine to distinguish platform from nondeterminism. That test is real but **cannot reach
  the answer**: both runs are clean and identical, so it would have concluded "platform
  hypothesis survives" and left the ticket pointed at the wrong layer. The discriminating
  test varies the *input* line endings, not the number of runs.
- **The retro's ENV-2 fix block** should be revisited by whoever owns ENV-1/ENV-2 (W1). Its
  `.gitattributes` is close but `-diff` on the proto directory would mask exactly the drift
  CI exists to catch, and the required regenerate-and-recommit step is missing from both
  findings. Flagging the interaction only — ENV-2 is not my scope.
- **`PLAN.md` §8.1 and the `proto:generate` script** would benefit from a note that the
  generator propagates source line endings, but that is a doc change for the ticket to carry,
  not a separate finding.

---

## Classification

| Finding | Class | Portable rule |
| --- | --- | --- |
| **RSN-2** (all three instances) | **GENERAL** | A causal claim in a durable artifact must cite the command that established it or carry the word "hypothesis". |
| **RSN-2, generated-artifact sub-case** | **GENERAL** | When regeneration produces a diff, establish which side is correct before committing either. |
| **RSN-1** | **MIXED** | General: an investigation that does not name and demonstrate a mechanism has armed the trap, not cleared it. Also general: test the boring hypothesis first. Project/harness-specific: this harness's main-session Bash persists cwd (subagent threads do not), and `git ls-tree`/`ls-files` are cwd-prefix-scoped. |
| **DOC-4** | **GENERAL** | Never assert a gitignored or generated input is present; give the regeneration command and its verification. |
| **Ticket 05 remedy** | **PROJECT-SPECIFIC** | — |
| **CI byte-compare failure** | **PROJECT-SPECIFIC** | — |

The three-way split is uneven for a reason: RSN-2 and DOC-4 are the same general defect —
*writing an unverified belief into a place where someone else will read it as fact* — differing
only in whether the belief concerns a cause or a file. RSN-1 is a genuinely different failure
(a scoped observation misread as a global one), and only its second-order half generalizes.

## Severity

I would **raise** RSN-2 above the retro's P0 framing and above ENV-1 as the session's
highest-leverage finding. The retro nominates ENV-1 (worktree exclusion) as the single
highest-leverage fix. ENV-1 is real, but its damage was caught: a near-miss, a broken local
verify, no bad bytes committed. RSN-2 put a **regression into `main`'s ancestry**, a wrong
premise into a tracked ticket, and a wrong claim into the retro meant to correct the record —
and none of it was noticed until this pass. It also has the worse property: ENV-1 fails
loudly, RSN-2 fails silently and is inherited as fact.

ENV-1 and ENV-2 remain the right _first_ fixes — `.gitattributes` is a precondition for
closing ticket 05. But the ranking of what went most wrong should change.

The cross-worker result (Instance 4) settles this. RSN-2 is not one of six finding families;
it is the defect the retro is **made of**. ORCH, DOC and CTX each turned out to contain a
correct observation attached to an untested mechanism, which is the exact RSN-2 shape. Fixing
ENV-1 fixes one gap. Adopting the durable-artifact rules below changes how every future
finding gets written down.

## One thing to do first

If only one rule is adopted from this report, adopt this one:

> **Mark causal claims you did not test.** In any commit message, ticket, plan doc, or retro:
> if you write why something happened, either name the command that showed it or write
> "hypothesis — untested" in the same sentence.

It is free, it is checkable in review, and it would have prevented `c0acbfc`'s invented Linux
run, ticket 05's misdirected remedy, `119c0b7`'s wrong ring explanation, the retro's repeat of
it, ORCH-1's non-determinism story, and the prettier instruction sent to five workers.
