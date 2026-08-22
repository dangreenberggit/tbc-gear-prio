Status: closed
Type: task (pinned-input drift; latent, gated)
Origin: `feat/candidate-pool` stage-gate tail, 2026-08-20 — carried forward as
  the one advisory the branch did not act on
Blocks: none
Blocked by: none

# The proto pin has no `timeToNextEnergyTick`, so a feral APL re-sync is blocked until it is re-pinned

## Superseded by ticket 244, 2026-08-20

**This ticket's acceptance criteria are wrong.** Criterion 1 assumes
`pnpm fetch:protos` can advance the proto pin. It cannot:
`scripts/fetch_protos.py:86` reads `sha = lock["commit"]` and re-fetches at the
commit already pinned.

It also mis-locates the blocker. Re-pinning `data/proto/` alone would satisfy
the name-based gate in `scripts/apl_schema.py` while the **compiled binary**
kept discarding the field — turning a loud armed gate into a silent wrong
answer. The binary at v0.0.101 contains zero occurrences of
`time_to_next_energy_tick`; see ticket 244 for the probe.

The gate described below is still real and still armed. Ticket 244 carries the
actual fix, the measured blast radius, and the owner's options.

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

- [x] `data/proto/*.proto` re-pinned to a version declaring
      `timeToNextEnergyTick` — done 2026-08-21 on
      `feat/engine-pin-backend-reforge`. **Not by `pnpm fetch:protos`**, which
      cannot advance anything on its own (see the correction at the top of this
      ticket): the main pin moved first with
      `sync_wowsims.py --update --ref feature/backend-reforge`, and
      `fetch_protos.py` then read the new `lock["commit"]`. Verified:
      `data/proto/apl.proto:149` declares `time_to_next_energy_tick = 89`.
- [x] `python scripts/check_build_feral_skeleton.py` still passes — done in
      `fc1b13f`. This ticket predicted the staleness exactly and prescribed the
      fix that was applied: `check_rejects_time_to_next_energy_tick` was
      re-aimed (and renamed `check_rejects_unknown_apl_field`) at
      `selectedPotion`, a field the new pin still lacks, rather than deleted.
      Ticket 244 records why that field is the right replacement.
- [x] The feral skeleton regenerates from the re-pinned protos and the byte
      compare passes — done 2026-08-21. It now regenerates from the **owner's**
      export rather than upstream's default APL (rotation and consumables both),
      which is a change of source this ticket did not anticipate. See ticket 244.
- [x] Committed sim numbers changed, and by more than the re-pin alone. Stated
      with the measurements, all at 20k iterations / seed 42 on the committed p2
      skeleton via
      `vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe sim --infile ... --outfile ...`
      reading `raidMetrics.dps.avg`:

      - **The engine alone is nearly a no-op.** Ret's rotation is byte-identical
        across the old and new pins, so ret isolates the engine: 1909.74 ->
        1909.09, **-0.03%**.
      - **Feral moved because the rotation and consumables changed**, not
        because of the engine: 723.5 on the old pin's 12-action default, and
        **782.14** on the owner's rotation with their real consumables.

      Every recorded fixture was re-recorded on the pinned binary; `simVersion`
      is now the pinned ref rather than `v0.0.101`.

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
