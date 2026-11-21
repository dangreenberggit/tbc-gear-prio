# Review: chore/plain-wt-pair-commands

Range: `dev` 1bcec319 to `3fad2971` (two commits: `be6c0607`, `3fad2971`),
plus this review's fix. The branch answers one problem: agents were told to
run `pnpm -C <main folder> wt:pair …`, which the Claude Code sandbox keeps
inside, where `.git/worktrees` is read-only. The sandbox exclusion in
`~/.claude_router/settings.json:164-166` matches only the plain text
`pnpm wt:pair *`, `pnpm wt:unpair *` and `git worktree remove *`. The branch
gives the plain form in `docs/agents/upstream-catch-up.md` and
`docs/agents/paired-worktrees.md` § Remove it, and makes
`scripts/worktree_pair.py` print the plain unpair command through a new
`unpair_hint()`, with a check in `scripts/check_worktree_pair.py`.

The two docs are agent tooling and had the `instruction-review` from the
author (`.scratch/agent-reports/2026-11-21-general-task-plain-wt-pair-commands.md`,
gitignored). This review covers the two script files, which
`python scripts/check_merge_ready.py --product-files` lists.

## Review

One reviewer (Opus `general-task`) that did not write the branch, 2026-11-21,
on the three axes of `docs/workflow.md` § The loop, step 4.

- **Adversarial:** one finding, A1.
- **Domain:** nothing to check. The diff states no TBC, WCL or wowsims fact.
- **Standards and spec:** no finding. The scripts do what the problem asks
  and nothing more. The comments say why. `pnpm_in` stays for the other
  hints (`sync:wowsims:restore` and the like), which no sandbox exclusion
  covers and which write only inside the pair.

**A1 (medium). The unpair hint told the reader to run from the main
checkout, which pushes a subagent back into the form that fails.** At
`3fad2971`, `scripts/worktree_pair.py:520-524` returned

```python
return f"`{cmd}` from {main_dir.as_posix()}"
```

so `pnpm wt:pair` ended with ``remove the pair with `pnpm wt:unpair <name>`
from /home/daniel/Code/lulz/tbc-gear-prio``, and the "already exists" refusal
and the part-made message said the same. A subagent's folder is reset for
every Bash call (Claude Code's subagent harness note: "Agent threads always
have their cwd reset between bash calls"), and a subagent is the usual caller
(`docs/agents/paired-worktrees.md` § Make one: "through a subagent like any
`pnpm` call"). If its folder is not the main checkout, the only way to obey
"from <main folder>" is `cd <main> && pnpm wt:unpair …` or
`pnpm -C <main> wt:unpair …`, the forms this branch exists to stop. The
author's own cold reader hit the same wording in the doc's first draft:
"Lines 17-18 forbid a `cd` or `-C`, so I can't fix this … If it isn't the
main folder, stop and report" (run log
`.scratch/agent-runs/1645d757-732b-44e6-81c6-211a4b52999c.jsonl`, "Cold read:
catch-up intro"). The doc was fixed to "any checkout of this repo but the pair
it removes"; the script kept "from <main folder>". Unpair does run from any
other checkout: `find_checkouts()` finds the main checkout from git's common
dir (`scripts/worktree_pair.py:418-420`), and the author's probe from the T3
worktree printed `nothing to remove: no folder …/tbc-wt/zz-probe-none`.

Fixed: `unpair_hint(target, name, force)` now names the pair, the one folder
unpair refuses to run from (`unpair()`, the `is_inside` check), and reads
``…`pnpm wt:unpair <name>`, sent alone, from any checkout of this repo but
<parent of the main checkout>/tbc-wt/<name>``. The three call sites pass
`target`. Test: `check_unpair_hint_is_the_plain_command` now also requires
"any checkout" and the pair's path in the hint.

## Checks

On the branch tip `3fad2971` before the fix, node v22.23.2:

```
TBC_VERIFY_WITHOUT_FORK=1 pnpm verify    rc=0, gates: 1469 ran, 277 skipped
python scripts/check_worktree_pair.py    worktree_pair.py checks ok (30 checks)   rc=0
```

The fix, test first. The new check against the code before the fix (red),
run by the reviewer and again by a separate agent on a temp copy of
`scripts/` with `worktree_pair.py` from `3fad2971`:

```
  FAIL: unpair_hint must say any checkout but the pair will do, got '`pnpm wt:unpair probe` from /home/u/tbc-wt/probe'
  FAIL: unpair_hint must say any checkout but the pair will do, got '`pnpm wt:unpair probe --force` from /home/u/tbc-wt/probe'
rc=1
```

No other check failed. After the fix, the same agent, node v22.23.2:

```
python scripts/check_worktree_pair.py    worktree_pair.py checks ok (30 checks)   rc=0
TBC_VERIFY_WITHOUT_FORK=1 pnpm verify    rc=0, gates: 1469 ran, 277 skipped
```

This checkout has no `vendor/tbc-new-fork`, so verify ran in the fork-less
form (`docs/agents/paired-worktrees.md` lines 11-16). The branch touches no
fork code; the 277 skips are the fork gates and fork-reading tests.

## Notes

- The check tests `unpair_hint()` itself, not its call sites. A call site
  that went back to `pnpm_in(main_dir)` would still pass. No such call site
  exists now (`grep -n "wt:unpair" scripts/worktree_pair.py`: the three hint
  sites call `unpair_hint`, and the rerun hint at the `rerun =` line already
  prints the plain form).
- Unpair's own refusal from inside the pair says "run it from the main
  checkout or another pair" (`scripts/worktree_pair.py`, `unpair()`). That is
  true but narrower than the doc, which says any checkout but the pair. A
  subagent that reads it has the same problem as A1 only if it is inside the
  pair, where no plain call can work anyway. Not changed.
- Whether a compound call such as `cd <main> && pnpm wt:unpair …` really stays
  in the sandbox was not tested here; the doc's claim rests on the author's
  record of the `-C` failure (hypothesis, untested for `cd … &&`).
- The reviewer could not commit in this worktree: `git commit` failed on
  `.git/worktrees/t3-66481a08-713c060dbfebd798/index.lock` with
  `Read-only file system`, because the sandbox keeps `.git/worktrees`
  read-only for worktrees outside the reviewer's session.
- `python scripts/check_merge_ready.py` names eight open tickets that mention
  `scripts/worktree_pair.py` or `scripts/check_worktree_pair.py` (596, 601,
  602, 740, 741, 796, 799, 864). None is about the unpair hint's wording, and
  this branch neither fixes nor worsens any of them. Ticket 864 (`--build`
  fails in the sandbox on tsx's IPC pipe) may no longer show now that the
  plain call runs outside the sandbox (the author's hypothesis, untested).

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                  |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------ |
| A1  | Adversarial | fixed       | `unpair_hint` names the pair; `check_unpair_hint_is_the_plain_command` pins it |
