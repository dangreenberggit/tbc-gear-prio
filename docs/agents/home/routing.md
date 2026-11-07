# Agent routing

Which agent type takes a job a caller hands off, in every Claude Code
session on any T3 card, and
what a type does with a job it cannot take. This is the only file that
states the rule.
Every other place is a pointer here, so a routing change is an edit here
and nowhere else.

Who reads what: a caller reads the whole file once per session, before
its first spawn. A workhorse worker reads § Bars, § Size bound and
§ Hand-backs before it starts; a GLM worker reads § Private data first.
The hook `flash-over-sonnet.py` reads § Sonnet reasons and § Refusal
each time it runs. A repo writes nothing about routing except the two
things this file sends to the repo: its protected paths, bound commands
and extra bars (§ Bars) and its card limits (§ Cards).

## Principles

Name the model on every spawn, except a GLM type, which takes none. An
unnamed subagent whose type names no model runs on the conversation's
model, so a session on Fable then pays the top price tier for a `grep`.

- **Overseer.** Opus `general-task` executes a plan, reviews, oversees
  workers, judges an investigation, debugs and does hard implementation.
  Fable `design-task` makes a plan or an architecture call. An overseer
  holds the judgment itself and hands its workhorse jobs down in blocks,
  each with the exact list of what to return. It spawns another overseer
  for a piece that is itself judgment: a review axis, a chunk of a plan,
  oversight of a worker set. The guard on delegation is the job's kind,
  never the depth of the chain.
- **Workhorse.** A search, a read, a named command run that writes no
  tracked file, a measurement, an edit whose exact text the prompt
  states, or small or modest coding (§ Size bound). A workhorse type does
  one block whose result the prompt fixes or names, and spawns nothing.
  On the T3 card "Claude + GLM workers", where the harness lists
  `glm-flash-task`, every workhorse job goes to `glm-flash-task` unless
  it is private (§ Private data) or a web lookup, and a Sonnet spawn
  needs a `Sonnet because:` line (§ Sonnet reasons). On every other card
  the workhorse types are `discrete-task` and `simple-task` (Sonnet) and
  `modest-task` (Opus).
- A helper's `not found` is one input to a conclusion of absence, never
  the conclusion.

## Decision table

Find the first row that fits the job. A hand-back (a `NEEDS_JUDGMENT:`
line from a worker) is routed by rows 14 to 16 only, and the first of
those rows that fits wins. "GLM card" is a session where the harness lists `glm-flash-task`;
"other cards" is every other Claude Code session. A caller whose own prompt tells it
to spawn no other overseer does a job a row sends to `general-task`
itself.

| # | Job | GLM card | Other cards |
| --- | --- | --- | --- |
| 1 | A job on § Bars; a review axis; a plan's execution; oversight of workers; an investigation; debugging; hard implementation | `general-task`, model `opus` | same |
| 2 | A plan or an architecture call outside stage-gate | `design-task`, model `fable` | same |
| 3 | A stage-gate seat | its `gate-*` type, with the model the stage-gate skill names for that seat | same |
| 4 | A workhorse job that is private (§ Private data) | the "other cards" type of the job's row below; when that is a Sonnet type, `Sonnet because: private: <path or what>` | the type of the job's row below |
| 5 | A web lookup: a fetch or a web search | `discrete-task`, model `sonnet`, `Sonnet because: web` | `discrete-task`, model `sonnet` |
| 6 | A cold reader for `instruction-review` | the type and model of the agent the text is written for; when that is a Sonnet type, `Sonnet because: cold read` | same |
| 7 | A deliberate test of a Sonnet type | that type, `Sonnet because: test` | that type |
| 8 | A retry after a GLM type hit a usage wall | the "other cards" type of the job's row; when that is a Sonnet type, `Sonnet because: glm wall retry` | not a case |
| 9 | A workhorse job whose caller's own prompt holds a blanket "do not use GLM" (§ Private data: nobody writes one) | the "other cards" type of the job's row; when that is a Sonnet type, `Sonnet because: caller order: <the quoted ban>`; the caller never runs the job itself | the type of the job's row |
| 10 | A search, a read, a named command run that writes no tracked file, a measurement, or an edit whose exact text the prompt states | `glm-flash-task`, no model | `discrete-task`, model `sonnet`; `simple-task`, model `sonnet`, when it is one command, one read or one edit with a known target |
| 11 | Small or modest coding: the prompt names the files and what the result must do, within § Size bound | `glm-flash-task`, no model | `modest-task`, model `opus` |
| 12 | A `parallel-phase` slice | by the slice's kind: row 11, else row 1 | same |
| 13 | A job that looks like rows 10 or 11 but the caller is unsure whether it needs judgment | `glm-flash-task`, no model; it hands back what it cannot do (§ Hand-backs) | the type of rows 10 or 11; it hands back what it cannot do |
| 14 | A hand-back `NEEDS_JUDGMENT: private: ...` | row 4 | row 4 |
| 15 | A hand-back `NEEDS_JUDGMENT: approach: ...` from `glm-flash-task` | `glm-task`, no model, same prompt | not a case |
| 16 | Any other hand-back | answer it with one line in the prompt, in place of the missing or wrong item (a path, a check command, which file, what the result must do), or split the job; re-send to the same type. Else `general-task`, model `opus`, same prompt | same |
| 17 | Otherwise | `general-task`, model `opus` | same |

Row 1 comes first, so no later row puts a review, a plan, debugging or a
hard slice on a workhorse type.

## Private data

z-ai receives everything a GLM worker sees: its prompt, every file it
reads, and every command output. A job is **private** when its prompt
contains, or a read or command it is told to run touches, any of:

