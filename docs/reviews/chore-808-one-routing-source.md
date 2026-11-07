# Instruction review — chore/808-one-routing-source

Reviewed range: `51184ca9..37e507d1` (4 commits on `dev` 51184ca9).

Reviewed change: the routing change the owner approved on 2026-11-06
("i think my answer is yolo yes"):
`.scratch/plans/routing-single-source/OWNER-VIEW.md` (md5
885906a6f8100445c7afb48f2f993059, main checkout, gitignored). It adds
`docs/agents/home/routing.md` (the one routing source, approved md5
3a4c0385d683c8dce09dec98460729e8), turns every other copy of the rule
into a pointer or deletes it (`PROPOSAL.md` § 5 in the same folder), and
adds the `flash-over-sonnet.py` hook that reads its reason list and
refusal text from `routing.md` (`PROPOSAL.md` § 4). The applying agent's
report is `.scratch/agent-reports/2026-11-06-general-task-routing-apply.md`
on the main checkout.

Dispatch: `python3 scripts/check_merge_ready.py --product-files` prints
`.prettierignore` (rc 0), so this is a mixed branch, not a tooling-only
one: `.prettierignore` is not on `TOOLING_PATHS`
(`scripts/check_merge_ready.py:177-193`). That one file only keeps
prettier off the approved `routing.md`, which is "a lint ignore for a
tooling folder" in the `pre-merge-review` skill's words (§ Agent-tooling
branches), so no product axes ran: this file is the `instruction-review`
of every changed file, written in the step 3 form. Without this file
`pnpm merge-ready` fails with "FAIL: missing review — run
pre-merge-review; expected docs/reviews/chore-808-one-routing-source.md"
(rc 1, run at 37e507d1).

Not re-reviewed, as the brief says: the wording of `routing.md` (twelve
reviews, `review-*.md` in the plan folder). Its bytes were checked:
`md5sum docs/agents/home/routing.md` gives
3a4c0385d683c8dce09dec98460729e8.

## Findings

