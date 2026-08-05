# Standalone app: what to build, what to take

**Reference note / proposal.** Detail in [`take-list.md`](take-list.md).
Nothing implemented; no existing file changed by this document.

**Goal:** a version of this tool we run ourselves, with our own WCL credentials,
independent of wowsims — so development isn't gated on their site. Whether it
later becomes a PR into their site or a separate site we operate is a downstream
choice this plan does not force.

**Rule:** don't rebuild anything upstream already has, unless ours is
substantially better in functionality or performance.

---

## The two functionalities

1. **Logs → gear baseline.** Character name → most recent qualifying kill →
   their actual equipped gear, gems and enchants.
2. **Ranked upgrades.** Each candidate item for a chosen phase, individually
   simmed against that gear, ranked by measured DPS delta with a noise cutoff.

(#2 is not a sort. Each row is a real sim result. A static EP sort is a
different, much weaker product — and is the failure mode we already hit.)

---

## Status

|                                                 | State                                                         |
| ----------------------------------------------- | ------------------------------------------------------------- |
| Ranking engine (`packages/core`, ~3k lines)     | **Built** — pool, gem solver, meta repair, statistics, cutoff |
| Three seams + recorded adapters                 | **Built** — runs offline from fixtures                        |
| CLI + HTML report                               | **Built** — current product surface                           |
| **Live WCL client**                             | **Not built** — see [`README.md`](README.md)                  |
| Cap/mechanics constants (PLAN.md §4 `CapState`) | **Not built** — specified only                                |
| Web UI                                          | **Not built.** No `apps/` directory                           |

The engine is real. What's missing is everything at the edges — and most of it
exists upstream.

---

## Build order (dependency, not priority)

1. **WCL client** — build it per `PLAN.md` §5.2. **Do not port upstream's
   importer**: its classifier reads an `icon` dash-suffix absent from our
   fixtures and throws on our data, and it has no character-first discovery to
   lift ([`take-list.md`](take-list.md) §1). Read it for the report-scoped
   GraphQL query shapes only. Turns the tool from fixture-replay into something
   that answers for a real character.
2. **Mechanics constants** — take upstream's; unblocks `CapState`.
3. **Sim throughput** — the per-candidate loop in `rank.ts` is serial. See
   [`../compute-topology.md`](../compute-topology.md); note PLAN.md §5.3's
   `cores - 1` default is wrong and would oversubscribe ~20×.
4. **UI** — see below.

Steps 1–3 are shell-agnostic and can proceed before any UI decision.

---

## The shell decision

The only choice here that forecloses options.

- **Their stack** (hand-rolled TSX + SCSS, i18n) — mergeable as a tab on their
  site.
- **Our stack** (PLAN.md §1.1: TanStack Start + Tailwind + shadcn) — better
  standalone; not mergeable upstream.

**Suggested reading of this** (per project owner, 2026-08-04): go basic first,
shaped so a PR to their site stays possible, and keep TanStack-based features
for a potential later stage. Worth noting TanStack Start is more than UI — it's
also the server/routing layer, so "keep it for later" means the standalone
version would gain server-side features the PR version wouldn't have. That is a
real fork in capability, not just styling, and is the thing to be deliberate
about.

Not a blocker for anything in steps 1–3.

---

## Open

- **Shell stack** — above.
- **Our own WCL credentials** — needed regardless. Upstream ships shared ones in
  their bundle; we should not copy that.
- **WASM-vs-native parity** — untested
  ([`../compute-topology.md`](../compute-topology.md) E1).
