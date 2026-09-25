# Pre-merge review — feat/orchestration-model-policy

Reviewed range: `e13edd4d6ccb46977d7984e924ef9dc8c6302d1e..1d86fd489880328998c199d1f2c8c60caa854f7a`

Dispatch: `codex exec` is not on `PATH`, so each axis ran as a fresh
subagent on Opus. The axes used the built-in `general-purpose` type, not
`general-task`: this branch adds `general-task`, and it is not registered
in a session started from another branch. The effort the built-in ran at
is unverified. That is the gap ticket 520 describes. Each axis was told it
writes nothing. Standards and Spec were dispatched as the two `code-review`
sub-agents. The spec was the owner-approved proposal, revision 2
(2026-09-25), and its writing review, plus four owner decisions that
override it: delegation binds every harness; Codex delegates non-review,
non-design work to lower-reasoning mid-tier agents and uses them freely;
the orchestrator's model is a per-session choice; the new agent types pin
model and effort in frontmatter. All four axes also judged the diff against
`.claude/skills/writing-for-agents/SKILL.md`.

Known gaps accepted before review: `gate-visual.md` is not on `dev`, so
it and the stage-gate Visual row are not edited here; `xhigh` is labelled
untested; ticket 517 covers agent-definition reload.

Baseline: `pnpm verify` on 1d86fd48 exited 0 (Node v22.17.1). Fixes for this round are in `edec2138`, after the reviewed range.

## Adversarial

No Blockers. The worktree was clean on arrival.

- **A1 (Major).** `code-review/SKILL.md:60` and its `.agents` copy still
  say "Use the `general-purpose` subagent for both". `pre-merge-review`
  invokes that skill for its third axis, and model-policy.md:203-205 says
  to spawn the new types in place of the built-ins. The Standards and Spec
  axes therefore spawn a built-in that inherits the session's model and
  effort. On a Fable session they bill at Fable. This is the one review
  axis the new policy does not control.
- **A2 (Minor).** gate-visual is handled inconsistently.
  model-policy.md:199 says every `gate-*` seat runs Opus at `high`. On
  feat/tab-signoff-followups, `gate-visual.md` still has `effort: medium`
  and no `model:` line. No ticket or note records the follow-up. After
  both branches merge, the stage-gate table conflict will show the gap,
  but `gate-visual.md` will keep `medium` without any conflict.
- **A3 (Minor).** `qa/SKILL.md:24` and
  `improve-codebase-architecture/SKILL.md:27` still use
  `subagent_type=Explore`, in both copies.
- **A4 (Minor).** The Codex and Cursor delegation text sends only
  "everything that is not review or design" to subagents. Read literally,
  the session keeps review and design, which contradicts "It hands every
  task to a subagent" (AGENTS.md:138). The Cursor table row still gives
  the parent "Planning and merge coordination".
- **A5 (Minor).** AGENTS.md:145 sends all "reading code or docs" to a
  subagent. But stage-gate Gate A needs the session to read
  `plan-template.md`'s section list, and Recovery resumes by reading
  `decision-log.md`.
- **A6 (Minor).** AGENTS.md:145 hands `pre-merge-review` to a
  `general-task`. `general-task.md` makes that agent read-only when the
  prompt allows no path, so a bare "run the whole skill" prompt cannot
  write the review file, file tickets or commit.
- **A7 (Minor).** model-policy.md:122-123 calls Opus "a top-tier model",
  but line 218 says Fable is the top price tier and line 127 says never
  to guess a tier.

What checked out:

- The mirrors are byte-identical.
- The sub-agents docs confirm three things: `effort: xhigh` and `effort:
high` are valid in frontmatter, a call-site model outranks the
  frontmatter model, and a definition with no effort takes the session's.
- All four seats' `WRONG_MODEL` checks require "Opus", and every call site
  names `opus`.
- Every agent type the diff references exists.
- The Fable mentions left in model-policy are dated history.

Unexamined:

- `pnpm verify`. The axis was read-only. The baseline above covers it.
- The Codex and Cursor parallel-phase adapters.
- Whether a `general-task` can spawn nested agents, and whether Sonnet
  accepts effort `high`. Both need a live session to check.

## Domain