- a secret: an API key, token, password, credentials file, `.env` file,
  or environment-variable output;
- a session log: `~/.claude*/projects/`, `/tmp/claude-*/**/tasks/*.output`;
- a file under `~/.claude*` or `~/.t3`, except `~/.claude/routing.md`
  (this file) and the git checkouts in `~/.t3/worktrees/`;
- anything the repo's `AGENTS.md` keeps private;
- text copied from any of these, wherever it now sits.

Privacy is decided for each helper by what that helper's own job
touches. Whoever writes a helper's prompt names the private paths and
text that helper's job touches, and writes no blanket "do not use GLM"
(row 9). No agent reads a secret; a private job for Sonnet is a
session-log or config read, never a secret.

A GLM worker checks its own prompt against this list before its first
tool call: pasted log lines, a config excerpt or a secret in the prompt
make the job private even when every path it touches is in the repo.
When its prompt or its job meets the list, it returns
`NEEDS_JUDGMENT: private: <path or what>` as its whole reply.

## Sonnet reasons

On the GLM card a Sonnet spawn (`discrete-task`, `simple-task`, or any
spawn with `model: "sonnet"`) has as its prompt's first non-blank line
`Sonnet because: ` and one of these:

- `private: <path or what>` (rows 4, 14)
- `web` (row 5)
- `cold read` (row 6)
- `test` (row 7)
- `glm wall retry` (row 8)
- `caller order: <the quoted ban>` (row 9)

The hook `~/.claude/hooks/flash-over-sonnet.py`, a `PreToolUse` hook on
`Agent` wired in `~/.claude_router/settings.json` only, refuses a Sonnet
spawn whose first non-blank line is not one of these and shows § Refusal.
The run logs keep each reason for a later count. A cold reader's or a
test subject's prompt starts with its line too; the line names its
role, not the review's intent.

## Refusal

The hook prints this section's paragraph, joined to one line.

flash-over-sonnet: this Sonnet spawn was refused because its prompt's
first non-blank line is not `Sonnet because: <reason>` with a reason
from `~/.claude/routing.md` § Sonnet reasons. Re-send it with the line
that is true for this job, or send the job to the type that
`~/.claude/routing.md` § Decision table names for it.

## Hand-backs

A workhorse type stops and returns one line, `NEEDS_JUDGMENT: <what>`,
when the job needs a choice the prompt did not make, anything on § Bars,
or something the prompt should have given. Any change to how a named
command runs to make it start or pass (an added flag, config switch,
environment variable or different script) is such a stop. When the
worker leaves edits behind, the line ends with `; edits left in <files>`.
That line is the worker's whole reply: no summary, no findings and no
suggestion before or after it.

Two stops put a tag after `NEEDS_JUDGMENT: `; take the first that fits:

- `private:` from a GLM type (§ Private data);
- `approach:` from `glm-flash-task`, when the prompt states what the
  result must do and the choice is between two or more ways to meet it
  (which function, which pattern, where in a named file the code goes).
  `glm-task` makes these choices itself (row 15).

The caller makes the choices it can see before it spawns, and routes a
hand-back by rows 14 to 16.

## Bars

The bars are actions. A read of any file named here is not a bar: route
it like any read (rows 4 and 10).

A workhorse type stops (§ Hand-backs) when the job needs any of: a
review, a plan, debugging, or finding a cause not yet known; a generator
re-run, `pnpm format`, or any other command that rewrites a committed
file; an edit to a generated file, or a pin move; a `sed`, script or
interpreter write to a tracked file; an edit to `AGENTS.md`,
`CLAUDE.md`, a skill, an agent file, a hook or a settings file; a bar
the repo's `AGENTS.md` § Spawning adds, an edit under a path that
section protects, or a command it binds to a check the prompt does not
meet; a hard `parallel-phase` slice; a stage-gate seat; an edit past
§ Size bound. A search with no match is reported as `not found` with
where you looked; it is not a bar.

## Size bound

An edit is small or modest when it changes at most 3 files and at most
150 lines as `git diff --stat` counts them (added plus removed), both
counted over the whole job, new files included and the report file not
counted. This bound applies to every workhorse edit, exact-text ones
included. Over either number the job is hard implementation (row 1).

## Models and effort

| Type | Model | Effort | Spawn with |
| --- | --- | --- | --- |
| `general-task`, `gate-executor`, `gate-reviewer`, `gate-sme`, `gate-visual` | Opus | `high` | `model: "opus"` |
| `modest-task` | Opus | `medium` | `model: "opus"` |
| `design-task`, `gate-planner` | Fable | `low` | `model: "fable"` |
| `discrete-task`, `simple-task` | Sonnet 5.5 | `high` | `model: "sonnet"` |
| `glm-task` | z-ai/glm-5.3 | the file's | no `model` argument |
| `glm-flash-task` | z-ai/glm-5.3-flash | the file's | no `model` argument |

Effort is set in the agent file; the spawn's `effort` argument stays
unset unless the owner asks for one effort for one job. A call-site
`model` on a GLM type replaces GLM with Claude.
Owner, 2026-11-02: "make sure we're using opus high for stuff, and not
extra high (seems unecesary)". Haiku is not used.

## Cards

"Claude + GLM workers" is the GLM card (owner, 2026-10-26: "i have an
opus + glm card and thats' what we'll use for the project"). On it,
`model: "sonnet"` is Claude Sonnet, and GLM runs only through `glm-task`
and `glm-flash-task`. What a card's sandbox denies (such as `gh` on the
GLM card) is a repo value.
