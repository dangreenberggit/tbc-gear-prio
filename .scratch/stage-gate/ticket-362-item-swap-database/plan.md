# Plan — ticket-362-item-swap-database

## Goal

Pressing Run on the Upgrades tab of `/tbc/shaman/enhancement/` (item swap on by the page's shipped default, naming unworn item 30832) completes a ranking and lands rows instead of aborting with `No item with id: 30832`. Every request the tab composes — baseline, per-candidate, and bulk-screen — carries item-database rows for the page's item-swap gear, the way upstream's own Simulate button does. The ret page still ranks (467 eligible, rows land). A core test pins the engine contracts the fix relies on. Ticket 362's ours-half is closed with evidence and the fork's panic-instead-of-error is filed as its own ticket.

## Approach

**Route: adapter only. No ported engine file changes.** Settled by reading the code, not by assumption:

- The engine's `composeFor` (fork `upgrades/engine/rank.ts:491`, core `packages/core/src/rank.ts:683`) calls `deps.simDatabaseFor?.(forEquipment)` and writes whatever comes back into the request verbatim; `compose.ts:48` sets `slot.database` and touches nothing else on the player. The bulk path `composeForBulk` (fork `rank.ts:527-556`) calls the same resolver per gear set and unions rows by `JSON.stringify` identity. So the engine never needs to know about item swap: a resolver that returns `(worn ∪ candidate) ∪ swap` rows satisfies every call site with the existing one-array signature.
- The resolver is wired in one place: `upgrades_tab.tsx:1252` (`simDatabaseFor,`), inside a method that already has `this.simUI.player` (lines 985, 1006, 1189, 1224). The swap gear is `player.itemSwapSettings.getGear()` (`item_swap_picker.tsx:65`), an `ItemSwapGear extends BaseGear` (`gear.ts:442`) which inherits `toDatabase(db)` (`gear.ts:145`). Upstream's own invariant is literally `Database.mergeSimDatabases(gear.toDatabase(db), itemSwapSettings.getGear().toDatabase(db))` (`player.tsx:1431-1435`).

So the fix is: turn `adapters/sim_database.ts`'s bare function into a factory that closes over the player and merges the swap gear's database into every result; the tab passes `simDatabaseResolverFor(this.simUI.player)`. `adapters/` is outside `engine/`, so E-W3 and the `PROVENANCE.md` sha row are not armed (`check_engine_port_drift.py:54` hashes only `.../upgrades/engine`). What *is* still owed, per `known-traps.md` line 66 ("A fork commit that touches nothing ported still needs steps 3–5"): a fork commit, re-pinning `data/wowsims-fork.lock.json` plus `pnpm sim-implemented-effects:generate`, and `pnpm verify`. Price: one adapter file, one line in the tab, one core test, one fork commit, one re-pin.

**Strongest rejected alternative: put the union in the engine** (have `composeFor` read `raidSimSkeleton.raid.parties[0].players[0].itemSwap.items`, convert to `SimItemSpec`, and hand `[...forEquipment, ...swapSpecs]` to the resolver). Same one-array signature, and it would let the regression test go red against product code. It lost because (a) any edit to `engine/rank.ts` — even this — arms E-W3 + PROVENANCE, and both engine copies must change and be kept in step; (b) handing a flat union with two same-slot items to `lookupEquipmentSpec` fails with "No slots left to equip" (the fork's own comment at `rank.ts:523-526`), so the engine route would also need a second resolver call and a merge — reimplementing `Player.toDatabase` inside a proto-unaware engine; (c) the owner asked for proportionate. The adapter route is upstream's path, exactly.

**Honesty about the test.** With the engine untouched, no core test can go red on this bug: the broken code is the fork adapter, and the fork has no JS test runner (its `package.json` `test:*` scripts are `test:locales` and `test:layout` only; `find vendor/tbc-new-fork/ui -name '*.test.ts'` is empty). The core test therefore pins the two engine contracts the fix depends on — (1) `compose` preserves the skeleton's `itemSwap` on the player, (2) the resolver's rows reach every request including the baseline — and will pass on first run. The product-code proof is the browser check in step 4. The plan says this so the executor does not manufacture a red.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | The engine calls the resolver with exactly one argument (the equipment array) and writes its return verbatim into `player.database`; nothing else consumes the result. | yes | `grep -n "simDatabaseFor" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts packages/core/src/rank.ts` → fork 170/491/530/533, core 150/683; `grep -n "slot.database" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/compose.ts` → line 48 (planner ran both) |
| C2 | The bulk-screen path unions per-gear resolver results by row identity, so swap rows returned for every gear set dedupe rather than duplicate. | no | `sed -n 527,556p vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` (planner ran) |
| C3 | The resolver is wired at a single site that has the player in scope. | yes | `grep -n "simDatabaseFor\|this.simUI.player" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` → import line 20, wiring 1252, player at 985/1006/1189/1224 (planner ran) |
| C4 | `ItemSwapGear` inherits `toDatabase(db)` from `BaseGear`, and upstream's `Player.toDatabase` is `mergeSimDatabases(gear.toDatabase, itemSwapGear.toDatabase)`, unconditional on `enableItemSwap`. | yes | `grep -n "class ItemSwapGear\|toDatabase(db: Database)" vendor/tbc-new-fork/ui/core/proto_utils/gear.ts` → 442, 145; `sed -n 1431,1435p vendor/tbc-new-fork/ui/core/player.tsx` (planner ran) |
| C5 | `adapters/` is not hashed by the engine-port-drift gate; only `upgrades/engine/` is. | yes | `grep -n "upgrades/engine" scripts/check_engine_port_drift.py` → line 54 is the only hashed dir; `grep -c "adapters/" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md` → 0 rows for adapters (planner ran the first; second is `hypothesis, untested` — executor runs it in step 2) |
| C6 | The skeleton the tab captures already carries `player.itemSwap` and a `player.database` that includes swap rows; `compose` then overwrites `database` with the resolver's (swap-less) rows, which is the exact mechanism of the panic. | yes | `sed -n 27,33p .../upgrades/adapters/skeleton.ts` (calls `makeRaidSimRequest(false)`); `sed -n 1443,1454p vendor/tbc-new-fork/ui/core/player.tsx` (`database: forExport ? undefined : this.toDatabase()`, `itemSwap: ...toProto()`); `compose.ts:48` (planner ran all three) |
| C7 | Enhancement is the only page whose shipped default turns item swap on; feral cat, shadow priest and warlock expose `itemSwapSlots` with `itemSwaps: []` (user arms by hand); the other `itemSwapSlots` pages have no default swap either. | yes | `grep -rn "itemSwap" vendor/tbc-new-fork/ui/*/*/sim.ts` → only `shaman/enhancement/sim.ts:96` sets `itemSwap:` (planner ran) |
| C8 | The default swap names item 30832 with enchant 2669, and a second item 27901. | no | `grep -n '"id"' vendor/tbc-new-fork/ui/shaman/enhancement/gear_sets/p1.truncheon.itemswap.json` → lines 17–18 (planner ran) |
| C9 | The fork panics rather than errors on an unknown id, reached from `enableItemSwap` → `toItem` → `NewItem`. | no | `sed -n 484,490p vendor/tbc-new-fork/sim/core/database.go` shows `panic(fmt.Sprintf("No item with id: %d", ...))`; `sed -n 50,57p vendor/tbc-new-fork/sim/core/item_swaps.go` (planner ran) |
| C10 | The browser wasm is built without `with_db`, which is why only the browser reproduces. | no | `hypothesis, untested` by the planner — ticket 212 and `adapters/sim_database.ts:4-9` assert it; executor may confirm with `grep -n "with_db" vendor/tbc-new-fork/makefile` |
| C11 | The fork has no JS unit-test runner, so the adapter cannot be unit-tested in place. | yes | `grep -n '"test' vendor/tbc-new-fork/package.json` → only `test:locales`, `test:layout`; `find vendor/tbc-new-fork/ui -name '*.test.ts' -o -name '*.spec.ts'` → empty (planner ran) |
| C12 | The fork clone is clean at `3829c66f6`, which is the commit `data/wowsims-fork.lock.json` pins. | yes | `git -C vendor/tbc-new-fork status --porcelain` → empty; `git -C vendor/tbc-new-fork rev-parse --short HEAD` → `3829c66f6`; `grep commit data/wowsims-fork.lock.json` (planner ran) |
| C13 | Repo working tree at plan time: branch `feat/reforge-catchup-leftovers`, HEAD `dc72da13`, with pre-existing ` M .gitignore` and untracked `.scratch/stage-gate/ticket-362-*`, `.scratch/stage-gate/ticket-365-*`, and two `.scratch/handoffs/wowsims-reforge-catchup/*` files that are not this plan's. | yes | `git -C C:/Users/dgree/Code/lulz/tbc-gear-prio status --porcelain` (planner ran) |
| C14 | `NEXT` holds `366`; highest ticket on disk is 365. | no | `cat .scratch/carry-forward/issues/NEXT`; `ls .scratch/carry-forward/issues \| sort -n \| tail -1` (planner ran) |
| C15 | The core test fixture skeleton is `data/presets/ret/p2.raid-sim-skeleton.json`, loaded at `packages/core/test/rank.test.ts:85`; the 212 test at line 4203 shows the capture-`sent`-requests pattern to copy. | no | `sed -n 85,87p packages/core/test/rank.test.ts`; `sed -n 4203,4314p` same file (planner ran) |
| C16 | `make dist/tbc/.dirstamp` with GNU Make 4.4.1 rebuilds `dist/tbc/index.html` and the bundle; the 3.81 on PATH builds nothing and exits 0. | yes | Ticket 362 § "Build and run evidence" records the 4.4.1 run; `hypothesis, untested` by the planner this session — step 3's acceptance re-measures it |
| C17 | The ret page has no item swap configured, so its swap database is empty and its requests are unchanged by this fix. | yes | `grep -c "itemSwap" vendor/tbc-new-fork/ui/paladin/retribution/sim.ts` → 0 (planner ran: file absent from the C7 grep output) |
| C18 | Ticket 365's parallel mini-loop writes under `packages/core/test/` (a captured fixture) and does not commit to the fork or move the lock file. | no | `hypothesis, untested` — from its brief `§ What done looks like`; the sequencing note in Paths manifest covers the case where it is wrong |

## Steps

Run every `pnpm`/`node`/`npx`/`python`/`make` command from **Bash**, never PowerShell. Git Bash prints an `fnm env` error on stderr that breaks `&&` chains and heredocs: use `git -C <dir>`, `pnpm -C <dir>`, write real script files, and never chain with `&&`. Append `; echo "rc=$?"` (or `rc=${PIPESTATUS[0]}` after a pipe) and read the artifact, not the status.

### Step 1 — Core test pinning the engine contracts (C1, C6, C15)

File: `C:\Users\dgree\Code\lulz\tbc-gear-prio\packages\core\test\rank.test.ts`. Add a new `it(...)` inside the existing `describe("rankUpgrades — simDatabaseFor (ticket 212)")` block (starts line 4203), titled along the lines of `"carries item-swap rows from the resolver into every request (ticket 362)"`. Copy the 212 test's shape (recorded runner with `keyFor`, capturing `sent`). Differences:

- Clone the ret skeleton and set `raid.parties[0].players[0].itemSwap = { items: [{ id: 30832, enchant: 2669 }] }` and `enableItemSwap: true`. Vacuity guard: assert 30832 is not in `equipment` and is not the candidate.
- The resolver models the adapter: `equipment => ({ items: [...equipment rows..., { id: 30832, marker: "db-30832" }] })` — i.e. worn/candidate rows plus the swap row, unconditionally.
- Assert on every captured request: `player.itemSwap.items[0].id === 30832` (compose preserved it) and `player.database.items.some(it => it.id === 30832)` (the resolver's swap row reached the baseline request as well as the candidate's). Keep the 212 assertions that the baseline does not name the candidate.

Add a short comment above the test saying it pins the contracts the fork adapter relies on and cannot go red on the adapter itself (C11) — so a future reader does not "fix" it into a red.

Acceptance: `pnpm -C C:/Users/dgree/Code/lulz/tbc-gear-prio exec vitest run packages/core/test/rank.test.ts -t "ticket 362" > "$SCRATCH/step1.log" 2>&1; echo "rc=$?"` → rc=0 and the log shows the new test passing (`grep -c "✓\|passed" ...` ≥ 1, and `grep -c "362" ...` ≥ 1). Commit: `Pin the engine contracts the item-swap database fix relies on`.

### Step 2 — Adapter: merge swap gear into every resolver result (C1, C2, C3, C4, C5)

File: `C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork\ui\core\components\individual_sim_ui\upgrades\adapters\sim_database.ts`.

Replace the exported bare function with a factory, keeping the resolver's shape `(equipment) => Readonly<Record<string, unknown>> | undefined`:

```ts
export function simDatabaseResolverFor(player: Player<any>): (equipment: readonly SimItemSpec[]) => Readonly<Record<string, unknown>> | undefined {
	return equipment => {
		const db = Database.getSync();
		const spec = EquipmentSpec.fromJson({ items: equipment.map(item => ({ ...item })) }, { ignoreUnknownFields: true });
		const gear = db.lookupEquipmentSpec(spec);
		const swap = player.itemSwapSettings.getGear().toDatabase(db);
		return SimDatabase.toJson(Database.mergeSimDatabases(gear.toDatabase(db), swap)) as Readonly<Record<string, unknown>>;
	};
}
```

Import `Player` from `../../../../player.js` (type import). Merge order worn-then-swap, unconditional on `getEnableItemSwap()` — both mirror `Player.toDatabase` (C4); say so in the doc comment, and extend the file's header with one paragraph on why swap rows are here (ticket 362: the skeleton's own database already carried them and `compose` replaces it — C6). Comments explain why, not what.

File: `C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork\ui\core\components\individual_sim_ui\upgrades_tab.tsx` — line 20 import becomes `simDatabaseResolverFor`; line 1252 becomes `simDatabaseFor: simDatabaseResolverFor(this.simUI.player),`.

Acceptance:
- `grep -rn "simDatabaseFor\b" vendor/tbc-new-fork/ui --include=*.ts --include=*.tsx` shows only the engine's `Deps` field/call sites and the tab's `simDatabaseFor:` key — no remaining import of the old bare symbol.
- Fork typecheck green: find the fork's tsc invocation with `grep -n "tsc" vendor/tbc-new-fork/package.json vendor/tbc-new-fork/makefile` and run it from Bash redirected to a log; rc=0 and `grep -c "error TS" log` → 0. (Exact invocation is `hypothesis, untested`; ticket 362 says `tsc --noEmit` was run for fork commit `ab59127d`.)
- `python scripts/check_engine_port_drift.py; echo "rc=$?"` → rc=0 (C5: nothing under `engine/` moved).

No commit yet in the main repo; the fork commit is step 5.

### Step 3 — Build the tab (C16)

From Bash: `"/c/Users/dgree/AppData/Local/Microsoft/WinGet/Packages/ezwinports.make_Microsoft.Winget.Source_8wekyb3d8bbwe/bin/make.exe" --version` must print 4.4.1 first. Then `"<same>/make.exe" -C C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork dist/tbc/.dirstamp > "$SCRATCH/make.log" 2>&1; echo "rc=$?"`.

Acceptance: rc=0; `grep -c "built in" "$SCRATCH/make.log"` ≥ 1; `grep -ci "error" "$SCRATCH/make.log"` → 0; `ls -l --time-style=full-iso vendor/tbc-new-fork/dist/tbc/index.html` shows a timestamp after the make started; `grep -rl "simDatabaseResolverFor\|itemSwapSettings" vendor/tbc-new-fork/dist/tbc/bundle/ | head -3` is non-empty (the new adapter is in the shipped bundle; a minifier may rename the function, so accept either string). Do **not** run `make host` (hands off to `air`, never exits).

### Step 4 — Browser confirmation: enhancement, ret, one hand-armed page (C7, C8, C17)

Serve: write `$SCRATCH/serve.sh` containing `python -m http.server 8099 --directory C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork/dist` and run it with `run_in_background: true`. Confirm with `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8099/tbc/shaman/enhancement/` → 200.

Use the browser tools (`navigate`, `find`, `computer`, `read_page`, `read_console_messages`):

1. `http://127.0.0.1:8099/tbc/shaman/enhancement/` → Upgrades tab → Run. Acceptance: no "Ranking failed" / "No item with id" text on the page (`find` for "Ranking failed" returns nothing); at least one ranked row lands (`Simming N/M` progresses and a row with an item name and a DPS delta appears); the "eligible items" count is 954 as before (a changed count would mean the fix touched pool composition, which it must not). Take one screenshot for the ticket record.
2. `http://127.0.0.1:8099/tbc/paladin/retribution/` → Upgrades tab → Run. Acceptance: header `Phase 3 (2.2 - T6) - Alpha`, 467 eligible items, rows land, no console errors — the same pre-registered values as ticket 362's table.
3. `http://127.0.0.1:8099/tbc/druid/feralcat/` (arms by hand — C7): in the page's Item Swap picker enable the swap and equip any unworn one-hand weapon or trinket in a swap slot, then Upgrades → Run. Acceptance: rows land, no "No item with id". Shadow priest and warlock share the identical code path (same `itemSwapSlots`-only config, same `Player.itemSwapSettings`) and are covered by C7; do not spend time on them unless feral cat fails.

Record the observed values (eligible counts, first row, any console error) in step 6's ticket update. Stop the server when done.

If enhancement still fails with a *different* id: that is a new finding — record it and stop; do not widen scope.

### Step 5 — Fork commit and re-pin (C5, C12)

1. `git -C vendor/tbc-new-fork status --porcelain` shows only `sim_database.ts` and `upgrades_tab.tsx` (dist is ignored there; if it is not, do not add it — report). Commit in the fork with `git -C vendor/tbc-new-fork commit -F <msgfile>`; subject like `Carry item-swap gear in the tab's per-request database`, body naming ticket 362 and the upstream invariant (`Player.toDatabase`).
2. `git -C vendor/tbc-new-fork rev-parse HEAD` → new sha. Edit `C:\Users\dgree\Code\lulz\tbc-gear-prio\data\wowsims-fork.lock.json` (Edit tool): `commit` to the new sha; extend `_comment`'s "As of 3829c66f" sentence to name the new tip and this adapter change. `branchedFrom` and `pushed: false` unchanged.
3. `pnpm -C C:/Users/dgree/Code/lulz/tbc-gear-prio sim-implemented-effects:generate > "$SCRATCH/gen.log" 2>&1; echo "rc=$?"` → rc=0; `git status --porcelain` shows the regenerated artifact(s) as modified (read the diff `--stat`; only pin-embedding changes expected).
4. `git status --porcelain` must show only: `data/wowsims-fork.lock.json`, the regenerated artifact(s), and the pre-existing items from C13 (` M .gitignore`, the untracked `.scratch/...` entries). If ` M .gitignore` is still present, **stop and report** — lint-staged sweeps every dirty tracked file into the commit, and that edit is not this plan's. Otherwise commit: `Re-pin the fork to carry item-swap gear per request`.

### Step 6 — Ticket 362 close-out and the fork-half ticket (C9, C14)

Files: `.scratch/carry-forward/issues/362-...md`, new `.scratch/carry-forward/issues/366-<slug>.md`, `.scratch/carry-forward/issues/NEXT`.

- 362: set `Status: closed`. Under a new `## Resolution` heading: the chosen option ("include item-swap items in the per-request item data", owner's call 2026-09-10, adapter route, reason the strip option lost — one sentence each, from the brief), the fork sha, the core test name, and step 4's observed values for the three pages. Tick the three Acceptance boxes. Under `## Comments`: the fork-half is split to 366.
- 366: `Status: open`, `Type: bug`, `Origin: .scratch/carry-forward/issues/362-...md`, `Blocks: none`, `Blocked by: none`. Title: the fork's `NewItem` panics instead of returning an error on an unknown id (`sim/core/database.go:485-490`, reached via `item_swaps.go:50-57`). Body: two paragraphs — what it is, and that it is upstream's (`wowsims/tbc-new`) code; owner named as the fork/upstream, not the tab; fixing it would turn a crash into a tidy failure and is out of this repo's scope until someone chooses to carry a fork patch. Do not fix it.
- `NEXT` → `367`, same commit.

Acceptance: `pnpm issues:open` lists 366 and not 362; `grep -c "^Status: closed" .scratch/carry-forward/issues/362-*.md` → 1; `cat .scratch/carry-forward/issues/NEXT` → 367. Commit: `Close 362 and file 366 for the fork's NewItem panic`.

### Step 7 — Verify (all)

`pnpm -C C:/Users/dgree/Code/lulz/tbc-gear-prio verify > "$SCRATCH/verify.log" 2>&1; echo "rc=$?"` → rc=0, and `tail -5 "$SCRATCH/verify.log"` shows the last gate passing (not a mid-chain failure). This is the last step; do not push, do not merge.

## Paths manifest

Repo root `C:\Users\dgree\Code\lulz\tbc-gear-prio`:

- `packages/core/test/rank.test.ts` — modify (step 1)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/sim_database.ts` — modify (step 2; fork commit, step 5)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` — modify (step 2; fork commit, step 5)
- `data/wowsims-fork.lock.json` — modify (step 5)
- whatever `pnpm sim-implemented-effects:generate` regenerates (step 5; read `git status` after the run rather than guessing the name)
- `.scratch/carry-forward/issues/362-upgrades-tab-enhancement-run-panics-on-an-item-swap-item.md` — modify (step 6)
- `.scratch/carry-forward/issues/366-<slug>.md` — create (step 6)
- `.scratch/carry-forward/issues/NEXT` — modify (step 6)
- `vendor/tbc-new-fork/dist/**` — build output only (step 3), gitignored, never committed

Not touched: `packages/core/src/rank.ts`, `vendor/tbc-new-fork/.../upgrades/engine/**`, `PROVENANCE.md`, any Go file, `.gitignore`, `.scratch/handoffs/**`.

No partition — single executor, serial. **Sequencing with ticket 365's mini-loop (C18):** both branches may touch `packages/core/test/`; if 365 also moves `data/wowsims-fork.lock.json` or commits to the fork clone, whichever lands second must re-run step 5 on top of the other's fork tip (`git -C vendor/tbc-new-fork log --oneline -3` before committing there).

## Verify recipe

```
pnpm -C C:/Users/dgree/Code/lulz/tbc-gear-prio exec vitest run packages/core/test/rank.test.ts -t "ticket 362"   # step 1 test green
python scripts/check_engine_port_drift.py; echo "rc=$?"                                                        # engine untouched → 0
"<winget path>/make.exe" -C vendor/tbc-new-fork dist/tbc/.dirstamp > make.log 2>&1; echo "rc=$?"               # 4.4.1, "built in", 0 errors
# browser: enhancement Run → rows, no "No item with id"; ret → 467 eligible, rows; feral cat hand-armed → rows
git -C vendor/tbc-new-fork rev-parse HEAD  ==  "commit" in data/wowsims-fork.lock.json
pnpm -C C:/Users/dgree/Code/lulz/tbc-gear-prio verify > verify.log 2>&1; echo "rc=$?"                         # 0
pnpm issues:open | grep -c "366"   # 1 ; grep -c "^Status: closed" .scratch/carry-forward/issues/362-*.md  # 1
```

## Out of scope

- Stripping item swap from the captured skeleton (rejected by the owner), and any user-facing error message as a substitute.
- Editing `upgrades/engine/rank.ts` (either copy), `compose.ts`, or `PROVENANCE.md`; widening `Deps.simDatabaseFor`'s signature.
- Fixing the fork's `NewItem` panic (filed as 366, owner: fork/upstream); editing any Go; moving the wowsims engine pin (`data/wowsims.lock.json`); re-measuring feral.
- Ticket 365 and its fixture; ticket 355 (pushing the fork branch — `pushed` stays `false`).
- Checking shadow priest and warlock in the browser unless feral cat fails (C7 covers them).
- `pre-merge-review`, `pnpm merge-to-dev`, any merge into `dev`, any push.
- Committing `.gitignore`, `.scratch/handoffs/wowsims-reforge-catchup/*`, or `vendor/tbc-new-fork/dist/**`.
