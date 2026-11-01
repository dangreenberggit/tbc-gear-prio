Status: open
Type: bug
Origin: .scratch/agent-reports/2026-11-01-general-task-644-655.md
Blocks: none
Blocked by: none
Related: 644

# The tab recorder cannot re-record `feral-p5-th4pc`

On 2026-11-01, while checking the fix for ticket 644 (fork commit
`3f2948ce1`), re-recording the fixture `data/tab-fixtures/feral-p5-th4pc.json`
stopped before any sim with the message "gear not loaded; missing Signet of
Primal Wrath, Berserker's Call". Cause: hypothesis, untested. So ticket 644's
fix was checked live on `feral-p3-th-hands-legs` and `ret-p3-p2`, but not on
the fixture where 644 was first seen.

From the report (`.scratch/agent-reports/2026-11-01-general-task-644-655.md`,
§ Checks):

> - Live runs at `3f2948ce1` (`pnpm tab-fixtures:record`, `.scratch/tab-recordings-644/`):
>   `feral-p3-th-hands-legs` and `ret-p3-p2` have no tier-set entry at a count
>   other than 2 or 4, and no Thunderheart crossing gate at 3.
> - Not run: `feral-p5-th4pc` re-record (recorder stopped: "gear not loaded;
>   missing Signet of Primal Wrath, Berserker's Call"; cause untested, may be the
>   recorder or the preset, not this change); layout gate and desktop gate (not
>   verify steps).

Done when: the recorder re-records `feral-p5-th4pc` and the new recording has
no Thunderheart Harness set-bonus entry at a piece count other than 2 or 4; or
the cause is found and recorded with a command a reader can re-run.