**Domain: clean.** The diff makes no TBC, WCL, wowsims or game-data
claims. `gate-sme.md` moves from effort `medium` to `high` and gains
`model: opus`, and it keeps its Opus self-check. `sme-rank-review` is not
touched, and its pointer to the review lane still resolves. No domain check
is routed to `simple-task`.

## Standards + Spec

### Standards

- **S1 (Major, judgement).** The Codex bullet in AGENTS.md § The session
  delegates says "Lower-reasoning agents do this work well, so use them
  freely." That is a causal claim with no command and no `untested`
  label, which § Durable claims forbids.
- **S2 (Major).** model-policy § Claude Code says to spawn the new types
  "in place of the built-in `Explore`, `general-purpose` and `Plan`
  types". `code-review/SKILL.md:60`, `qa/SKILL.md:24` and
  `improve-codebase-architecture/SKILL.md:27` still name built-ins, and so
  do their `.agents/skills` copies. `pre-merge-review` invokes
  `code-review` unchanged, so its Standards and Spec axes run on
  `general-purpose`.
- **S3 (Major, judgement: Duplicated Code / Shotgun Surgery).** The model
  and effort values are written in about seven places, and "extremely
  simple" is defined twice. Only frontmatter takes effect, so the other
  copies can drift from it without anything failing.
- **S4 (Minor).** model-policy.md:63-66, "A model pinned [in design] is
  not a general-purpose upgrade", is stale now that Opus fills every lane.
- **S5 (Minor).** Banned words stay in rewritten paragraphs: "The tell"
  in AGENTS.md, and "carries" in the parallel-phase Done-when line.
- **S6 (Minor).** Ticket 517's `Origin:` names a proposal, not a review.
- **S7 (Minor, judgement).** Stage-gate § Seats says to name the model at
  the call site even though frontmatter pins it, then says a wrong
  call-site name is the one way a seat runs on the wrong model.
- **S8 (Minor).** AGENTS.md § Parallel agents mentions "The Delegator"
  before introducing it, and the "— never merge each worker into `dev`"
  clause now dangles. This is the same defect as SP6.
- **S9 (Minor, judgement).** The new AGENTS.md subsection adds about 15
  always-loaded lines, and its per-harness bullets repeat model-policy.

The axis also checked `NEXT`: moving from 412 to 518 is correct. dev's
412 was already stale, since 413 and 414 exist on dev, and
feat/tab-signoff-followups holds tickets up to 516 with `NEXT` at 517.

### Spec

The diff contains every section of the proposal, 1a to 13. The four
skill mirrors are byte-identical (`cmp`), the "Not changed" list is
respected, and the diff adds nothing out of scope.

- **SP1 (Major).** The `xhigh` pre-merge check is not recorded. The spec
  says to "spawn `design-task` once … record how you confirmed it in the
  commit body", and the commit body does not mention it. The committed
  label, "the CLI accepts it; model-side behavior untested", also claims
  something the commit gives no source for.
- **SP2 (follow-up, outside the repo).** The auto-memory file
  `feedback-fable-low-orchestrator-lane.md` still says "Fable low = plan +
  judge". The spec asks the caller to update or retire it after merge.
- **SP3 (Minor).** Codex's "lower reasoning" and "use freely" rules are
  in AGENTS.md only. model-policy § Codex still says "Mid tier", and
  model-policy tells agents to "Read the fill out of your harness
  section".
- **SP4 (Minor).** The Cursor table row "Parent / orchestrator | Either;
  Grok is fine | Planning and merge coordination" contradicts the
  delegation rule.
- **SP5 (Minor).** For Codex and Cursor, AGENTS.md and model-policy never
  say where review and design jobs go.
- **SP6 (Minor).** The 2b dash clause now reads as if it applies to
  Claude Code only.

## Summary

**No Blockers.** Four findings are Major:

- **Built-in agent types (A1 + S2).** Three skills still name built-in
  types, and one of them is `code-review`, which `pre-merge-review` uses.
  Deferred to 520 for the owner's call.
- **The `xhigh` check (SP1).** The label now cites `claude --help`, and
  the model-side check is deferred to 518.
- **Unsourced Codex claim (S1).** AGENTS.md states a causal claim with
  no command. Deferred to 519, because AGENTS.md edits need owner
  approval.
