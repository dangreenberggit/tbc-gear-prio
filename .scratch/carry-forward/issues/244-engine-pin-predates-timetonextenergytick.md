Status: open
Type: task (pin bump; blocks the feral APL replacement)
Origin: owner-supplied feral APL, 2026-08-20 — the first real input to trip the
  ticket-239 gate. Supersedes ticket 239's acceptance criteria, which assume a
  fix that cannot work.
Blocks: none
Blocked by: none

# The engine pin predates `timeToNextEnergyTick`, so the owner's feral APL cannot land

## What the owner wants

Replace the feral skeleton (`data/presets/feral/p2.raid-sim-skeleton.json`, a
12-action APL) with a real 22-action feral cat APL carrying full powershifting,
bite-trick and Rip/Mangle-next logic. The APL is saved outside the repo; ask the
owner for it, or re-export from wowsims.

Owner's framing, which is correct: **the skeleton mechanism is fine and in use.**
This is not a "we cannot handle player settings" problem. It is one field our
engine pin predates.

## Why it cannot land today

The APL uses the APL value `timeToNextEnergyTick` **17 times**, across 9 of its
22 actions. Our pinned engine does not have it.

**The blocker is the compiled binary, not `data/proto/`.** This is the part that
makes the obvious fix wrong. `data/proto/` is a codegen input for our
TypeScript; the sim binary carries its own compiled-in schema. Probing the
pinned binary directly:

```
python -c "
b=open('vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe','rb').read()
for n in (b'time_to_next_energy_tick', b'energy_regen_per_second', b'energy_time_to_target'):
    print(n.decode(), b.count(n))
"
```

Observed 2026-08-20:

```
time_to_next_energy_tick 0
energy_regen_per_second  2
energy_time_to_target    2
```

The binary knows only the old fields. `wowsimcli` unmarshals with
`DiscardUnknown: true` (`vendor/tbc-new-fork/cmd/wowsimcli/cmd/basic_sim.go:39`),
so the unknown field is **silently dropped, not an error**.

Proven end-to-end rather than inferred: grafting the owner's rotation onto the
committed skeleton and running the pinned binary gave 17 occurrences in, **0
out, exit code 0, no warning**.

### The trap, in numbers

10k iterations, seed 1, pinned binary:

| skeleton | DPS |
| --- | --- |
| committed 12-action | 723.17 |
| owner 22-action, field silently dropped | 748.66 (+25.49) |

A believable +25 for a better rotation — which is exactly why this is dangerous.
All 17 uses sit inside `condition` boolean trees. A dropped leaf inside an
`and`/`cmp` does not disable the action; it changes what the guard evaluates. So
748.66 is a real number from a mutilated rotation. **Treat it as evidence of the
bug, never as the new skeleton's DPS.** This is PLAN.md's stated worst case.

## Two fixes that do not work — do not attempt either

1. **`pnpm fetch:protos` cannot advance anything.** `scripts/fetch_protos.py:86`
   reads `sha = lock["commit"]` — it re-fetches at the commit already pinned. It
   would re-download 16 byte-identical files and report success. **Ticket 239's
   acceptance criterion 1 assumes this works and is wrong.**
2. **Rewriting the field to `energyTimeToTarget` is a semantic substitution, not
   a rename.** Field 89 was *repurposed*: `energy_regen_per_second = 89` became
   `time_to_next_energy_tick = 89`, while `energy_time_to_target = 91` still
   exists unchanged alongside it. Swapping them silently changes the rotation's
   meaning while turning the gate green.

Note also that re-pinning `data/proto/` **alone** would be worse than doing
nothing: it satisfies the name-based gate in `scripts/apl_schema.py` while the
binary keeps discarding the field, converting a loud armed gate into a silent
wrong answer.

## Where the field actually exists

Verified 2026-08-20 by fetching each ref and reading `proto/apl.proto`:

| ref | has the field |
| --- | --- |
| v0.0.101 (our pin) | no — `energy_regen_per_second = 89` |
| v0.0.102, v0.0.103, v0.0.104 | no |
| **v0.0.105** | **yes — first tag that has it** |
| v0.0.119 (current upstream tag) | yes |
| upstream `master` (`3267f8d`) | yes |
| **`feature/backend-reforge`** | **yes** |
| `feral-init`, `tmp/pshbk` | no |

`feature/backend-reforge` is the branch already recorded in
`data/wowsims.lock.json` under `watchedRefs` (watched at `33970a8`, 2026-08-12;
branch HEAD is now `cbf6b75` — it has moved and we have not re-fetched).

**It is at v0.0.115 plus 54 commits of its own reforge work.** Measured by
`gh`-less compare against each tag:

```
curl -s "https://api.github.com/repos/wowsims/tbc-new/compare/<tag>...cbf6b75a889e52c4106351976db66efd914ea349"
```

`behind_by: 0` against every tag through **v0.0.115** (it fully contains them);
it diverges from v0.0.116 onward (behind 10, then 12, 14, and 20 at v0.0.119).
Its HEAD is a `Merge branch 'master'` dated 2026-08-13.

So the branch we already track is **14 tags ahead of our pin** and only 4 tags
behind current upstream — not an exotic side branch. It carries a **working
implementation**, not just a schema entry:

- `sim/core/apl_value.go:139` — dispatch case
- `sim/core/apl_values_resources.go:304-325` — the value type
- `sim/core/energy.go:81` — `TimeToNextEnergyTick(sim)` on the energy bar

