# wowsims reuse — what we should take instead of build

**Context.** An audit of `wowsims/tbc-new` beyond `wowsimcli`, asking one
question: _what already exists upstream that we would otherwise write ourselves?_
Prompted by Stage 1 taking longer than expected. These are **reference notes and
proposals** — nothing here is implemented, and none of it changes `PLAN.md`.

**Standing rule:** don't rebuild what upstream has, unless ours is substantially
better in functionality or performance.

Upstream pin: `wowsims/tbc-new` @ `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`.

| File                                     | What it covers                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| [`take-list.md`](take-list.md)           | The audit: every upstream piece worth taking, what it gives us, what stays ours |
| [`standalone-app.md`](standalone-app.md) | The two functionalities, current build status, the shell-stack decision         |

Related, outside this folder:
[`../compute-topology.md`](../compute-topology.md) (the sim: CLI vs WASM vs HTTP),
[`../ep-weights-from-sim.md`](../ep-weights-from-sim.md),
[`../upstream-data-redundancy.md`](../upstream-data-redundancy.md).

---

## The one thing to read if you read nothing else

**There is no live Warcraft Logs client in this repo.** Not ours, not theirs.

```bash
wc -l packages/core/src/seams/gear-source.ts   # 73
```

Those 73 lines are a two-method interface (`findFights`, `readGear`) plus
`RecordedGearSource`, which replays committed JSON fixtures. `cli.ts:240`
constructs it; there is one fixture character (`slamaltman`). Every test and CLI
run replays canned gear captured in Stage 0 by a throwaway Python script
(`wcl_probe.py`).

That is the seam working as designed — the engine runs offline and
deterministically. But the "fetch real gear from WCL" box is **empty**. Type a
character name for real and nothing answers.

So the box is empty rather than duplicated — an earlier note in this folder
implied we had rebuilt their importer, and we had not.

**But do not conclude "so take theirs" — that was this folder's second wrong
answer, corrected 2026-08-04.** Their importer throws on our fixtures, and
`PLAN.md` §5.2 already specifies our own adapter. Reasons and repro commands live
in one place: [`take-list.md`](take-list.md) §1. Do not restate them here — this
fact already appears in more files than is comfortable, and one copy drifted
before the branch merged.

---

## Findings at a glance

| Upstream piece                                                             | Our state            | Verdict                                                                 |
| -------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------- |
| `raid_wcl_importer.tsx` — OAuth, GraphQL, `CombatantInfo`, gear→ItemSpec   | **unbuilt**          | **Reference only** — their classifier throws on our data (take-list §1) |
| `constants/mechanics.ts` — hit/crit/haste/expertise rating conversions     | **unbuilt**          | **Take.** Hand-deriving these invites silent error                      |
| `gear_picker.tsx`, `database.ts`, `wowhead.ts` — pickers, lookup, tooltips | **unbuilt**          | **Take** if any UI is built                                             |
| The sim (CLI / WASM / HTTP — one engine)                                   | using CLI            | Already ours; see [`../compute-topology.md`](../compute-topology.md)    |
| `db.json` item `phase`, encounter presets                                  | partly duplicated    | See [`../upstream-data-redundancy.md`](../upstream-data-redundancy.md)  |
| `proto_utils/gems.ts` meta conditions                                      | ported (204 lines)   | **Keep ours** — behaviourally equivalent, wants a tripwire test         |
| `tools/database/atlasloot.go`                                              | ours is TBC-specific | **Keep ours** — theirs reads MoP URLs only                              |
| Fight _selection_ ("last qualifying kill for a character")                 | ours                 | **Ours.** Theirs takes a report URL                                     |
| Ranked single-item upgrades vs logged gear                                 | **built**            | **Ours.** Not in their app; this is the product                         |

**On volume:** our whole domain layer is ~1,066 lines against upstream
counterparts of 9 KB and 54 KB for the same concepts. Confirmed overlap is ~250
lines. We did not write a parallel universe — the gap is things **unwritten**,
not things written twice.