| ID     | Check            | file:line                                                                            | Quoted text                                                                                                                                | What goes wrong, how, and the cost                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Severity                       | Evidence                                                                                                                                                                                            |
| ------ | ---------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R808-1 | 3 (trial)        | `docs/agents/home/hooks/flash-over-sonnet.py`; `docs/agents/home/routing.md:103-131` | (no live run)                                                                                                                              | No live run has fired the hook, or used the installed routing file on the "Claude + GLM workers" card. The hook was fed recorded events on stdin through its wired command in a fake home (refusal, placeholder refusal, pass), and 52 of 52 test cases pass. But a real session can differ: for example, the harness's `tool_name` or `tool_input` keys may not match what the hook expects, and then every Sonnet spawn passes without notice. The cost is that the guard silently does nothing.                                                                         | blocks, by the skill's wording | `OWNER-VIEW.md` (c): "not live-tested, because the hook is not written or wired". `PROPOSAL.md` § 5, last paragraph, and § 8 leave the GLM-card trial for after install. The trial to run is below. |
| R808-2 | 2 (clash)        | `.claude/agents/gate-reviewer.md:72-74` on `chore/729-test-result`                   | "(`docs/agents/stage-gate-project.md` § Worker lanes, Reviewer; its private-data exception applies, because the helper sees every output)" | Row 36e was skipped, correctly, because `git merge-base --is-ancestor 7e2ebae0 dev` gives rc 1. But no ticket records that it is still to do: it appears only under "Not done / open" in the applying report. When `chore/729-test-result` merges, the gate reviewer's dry-run step will point at a "Reviewer" entry and a private-data exception that § Worker lanes does not have. The reviewer then has to guess which type takes the dry run.                                                                                                                          | should fix                     | `git -C <main> show chore/729-test-result:.claude/agents/gate-reviewer.md` lines 72-74. Ticket 808 (on `chore/729-test-result`) § Done when does not name 36e.                                      |
| R808-3 | 1 (hook text)    | `docs/agents/home/hooks/flash-over-sonnet.py:121-122`                                | "`` `%s` needs the path or the content, not a placeholder.``"                                                                              | This sentence is also used for `caller order:` (the one departure from § 4, which gives it only for `private:`). It tells a caller that wrote `Sonnet because: caller order: <the quoted ban>` to give "the path or the content", when what is missing is the quoted ban. The likely cost is one more refused re-send.                                                                                                                                                                                                                                                     | minor                          | Recorded event through the wired command (fake home): "`` `caller order:` needs the path or the content, not a placeholder. flash-over-sonnet: this Sonnet spawn was refused ...``".                |
| R808-4 | hook code        | `docs/agents/home/hooks/flash-over-sonnet.py:138-143`                                | `except OSError:`                                                                                                                          | When `routing.md` exists but is not valid UTF-8, the error is a `UnicodeDecodeError`, not an `OSError`. `main()` catches it and lets the spawn through, but no line is written to `flash-over-sonnet.jsonl`. So in that case the guard is off and no log line shows it. § 4 asks for a log line only for a missing file or section, so this is not a departure from § 4. The cost is low, because the file is copied from git.                                                                                                                                             | minor                          | `printf '\xff\xfe' > bad.md`; `FLASH_OVER_SONNET_ROUTING=bad.md` hook run on a discrete-task event: rc 0, no output, no `~/.local/state/agent-guard/` folder created.                               |
| R808-5 | install script   | `docs/agents/home/hooks/install-flash-over-sonnet.sh:74-81`                          | `jq ... "$ROUTER" > "$ROUTER.new"` then `mv "$ROUTER.new" "$ROUTER"`                                                                       | (a) When `jq` fails after the backup (tested: an Agent entry whose `hooks` is a string), the script stops with rc 5 and leaves the original file untouched. By shell redirect semantics it also leaves a `settings.json.new` file beside it. (b) If `settings.json` were a symlink, `mv` would replace the link with a regular file (tested in the fake home). The real `~/.claude_router/settings.json` is a regular file (`test -L` is false), so (b) does not apply today. (c) `jq-1.6` rewrites the whole file with its own formatting. The backup is kept every time. | minor                          | Fake-home cases in `$TMPDIR/fh808` (listed under Check 4).                                                                                                                                          |
| R808-6 | 2 (pointer)      | `docs/agents/home/skills/parallel-phase/adapters/claude-code.md:7`                   | "Lane-aware defaults (see `~/.claude/model-policy.md` § Claude Code, which defines each agent type):"                                      | Row 5a deleted the "Use for" column, so § Claude Code no longer says what each type is for. The bullets under this line now point at `routing.md`. A Delegator may open model-policy § Claude Code first and find only models and efforts there. The cost is one wasted read. No row covers this line.                                                                                                                                                                                                                                                                     | minor                          | `git diff dev..HEAD -- docs/agents/home/model-policy.md` (agent-type table)                                                                                                                         |
| R808-7 | 2 (pointer)      | `AGENTS.md:28-30`, `:91-92`; `docs/agents/home/model-policy.md:6`                    | "this repo's card limits: `docs/agents/model-policy.md` § GLM worker types" / "the repo's `AGENTS.md` names where"                         | Global model-policy says the repo's `AGENTS.md` names where repo values live. On `dev`, repo `AGENTS.md` said "this repo's values are in `docs/agents/model-policy.md`" twice. After rows 33a and "new", it names that file only for card limits. The repo values under § Budget the round, § Trial types and § Stage-gate seats lose that pointer. The cost is small: the file's own header says it holds every repo value. This is the approved text, applied as approved.                                                                                               | minor                          | `git diff dev..HEAD -- AGENTS.md`; `docs/agents/model-policy.md` headings at `:9`, `:18`, `:25`, `:38`                                                                                              |
| R808-8 | 2 (install docs) | `docs/agents/home/README.md:27-57`                                                   | the `pairs=(...)` install block                                                                                                            | The README's install block now copies `routing.md` and makes the symlink, but it does not install `hooks/flash-over-sonnet.py`, which it does for the other two staged hooks. The README also names neither `install-routing.sh` nor `install-flash-over-sonnet.sh`. If someone later edits the hook and installs from the README, the installed hook stays old, and only `install-flash-over-sonnet.sh --check` would show it. No row asked for this.                                                                                                                     | minor                          | `sed -n 27,57p docs/agents/home/README.md`                                                                                                                                                          |

