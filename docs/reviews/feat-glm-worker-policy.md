# Pre-merge review — feat/glm-worker-policy

Reviewed range: `c83e571227bf94c468cf5874a0110d6f58a28fa7..a13c89b124215574f4add9bdcb193d369e00e556`

Dispatch note (round 1): small-change lane. `git diff --shortstat dev...HEAD`
gave `1 file changed, 41 insertions(+), 1 deletion(-)`; `git diff --name-only
dev...HEAD` gave `docs/agents/model-policy.md`. `codex` is not on `PATH`, so one
fresh `general-task` reviewer on Opus (effort `high`) ran the adversarial brief
and applied the `code-review` skill's Standards and Spec checks itself. Domain
axis skipped: the diff is about agent types and models, with no game-domain
content.

Line numbers below are for `docs/agents/model-policy.md` at `a13c89b1`
unless a finding names another file.

## Adversarial

- **A1a** (line 99, § Lane is per job): "Name the model on every spawn" has
  no GLM exception there; only lines 238–240 carry one. An agent following
  line 99 passes `model` on a `glm-task` spawn, and the agent files'
  descriptions say a call-site model "replaces GLM with Claude", so the job
  silently runs on Claude.
- **A1b** (`AGENTS.md` lines 163 and 179): the same rule, with no exception,
  in AGENTS.md. Same failure as A1a. This branch's brief forbade AGENTS.md
  edits, and AGENTS.md edits need the owner's approval of the exact text.
- **A2** (lines 302–318 against 363–365): the "Always `general-task`" list
  binds only `simple-task` and the trial types. The GLM section excludes
  only review, design, planning, debugging and judgment, so as written a
  `glm-task` "mechanical change" may take a `data/` regen, a pin move, a
  `vendor/tbc-new-fork` edit, `scripts/`, agent files or a `parallel-phase`
  worker. The facts file
  (`.scratch/plans/agent-setup-2026-10/glm-worker-policy-facts.md`) does not
  settle this, so the fix is an owner decision, not a wording change.
- **A3** (lines 369–373): the evidence sentence says the later review found
  "a code comment and a test name" that claimed too much. The comment
  predates the GLM work: `git -C /home/daniel/Code/Snug/pattern-text-extractor
show 20388fad:src/extract.ts` has it at lines 41–43, and `20388fad` is the
  base of that review's first `Reviewed range:`. Only the test name was new.
  The facts file has the same error.
- **A4** (line 350): "cheaper" is stated as fact. The plan says cheapness
  "depends on cache reads; measure per route" (PLAN.md line 196 in
  `.scratch/plans/agent-setup-2026-10/`), and no per-task cost is recorded.
- **A5** (lines 81–84 against 350): "fill for … workhorse jobs" next to
  "Claude Code names none [peer fill]" leaves it open whether a job that
  hits a wall may move to GLM.
- **A6** (lines 206–208): both GLM agent files return `NEEDS_JUDGMENT`; the
  policy says what to do with that return only for `simple-task`,
  `discrete-task` and `modest-task`. The facts file is silent: owner
  decision.

Not a defect: the router card's sandbox allows writes only under `~/.npm`
and `~/.cache`, so `pnpm wt:pair` probably fails on that card (hypothesis,
untested); it would fail loudly.

## Domain

Skipped (see the dispatch note).

## Standards + Spec

- **S1** (line 363): "stay on their own lanes" is unclear; debugging and
  judgment are not lanes.
- **S2** (line 347): "T3 card" is not defined anywhere in this repo's docs.
- **S3** (lines 379–380): "cannot `git push`" is stated as fact, but
  `router-card-subplan.md` line 36 lists `git push` over HTTPS as untested.
- **P1** (line 374): the fallback is keyed to knowing which card the session
  runs on; the facts file keys it to "If the harness doesn't list these
  types", which an agent can check.

Otherwise clean: only `docs/agents/model-policy.md` changed, no AGENTS.md,
CLAUDE.md or skill file; the section sits under § Claude Code after § Trial
types; it says the types exist only on that card and that a missing type is
no reason to restart; models, tools, the no-`model` spawn and the
`delegate_task` rule match `~/.claude_router/agents/*.md` and
`router-card-subplan.md` § 3–4. Prettier passes.

## Code quality

| ID  | Row                                                               |
| --- | ----------------------------------------------------------------- |
| S1  | Replace "stay on their own lanes" with a plain "not for" sentence |
| S2  | Name the "T3 Code provider card"                                  |