**But `watchedRefs` does not mean we build from it.** `scripts/sync_wowsims.py:41`
— `--watch-ref` records a ref *without fetching*, "for a branch we build from
the tag but want to know about if it moves." We build from v0.0.101.

## The binary question, which decides the cost

`scripts/fetch_wowsimcli.py` downloads from a **GitHub release**, and releases
exist for tags only. Verified 2026-08-20:

```
curl -s -o /dev/null -w "%{http_code}\n" "https://github.com/wowsims/tbc-new/releases/download/feature/backend-reforge/wowsimcli-windows.exe.zip"   # 404
curl -s -o /dev/null -w "%{http_code}\n" -L "https://github.com/wowsims/tbc-new/releases/download/v0.0.105/wowsimcli-windows.exe.zip"                # 200
curl -s -o /dev/null -w "%{http_code}\n" -L "https://github.com/wowsims/tbc-new/releases/download/v0.0.119/wowsimcli-windows.exe.zip"                # 200
```

So a `backend-reforge` binary would have to be **built from source**. That is
viable here — `go version` reports `go1.25.4 windows/amd64`, and the fork's
`go.mod` asks for `go 1.25.0` / `toolchain go1.25.4`, an exact match — but a
locally-built binary is not a pinned artifact, and every committed sim number
would then trace to a build nobody else can reproduce byte-for-byte. That is a
provenance decision, not a mechanical one.

## What a bump would and would not disturb

Measured, not assumed:

- **Content tier does not move.** `CURRENT_PHASE` is `Phase2` at v0.0.101,
  v0.0.105 **and** v0.0.119 (fetched `ui/core/constants/other.ts` at each). So
  `defaultMaxPhase` and every phase-gated pool stay put — the largest feared
  cascade does not happen.
- **Proto drift v0.0.101 → v0.0.105 is tiny**: 2 lines in `apl.proto` (the tag
  89 swap) and 2 in `common.proto` (`current_version_number` 13→14, plus a
  `bloodthistle` field).
- **Committed sim numbers will move** and need re-baselining. That is the real
  cost, and it is unavoidable on any route that changes the engine.
- **The fork needs rebasing.** `data/wowsims-fork.lock.json` records
  `branchedFrom: 8aa378b` (= v0.0.101), so `feat/upgrades-tab` sits on the old
  base. `pushed: false` — nothing has left this machine, so there is no remote
  to coordinate with.
- **Untested, flagged rather than guessed:** whether
  `scripts/check_engine_port_drift.py` (33 ported files) survives the bump, and
  how much `db.json` / gear-set churn a `sync:wowsims` bump brings. Neither was
  measured.

## Options

1. **Bump the pin to v0.0.105.** Minimum version with the field; smallest
   upstream drift; prebuilt binary exists. Leaves us on a stepping stone 14 tags
   behind.
2. **Bump to v0.0.119** (current upstream tag). Same mechanical work, larger
   drift, prebuilt binary exists, leaves us current.
3. **Track `feature/backend-reforge`.** `sync_wowsims.py` explicitly supports
   `--update --ref feature/backend-reforge` (its own usage examples), and this
   is the branch we already watch — we are 14 tags behind it. Gets the field
   **and** v0.0.115 **and** the reforge work in one move, versus option 1's
   14-tag-older stepping stone. Cost: **no prebuilt binary**, so a from-source
   build and the provenance problem above — that is the only thing making this
   more expensive than option 1, and it is a provenance judgement, not a
   mechanical blocker.
4. **Hold.** Keep the 12-action skeleton until an engine bump is wanted for its
   own reasons. Costs nothing now; the owner's APL stays unlandable.

**Correction, 2026-08-20.** This section originally called option 3 marginal —
"only worth it if `backend-reforge` is wanted for reforging". That was written
without checking what version the branch was on, which is the number the whole
decision turns on. At v0.0.115 it is not a side quest: it is the branch this
repo already committed to tracking, 14 tags ahead of the pin, and it moots the
stepping-stone problem option 1 creates.

Option 1 is the cheapest route with a **prebuilt, pinnable** binary. Option 3
gets more in one move and is the better answer if a from-source build is
acceptable — the trade is provenance (a locally-built binary no one else can
reproduce byte-for-byte) against not doing this again in a few weeks.

## Acceptance

- [ ] An option above chosen and recorded here with its reason.
- [ ] If a pin moves: `data/wowsims.lock.json`, `data/proto/`, the wowsimcli
      binary and `data/wowsims-fork.lock.json` all move **together**, and the
      working tree matches `HEAD` after regenerating every committed artifact.
- [ ] `grep -rn timeToNextEnergyTick data/proto/` returns a hit, **and** the
      binary probe above returns a non-zero count. Both, not either.
- [ ] The owner's APL round-trips through the pinned binary with **no dropped
      fields** — 17 occurrences in, 17 out, proven by the same in/out count that
      demonstrated the bug.
- [ ] `python scripts/check_build_feral_skeleton.py` passes for the right
      reason (the field is known), not because the APL was rewritten.
- [ ] New feral skeleton DPS recorded with its exact command, alongside the old
      723.17, and the 748.66 figure explicitly retracted as a mutilated-rotation
      artifact.
- [ ] `check_engine_port_drift.py` green, or its failure documented and the fork
      rebase recorded.
- [ ] Ticket 239 updated — its criterion 1 (`pnpm fetch:protos` advances the
      pin) is false and must not be left as guidance.
- [ ] `pnpm verify` green.
