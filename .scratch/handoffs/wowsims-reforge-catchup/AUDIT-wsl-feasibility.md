# Audit: should the fork build move to WSL?

Read-only investigation, 2026-09-10. No repo file changed except this one. Every
number below came from a command named beside it; re-run any of them to check.

**Headline:** do not move to WSL. `/mnt/c` is 75x slower for the fork's git
operations, and the real defect is not the operating system — it is GNU Make
3.81, which silently computed an **empty** source list for the build we
believed had succeeded. A modern make on Windows fixes the actual bug for a
one-line install.

---

## 1. What WSL setup already exists

### Distros

`wsl --status` / `wsl --list --verbose`:

| Name | State | Version | Notes |
| --- | --- | --- | --- |
| **Ubuntu-22.04** | Running | 2 | **default distro**, the live one |
| Ubuntu | Stopped | 2 | near-empty, stale (last touched Nov 2025) |
| docker-desktop | Stopped | 2 | Docker Desktop's backing distro |
| docker-desktop-data | Stopped | 2 | Docker Desktop's backing distro |

The `~daniel` folder the owner remembers is **`/home/daniel` in Ubuntu-22.04**.
The second `Ubuntu` distro also has a `/home/daniel`, but it holds only a
`dev/` directory and default dotfiles, `whoami` there returns `root`, and
nothing has been touched since 2025-11-20. Treat Ubuntu-22.04 as the only real
environment.

### What lives in /home/daniel (Ubuntu-22.04)

Projects under `~/Code`:

- `~/Code/lulz/devflow` — active, last touched 2026-09-09
- `~/Code/lulz/_orchestration` — active, 2026-09-09
- `~/Code/lulz/mortgage-calculator` — 2026-09-06
- `~/Code/Cx` — empty

`~/Code/lulz` is a *parallel* tree to this project's Windows
`C:\Users\dgree\Code\lulz`. This project (`tbc-gear-prio`) is **not** in WSL.

### Toolchain installed (all versions read from `--version`)

| Tool | WSL Ubuntu-22.04 | Needed by fork | Verdict |
| --- | --- | --- | --- |
| node | 22.23.2 (nvm) | `.nvmrc` 22.17.1, `engines: >=22` | OK |
| npm | 10.9.8 | yes | OK |
| **make** | **GNU Make 4.3** | yes | OK — and this is the version Windows lacks |
| git | 2.34.1 | yes | OK |
| gzip | 1.10 | `make wasm` gzips lib.wasm | OK |
| jq | 1.6 | FreeBSD branch only | OK |
| python3 | 3.10.12 | this repo's gates | OK |
| curl | 7.81.0 | listfile download | OK |
| bun | 1.4.2 | not used by fork | — |
| pnpm | via corepack (not yet downloaded) | this repo | needs one fetch |
| **go** | **MISSING** | **required** — wasm + devserver + codegen | **install delta** |
| **protoc** | **MISSING** | **required** — `make proto` | **install delta** |
| **protoc-gen-go** | **MISSING** | **required** — `make proto` | **install delta** |
| **air** | MISSING | only for `WATCH=1` live reload | optional |
| **zip** | MISSING | only `make release` | optional |

**Install delta to build the fork in WSL: go, protoc, protoc-gen-go** (plus
`air`/`zip` if live-reload or release packaging is wanted). Note the makefile
already carries a warning about exactly this path — it explicitly guards
against "Ubuntu/WSL's protobuf-compiler" shipping a `descriptor.proto` whose
`go_package` points at the deprecated `github.com/golang/protobuf`. So the
apt-installed protoc is a known trap; the makefile pins around it, but
`protoc-gen-go` must come from
`go install google.golang.org/protobuf/cmd/protoc-gen-go@latest`, not apt.

### The reusable setup pattern

There is a real, consistent pattern, and it is worth matching:

- **nvm** for node (`~/.nvm`, sourced from `.bashrc`), single version 22.23.2.
- **`~/.bashrc.d/*.sh`** drop-in directory, sourced by a loop at the end of
  `.bashrc` under a `# --- dgree: local bits ---` marker. Currently holds
  `t3.sh` with aliases (`verify='pnpm verify'`, `gwt`, `lulz`, `cx`, `here`,
  `vs`) and a `w()` jump function.
- **`~/.local/bin`** on PATH, holding hand-rolled tools: `bring`, `claude`,
  `t3-dispatch`, `t3up`, `work`.