### Trial to run for R808-1

Input: the owner runs `install-routing.sh`, then starts a new session on
the "Claude + GLM workers" card and asks it to spawn, in turn:

1. a `discrete-task` with `model: "sonnet"` and the prompt "Run `ls`.";
2. the same spawn, with the first line "Sonnet because: web";
3. a `glm-flash-task` with no model.

New text: spawn 1 is refused with the § Refusal sentence. Spawns 2 and 3
run. Spawn 3 also shows the worker reading `~/.claude/routing.md`
§ Private data before its first tool call. Old text (today's install,
with no hook): spawn 1 runs on Sonnet. `PROPOSAL.md` § 8 (the GLM-card
trial) is the fuller version.

## Check 1: the applied text against the approved rows

Method: I read the whole diff (`git diff dev..HEAD`) against
`OWNER-VIEW.md` (b) and `PROPOSAL.md` § 5, row by row, and I read every
changed file whole in its post-install form. I checked first that each
staged file equals its installed copy on `dev` (`git show dev:<path> |
cmp - <installed>`, all 19 pairs "same"). So the line numbers in the rows
match `dev`, for example `grep -n` on `dev:docs/agents/home/AGENTS.md`:
`:295` "The `glm-task` and", `:301` "agent.", `:317` "# Spawning", `:347`
the last line.

Every row is applied, except row 36e (R808-2). In every file, every hunk
maps to a row. The parsed agent descriptions all equal the approved text
(`yaml.safe_load` of the frontmatter; each description string is found in
`OWNER-VIEW.md`). The only change on the branch that no row asked for:

- `.prettierignore` gains `docs/agents/home/routing.md`. This is needed to
  keep the approved bytes: `npx prettier --check --ignore-path /dev/null
docs/agents/home/routing.md` gives rc 1, and the diff pads every row of
  the Decision table. Without the ignore, the pre-commit `prettier
--write` would change the md5. A nested ignore file or a comment in
  `routing.md` would either not work or change the bytes, so the root
  ignore file is the only place for it. Side effect: the branch becomes
  mixed (see Dispatch).
- `install-routing.sh` and `install-flash-over-sonnet.sh` are install
  tools, not instruction text. § 4 and the brief call for them.

The applying agent's readings (report § "Rows applied, with the readings
I had to make"). Each is judged here:

