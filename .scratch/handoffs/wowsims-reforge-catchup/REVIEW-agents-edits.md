# Review — two drafted `AGENTS.md` edits

Rubric: the `writing-for-agents` skill (invoked and applied, not merely
cited). Scope: read-only. Nothing was edited; this file is the only output.

Sources read:

- Drafts: `.scratch/handoffs/wowsims-reforge-catchup/AUDIT-wsl-feasibility.md`
  § 3, lines ~268–320.
- Target: `AGENTS.md` `### Durable claims` (the "exit code" paragraph) and
  `### CLI environment` (the `**Before**` pointer line).
- `docs/agents/known-traps.md` (all 139 lines, headings and § pin body).

---

## Verification first

### The pipe claim (draft a) — TRUE, measured in this repo's Git Bash

Run in the Bash tool, `bash 5.2.15(1)-release`:

```
$ false 2>&1 | tail -n 1; echo "pipe status=$?"
pipe status=0

$ nosuchcmd_xyz 2>&1 | tail -n 1
/usr/bin/bash: line 1: nosuchcmd_xyz: command not found
$ echo "${PIPESTATUS[0]} ${PIPESTATUS[1]} $?"
127 0 0

$ set -o | grep pipefail
pipefail       	off
```

All three of the draft's factual claims hold: the pipeline reports the last
command's status; `${PIPESTATUS[0]}` carries the real one; and `pipefail` is
**off** by default here, so nothing rescues the shape automatically. The
motivating incident (`make host ... 2>&1 | tail` returning 0 over
`make: command not found`) is exactly the 127-then-0 case reproduced above.

### The known-traps section (draft b) — the precondition is now MET

The audit says the pin-moving section does not exist. **That is stale.**
`docs/agents/known-traps.md` line 68 is `## Before moving the wowsims engine
pin`, a 38-line section (through line 106) covering the slash-in-tag nesting,
the `watchedRefs` staleness, the `currentPhase`/`defaultMaxPhase` co-write, the
build-from-source toolchain requirement, and the by-design red fork gates. It
landed in `ad7f2d7 Record ADR-0030 and correct what the pin move falsified`.

So (b)'s blocker is cleared. It is also the only section heading in that file
with no matching trigger in the `AGENTS.md` pointer — the other seven headings
all map to a trigger. That is the actual argument for (b), and it is stronger
than the one the draft makes.

---

## Draft (a) — piped exit codes

**Verdict: APPROVE WITH CHANGES.**

### Is it necessary? Yes — the existing line does not cover it

The existing sentence reads:

> **An exit code is not evidence that work happened.** A stopped background
> task reports exit 0, and a command that ran in the wrong directory succeeds
> at nothing.

Both existing examples are *honest* exit codes: some process really did run and
really did return 0; the fault is that the 0 does not mean what the reader
takes it to mean. The remedy the sentence gives — confirm the artifact — works
for those.

A pipe is a different animal. `make: command not found` is a **127 that the
shell then discards**. No process ran at all. The distinction matters for
behaviour, not just taxonomy: the existing remedy ("confirm the artifact") is
the one that *did* eventually catch incident 1, by artifact timestamps — so the
paragraph is not useless here — but an agent reading the current text has no
reason to suspect the exit code itself is fabricated, and so no reason to reach
for `PIPESTATUS`. That is a genuine gap, and it is not covered elsewhere in
`AGENTS.md`.

Sharpening the case: the repo **actively teaches the dangerous shape** two
paragraphs above, in the same section —

> Bound scaling command output (`--stat`, `head`/`tail`, exit codes) before
> dumping unbounded diffs or logs

`AGENTS.md` tells the agent to pipe into `tail`, and then does not tell it that
piping into `tail` destroys the exit code it is also told to check. That is not
bloat to fix; that is an instruction with a hole in it.

Against the skill's **no-op** test: does the sentence change behaviour versus
the default? Yes. The default is to read the tool result's exit code as the
command's status, and this repo produced a false "build succeeded" report to
the user from precisely that default. Not a no-op.

### Is it in the right place? Yes — and the audit's reasoning is right

