Status: open
Type: bug
Origin: docs/reviews/fix-prepush-git-env.md (round 1, I2)
Blocks: none
Blocked by: none
Related: 742

# An empty read-only `.git/config.lock` in the main checkout blocks every git config write

## What happens

The main checkout has an empty, read-only lock file:

```
ls -la /home/daniel/Code/lulz/tbc-gear-prio/.git/config.lock
-r--r--r-- 1 daniel daniel 0 Oct 25 13:24 /home/daniel/Code/lulz/tbc-gear-prio/.git/config.lock
```

(seen 2026-11-01). git refuses to write `.git/config` while the lock
exists, so every command that writes repo config fails with
`could not lock config file ... File exists`. The ticket 742 report
names `git push -u`, `git remote add` and `git branch --set-upstream-to`
(`.scratch/agent-reports/2026-11-01-general-task-prepush-worktree-pair-check.md`
in the main checkout); only the `git init` case was run there.
Hypothesis, untested: the other three fail the same way.

The lock is also what stopped ticket 742's bug from writing
`core.bare=true` into the real repo.

## Where it came from

Unknown. Hypothesis, untested: an agent sandbox makes it as a
placeholder for a write-denied path.
`.scratch/agent-reports/2026-10-25-sandbox-settings-fixes.md:11` (main
checkout) says that session "created and deleted `.git/config.lock`" on
Oct 25, the file's date.

2026-11-05: the owner removed the lock in their own shell; `git branch
--set-upstream-to` then worked and `core.bare` is `false`. Right after,
inside an agent's sandboxed Bash, `ls -la .git/config.lock` printed
`crw-rw-rw- 1 nobody nogroup 1, 3 Oct 23 17:02`: a character device
1,3 is `/dev/null`, so the sandbox mounts `/dev/null` over that path.
Hypothesis, untested: the empty read-only file was the mount point the
sandbox left behind. To check, run `ls -la .git/config.lock` in a plain
shell after the next agent session ends.

## Done when

- The cause is known and recorded here.
- The lock is gone and `git -C /home/daniel/Code/lulz/tbc-gear-prio config --local --get core.bare`
  still prints `false`; a config write (for example
  `git -C /home/daniel/Code/lulz/tbc-gear-prio config --local tbc.probe 1 && git -C /home/daniel/Code/lulz/tbc-gear-prio config --local --unset tbc.probe`)
  exits 0.
- Whatever made it no longer does, or is documented.