| Row             | Reading                                                                                                           | Verdict                                                                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1               | The whole of `:295-301` was replaced, including "exist only on the GLM card" and "If unsure, use a Claude agent." | Agrees: the range says `:295-301`. The second sentence is the old rule that `routing.md` row 13 replaces.                                                                                                           |
| 2               | "Nothing runs on Haiku" and the `not found` sentence went with `:319-347`.                                        | Agrees: both are in the range, and `routing.md:42-43` and `:195` state them.                                                                                                                                        |
| 3               | Replaced from "Workhorse jobs **may** retry" to "onto a GLM type."; the wall sentence stays.                      | Agrees with the row's "to 'onto a GLM type.'". The general peer-fill retry sentence goes with it. Cursor keeps its own retry (`model-policy.md:522-523`), and Codex names no peer fill, so no harness loses a rule. |
| 5, 5a           | The whole lane-fill table went; the "Use for" column went.                                                        | Agree.                                                                                                                                                                                                              |
| 11              | The pointer is at the end of the § Trial types opening paragraph.                                                 | Agrees.                                                                                                                                                                                                             |
| 12              | The list item number is kept: "2. Modest means within routing.md § Size bound."                                   | Agrees.                                                                                                                                                                                                             |
| 16              | The bullet label "**Private data.**" is kept.                                                                     | Agrees: the router test record stays under it.                                                                                                                                                                      |
| 17, 19, 20, 27a | Descriptions are single-quoted YAML (`plan''s`).                                                                  | Agrees: needed because of ": "; the parsed value equals the approved text.                                                                                                                                          |
| 24, 26          | Line 14 ("If the job needs a choice the prompt did not make ...") is deleted with the bars.                       | Agrees: `:14-25` includes it (`dev` line 14), and `routing.md:135-136` § Hand-backs states it.                                                                                                                      |
| 28              | "Hold the judgment yourself." is kept.                                                                            | Agrees: it is not routing. `general-task.md` keeps its matching sentence, and the row's quoted old text starts at the routing clause.                                                                               |
| 29-31           | Of line 14, only the § Budget the round sentence is kept.                                                         | Agrees: the row keeps only that sentence and the review-axis line. The dropped effort and name-the-model sentences are in `routing.md:20-22` and `:191-193`.                                                        |
| 32, 35, 36      | The pointer is written as a sentence ("A slice's type: ...").                                                     | Agrees.                                                                                                                                                                                                             |
| 33              | The two moved sentences sit after the `data/` stop line.                                                          | Agrees. Both existing stop lines are unchanged (`AGENTS.md:93-101`).                                                                                                                                                |
| README          | `routing.md` is added to `pairs`, and the `ln -sfn` line comes before the final echo.                             | Agrees with the "new" row.                                                                                                                                                                                          |

## Check 2: the files after install

Each edited file reads as sentences in its new form. Line wraps differ
in places, for example `docs/agents/home/AGENTS.md:200-201`,
`AGENTS.md:97-98` and `docs/agents/orchestration.md:43`. Markdown renders
them the same, and prettier passes, so they are not findings.

I searched for pointers into deleted text: `git grep` for "Always
`general-task`", "Which type takes a small job", "Otherwise" column,
"GLM worker types, Private data", "AGENTS.md § Spawning", "agent-type
table", "lane-fill", "model-policy § Claude Code" and "§ Workhorse jobs",
outside `docs/reviews/` and `.scratch/`. Every hit outside review records
resolves to text that still exists:

- `model-policy.md:185` "AGENTS.md § Spawning gives the rule": the heading
  stays.
- `model-policy.md:270` "agent-type table above": its Model column stays.
- `routing.md:166` "the repo's `AGENTS.md` § Spawning": exists.
- `stage-gate-project.md:12-13` "Naming the model on every spawn: § Claude
  Code of the same file": `model-policy.md:314`.
- `general-task.md:17-18` and `design-task.md:26-27` "Block size, and what
  to run in place: § Workhorse jobs": `model-policy.md:334-345`.

The two exceptions are R808-6 and R808-7. The files that
`chore/729-test-result` changes do not overlap this branch's files
(`comm -12` of the two `--name-only` lists is empty).