The task brief frames this as a shell-mechanics fact sitting in an evidentiary
section, which would argue for `### CLI environment`. I disagree, on the
skill's **co-location** criterion. Co-location asks what sits beside a piece
once you know its rung: keep a concept's rules and caveats under one heading so
reading one part brings its neighbours. The concept here is *what an exit code
proves*. The pipe fact is a caveat on that concept, and its remedy
(`PIPESTATUS` / drop the pipe) only makes sense once you already care about the
exit code's truth value. Split from the paragraph it qualifies, it becomes a
free-floating shell trivium; attached, it extends a claim the agent is already
holding. The mechanics belong beside the evidentiary rule they break.

Two corroborating signals: the "bound scaling command output" line it collides
with lives in `### Durable claims`, not `### CLI environment`; and `### CLI
environment`'s own material is about *shells differing* (Bash vs PowerShell,
backgrounded `cd`, Windows path forms) — the pipe fact is identical in both
shells' POSIX semantics and would be the odd one out there.

Appending rather than starting a new paragraph is also correct: a new bolded
lead would raise this to a peer of "An exit code is not evidence" and "A
property measured against one option", inflating its rank on the hierarchy past
what it is — a caveat, not a law.

### Will an agent act on it? Yes, with one fix

The draft states the positive move (`read ${PIPESTATUS[0]}`) rather than
banning pipes — correct handling of the skill's **negation** warning, and
important, because a ban would collide head-on with the "bound scaling output"
instruction and leave the agent with two rules it cannot both obey.

The behavioural weak point is `${PIPESTATUS[0]}`. It is only readable in the
**same shell invocation**, in the command immediately after the pipeline. Each
Bash tool call here is a fresh shell, so an agent that runs the pipe in one
call and tries to read `PIPESTATUS` in the next gets nothing. An agent that
knows this already will append `; echo ${PIPESTATUS[0]}`; an agent that does
not will get a plausible-looking empty result and conclude the advice is
broken. Naming the shape closes that.

### Second issue: the draft covers only the pipe, and the evidence is broader

The brief flags this correctly. Of the three motivating incidents, only #1 is a
pipe. #2 and #3 are `&&` chains that failed to run their right-hand side while
the compound still returned 0.

I checked the mechanism rather than assuming it. `&&` propagates correctly —
`false && echo x` gives 1, and stderr noise on a successful left side does not
break the chain. So there is no second shell fact to document. What actually
happened in #2 and #3 is the fnm-env footgun *already documented* in the user's
memory (`reference-fnm-node-shell-footgun`), interacting with a chain. The
observable I hit while testing for this review is the same one:

```
error: We can't find the necessary environment variables to replace the Node version.
```

emitted by the shell's own profile before any of my commands ran.

**Conclusion: extending draft (a) to cover chains would be scope creep, and
worse, would be wrong** — it would document a shell behaviour that does not
exist. `&&` is not the bug. The right response to #2 and #3 is not more words
in `### Durable claims`; the file already carries the correct remedy in `###
CLI environment` ("Reach for the command's own directory flag: `npm --prefix`,
`git -C`, `pnpm -C`"), and the fnm trap is already in `known-traps.md` § "Before
running node / pnpm / test commands". Keep (a) about pipes.

That said, one word makes the generalisation land without adding a claim: lead
with what the agent should *check*, not with what pipes do. See revised text.

### Writing rules

Plain English, ASD-STE100 / Google dev style: the draft is clean — active
voice, present tense, second-person-implied imperative, no ambiguous
vocabulary. It matches the file's voice (bolded lead, em-dash aside, concrete
command in backticks). One nit: "bound the output another way" is vague where
the rest of the paragraph is concrete. Name the way.

Length: the draft adds 40 words to a 74-word paragraph. That is a real cost on
an always-loaded file. My revision comes in at 38 — no saving worth chasing,
but no growth either, and it buys the same-command fix.

### APPROVE WITH CHANGES — exact revised text

Replace the whole `**An exit code is not evidence that work happened.**`
paragraph with:

```markdown
**An exit code is not evidence that work happened.** A stopped background task reports exit 0, and a command that ran in the wrong directory succeeds at nothing. A pipe is worse — it reports the **last** command's status, so `make ... 2>&1 | tail` returns `tail`'s 0 and hides `make: command not found`. To bound output and keep the status, append `; echo "rc=${PIPESTATUS[0]}"` to the same command (a later tool call is a new shell and has lost it), or redirect to a file and `tail` it separately. Confirm the artifact — `ls node_modules`, read the file, check the row count — before reporting an install, build or regen as done.
```

Four changes from the draft:

1. **Moved before "Confirm the artifact"**, so the paragraph runs
   cause → cause → cause → remedy, and the artifact check reads as the catch-all
   it is. The draft leaves it stranded mid-paragraph.
2. **`make ... | tail` rather than `cmd ... | tail`**, with the real error
   text. A leading word the skill would endorse: the agent has the actual
   incident, not an abstraction.
3. **"append to the same command"** with the parenthetical on why. This is the
   fix that decides whether the advice is actionable.
4. **"redirect to a file and `tail` it separately"** replaces "bound the output
   another way" — a named move instead of a gesture.

---

## Draft (b) — known-traps trigger

**Verdict: APPROVE AS WRITTEN.**

The audit's stated blocker no longer applies: `## Before moving the wowsims
engine pin` exists at `docs/agents/known-traps.md:68`, is 38 lines of real
content, and is the file's most detailed trap. The precondition the audit
correctly insisted on is satisfied, and (b) can land today.

Against the skill's **context pointer** criteria:

- **One trigger per branch.** The pointer's job is to list the branches that
  should trigger reaching the material. `known-traps.md` has eight sections;
  the pointer currently names seven. "moving the wowsims engine pin" is the
  eighth, and it is a genuinely distinct branch — not a synonym for the
  scripted/generated-file trigger beside it, since a pin move is a *lock and
  toolchain* action whose failures (404s, nested vendor dirs, exit-2 fork
  gates, silent `defaultMaxPhase` writes) share nothing with generated-file
  edits.
- **Front-loaded leading word.** "moving" is the verb, first. Consistent with
  its neighbours.
- **Cuts identity the body already carries.** Six words for a 38-line section
  the agent otherwise reaches only by luck. Good ratio.
- **Placement in the list.** After the scripted/generated-file trigger is
  fine — it does not match the file's section order (pin is 4th of 8, this
  puts it 3rd of 8), but the pointer's order does not track the file's order
  today either, and reordering is churn on a file where every edit costs
  approval. Leave it.

**Will an agent act on it?** This is the strongest behavioural case of the two.
Without the trigger, an agent about to run `sync_wowsims.py --update --ref` has
no reason to open `known-traps.md`, and the trap section documents at least
four failures that cost real time — including one (`defaultMaxPhase` written
silently, invisible to every gate in `pnpm verify`) that no gate catches and no
error message announces. That is precisely the class of material a pointer
exists for.

**Writing rules.** Six words, imperative-compatible, no new vocabulary. Nothing
to change.

---

## Would I cut instead of add?

I looked for this, as asked. Answer: no for (b), qualified no for (a).

For (b) there is nothing to cut — it is a pointer to material that already
exists and is currently unreachable by design intent.

For (a) I considered arguing "the existing line already does this job" and
rejected it on the evidence. The existing remedy did eventually catch incident
1, but by accident of the agent choosing to check timestamps, not because the
text told it the exit code could be fabricated. More decisively, `AGENTS.md`
itself recommends the shape that breaks the exit code. A file that says "bound
output with `tail`" and "check exit codes" in the same section, without saying
those two interact, has an internal hole — and holes are worth words in a way
that restatements are not.

What I would cut, if the owner wants the paragraph to stay near its current
length: nothing in the existing text is dead. My revision is net +38 words on
`### Durable claims`, which is already the longest section in the file. That is
the honest cost.

---

## Recommendation to the owner

- **Draft (a):** approve with changes — take the revised paragraph above, not
  the draft as written; the draft's `${PIPESTATUS[0]}` advice does not work
  across tool calls and needs the same-command shape spelled out.
- **Draft (b):** approve as written and land it — the audit's blocker is stale,
  the pin trap section exists at `docs/agents/known-traps.md:68`, and it is the
  only trap section the pointer does not name.
