# Option: build on the wowsims app instead of beside it

> **SUPERSEDED (2026-08-04)** by [`README.md`](README.md),
> [`take-list.md`](take-list.md) and [`standalone-app.md`](standalone-app.md).
> Kept for the record.
>
> Two things in this document are wrong:
>
> 1. **§3 implies we rebuilt upstream's WCL importer.** We did not — we have
>    never written a live WCL client at all. `gear-source.ts` is 73 lines: an
>    interface plus a fixture replayer (`wc -l
packages/core/src/seams/gear-source.ts`). Their importer is the clearest
>    take-don't-build item we have, not duplicated work.
> 2. **§5's option table weighs "upstream drift" and licensing heavily.** Both
>    were ruled out of scope by the project owner, who is in direct contact with
>    the upstream maintainers. The live question is the **shell stack**, not
>    fork-vs-not.
>
> §4's four joints and §3's finding that upstream ships WCL credentials in the
> browser bundle both still hold.

Status: **superseded sketch.** Architectural joints only, no task list. Nothing
here is implemented; no existing file is changed by this document.

Upstream pin: `wowsims/tbc-new` @ `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`.

---

## 1. What we have on this branch today

Worth stating plainly, because it decides how much a fork would actually cost.

| Piece                                                         | State                                           |
| ------------------------------------------------------------- | ----------------------------------------------- |
| `packages/core` — `rankUpgrades` engine, 8 stages, ~3k lines  | **Built and working**                           |
| Three seams — `GearSource`, `SimRunner`, `Store`              | **Built**, with recorded adapters               |
| Pool/universe generation, gem solver, meta repair, statistics | **Built**                                       |
| CLI entry point (`cli.ts`) + `rank-report.ts` HTML            | **Built** — this is the current product surface |
| Web app (PLAN.md §12's three routes)                          | **Not built.** No `apps/` directory exists      |

So the engine is real and the **UI is the part that doesn't exist yet**. That is
precisely the part wowsims already has.

---

## 2. The two functionalities — one correction

Your framing was:

1. take WoW logs data to set up / autofill a gear baseline
2. ranked sorting of chosen-phase gear options

That is right, and it is the whole product. One correction on #2: it is not
_sorting_ in the list-view sense. Each candidate item is **individually simmed
against the player's actual gear** and ranked by measured DPS delta, with a
noise-floor cutoff. That distinction is the reason the engine exists at all — a
static EP sort would be a much smaller program, and would be the "faulty EP"
failure we already hit.

---

## 3. The finding that reframes this whole question

**wowsims already has both halves — and closer to ours than expected.**

- **Logs → gear.** `ui/raid/components/importers/raid_wcl_importer.tsx` (776
  lines) hits the same WCL v2 GraphQL API, pulls the same `CombatantInfo`
  events, and maps `gear[] → ItemSpec` including `permanentEnchant` and gem ids
  — the same route and the same enchant namespace our `GearSource` uses.
- **Multi-item comparison.** `ui/core/components/individual_sim_ui/bulk_tab.tsx`
  ("Bulk" tab) already sims many gear combinations and renders results, with
  slot freezing for rings/trinkets and a combinations counter.

**This also corrects something I told you earlier in this session.** I said WCL
credentials are what pin us to a server. Technically that is wrong: upstream
ships WCL **client credentials in the browser bundle** (`raid_wcl_importer.tsx`,
in the `getWCLBearerToken` method — a hardcoded `Basic` auth pair). So a
browser-only WCL fetch is demonstrably possible.

Whether we should copy that is a **separate, non-technical question**: those are
shared credentials against a rate-limited API, and a public clone spending
someone else's point budget is a different posture than a hobby tool. Treat
"credentials in the client" as upstream's choice, not as a validated pattern for
us.

---

## 4. What a fork actually is

The joints, in order of how much they'd cost.

**Joint A — the sim.** Free. Upstream's UI already talks to `WorkerInterface`,
backed by WASM in-browser or an HTTP sim server. Our `SimRunner` port has the
same shape. Nothing to reconcile.

**Joint B — logs → baseline gear.** Mostly free, but their importer targets a
**raid** (all 25 players, for raid-sim setup) and ours targets **one character's
most recent qualifying kill**. Same API, same events, different selection
policy. This is a rewrite of the _picking_ logic, not of the fetching.

**Joint C — ranked upgrades.** **This is the real work, and it is ours.** Their
Bulk tab answers "which of these combinations is best" — a combinatorial search
the user configures. We answer "what single item should I want tonight, against
my logged gear, ranked with a noise floor." Related, not the same. Everything
distinctive in `packages/core` lives here: candidate pools, the EP prefilter,
gem fill + meta repair per candidate, paired-replicate statistics, the cutoff,
`substitutions`/`assumptions`.

**Joint D — the shell.** Their UI is class-agnostic, i18n'd, hand-rolled TSX
with SCSS — not React, not Tailwind, not shadcn. PLAN.md §1.1 commits to
TanStack Start + Tailwind + shadcn. **These do not meet in the middle**; picking
their app means adopting their stack and conventions wholesale.

---

## 5. The three honest options

|                                                     | What it means                                                                                        | Main cost                                                                                | Main risk                                                                                              |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **A. Fork their app**                               | Clone the repo, add a tab/route that calls our ranking logic                                         | Adopt their stack (D); port `packages/core` into their build; live on their fork forever | Upstream drift. Our logic sits inside a large app we don't control, and every upstream pull is a merge |
| **B. Build our own shell** (PLAN.md §12 as written) | Keep `packages/core`, build the three routes on our stack                                            | Build the UI from scratch — gear picker, item tooltips, icons                            | Slower to something that looks finished; we re-solve display problems they solved                      |
| **C. Our shell, their parts**                       | Our app and stack; borrow the _sim_ (WASM) and _data_ (db.json, icons), port the WCL selection logic | Some borrowing per piece                                                                 | Least risky, but no single big win — it is the incremental path                                        |

**My read: C, and B's shell.** The reason is Joint C. The ranked-upgrade engine
is the product, it already exists, and it is not something their app has. Fork
cost is dominated by adopting a large UI to gain a Bulk tab that answers a
different question. Option C captures the genuinely reusable things — the sim,
the item DB, the WCL query shapes — without inheriting a codebase.

Two things worth taking from them regardless of the choice:

- **The WASM sim**, which is the topology plan's subject already.
- **The WCL query shapes** in `raid_wcl_importer.tsx` — a second, working
  implementation to check ours against, especially around gear and enchants.

---

## 6. What I have not verified

- **Whether upstream's license permits a fork/derivative** — not read. This gates
  option A entirely and should be checked before anyone weighs cost.
- **Whether their Bulk tab could be bent into single-item ranking** — I read its
  structure, not its full behaviour. If it turns out to already do
  one-item-at-a-time deltas against a baseline, option A gets meaningfully
  cheaper and this sketch should be revisited.
- **WASM-vs-native numerical parity** — still untested (see
  [`compute-topology.md`](../compute-topology.md) E1).
- Whether shipping WCL credentials client-side is acceptable for us — a policy
  question, not a technical one.
