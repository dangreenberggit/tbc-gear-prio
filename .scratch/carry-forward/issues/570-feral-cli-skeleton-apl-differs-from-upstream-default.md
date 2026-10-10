Status: wontfix
Type: task
Origin: docs/reviews/feat-upstream-react-port.md (fix round B1; not a review finding, filed at the session's request)
Blocks: none
Blocked by: none
Related: 244, 250, 558, 561

# The feral CLI skeleton's rotation differs from upstream's default APL at the engine pin

## What was reported

The session asked for this ticket on the premise that
`data/presets/feral/p2.raid-sim-skeleton.json` "still holds upstream's
pre-`6163fdbff` default feral APL", so the CLI sims an older rotation than the
site's default at the pinned engine `42c75dc9`. The evidence given: upstream
commit `6163fdbff` changes only `ui/specs/druid/feralcat/apls/default.apl.json`
and a results file, and the skeleton's rotation has no `gcdTimeToReady`.

## What is true

Part of the premise holds and part does not.

- `6163fdbff` ("[Feral] Use the Haste Potion and trinkets together in
  Bloodlust", 2026-09-29) changes the default APL and
  `sim/druid/feralcat/TestFeralCat.results` only, and it is in the engine pin:
  `git -C vendor/tbc-new-fork show --stat 6163fdbff` and
  `git -C vendor/tbc-new-fork merge-base --is-ancestor 6163fdbff 42c75dc9; echo $?`
  (prints 0). Of the APL's four groups it changes only `Powershifting`, which
  now uses `gcdTimeToReady`.
- The skeleton's rotation has no `gcdTimeToReady`, so it does differ from the
  site's default at `42c75dc9`.
- The skeleton does **not** hold upstream's pre-`6163fdbff` default. It holds
  the owner's own settings export,
  `data/presets/feral/owner-p2.settings-export.json`, with upstream's item-id
  renames applied (`data/presets/feral/upstream-item-id-renames.json`). Its
  `priorityList` has 22 entries; upstream's default has 24 both before and
  after `6163fdbff`. Its `CD: Trinkets` and `Powershifting` groups differ from
  upstream's in both versions; `Drums` and `Engineering` match both.

Re-run (Python, port root):

```sh
git -C vendor/tbc-new-fork show 6163fdbff^:ui/specs/druid/feralcat/apls/default.apl.json > old.json
git -C vendor/tbc-new-fork show 42c75dc9:ui/specs/druid/feralcat/apls/default.apl.json > new.json
python -c "import json;s=json.load(open('data/presets/feral/p2.raid-sim-skeleton.json'))['raid']['parties'][0]['players'][0]['rotation'];o,n=json.load(open('old.json')),json.load(open('new.json'));print([(k,s[k]==o[k],s[k]==n[k]) for k in ('prepullActions','priorityList','groups','valueVariables')], 'gcdTimeToReady' in json.dumps(s))"
python scripts/check_raid_sim_skeleton.py --spec feral
```

The last command compares the skeleton with the owner's export through the
builder's own rename function; it prints `ok`.

## Are the skeletons meant to follow upstream's default APL?

- **Feral: no, by design.** `scripts/build_feral_skeleton.py` (docstring and
  the `FERAL_APL` comment) builds the rotation from the owner's export, "NOT
  from the pinned vendor/wowsims/feral_default.apl.json -- upstream's APL
  rewrites do not reach this skeleton". The reason given there is fidelity to
  the rotation the owner plays (tickets 244 and 250).
  `scripts/check_raid_sim_skeleton.py` gates feral against the owner's export
  for the same reason.
- **Ret: yes, and it is current.** `check_raid_sim_skeleton.py` says "Ret still
  tracks the pinned vendor APL" and compares the ret skeleton with
  `vendor/wowsims/ret_default.apl.json`, which `data/wowsims.lock.json` pins at
  `42c75dc9`. `python scripts/check_raid_sim_skeleton.py` prints `ok`. Upstream's
  ret default APL last changed in `0bc72a870`, a path move
  (`git -C vendor/tbc-new-fork log --oneline 42c75dc9 -- ui/specs/paladin/retribution/apls/default.apl.json`).

Both skeletons feed only the CLI harness. The Upgrades tab builds its request
from the live page (ADR-0031), so neither file decides what the tab sims, and
the recorded tab fixtures do not read them.

## What is open

The owner's export was committed on 2026-08-20 (`1dbbc79b`, `git log --
data/presets/feral/owner-p2.settings-export.json`), before `6163fdbff`
(2026-09-29), so the CLI's feral
rotation does not get upstream's later fixes, such as Cat Form waiting for the
GCD to end before the trinkets, potion and sappers. Whether the owner's own
APL has the problem `6163fdbff` fixed is a rotation question, untested here.

Choose one:

1. Keep the owner's export as the source. The difference is the documented
   design; close this ticket `wontfix` with that reason.
2. Take a new owner export, or move feral to upstream's default APL as ret
   does. Either is data-pipeline work (`data-pipeline-work` skill): rebuild with
   `python scripts/build_feral_skeleton.py`, update the gate's source if the
   source changes, and expect the pinned CLI feral values to move.

## Done when

The owner has picked 1 or 2, and for 2 the skeleton is rebuilt, `pnpm
skeleton:check` passes, and every pinned CLI feral value that moved is
re-recorded with the old and new values written here.

## Closing note (2026-10-07, round B2b)

`wontfix`: option 1 above, keep the owner's export as the source. This is a session ruling, not an owner pick. The stage decision log (`C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/558-p3-settings-gates/decision-log.md`, gitignored, owner's checkout) records it verbatim:

> 2026-10-07T07:55Z | ef13ce60-a835-4a9f-b024-892080124bda | row Q-570-feral-skeleton-apl | wontfix (session ruling) | the feral CLI skeleton is the owner's own export by design (build_feral_skeleton.py docstring; tickets 244, 250; check_raid_sim_skeleton.py gates it against that export); ret follows upstream and is current; CLI-only (ADR-0031); the owner said tuning rotations is not the job; the later agent closes 570 with this ruling | evidence: B1 report § Ticket 570

The owner's words the ruling rests on, as quoted in `docs/reviews/feat-upstream-react-port.md`: "I'm just making sure this upgrades tab gets made. Our job is not to make a good player rotation. Stay on target". If the owner wants feral to follow upstream's default APL, option 2 above is the work.

## Reopened (2026-10-08, pre-merge review round 2, SP5)

The owner overruled the closing note's session ruling on 2026-10-08T15:31Z (`C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/558-p3-settings-gates/decision-log.md:206`, gitignored, owner's checkout):

> "\"Q-570-feral-skeleton-apl. The command-line harness keeps your own exported feral rotation, which is its documented design.\" this doesnt make any sense. i see no reason for this to exist as part of the upgrades tab code, it is a huge smell. our job is making an upgrades tab, not making a feral rotation (perhaps it existed somewhere for testing or in tbc gear prio as some default setting)"

So the `wontfix` above no longer stands and the done line ("The owner has picked 1 or 2") is not met. The work is planned in `C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/570-feral-upstream-apl/` (`plan.md`, `investigation.md`, `decision-log.md`; gitignored, owner's checkout): build the command-line feral skeleton from wowsims' own default rotation and presets and delete the project's exported rotation. That plan is held until `feat/upstream-react-port` merges (`.scratch/handoffs/cleanup-upstream-footprint-HANDOFF.md`, "Ticket 570: the feral rotation", owner's checkout).

## Closed (2026-10-09): wontfix, owner ruling

The owner, in the session of 2026-10-09, about this ticket:

> "This concept is dumb. If we are simming on wowsims then the sim uses whatever settings a user has on wowsims."

So the feral command-line skeleton is not rebuilt from upstream's default
rotation, and the plan in `.scratch/stage-gate/570-feral-upstream-apl/`
(gitignored) is not executed. The stage is closed on this ruling.