- **`~/.config/devflow/repos.json`** and `~/.config/bring/excludes` — config
  for those tools.
- **Windows config symlinked in**: `~/.aws` and `~/.azure` point at
  `/mnt/c/Users/dgree/...`.
- `/etc/wsl.conf` sets `systemd=true`, `[automount] options = metadata`, and
  `appendWindowsPath = true`.

No dotfiles *repo* and no setup script — the pattern is a convention, applied
by hand. `.bash_history` shows the bootstrap was one apt line:
`build-essential git curl jq unzip rsync dbus python3 python3-venv python3-pip
python-is-python3 wslu`.

---

## 2. The move assessment

### 2a. The /mnt/c crossing — measured, not assumed

The same command, same repository, two sides:

| Command | From Windows | From WSL over `/mnt/c` | Ratio |
| --- | --- | --- | --- |
| `git status --porcelain` on the fork | **0.4 s** | **30.1 s** | **75x** |
| walk `ui/` (812 files) | 0.1 s | 0.95 s | ~9x |

Commands (re-runnable):

```
# Windows
git -C C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork status --porcelain

# WSL
wsl -d Ubuntu-22.04 -- bash -lc 'time git -C /mnt/c/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork status --porcelain'
```

The mount is 9p (`aname=drvfs`, `cache=0x5`, `msize=65536`). 30 seconds for a
single `git status` is not a build; it is the *cheapest* git operation. A
`make host` walks `ui/` three times over (`TS_CORE_SRC`, `UI_SRC`,
`ASSETS_INPUT`), then runs `tsc --noEmit`, vite, and a Go wasm compile — every
one of them stat-heavy. `node_modules` is already present on the Windows side
and would be traversed across the same boundary.

Scale of what would cross it (`du -sh` on the fork root): **1.9 GB total, of
which `node_modules` is 431 MB**. That is also the size of any copy into the
WSL filesystem, and the 431 MB is the part a relocated clone would have to
re-install rather than move.

**Verdict: building the fork from `/mnt/c` is not viable.** Not "slow but
workable" — a 30-second `git status` makes the fork-pin gates alone
intolerable, before any compilation starts.

### 2b. So it would have to be cloned inside WSL — and that is the expensive part

Moving the clone to `~/Code/...` inside the WSL filesystem breaks this repo's
gates, because they resolve the fork by a **hard-coded relative path**.
`scripts/_fork_gate.py`:

```python
ROOT = Path(__file__).resolve().parent.parent
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
LOCK_PATH = ROOT / "data/wowsims-fork.lock.json"
```

Six checks in `pnpm verify` read the fork through that constant, each
re-declaring it themselves:

`check_engine_port_drift.py`, `check_ep_presets.py`,
`check_equip_eligibility.py`, `check_layout_gate.py`,
`check_meta_conditions.py`, `check_sim_implemented_effects.py`
(plus `fetch_wowsimcli.py`, `generate_sim_implemented_effects.py`,
`sync_fork_universes.py`, `list_phase_pool.py` outside verify).

**Would `pnpm verify` still pass on the Windows side if the fork moved into
WSL?** Yes — but only by going *blind*, which is the dangerous answer. Every
one of the six is written to **skip cleanly (exit 0)** when
`vendor/tbc-new-fork` is absent, because `vendor/` is gitignored and CI never
has a fork. So moving the clone out converts six live gates into six no-ops
and `pnpm verify` still reports green. That is precisely the
"an exit code is not evidence" failure the repo already legislates against, at
gate scale.

The workarounds are all bad:

