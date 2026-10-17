# Pre-merge review — feat/global-subagent-reports

Reviewed range: `6a2b1221df470f4ab6446b0f5a21f9c8dec3af35..9ff92726bdef6896fd02565c881f669dc1b9462c`

Reviewed range: `9ff92726bdef6896fd02565c881f669dc1b9462c..896abbdb06de8a22604623fd043477c217670f9f`

Dispatch note: small-change lane, one fresh `general-task` reviewer (Opus,
effort high); `codex` is not on `PATH`. `git diff --shortstat dev...HEAD`:
"2 files changed, 3 insertions(+), 5 deletions(-)". `git diff --name-only
dev...HEAD`: `AGENTS.md`, `docs/agents/home/AGENTS.md`. Domain brief not
given: the diff is agent-facing rules text with no game-domain content.

## Adversarial

**A1.** `docs/agents/home/AGENTS.md:40` says important claims are "defined in
the next paragraph". The new **Subagent reports** paragraph now sits between
it and the definition ("Sources on important claims", line 44), so the
reference points at the wrong paragraph. Found by `grep -n "next paragraph"
docs/agents/home/AGENTS.md`. A3's insertion point had the same defect.

**A2.** `AGENTS.md:177`, last sentence: "is their caller under the global
rule" replaced "under this section". Read literally, `gate-executor` as a
caller would follow only the global rule and skip this repo's default path
`.scratch/agent-reports/`. The change was not needed.

Not checked by the reviewer: whether Claude Code's Write tool refuses those
file names (moved text, not tested here), and whether subagents read the
staged file through the "(staged in …)" pointer before the owner installs
the global file (hypothesis, untested).

## Standards + Spec

**Standards: clean.** No banned words; the Write-tool rule is stated as a
positive action with its reason.

**P1.** `AGENTS.md:177`, sentence 3 ("label each claim you did not check
`hypothesis, untested`") is not in A3 and widens the old rule, which applied
the label to an important claim with no source. It also repeats
`.claude/agents/general-task.md`.

The reviewer mapped every sentence of the old section to its new place: no
rule lost, no sentence in both files, the pointers in `.claude/agents/*.md`
and `parallel-phase/SKILL.md` still resolve.

## Summary

All three findings ask for edits to agent files, so they wait for one owner
approval before any fix (pre-merge-review step 3, "Agent files"). No
Disposition table yet; round 2 runs after the approved fixes. Tickets filed: 0. Tickets closed: 0.

Proposed fixes, exact text:

- A1, `docs/agents/home/AGENTS.md:40`: replace `(defined in the next
paragraph)` with `(defined in "Sources on important claims" below)`.
- A2, `AGENTS.md:177`: replace `is their caller under the global rule.` with
  `is their caller under this section.`
- P1, `AGENTS.md:177`: replace `In the condensed report, label each claim you
did not check `hypothesis, untested`.` with `In the condensed report, mark
an important claim that has no source `hypothesis, untested` in place of
"unverified".`

Owner approval of all three fixes, 2026-10-17: "do those fixes". Applied
in `896abbdb` ("Fix review findings A1, A2 and P1"). `pnpm verify` at
`896abbdb`, plain-worktree form (`TBC_VERIFY_WITHOUT_FORK=1`, Node
v22.17.1, `corepack pnpm -C <worktree> verify`): rc=0; the restores were
not needed because `vendor/wowsims` and `vendor/atlasloot` were present.

Round 2 (focused check) passed with no findings; the round-2 Disposition
table below closes A1, A2 and P1. Tickets filed: 0. Tickets closed: 0
(`git diff --name-status dev...HEAD -- '.scratch/carry-forward/issues/*.md'`
is empty).

## Focused check (round 2)

Dispatch note: one fresh `general-task` agent (Opus, effort high); `codex`
is not on `PATH`. Main range `9ff92726..896abbdb`. Fork range: none —
`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` exits 0, so
the branch never moves the fork pin and condition 3 holds.

1. **Conditions 1 to 3: pass.** `0c1e503e` changes only this review file;
   `896abbdb` names A1, A2 and P1 and changes one line each in
   `docs/agents/home/AGENTS.md:40` (A1) and `AGENTS.md:177` (A2, P1), the
   places the findings cite.
2. **Diff changes only what each finding asks for: pass.** Each
   replacement matches the "Proposed fixes, exact text" list word for
   word; nothing else on either line changed.
3. **New tests assert their findings: pass (no tests in range).**
   `git diff --name-only 9ff92726..896abbdb` lists only the two agent
   files and this review file.
4. **Tests the fixes touch pass: pass (none touched).** `pnpm verify`
   rc=0 at `896abbdb`.

In context: the A1 pointer resolves to the bold lead-in
`**Sources on important claims.**` at `docs/agents/home/AGENTS.md:44`;
"this section" in A2 sits inside `### Subagent reports` of `AGENTS.md`, so
it can only mean that section; the P1 sentence applies the
`hypothesis, untested` label to the same claims the global rule marks
"unverified". No findings.

Outside this round's lines (not a finding of this review):
`.claude/agents/general-task.md:30` and `.claude/agents/modest-task.md:42`
still say "label each claim you did not check `hypothesis, untested`",
wider than the `AGENTS.md:177` sentence but not in conflict with it
(`git grep -n 'did not check' HEAD -- .claude`). This branch does not
touch those files.

## Disposition (round 2)

| ID  | Axis             | Disposition | Ticket / note                                                                            |
| --- | ---------------- | ----------- | ---------------------------------------------------------------------------------------- |
| A1  | Adversarial      | fixed       | `896abbdb`: pointer now reads `(defined in "Sources on important claims" below)`         |
| A2  | Adversarial      | fixed       | `896abbdb`: `is their caller under this section.`                                        |
| P1  | Standards + Spec | fixed       | `896abbdb`: label limited to an important claim with no source, in place of "unverified" |
