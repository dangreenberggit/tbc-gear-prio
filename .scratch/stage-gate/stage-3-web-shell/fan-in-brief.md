# Fan-in brief — Stage 3 web shell, S2 ∥ S3

Written by the Executor seat at fan-out time so a compaction or session
restart does not lose the merge contract. Not a report; a working file.

## Base

- Feature branch: `phase-3/web-shell`
- Base SHA for both workers (from `git rev-parse HEAD` after S1's final
  commit): `dfa801cac8cb1036076536f3c772fd667607a36a`
- Merge-base with `dev`: `8a1c01af…`

S1 (plan steps 1–5) is committed on the feature branch in five commits:
`69e32ae` cli-wiring, `5664ff5` set-potential, `700a887` candidates,
`eae5c00` share-link + individual-settings, `dfa801c` apps/web scaffold.

## Slices

| Slice | Branch | Steps | Model |
| --- | --- | --- | --- |
| S2 server | `phase-3/web-shell-s2-server` | 6–9 | Opus |
| S3 UI | `phase-3/web-shell-s3-ui` | 10–12 | Opus |

Both slices carry real design judgment (S2 wires `rankUpgrades` through a
job worker with honest progress; S3 owns the skeleton/FLIP timing and the
client-side `applyView` re-render), so neither goes to the workhorse lane.

## Path ownership

Disjoint — verified against the plan's Partition table before spawning; no
path appears in both `pathsAllowed` sets.

| Slice | pathsAllowed | pathsForbidden |
| --- | --- | --- |
| S2 | `apps/web/server/**`, `apps/web/test/{jobs,characters,scaffold}.test.ts`, `apps/web/test/recordings.ts`, `apps/web/test/fixtures/**` | `apps/web/src/**`, every manifest, `packages/**`, docs, tickets |
| S3 | `apps/web/src/**`, `apps/web/test/{router,run-state}.test.ts` | `apps/web/server/**`, `apps/web/test/fixtures/**`, every manifest, `packages/**`, docs, tickets |

`apps/web/test/scaffold.test.ts` is S1's placeholder; it imports
`server/main.ts`, so it belongs to S2, which deletes or replaces it. This
is an addition to the plan's table, which predates the file.

Every shared manifest was written by S1 and is frozen for the duration of
the fan-out. A worker needing a manifest line states it verbatim under
`Notes / concerns`; the delegator applies it at fan-in.

## Conflict policy

The two slices share no file, so a content conflict means someone left
their scope — resolve by reverting the out-of-scope hunk, not by merging
it. `pnpm-lock.yaml` must not move: if a worker's install rewrote it,
take the feature branch's copy and re-run `pnpm install` after fan-in.

## Fan-in order

S2 first (S3 builds against the `JobView`/export contract S2 writes), then
S3. Then: tear down both worktrees, `pnpm install`, `pnpm verify` on the
integrated tip, then S4 (steps 13–17).

## Claims to re-check at fan-in

| Claim | Command |
| --- | --- |
| No item index in the client bundle (C31) | `grep -c index.json apps/web/dist/assets/*.js` → 0 |
| Main chunk under 400 kB (C31) | `pnpm -C apps/web build` size line |
| Stage 1 CLI tests untouched (box 6) | `git diff --stat $(git merge-base HEAD dev) -- packages/core/test` → only the two new test files |
| CLI output unchanged (step 2a) | `diff` of `rank-before.txt` / `rank-after.txt` in the scratchpad, modulo the pid in Node's SQLite warning |
| Both `pinBisAvailable` polarities (F2, box 5) | S2's `jobs.test.ts` |
| `decodelink` round trip (step 3) | recorded in `<scratchpad>/decodelink-evidence.txt`; apiVersion 13 both sides, 17 equipment ids equal |

## Merge-gate note for Gate C (not the Executor's call)

Ticket `263-wcl-gear-source-goes-live.md` is deliberately filed with
`Blocks: phase-3`, because gate box 1 ("type a character…") genuinely stays
open until a live `WclGearSource` exists. `scripts/check_merge_ready.py`
vetoes a merge when an open ticket's `Blocks:` names the branch's phase, so
`pnpm merge-to-dev` on `phase-3/web-shell` will refuse without
`--ack-open-blockers`.

That is the tracker working, not a defect: the plan's own box 1 is ☐. The
choice between acknowledging the blocker, re-scoping 263 off phase-3, or
holding the merge belongs to the orchestrator at Gate C. Tickets 72
(re-blocked to phase-5) and 78 (closed) no longer block.