- A WSL→Windows symlink at `vendor/tbc-new-fork` puts the reads right back
  across 9p (worse: reads from Windows into `\\wsl$\` are slower still).
- Two clones (one per side) means two HEADs against one pin, and
  `require_pinned_fork` compares clone HEAD to
  `data/wowsims-fork.lock.json`'s `commit` — they would drift the moment
  either side commits.
- Running `pnpm verify` itself inside WSL means installing this repo's whole
  Python + node toolchain there and reading *this* repo across `/mnt/c`,
  inheriting the same 75x penalty.

**And the risk is not recoverable.** `data/wowsims-fork.lock.json` records
`"pushed": false`. The clone at
`vendor/tbc-new-fork` is on `feat/upgrades-tab` at
`ab59127d9faad30cdd4190b5f7e6780e34405822`, an **unpushed merge commit that
exists on exactly one machine**. Any move is a copy of the only extant copy.
If a move is ever done, push the fork branch to the personal remote **first**
(a deliberate act the plan gates behind an explicit ask), so the work stops
being single-copy before it is relocated.

**Verdict: moving the fork into WSL is not worth it, and would silently
disarm six gates.**

### 2c. The cheaper option — and it fixes a real bug, not just ergonomics

Everything the fork needs is **already installed on Windows**:

| Tool | Windows path |
| --- | --- |
| go | `C:\Program Files\Go\bin\go` |
| protoc | winget `Google.Protobuf` package bin |
| protoc-gen-go | `C:\Users\dgree\go\bin\protoc-gen-go` |
| node / npm / npx | fnm shim, v22 |
| find, realpath, uname, awk, sed, grep, touch, cp, gzip | Git Bash `/usr/bin` |

The **only** gap is `make`. And the ancient GnuWin32 make is not merely
awkward — it produces a build that looks fine and is not.

Dry-run under GnuWin32 GNU Make 3.81, with the fork as cwd:

```
$ make -n -p host
File not found - *.ts
FIND: Parameter format not correct
File not found - *.ts
...
TS_CORE_SRC :=
UI_SRC :=
ASSETS_INPUT :=
SHELL = C:/Program Files/Git/usr/bin/sh.exe
```

Read that carefully. `SHELL` *is* Git Bash's `sh.exe`, yet `$(shell find ...)`
still invoked Windows' `FIND.EXE` — make 3.81 does not route `$(shell ...)`
through its own `SHELL` on Windows. The three `find`-derived variables came
back **empty**. Run the same expressions in Git Bash directly and they work:

```
$ /usr/bin/find ui/core -name '*.ts' -type f | wc -l      # 176
$ /usr/bin/find ui -name '*.ts' -o -name '*.tsx' -o -name '*.scss' -o -name '*.html' | wc -l   # 506
$ /usr/bin/find assets/ -type f | wc -l                   # 89
```

So `TS_CORE_SRC` should be 176 files, `UI_SRC` 506, `ASSETS_INPUT` 89 — and
make 3.81 saw zero of each. Consequences:

- `$(OUT_DIR)/bundle/.dirstamp` has **no TypeScript sources** as
  prerequisites. Edit any `.ts` and make considers the bundle up to date.
- `ASSETS` expands to nothing, so the `$(OUT_DIR)/assets/%: assets/%` copy
  rule has no instances — assets are never refreshed.
- `ui/core/index.ts`'s recipe pipes that same broken `find` into awk, so the
  generated barrel file would be emptied if the rule ever fired.

`dist/tbc/.dirstamp` and `dist/tbc/bundle/.dirstamp` both exist (timestamped
2026-09-10 08:58), so make now believes the tree is built. **The build that
"worked" is a build with dead dependency tracking.** It will not rebuild on
source changes.

**The fix**: winget offers a modern GNU make.

```
winget search make --source winget
  ezwinports: make    ezwinports.make    4.4.1
  GnuWin32: Make      GnuWin32.Make      3.81
```

`ezwinports.make` is **GNU Make 4.4.1**, which does honour `SHELL` for
`$(shell ...)`. Install it, and remove `C:\Program Files (x86)\GnuWin32\bin`
from PATH so its `find.exe` stops shadowing things.

**Verdict: the cheap option is the right option, and it is not a 90% solution
— it is a better outcome than WSL for this repo**, because it keeps the fork,
the pin, and all six gates on one filesystem at native speed.

*Untested*: whether make 4.4.1 drives `make host` end-to-end to a working
server. Only the 3.81 dry-run was measured. Verify with
`make -n -p host | grep -E '^(TS_CORE_SRC|UI_SRC|ASSETS_INPUT) '` — those three
must be non-empty — then a real `npm run build`.

---

## 3. Drafted AGENTS.md edits (for approval — not applied)

The repo requires owner approval before `AGENTS.md` edits. Both drafts below
are ready to paste.

### (a) Piped exit codes

**Where:** `AGENTS.md` line 69, in `### Durable claims`. Append to the
existing **"An exit code is not evidence that work happened"** paragraph
rather than starting a new one — same subject, and co-locating keeps the two
failure modes together. The existing line covers an *honest* exit code that
proves too little; this covers a *false* one.

**Exact replacement for line 69:**

```markdown
**An exit code is not evidence that work happened.** A stopped background task reports exit 0, and a command that ran in the wrong directory succeeds at nothing. Confirm the artifact — `ls node_modules`, read the file, check the row count — before reporting an install, build or regen as done. A pipe reports the **last** command's status, so `cmd 2>&1 | tail` returns `tail`'s 0 and hides `cmd`'s failure; read `${PIPESTATUS[0]}` in Bash, or drop the pipe and bound the output another way.
```

Rationale against the `writing-for-agents` criteria: it is not a no-op (the
default behaviour is to trust the visible code — this repo already reported a
false "build succeeded" from exactly this shape); it states the positive move
(`PIPESTATUS[0]`) rather than banning pipes; it co-locates with the meaning it
extends instead of adding a rung to the hierarchy; and it names the concrete
shape `cmd 2>&1 | tail`, which is the one the repo's own "bound scaling
command output" line two paragraphs above actively encourages.

### (b) Known-traps trigger list

**Where:** `AGENTS.md` line 87 (the `**Before**` line in `### CLI
environment`).

**Current:**

```markdown
**Before** a ported-engine-file edit, a scripted/generated file edit, filing a ticket, writing a review Disposition table, or starting the dev servers — or when a node/pnpm command fails strangely — read [`docs/agents/known-traps.md`](docs/agents/known-traps.md): the trap each of those actions arms, and the move that disarms it.
```

**Exact replacement:**

```markdown
**Before** a ported-engine-file edit, a scripted/generated file edit, moving the wowsims engine pin, filing a ticket, writing a review Disposition table, or starting the dev servers — or when a node/pnpm command fails strangely — read [`docs/agents/known-traps.md`](docs/agents/known-traps.md): the trap each of those actions arms, and the move that disarms it.
```

The single insertion is `moving the wowsims engine pin, ` after the
scripted/generated file edit trigger. It is one more branch on an existing
pointer, front-loaded on the verb, adding no new identity the body does not
already carry.

**Precondition before (b) lands:** `docs/agents/known-traps.md` must actually
gain a pin-moving trap section. A pointer to material that is not there is
worse than no pointer — it spends context on every turn and pays back nothing.
Write the trap first, then add the trigger.

---

## RECOMMENDATION

**Do first — install a modern make on Windows.**

```
winget install ezwinports.make
```

Then remove `C:\Program Files (x86)\GnuWin32\bin` from PATH (its `find.exe`
shadows things beyond this project), and confirm the fix with
`make -n -p host | grep -E '^(TS_CORE_SRC|UI_SRC|ASSETS_INPUT) '` — all three
must list files. **Cost: one install and a PATH edit.** This is the highest
priority item here, because it is not an ergonomics upgrade — the current
build has silently dead dependency tracking, so `npm run build` is not
rebuilding on source changes.

**Do second — treat the existing `dist/` as suspect.** It was produced by make
3.81 with empty source lists. Run `make clean` (or delete `dist/`,
`binary_dist/`, and the `.dirstamp` files) and rebuild once under make 4.4.1,
so the tree matches the sources.

**Do third — push the fork branch.** Independent of any of this,
`"pushed": false` plus an unpushed merge commit on one machine is the real
standing risk in this picture. That is an explicit owner decision the plan
already gates; this audit only notes that every other option here is made
safer by it.

**Do NOT bother with:**

- **Moving the fork into WSL.** 75x slower over `/mnt/c` if left in place;
  and if relocated into the WSL filesystem, it silently converts six
  `pnpm verify` gates into skips that still exit 0, while duplicating a
  single-copy unpushed branch. The install delta (go, protoc, protoc-gen-go)
  is real work on top of that, and the makefile itself warns that WSL's apt
  protoc ships a broken `descriptor.proto` mapping.
- **The second `Ubuntu` distro.** Stale since 2025-11, near-empty. If tidying
  ever comes up it is a candidate for removal, but it is not in the way.

**Keep WSL for what it is already doing.** Ubuntu-22.04 is a working,
well-organised environment for `devflow` and `_orchestration` in
`~/Code/lulz`, with a clean convention (nvm, `~/.bashrc.d/*.sh` drop-ins,
`~/.local/bin` tools). Nothing here argues against it — it argues that
`tbc-gear-prio`, whose gates are anchored to `vendor/tbc-new-fork` by a
relative path, is the wrong project to drag across the boundary.
