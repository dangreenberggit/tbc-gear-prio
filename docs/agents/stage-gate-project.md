# Stage-gate project values

The values that the `stage-gate` skill and its seats read for this repo,
one section per kind. Lanes and spawning rules in full:
`~/.claude/model-policy.md` § Workhorse jobs and § Who spawns whom.

## Planner

The `gate-planner` reads only this section.

**Workhorse types and block size:** `~/.claude/model-policy.md` § Workhorse
jobs. **Naming the model on every spawn:** § Claude Code of the same file.

**Judgment agent:** `general-task` (`model: "opus"`)

**Gate command** (the Verify recipe runs it): `pnpm verify`

**Plan lines:** A step that changes what the Upgrades tab
renders says how it is looked at. The default is a `Visual check:` line:
the fixture names to look at (from `data/tab-fixtures/`) and the one
sentence to judge against. The executor opens the fixture's link in a
browser pane where the harness has one (the Claude desktop app's Browser
pane; untested under T3 Code or WSL mode), and otherwise looks at the
PNGs from `pnpm tab-fixtures:smoke`. Only the browser pane covers hover
and widths other than 1280. No live sim runs. Use a `Visual acceptance:`
block instead only when the ticket must close on recorded evidence
(captures at fixed widths, axe results, measured facts, a pre-run state,
or an independent `gate-visual` verdict), or when a step needs hover or
another width and the harness has no browser pane. The block names the
state (`pre-run` / `post-run`), widths, selectors to capture,
interactions, facts to record, and the sentence; the manifest schema is
in the header comment of `scripts/tab-harness/test-review.mjs`.

## Folders

**Stage folder:** `.scratch/stage-gate/<slug>/`
(`git check-ignore -v .scratch/stage-gate/<slug>/plan.md`)

**Run-log folder:** `.scratch/agent-runs`

**Report folder:** Report files: AGENTS.md § Subagent reports.

## Hand off

**Review step:** `pre-merge-review`

**Merge rule:** the AGENTS.md merge gate (AGENTS.md § Commits and merges)

**Merge command:** `pnpm merge-to-dev`, after the ask

**Integration branch:** `dev`.

**Gate command:** `pnpm verify`

**Executors never merge into:** `dev` or `main`

## Tickets

**Ticket rules:** a ticket per `docs/agents/issue-tracker.md`

## Session commands

The only commands you run are the ones that
`docs/agents/orchestration.md` § The session delegates lists.

## Worker lanes

**Judgment agent:** `general-task` (`model: "opus"`)

**Workhorse types** (the session, the Reviewer and the Executor):
`~/.claude/model-policy.md` § Workhorse jobs.

### Executor

**Parallel-phase workers:** An extremely simple slice (see
`simple-task`) goes to `simple-task` (`model: "sonnet"`). Every other
slice goes to `general-task` (`model: "opus"`).

## Checkouts

**Pair:** When AGENTS.md § The forked tab repo says the work needs a
pair, have a subagent make the pair with `pnpm wt:pair`;
`isolation: worktree` has no fork.

**In the pair (the pair path is the checkout path):**
(fork commands: `-C <pair path>/vendor/tbc-new-fork`)

## Search scopes

**Reviewer, Less code:** in the fork (`vendor/tbc-new-fork`), or in
wowsims upstream (`upstream/master` in the fork).
`git -C vendor/tbc-new-fork grep -n <words>` (the fork) and
`git -C vendor/tbc-new-fork grep -n <words> upstream/master` (upstream).
`vendor/` is gitignored, so `git grep` in this repo does not search the
fork. If your checkout has no `vendor/tbc-new-fork`, write that in
`Evidence` and search this repo only.

## Project seats

**Seat rows:**

| Seat   | subagent_type | Call-site model | Frontmatter effort | Lane   |
| ------ | ------------- | --------------- | ------------------ | ------ |
| SME    | `gate-sme`    | `opus`          | `high`             | review |
| Visual | `gate-visual` | `opus`          | `high`             | review |

**Plan lines (planner):** in § Planner.

**Session, step 5:** When the plan has an SME step, the executor spawns
`gate-sme` once and commits its handoff.

When a plan step carries a `Visual check:` line, the executor looks at
each named fixture before that unit's re-pin (`pnpm tab-fixtures:smoke`
and its PNGs, or the fixture's link in a browser pane where the harness
has one), judges it against the sentence, and records the smoke line and
what it saw in its ledger. That is the whole check: no `tab-review` run
and no `gate-visual` seat.

When a plan step carries a `Visual acceptance:` block, the executor
writes the unit's manifest, runs `pnpm tab-review <manifest>`, and spawns
`gate-visual` once per unit before that unit's re-pin. A ticket with a
Visual acceptance is not closed on `fail` or `cannot-judge`.

**Gate C done-when:** every ticket with a Visual acceptance has a `pass`
row or an accepted / escalated disposition.

**Executor:**

- Per unit with a `Visual check:` line: run `pnpm tab-fixtures:smoke` (it
  starts `:5173` if the port is free) and Read the named fixtures' PNGs in
  `.scratch/tab-fixtures-smoke/`, or, where the harness has a browser pane,
  open their links from `http://localhost:5173/tbc/tab-fixtures/` in it →
  judge against the sentence → record the smoke line and what you saw in the
  ledger → re-pin.
- Per unit with a `Visual acceptance:` block: fork edits → write
  `.scratch/stage-gate/<slug>/visual/<unit>/manifest.json` →
  `pnpm tab-review <manifest>` → spawn `gate-visual` (`model: "opus"`) →
  `fail`: fix, re-capture, `SendMessage` the same seat for the failed
  tickets; `cannot-judge`: fix the manifest and re-capture; `pass`: commit
  the handoff, then re-pin. Ledger row per ticket:
  `visual: pass | fail-fixed | contested`. A ticket with a Visual
  acceptance is not closed on `fail` or `cannot-judge`.

## History

On 2026-10-25 five stages ran at once, 12 planner and 8 reviewer runs
went to 2 executor runs, and the session hit the 5-hour limit in 59
minutes (`.scratch/agent-reports/2026-10-25-general-task-usage-limit-burn.md`;
gitignored; main checkout only).

**SKILL.md step 2, never revert:** ticket 261

**Subagent helpers run in the foreground (`~/.claude/hooks/subagent-foreground-helpers.py`, staged in `docs/agents/home/hooks/`):** ticket 712
