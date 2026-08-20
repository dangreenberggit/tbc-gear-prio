Status: open
Type: task (pinned-input drift; latent, gated)
Origin: `feat/candidate-pool` stage-gate tail, 2026-08-20 — carried forward as
  the one advisory the branch did not act on
Blocks: none
Blocked by: none

# The proto pin has no `timeToNextEnergyTick`, so a feral APL re-sync is blocked until it is re-pinned

## What this is, and what it is not

Upstream's newer feral APL uses an APL value field called
`timeToNextEnergyTick`. `data/proto/apl.proto` at our pin does not declare it —
the pinned `APLValue` oneof has `energyTimeToTarget` instead. The pinned
`wowsimcli` (v0.0.101) unmarshals with `DiscardUnknown: true`, so a field our
proto pin does not know is **silently dropped rather than erroring**: a
skeleton built from such an APL would produce a plausible but wrong rotation
with no signal at all.

**This is not firing on anything today, and no numbers are currently wrong.**
Observed 2026-08-20: `grep -c timeToNextEnergyTick vendor/wowsims/feral_default.apl.json`
→ `0`. The vendored APL at the current pin (`data/wowsims.lock.json`, tag
`v0.0.101`, commit `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`) does not use the
field. The gate is armed and the input is clean.

Note for anyone reading a `pnpm verify` log: `python scripts/check_build_feral_skeleton.py`
prints a paragraph naming `timeToNextEnergyTick` and a temp path under
`.../tmp*/feral_default.apl.json`, then exits 0 with
`feral skeleton APL schema gate ok (3 checks)`. That paragraph is the gate's own
end-to-end self-test exercising a **fabricated** APL it writes to a temp
directory (`check_build_feral_skeleton.py`,
`check_build_feral_skeleton_refuses_unknown_apl_field`) — it is proof the gate
works, not a complaint about a real file. Do not read it as an alarm.

## Why file it anyway

The gate refuses to write a skeleton containing an unknown field
(`scripts/build_feral_skeleton.py` exits 1). That is the right behaviour, but it
means the **next wowsims re-sync that brings the newer feral APL will hard-stop
skeleton regeneration** until the protos are re-pinned. Filing this now so that
stop is a known, already-diagnosed step rather than a fresh investigation under
time pressure.

## Prior history — this is not a new discovery

Three earlier notes already cover this ground. Read them before starting:

- `.scratch/handoffs/issue-1-upstream-gem-cleanup/investigation2-comment.md:22`
  — the original finding: the new upstream APL uses the field in at least 8
  places, `build_feral_skeleton.py` copied APL keys blindly, and there was no
  schema gate between the vendored APL and the skeleton.
- `.scratch/handoffs/issue-1-upstream-gem-cleanup/fan-in-brief.md:34` and `:40`
  — the gate that answered it: an `apl_schema.py` check wired into
  `build_feral_skeleton.py` that rejects `timeToNextEnergyTick` and accepts the
  real ret APL, landed 2026-08-12 on `wt/issue1-guard-rails`
  (`4869a87` + `8ef48cc`).
- `.scratch/handoffs/issue-1-upstream-gem-cleanup/impact-comment.md:13` — the
  mechanism: apl.proto field 89 was **repurposed** upstream,
  `energyRegenPerSecond` → `timeToNextEnergyTick`. A repurposed tag is why a
  name-based gate is the right shape here.

The gate is done. What remains is the step those notes stop short of: re-pin the
protos so the field exists, then regenerate.

## Known limit of the gate

`scripts/apl_schema.py` extracts a single **flat** set of every camelCase field
name declared anywhere across `data/proto/*.proto`, not a per-message schema. It
catches a name unknown everywhere; it would not catch a known name used in the
wrong message. Its own docstring says so. Adequate for this case, worth
tightening if it ever bites.

## Acceptance criteria

- [ ] `pnpm fetch:protos` re-pins `data/proto/*.proto` to a version declaring
      `timeToNextEnergyTick`, and `pnpm fetch:protos:check` passes at the new
      pin.
- [ ] `python scripts/check_build_feral_skeleton.py` still passes. Note its
      `check_rejects_time_to_next_energy_tick` self-test asserts the field is
      **unknown**, so re-pinning makes that check stale by design — its own
      failure message says so. Replace it with a still-unknown field rather
      than deleting the coverage.
- [ ] The feral skeleton regenerates from the re-pinned protos and the byte
      compare over the regenerated artifact passes.
- [ ] Whether the re-pin changes any committed sim numbers is stated either way,
      with the command that shows it.

## Out of scope

Doing the re-pin was explicitly out of scope for the `feat/candidate-pool`
stage-gate tail that filed this; only the filing was in scope. The mana /
healer-item question (tickets 227, 234) is unrelated and separately owned.

## Ticket numbering note

`.scratch/carry-forward/issues/NEXT` read `238` when this ticket was allocated,
but `238-ticket-228-status-blocks-the-merge-gate.md` already existed — the
counter was stale by one. Observed 2026-08-20: `cat .scratch/carry-forward/issues/NEXT`
→ `238`; `ls .scratch/carry-forward/issues/238-*` → one file. This ticket took
239 and wrote `240` to NEXT.
