Status: open
Type: defect
Origin: docs/reviews/feat-wowsims-reforge-catchup.md (Adversarial axis, A1 and A3)
Blocks: none
Blocked by: none

# `build_from_source` can leak a worktree registration, and `--commit` can write a binary nothing loads

Relates to: ADR-0030 Decision 2; ticket 244; branch `feat/wowsims-reforge-catchup`

Two defects in the same function, both cheap to fix together.

## (a) The `finally` guard is re-evaluated, and the leak is unrecoverable by hand

`scripts/fetch_wowsimcli.py:190-193`:

```python
finally:
    if src is not None and (FORK / ".git").exists():
        run(["git", "-C", str(FORK), "worktree", "remove", "--force", str(src)])
    shutil.rmtree(scratch_root, ignore_errors=True)
```

`obtain_source` (`:105-133`) branches on the *same* `(FORK / ".git").exists()`
test at entry, returning a worktree when the fork clone is present and a
standalone scratch clone when it is not. The `finally` re-tests it, so the two
can disagree:

- Fork absent at entry, present at cleanup -> `git worktree remove` is called on
  a path that was never a worktree.
- Worktree created, then `protoc` (`:145-156`) or `go build` fails ->
  `shutil.rmtree(scratch_root)` deletes the worktree directory, but only after
  `worktree remove --force` has already run, so this half is usually fine. The
  hazard is any path where `rmtree` wins: `vendor/tbc-new-fork/.git/worktrees/`
  keeps a registration pointing at a directory that no longer exists.

The path name is `wowsims-src-{commit[:12]}` — **deterministic per commit**. So
a leaked registration is not transient: the next build of the same commit fails
with "already registered" and stays failing until someone runs
`git worktree prune` by hand, which nothing tells them to do.

## (b) `--commit` without `--tag-dir` writes a binary no consumer resolves

`:235`: with `--commit X` and no `--tag-dir`, `dir_name = X`, producing
`vendor/wowsimcli-<X>-<platform>`. Every consumer resolves the directory from
`lock.tag`. Unless `X` equals `lock["tag"]`, the binary is unreachable.

That is *intended* for pre-pin proving (the flag's help text says so), but
nothing warns. A developer who builds `--commit <newsha>` and then runs
`pnpm rank` silently gets the **old** binary and old numbers, with no signal
that the build they just watched succeed is not the one being used. This is the
ticket-244 failure mode re-armed through a new flag.

## Suggested fix

- (a) Capture which path `obtain_source` took (return the mode, or set a flag)
      and clean up on that, not on a re-test. Prune defensively before
      `worktree add`, or use a unique suffix so a leak cannot block the retry.
- (b) When `--commit` is given and the resulting `dir_name != lock["tag"]`,
      print a line saying the binary is for proving only and will not be picked
      up by `pnpm rank` / the fixtures recorder.

## Acceptance

- [ ] A failed build leaves no registration that blocks a retry of the same
      commit; a test or a documented reproduction shows the retry succeeds.
- [ ] Cleanup branches on the path actually taken, not on a re-evaluated
      filesystem test.
- [ ] `--commit` with a non-matching directory name prints the "proving only"
      warning.
