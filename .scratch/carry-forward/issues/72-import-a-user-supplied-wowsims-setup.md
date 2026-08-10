Status: open
Type: feature
Origin: chat, 2026-08-08
Blocks: phase-3
Blocked by: none

# Let a user supply their own wowsims setup instead of trusting our skeleton

## Problem

Our sim configuration is a committed per-spec skeleton. A user who configures a
character on wowsims.github.io and gets a different number than we report has no
way to make the two agree, and no way to tell us which one they meant.

Ticket `.scratch/phase-2/issues/07-sim-defaults-diverge-from-wowsims.md` fixes
*our* defaults per spec. This is the complement: let the user supply *theirs*.
The two are not the same work, and 07 does not subsume this — but note 07's
scope item 2 (cross-spec comparability) is weakened if user-supplied config
lands, because an imported config is per-user rather than per-spec. Resolve
07 first or resolve them together.

Motivating case: feral cat, where rotation and buff fidelity matter more than
for simpler specs, and where an unexplained helm-ranking gap between our sim
and wowsims prompted this.

## The plan already anticipated this

**PLAN.md:522 names the runtime lift as "the eventual end state"** and names its
blocker: the exported `consumables.potions[]` / `conjuredItems[]` menus, inert
for ret but not yet regenerable. PLAN.md:516 ([R6]) states the message-boundary
distinction this ticket depends on. So the lift is not a new idea — it is a
deferred decision that was never assigned to a phase, and this ticket is that
assignment.

What is genuinely new here, beyond §8.2: the **user-supplied** case. §8.2 is
about assembling *our* skeleton from pinned presets. This ticket adds a skeleton
that comes from the user, which is what makes our number reconcilable with the
one they got in the browser — and which §8.2's build-time framing cannot serve,
since it happens per-run rather than per-release.

## What already exists

The import path is built for **build time, one direction**. Read from code:

- `data/presets/ret/p2.individual-sim-settings.json` exists on disk. Feral has
  no equivalent — `data/presets/feral/` holds only `p1.ep-weights.json` and
  `p2.raid-sim-skeleton.json`.
- **There is no `IndividualSimSettings` → `RaidSimRequest` lift in code.**
  `packages/core/src/compose.ts:5-7` states the lift is a build-time generator
  and that compose does not re-do it. `scripts/build_feral_skeleton.py` does not
  lift from IndividualSimSettings at all.
- Runtime consumption is CLI-only and disk-only: `packages/core/src/cli.ts:269`
  loads `data/presets/${args.spec}/p2.raid-sim-skeleton.json`.
- Generated proto types exist for the input side —
  `packages/core/src/proto/ui_pb.ts` carries `IndividualSimSettings`. The output
  side does not: `packages/core/src/seams/sim-runner.ts:13` types
  `RaidSimRequest` as an opaque `Readonly<Record<string, unknown>>`, so the lift
  lands with no compiler help on its target.
- `.scratch/wowsims-import/README.md` plus three real user exports
  (apiVersion 13) are prior art, including a catalogue of user-vs-pipeline
  divergences.

Quoted from PLAN.md / verification-log, **not re-run here** — cite the source
rather than restating as fresh fact: the `wowsimcli decodelink` gate pass
(PLAN.md:822), and the measurement that stripping `prepullActions` drops
slamaltman 2042.85 → 789.02 DPS (`docs/verification-log.md`, 2026-07-27, quoted
at `content-hash.ts:82-84`).

## Why this blocks phase-3

PLAN.md:781 already commits Phase 3 to *emitting* `IndividualSimSettings` JSON
and a wowsims share link (zlib+base64 after `#`). This ticket is the inverse
direction of that deliverable and shares a codec. Filing it against phase-3 puts
it in front of whoever builds the export, so both directions are built against
one codec rather than two.

## Architectural constraint: no fourth seam

`packages/core/src/rank.ts:95-96` already injects `raidSimSkeleton` as a `Deps`
field, with the comment "CLI loads from disk." An imported config enters by
**replacing that value**. `rankUpgrades` never reads the skeleton from a
filesystem.

Two properties that make this cheaper than it looks:

- `compose` needs no change. `compose.ts:21-42` patches only `name`, `race` and
  `equipment` and deletes `simOptions`/`requestId`, so a user-supplied skeleton
  flows through untouched.
- Cache behaviour is correct for free. `content-hash.ts:139` hashes
  `skeleton` **by value**, and `content-hash.ts:79-85` records why. Two users
  with different buffs therefore get different hashes. *(Inference from reading
  the hash input, untested for this use.)*

An imported config's `equipment` block should be **discarded**: the tool ranks
against WCL-logged gear, and `compose.ts:39` overwrites equipment anyway.

## The constraint that will bite

Website exports are frequently `TypeSimple` with a `specRotationJson` and no APL
block — ticket 07 records exactly this for the feral export. Given the prepull
measurement cited above, a naive lift of such an export would produce a request
that runs far below the correct DPS. **The importer must merge the pinned vendor
APL (`vendor/wowsims/<spec>_default.apl.json`), or refuse the import.** Not
optional polish.

This specific failure is **hypothesis** — it follows from the recorded prepull
measurement plus 07's observation about the export shape, but nobody has run a
lifted user export through the pinned binary. Do that first; it is the cheapest
way to find out whether the whole feature is harder than this ticket assumes.

Second constraint: `scripts/check_raid_sim_skeleton.py:9-11` records that
byte-identical regeneration is blocked on the exported
`consumables.potions[]` / `conjuredItems[]` menus ("inert for ret, unknown
filter"). An importer must decide whether to drop them — what
`build_feral_skeleton.py:52-54` did, calling invented values "fabrication rather
than a port" — or carry them through unvalidated.

## Scope, staged

**Stage 1 — smallest useful version.** Accept a pasted `IndividualSimSettings`
JSON as the skeleton source: a `--sim-settings <path>` CLI flag, a lift function
in core, APL merge when the export's rotation is `TypeSimple`, feeding the
existing `Deps.raidSimSkeleton`. No new seam, no network, no codec.

Test at the module interface through the recorded adapters per AGENTS.md, plus a
direct unit test of the lift — it is a pure function, so no agreement needed.
Acceptance that actually proves something: lift
`.scratch/wowsims-import/slamaltman-before-user.json` and compare the composed
request against that README's recorded user DPS.

**Stage 2 — accept a share link.** `decodelink` is a subprocess call; the
in-process zlib+base64 codec is the fallback PLAN.md:511 already scopes, and
§12 needs the encode half regardless. This is where "connect to wowsims web
usage" actually lands — a share link is the connection; wowsims has no API.

**Stage 3 — web shell paste box and round-trip.** Phase 3, paired with the §12
export deliverable.

## Not in scope

Validating that a user's talents match the requested spec (carry-forward 61's
territory), and reconciling imported gear against WCL-logged gear.
