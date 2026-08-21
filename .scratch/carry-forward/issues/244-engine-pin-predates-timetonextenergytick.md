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

**Two of the original four are dead. Recorded so nobody re-opens them.**

- ~~**Bump to v0.0.105.**~~ Dead. It carries the field, but it is the minimum
  version that does — a stepping stone that buys the field and another bump
  shortly after. Both live options contain it.
- ~~**Hold / keep the 12-action skeleton.**~~ Dead. The owner has asked for the
  real APL; holding is a decision not to do the thing this ticket exists for.

**Still live: `feature/backend-reforge` and `v0.0.119`.** A previous revision
marked v0.0.119 dead "once the ancestry was checked". That reasoning is
retracted immediately below and v0.0.119 is back on the table.

### The ancestry argument, retracted 2026-08-20

An earlier revision of this ticket decided the matter on ancestry: our pin is an
ancestor of `feature/backend-reforge` (`ahead_by: 154, behind_by: 0`), therefore
moving to it is a fast-forward along the line we are already on, while v0.0.119
is a "sideways move onto a different line."

**The measurement is correct and the inference from it is wrong.** Re-measured
2026-08-20, same endpoint, all three candidates against the pin
`8aa378b3671a0923fd11fb34b4b3753e53f20c9b`:

```
curl -s "https://api.github.com/repos/wowsims/tbc-new/compare/8aa378b...<ref>"
```

| ref | status | ahead_by | behind_by |
| --- | --- | --- | --- |
| `feature/backend-reforge` (`cbf6b75`) | ahead | 154 | 0 |
| `v0.0.119` | ahead | 122 | 0 |
| `v0.0.105` | ahead | 30 | 0 |

Our pin is an ancestor of **every** candidate. It is a commit on `master`, so
each later `master` tag contains it by construction. `behind_by: 0` therefore
does not distinguish the options — it is true of all of them, and cannot decide
between them. v0.0.119 is not "a different line"; it is further along the same
`master` line the pin sits on. What diverges from `master` is
`backend-reforge`'s own 54 reforge commits.

Do not re-derive a decision from `behind_by: 0` against a single ref. Measure
every candidate or the number means nothing.

## The decision

Retracting the ancestry argument does not resurrect the dead options above:
v0.0.105 is still a stepping stone, and holding still refuses the thing this
ticket exists for. It reopened exactly one question, the one the original
write-up posed, now answered below:

**`feature/backend-reforge` vs `v0.0.119` — do we want the reforge work enough
to accept a from-source binary?**

- **`feature/backend-reforge`**: v0.0.115 base + 54 reforge commits. No GitHub
  release exists for a branch (404 verified above), so the binary must be built
  from source and committed sim numbers trace to a local build.
- **`v0.0.119`**: current `master` tag, 4 tags ahead of backend-reforge's base,
  prebuilt binary with a downloadable release artifact. No reforge work.

Both contain the field. Both are the same mechanical bump. The trade was reforge
work against binary provenance — a judgement for the owner, not something a
compare endpoint settles.

**Decision, 2026-08-20: track `feature/backend-reforge`** (v0.0.115 base + 54
reforge commits). Owner's call, made on the trade as stated above — the reforge
work is wanted, and a from-source binary is accepted as its price.

Note this reaches the same ref an earlier revision recorded, but *not* for that
revision's reason. Its ancestry argument is retracted above and must not be
cited as support: the pin is an ancestor of both candidates, so `behind_by: 0`
never distinguished them. The reason is the reforge work, and the cost accepted
alongside it is binary provenance.

Mechanics verified for the chosen route:

- `sync_wowsims.py --update --ref <ref>` is the supported door and is in the
  script's own usage examples. On a `--ref` pin, `lock["tag"]` becomes the
  literal ref you passed — a branch name, not a release tag
  (`sync_wowsims.py:36`).
- That matters because `fetch_wowsimcli.py:45-48` builds
  `releases/download/{tag}/...` straight from `lock["tag"]`. On a branch ref it
  **404s** — so that fetch path is dead for us and needs replacing.
- The binary must therefore be **built from source**. Go `1.25.4` is
  installed and matches the fork's `toolchain` directive exactly, so the build
  is not the risk; provenance is. Committed sim numbers would trace to a local
  build, and `fetch_wowsimcli.py`'s provenance story needs an answer — pin the
  built binary's sha256 in the lockfile, or record the build command and commit
  as the provenance.
- `watchedRefs` still records `33970a8` (2026-08-12) while the branch HEAD was
  `cbf6b75` (re-confirmed 2026-08-20) — re-resolve at execution time rather
  than trusting the recorded sha.

## Acceptance

- [x] Option chosen: **track `feature/backend-reforge`** (v0.0.115 + 54 reforge
      commits), 2026-08-20, because the reforge work is wanted and a from-source
      binary is an accepted cost. Not chosen on ancestry — the pin is an
      ancestor of both candidates and `behind_by: 0` distinguishes nothing.
- [ ] The from-source binary's provenance settled and recorded — how a future
      reader reproduces or verifies the binary the committed sim numbers came
      from. **Now in scope**, since the branch route was chosen: pin the built
      binary's sha256 in the lockfile, or record the build commit and exact
      command. `fetch_wowsimcli.py` cannot fetch it (404 on a branch), so
      whatever replaces that path needs writing down.
- [ ] **`data/wowsims.lock.json` moved to the chosen ref.** On the branch
      route, re-resolve the branch HEAD at execution time rather than trusting
      the stale `watchedRefs` sha (`33970a8`, 2026-08-12; HEAD was `cbf6b75` on
      2026-08-20):

      ```
      python scripts/sync_wowsims.py --update --ref feature/backend-reforge
      ```

      On a `--ref` pin, `lock["tag"]` becomes the literal ref — a branch name,
      not a release tag. `sync_wowsims.py:36` warns to read it back and check
      before assuming it names a tag; anything keying off `tag` needs
      re-reading, including `fetch_wowsimcli.py:45-48`, which builds a release
      URL from it and will 404 on a branch.
- [ ] **The watch is reconciled with the pin.** We now build from
      `feature/backend-reforge`, so keeping it in `watchedRefs` means watching the
      thing we build from, which is not what a watch is for
      (`sync_wowsims.py:41` — "a branch we build from the tag but want to know
      about if it moves"). Either drop the `watchedRefs` entry, or repoint the
      watch at whatever we are now *not* building from (`master`, so a future
      divergence is visible). Record which and why.
- [ ] `data/proto/`, the wowsimcli binary and `data/wowsims-fork.lock.json` all
      move **with** the main pin, and the working tree matches `HEAD` after
      regenerating every committed artifact.
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
