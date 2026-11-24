# Pre-merge review — fix/pointers-skip-stray-home-skills

Reviewed range: `7811fc26..807db37a` (fixes in `6b151c6e`)

## Summary

`pnpm verify` failed on every branch at its `pointers:check` step:
`~/.claude/skills/mobile-native/SKILL.md:72: write a space after §`.
mobile-native is a third-party skill the skills CLI installed. The branch
makes `scripts/check_instruction_pointers.py` skip the skills listed in
`~/.agents/.skill-lock.json`, because those files are their authors' text
and an update overwrites any edit. Owned skills, and pointers from our files
into installed skills, are still checked. A lock file that cannot be read
fails the check.

Two fresh-context axes reviewed `git diff 7811fc26...807db37a`: Adversarial
(`.agents/reviews/adversarial.md`) and Standards + Spec (`code-review` axes).
The Domain axis was not run: the diff states no TBC, WCL or wowsims fact.
Neither axis found a defect that blocks the merge.

Both reviewers ran the parent commit's script on the same home. It printed
`272 checked, 0 dead, 1 style` with the mobile-native error, rc=1. The
branch prints `271 checked, 0 dead, 0 style`, so the one pointer it drops is
the one that failed.

## Findings

- **A1 (low): an owned skill whose name is in the lock is skipped.**
  `scripts/check_instruction_pointers.py:220-224`. The adversarial probe
  listed `tdd` in a fake lock and gave the owned `tdd/SKILL.md` a dead
  pointer. The result was rc 0, with only `1 file in 1 installed skill skipped`
  in the summary.
- **A2 (low): the home lock also filters `--home-overlay` files.**
  `:210-224`. An overlay `skills/pack/SKILL.md` with a dead pointer and
  `pack` in the home lock gave rc 0. The real overlay
  (`~/setup/research/rebuild`) keeps no files under `skills/`.
- **A3 (low, test theatre): the broken-lock subtest's `rc == 1` held without
  the lock.** `:924-926`. The fixture's `packed/SKILL.md` style error made
  rc 1 on its own. The Standards + Spec axis noted the same thing.
- **S1 (low, standards): the `site_keys` docstring was stale.** `:203`. It
  did not say that the function leaves out installed-skill files or that it
  writes `world.installed`.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                             |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | wontfix     | The lock is the skills CLI's own record of what it installed, so the direct signal is used; a skill the owner writes under that name should leave the lock first. The summary prints every skipped file count, so the skip is never silent in the output. |
| A2  | Adversarial | wontfix     | An overlay is a draft of the home, so it skips the same installed names the home does. The real overlay has no `skills/` folder today.                                                                                                                    |
| A3  | Adversarial | fixed       | `t_installed_skill_is_not_a_site` now runs the broken lock against a home with nothing else wrong, and asserts `0 dead, 0 style`. Red/green below. Commit `6b151c6e`.                                                                                     |
| S1  | Standards   | fixed       | The docstring now names the left-out files and `world.installed`. Commit `6b151c6e`.                                                                                                                                                                      |

## Fix check (A3)

The mutant makes errors print without failing the check: in `run_check`,
`return 1 if bad or errors else 0` becomes `return 1 if bad else 0`. A
fresh agent ran the self-test of each commit, plain and mutated, and
grepped for the test:

```
== 807db37a
check_instruction_pointers.py self-test ok (49 tests)
== 807db37a-mut
== 6b151c6e
check_instruction_pointers.py self-test ok (49 tests)
== 6b151c6e-mut
  FAIL t_installed_skill_is_not_a_site: ('pointers: 0 checked, 0 dead, 0 style\n', '.../home/.agents/.skill-lock.json: cannot read (Expecting property name enclosed in double quotes: line 1 column 2 (char 1))\n')
```

So the old test missed the mutant, and the new one catches it. In the
807db37a mutant, other tests fail too (`t_missing_home_claude_fails_off_ci`,
`t_unreadable_home_folder_fails`), but not this one.

## Check output

Run at `6b151c6e`:

```
node --version; pnpm run pointers:selftest; pnpm run pointers:check
v22.23.2
check_instruction_pointers.py self-test ok (49 tests)
pointers: 271 checked, 0 dead, 0 style; 1 into .scratch skipped; 22 files in 11 installed skills skipped
```

The `pnpm verify` that runs on push (with `TBC_VERIFY_WITHOUT_FORK=1`,
because this checkout has no fork and the change never reads it) passed
for `807db37a`.

## Notes

- **The repo's own `skills-lock.json` is not read.** It lists 41 skills that
  also live in `~/.claude/skills` (for example `tdd` and `code-review`).
  Those skills are still checked as the owner's own. An upstream update to
  one could break verify the same way again. Some of them may be
  owner-edited, so checking them may be right. Hypothesis, untested.
- **Every lock entry is skipped, whatever its `source`.** A skill the owner
  installs from their own repo with the skills CLI would be skipped too.
- **`World.stems()` no longer includes installed skills' file names**, so a
  prose "testing § X" pointer is no longer flagged. This is probably an
  improvement.
- **On CI the lock is never read**, so a broken lock is not reported there.
  That matches CI skipping all home files.
- **Beyond the request:** the summary's skip count and the `"/" not in n`
  filter on lock names. Both are small and follow the file's existing
  patterns.
- Full axis reports: `.scratch/agent-reports/2026-11-24-general-task-adversarial-pointers-skip.md`
  and `.scratch/agent-reports/2026-11-24-general-task-standards-spec-pointers-skip.md`
  (gitignored).