| File read                                                                                                             | Result                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/agents/home/AGENTS.md` (new)                                                                                    | agrees                                                                                                                                                                          |
| `docs/agents/home/model-policy.md` (new)                                                                              | agrees; R808-7 for `:6`                                                                                                                                                         |
| `docs/agents/home/routing.md`                                                                                         | bytes match the approval (md5)                                                                                                                                                  |
| `docs/agents/home/agents/*.md` (7 files, new)                                                                         | agree (parsed descriptions)                                                                                                                                                     |
| `docs/agents/home/skills/{code-review,instruction-review,pre-merge-review,parallel-phase}/…` (new)                    | agree; R808-6 for the adapter `:7`                                                                                                                                              |
| `docs/agents/home/README.md`                                                                                          | agrees with its row; R808-8                                                                                                                                                     |
| `AGENTS.md`, `docs/agents/model-policy.md`, `docs/agents/orchestration.md`, `docs/agents/stage-gate-project.md` (new) | agree; R808-7                                                                                                                                                                   |
| `.claude/agents/gate-reviewer.md` (`chore/729-test-result`)                                                           | R808-2                                                                                                                                                                          |
| `docs/agents/home/hooks/subagent-foreground-helpers.py` and its tests                                                 | agree: the same `tool_name == "Agent"` check (`:27`); its test wants exactly one Agent entry (`tests/subagent-foreground-helpers.py:86-90`), and the installer joins that entry |
| `scripts/check_merge_ready.py`, `docs/workflow.md` § The loop, `pre-merge-review` § Agent-tooling branches            | the review file is required (Dispatch)                                                                                                                                          |
| installed `~/.claude*` copies (paths and file types only; no settings content read)                                   | the staged copies on `dev` equal them; `~/.claude_router/settings.json` is a regular file; `~/.claude_router/{AGENTS.md,hooks}` are links                                       |

## Check 3: the hook against § 4, and its tests

The hook (`flash-over-sonnet.py`) holds no reason list and no refusal
text. Each Sonnet spawn makes it read `routing.md`. It takes the tokens
under `## Sonnet reasons` up to the first `<` or backtick
(`:64-78`). The refusal is the paragraph after "The hook prints" under
`## Refusal`, joined with single spaces (`:80-90`). Matching is
case-insensitive, on the first non-blank line, after "Sonnet because:"
and its blanks (`:94-123`). Colon tokens need a following character other
than `<`; the other tokens need the end of the line, a blank, `.`, `,` or
`;` (`SEPARATORS`, `:32`). A missing file or section prints nothing,
exits 0 and writes one log line (`:138-147`). Any other fault prints
nothing and exits 0 (`:161-168`). The only text the hook holds is the
lead phrase "sonnet because:" (`:31`), which § 4 itself names.

`python3 docs/agents/home/hooks/tests/flash-over-sonnet.py; echo rc=$?`
gives "52 of 52 cases passed", rc=0. The cases cover every § 4 example
(`private:~/x`, `private: ~/x`, `private: <path>`, `web`, `web.`,
`web, see below`, `testing`, `website`), both extra sentences, the parser
against the staged file, a source scan for copied text, and fail-open
with one log line for a missing § Sonnet reasons, a missing § Refusal and
a missing file. One small difference from § 4: the cases run the staged
routing file directly, not a temp copy. Only the missing-section cases
use temp copies.

The stdin trial through the wired command in a fake home
(`HOME=$TMPDIR/fh808 bash -c 'python3 "$HOME/.claude/hooks/flash-over-sonnet.py"'`):

- a discrete-task with no line: deny, with the § Refusal text;
- `caller order: <the quoted ban>`: deny, with the placeholder sentence
  (R808-3);
- `Sonnet because: web`: silent, rc 0.

No live session has fired the hook (R808-1).

## Check 4: the install scripts

Both scripts ran against fake homes under `$TMPDIR/fh808`. The fake
homes were built from `dev`'s staged copies, with stand-in settings files
that hold an `env` block with a sentinel value. No real settings file
was read.

- `install-routing.sh`, run 1: rc 0. 22 lines say "same". 20 backups were
  made (19 files and the router settings), all under one
  `routing-<UTC>` folder. The symlink `~/.claude_router/routing.md ->
~/.claude/routing.md` was made. The router settings gained the hook in
  the existing Agent entry, mode 600 was kept, and the plain settings
  were byte-for-byte unchanged. Run 2: rc 0, "already wired", "nothing
  replaced, no backups". So the script is idempotent.
- `install-flash-over-sonnet.sh` cases:
  - two Agent entries: refused, rc 1, file unchanged;
  - invalid JSON: refused, rc 4, file unchanged;
  - no `hooks` key: wired, with a backup;
  - only a `Task` matcher: it adds a new Agent entry, with a backup;
  - `hooks` is a string: refused, rc 5;
  - an Agent entry whose `hooks` is a string: refused, rc 5, after a
    backup (R808-5).
- Secrets: the sentinel inside `env` was printed in no case. One `jq`
  error printed a value from inside the `hooks` key ("SENTINEL_H"),
  because the filters touch only `.hooks`. The `--check` path prints only
  yes/no and counts (`:21-28`).
- Wiring: the script writes only `$HOME/.claude_router/settings.json`. It
  only reads `~/.claude/settings.json`, through `jq`, to print "no (want
  no)".
- Pasting: `install-routing.sh` starts with `set -euo pipefail`, checks
  every source is non-empty before it writes anything, and copies
  through `.new` then `mv`. It runs the hook tests before it copies the
  hook or edits the settings file. The applying report names the owner
  command: `bash /home/daniel/Code/lulz/tbc-wt/808-routing-source/docs/agents/home/install-routing.sh`.

## Check 5: gates

- `node --version` printed v22.23.2. `XDG_RUNTIME_DIR=$TMPDIR/run
TBC_VERIFY_WITHOUT_FORK=1 pnpm -C <wt> verify` gave rc=0. The
  upstream-drift step printed "CHECK DID NOT RUN" once; that step is
  advisory. The layout and fork-parity steps were skipped because there
  is no fork.
- Hook tests: rc=0, 52 of 52.
- `python3 scripts/check_merge_ready.py --product-files`: rc 0, prints
  `.prettierignore`.
- `pnpm merge-ready` (check only): rc 1, "missing review". It was run
  before this file was written. With this file in place it still
  fails, rc 1, with "FAIL: review has no `## Disposition` section",
  because this review writes findings only. The agent that handles the
  findings adds that section.

## Notes

- I spawned no cold readers. The brief rules out re-reviewing the routing
  wording. The pointer lines are the owner-approved row texts, and
  reviews 11 and 12 read them. For each sentence the readings dropped, I
  checked that `routing.md` states it, with line numbers in the readings
  table. That check is a paper check, not a cold read.
- Old/new trial runs on record: `trial-2026-11-05.md` ran T1 to T9 on
  the new text and on the installed text, and `trial-2026-11-05-rerun.md`
  re-ran five cases. Both ran an earlier md5 of the routing file: the
  current text differs from it by the two "Claude Code session" phrases
  (`OWNER-VIEW.md` (a)). No trial ran the hook (R808-1).

## Disposition

R808-1 stays open: the review's trial ("Trial to run for R808-1") needs
the owner to run `install-routing.sh` and then a session on the
"Claude + GLM workers" card. `open` is not one of the gate's three words
on purpose, so `pnpm merge-ready` fails on this row until the trial has
run and the row says what it showed.

| ID     | Axis             | Disposition | Ticket / note                                                                                                                                          |
| ------ | ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R808-1 | 3 (trial)        | open        | Live trial after the owner runs `install-routing.sh`, then a session on the "Claude + GLM workers" card; the trial is under "Trial to run for R808-1". |
| R808-2 | 2 (clash)        | defer       | `.scratch/carry-forward/issues/809-gate-reviewer-dry-run-points-at-missing-section.md` — row 36e, after 7e2ebae0, 683bf83b, 79160874 reach `dev`       |
| R808-3 | 1 (hook text)    | fixed       | 06d4781c: the sentence names the placeholder from the reason's own bullet in § Sonnet reasons; a case per token                                        |
| R808-4 | hook code        | fixed       | 06d4781c: `UnicodeDecodeError` fails open with one log line; a not-UTF-8 case                                                                          |
| R808-5 | install script   | fixed       | 584367cd: writes through a symlinked settings file and removes `.new` when `jq` fails; fake-home runs under `$TMPDIR`                                  |
| R808-6 | 2 (pointer)      | defer       | `.scratch/carry-forward/issues/811-two-pointers-made-inaccurate-by-routing-change.md` — needs the owner's approval of exact text                       |
| R808-7 | 2 (pointer)      | defer       | `.scratch/carry-forward/issues/811-two-pointers-made-inaccurate-by-routing-change.md` — needs the owner's approval of exact text                       |
| R808-8 | 2 (install docs) | fixed       | 8ef43bec: the install block copies the hook, and the README names both install scripts with `install-routing.sh` as the one command                    |