- **Duplicated values (S3).** The model and effort values are written in
  about seven places. Won't fix: it is a judgement smell against the
  approved layout.

The smaller defects in model-policy.md are fixed in `edec2138`. That
commit landed after this round's range, so the next round starts at
`1d86fd48`. Every other AGENTS.md or skill wording defect is collected in
519 or 520 for owner approval, as AGENTS.md § Writing for agents requires.
`gate-visual` has a follow-up in 521.

`pnpm verify` exited 0 on 1d86fd48 and again after the fix commit.

## Disposition

Tickets 517 to 521 were deleted on 2026-09-25; the owner judged them too much overhead for this change. The rows below say where each finding went.

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                 |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | fixed in 4698c74b: `code-review` spawns `general-task` with `model: "opus"`                                                                                                                                                   |
| A2  | Adversarial | wontfix     | dropped; fix gate-visual effort when feat/tab-signoff-followups merges                                                                                                                                                        |
| A3  | Adversarial | wontfix     | Owner, 2026-09-25: `qa` and `improve-codebase-architecture` stay on `Explore`                                                                                                                                                 |
| A4  | Adversarial | fixed       | fixed in 4698c74b: AGENTS.md Codex and Cursor bullets say where review and design jobs go                                                                                                                                     |
| A5  | Adversarial | fixed       | fixed in 4698c74b: the session reads its own stage-gate artifacts                                                                                                                                                             |
| A6  | Adversarial | fixed       | fixed in 4698c74b: the review subagent may write and commit `docs/reviews/` and `.scratch/carry-forward/`. The stage-gate step 7 pointer was not added                                                                        |
| A7  | Adversarial | fixed       | edec2138: "When the workhorse fill is the same model as review — on Claude Code both are Opus"                                                                                                                                |
| S1  | Standards   | fixed       | fixed in 4698c74b: AGENTS.md now says "The owner wants these used freely"                                                                                                                                                     |
| S2  | Standards   | fixed       | fixed in 4698c74b for `code-review`; see A3 for the other two skills                                                                                                                                                          |
| S3  | Standards   | wontfix     | Judgement smell. Frontmatter is the only place Claude Code reads effort, and a spawner has to see the model to name it at the call site, so the descriptions and tables copy it. The owner approved this layout on 2026-09-25 |
| S4  | Standards   | wontfix     | model-policy:63-66 governs the design fill, which is Opus at `xhigh` through `design-task`. Using that fill outside planning still needs a reason, so the sentence is not stale                                               |
| S5  | Standards   | wontfix     | "The tell" and "carries" come from text on `dev` that this diff did not rewrite (`git show dev:AGENTS.md`)                                                                                                                    |
| S6  | Standards   | wontfix     | Moot: ticket 517 was dropped (owner, 2026-09-25): not worth a ticket                                                                                                                                                          |
| S7  | Standards   | wontfix     | The owner approved call-site naming (proposal § 3c). It also keeps the `WRONG_MODEL` self-check meaningful                                                                                                                    |
| S8  | Standards   | fixed       | fixed in 4698c74b: same defect as SP6                                                                                                                                                                                         |
| S9  | Standards   | wontfix     | The owner asked for the delegation rule in AGENTS.md, which is always loaded                                                                                                                                                  |
| SP1 | Spec        | wontfix     | dropped (owner, 2026-09-25): not worth a ticket                                                                                                                                                                               |
| SP2 | Spec        | wontfix     | Outside the repo. The caller updates or retires the auto-memory `feedback-fable-low-orchestrator-lane.md` after merge                                                                                                         |
| SP3 | Spec        | fixed       | edec2138: the Codex workhorse row says "Mid tier at a lower reasoning effort", and the section says the owner wants these used freely                                                                                         |
| SP4 | Spec        | fixed       | edec2138: the Cursor orchestrator row reads "Routes and judges; it delegates planning and merges"                                                                                                                             |
| SP5 | Spec        | fixed       | fixed in 4698c74b: same defect as A4                                                                                                                                                                                          |
| SP6 | Spec        | fixed       | fixed in 4698c74b: "Never merge each worker into `dev`." is its own sentence                                                                                                                                                  |
| N1  | Standards   | wontfix     | Moot: this branch no longer changes `NEXT`                                                                                                                                                                                    |
