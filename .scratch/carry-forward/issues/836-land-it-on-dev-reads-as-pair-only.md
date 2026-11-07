Status: open
Type: docs
Origin: docs/reviews/chore-merge-hurdles.md
Blocks: none
Blocked by: none
Related: 833

# "Land it on dev" reads as if only a pair can use it

## What a reader sees

Two cold readers of `docs/agents/paired-worktrees.md` § Land it on dev,
run during the review of `chore/merge-hurdles` on 2026-11-07, could not
follow these sentences as written. This branch did not change them:

- Step 1's done check runs `git -C <pair>/vendor/tbc-new-fork status
  --porcelain`, which fails in a plain worktree with no fork. No sentence
  says that "pair" in steps 1-3 also covers a plain worktree, although
  `pnpm merge-to-dev <branch>` takes one.
- "The pair stays in place" (the section's opening) contradicts the older
  route's first step, "Main folder: remove the pair."
- "It has not yet merged into the real `dev`" may mean the live tests or
  the `merge-to-dev <branch>` form itself; the reader cannot tell which.
- "The clone" in the older route's step 3 is not named. A reader took it
  to mean the main checkout's `vendor/tbc-new-fork`, whose HEAD may hold
  another pair's unlanded fork work.
- The text does not say whether `--check-only` reports the fork-pin
  refusal (it does: `pnpm merge-to-dev <branch> --check-only` prints
  "note: a real run refuses: ..."), and the older route does not say to
  return the main folder to `dev` at the end.
- A pair with fork commits that did not re-pin fails step 2's done check,
  and the text blames "the merge was not a fast-forward".

## Done when

A cold reader given the whole section, as a plain worktree and as a
pair, takes the intended route in each case, and each sentence above is
rewritten or removed.
