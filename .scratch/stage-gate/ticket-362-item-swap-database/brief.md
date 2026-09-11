# Brief — ticket 362, the item-swap panic

Mini-loop off `feat/reforge-catchup-leftovers`. Ticket:
`.scratch/carry-forward/issues/362-upgrades-tab-enhancement-run-panics-on-an-item-swap-item.md`
— read it in full; it has the traced mechanism. This brief settles the design
call and adds what the ticket does not carry.

## The bug in one paragraph

The browser sim's item catalogue starts **empty** — `lib.wasm` is built without
the `with_db` tag, so it knows nothing about any item until the request tells
it. Whoever builds the request must therefore attach stats for every item
involved. Upstream's own Simulate button attaches worn gear **plus** item-swap
gear (`Player.toDatabase()` merges `gear.toDatabase()` with
`itemSwapSettings.getGear().toDatabase()`). Our tab builds its own request and
attaches worn gear plus the candidate being tested — swap gear was never added.
So on the enhancement page, whose shipped default turns item swap on and names a
mace the character is not wearing, the engine hits an item it was never given
and dies. `wowsimcli` never reproduced it because the CLI **is** built
`with_db`, so its catalogue is already populated.

## The decision is made — do not re-open it

**Include the item-swap items in the per-request item data.** Owner's call,
2026-09-10. It restores an invariant upstream already holds rather than
inventing a rule, and it is the only option that leaves every number the tab
reports unchanged.

The rejected alternative — stripping item swap out of the captured settings —
was rejected because a configured swap is **not inert**: unequipped item
effects, stat offsets and set bonuses all apply at character construction.
Dropping it would silently move the baseline, every candidate's delta, and
possibly the row order, and would make the tab disagree with the Simulate
button on the same page with nothing on screen explaining why.

Do not implement the rejected option, and do not add a user-facing error
message as a substitute — the item is a legal enhancement one-hander, so the
honest message would amount to "we omitted an item," which is a bug report.

## What done looks like

- Pressing Run on the enhancement page's Upgrades tab completes a ranking and
  returns rows, with the swap configured as the page ships it.
- The three other pages that let a user arm item swap by hand — feral cat,
  shadow priest, warlock — do not break the same way. Check them rather than
  assuming; `grep -rn "itemSwap" vendor/tbc-new-fork/ui/*/*/sim.ts` is the
  starting point, and the ticket names `individual_sim_ui.tsx` as the place a
  page default forces the setting on.
- A regression test at the `rankUpgrades` interface with an item-swap set naming
  an unworn item, asserting the composed request carries item data for it.
  Ticket 362's own "What to do" section already specifies this.
- Ticket 362 updated: the ours-half closed with evidence, the fork-half
  (`NewItem` panicking instead of erroring) split out or explicitly left as a
  separate concern with its owner named.

## The trap that decides how this is implemented

`simDatabaseFor` is a `Deps` field on the engine's `RankInput`
(`upgrades/engine/rank.ts`), typed to take the equipment array. **Widening that
signature changes a ported engine file**, which arms the full five-step cycle in
`docs/agents/known-traps.md` § "Before editing a ported engine file" — E-W3
green first, then the `PROVENANCE.md` sha, a fork commit, re-pinning
`data/wowsims-fork.lock.json`, then `pnpm verify`. Both engine copies
(`packages/core/src/rank.ts` and the fork's) would need it, and they have
diverged in spelling before.

There may be a way to pass the union through the existing single-array
parameter, changing only the adapter — which would avoid the cycle entirely.
**Establish which is true before planning the edit**, and say so in the plan.
Neither route is forbidden; the point is to know which one you are on, because
one costs five extra steps and a re-pin.

## Constraints

- Bash and PowerShell share no state. Run `pnpm`/`node`/`npx`/`python` from
  **Bash**; PowerShell gives Node 20 and dies on `node:sqlite`.
- Git Bash prints an `fnm env` error on stderr that **breaks `&&` chains and
  heredocs**. Use `git -C` / `pnpm -C`, write real script files. This has cost
  this session five commands already.
- **Exit codes lie through pipes.** Append `; echo "rc=${PIPESTATUS[0]}"` or
  redirect to a file and read it separately. Confirm the artifact, not the
  status.
- `git add <paths>` does not scope a commit — pre-commit runs `lint-staged`
  against `*`. `git status` must be clean of work you did not do before each
  commit. Commit per green slice.
- Two untracked files under `.scratch/handoffs/wowsims-reforge-catchup/`
  predate this work. Leave them; do not sweep them into a commit.

## Verifying the fix for real

The tab is the thing that broke, so the tab is where the fix is confirmed.
Build with `make dist/tbc/.dirstamp` using GNU Make **4.4.1** at
`C:\Users\dgree\AppData\Local\Microsoft\WinGet\Packages\ezwinports.make_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\make.exe`
(the GnuWin32 3.81 on PATH silently resolves empty file lists and "succeeds"
having built nothing). `make host` hands off to `air` and never exits; the
`.dirstamp` target terminates. Then serve `vendor/tbc-new-fork/dist` and load
`/tbc/shaman/enhancement/`, press Run, and confirm rows come back.

The ret page at `/tbc/paladin/retribution/` was working before this change —
467 eligible items, header "Phase 3 (2.2 - T6) - Alpha". Re-check it after, so
the fix is not paid for with a regression somewhere it already worked.

## Out of scope

- The rejected fix, and any user-facing error message as a substitute.
- Ticket 365 (the dual-wield fixture) — a parallel mini-loop owns it.
- Fixing the fork's `NewItem` panic-instead-of-error. File or record it; it is
  upstream's, and fixing it would only turn the crash into a tidy failure.
- Moving the engine pin, editing fork Go, re-measuring feral.
- Ticket 355 (pushing the fork branch) — owner's call.
- `pnpm merge-to-dev`, `pre-merge-review`, any merge into `dev`.
