# Report: healer support is blocked upstream — revisit if wowsims fixes healing

**Status:** decision recorded. The Upgrades tab stays **DPS-only** for now.
**Audience:** a future session picking this up if/when wowsims implements TBC healing.
**Depends on:** [`trustworthiness-probe.md`](trustworthiness-probe.md) (the evidence),
[`foundation.md`](foundation.md) (the engine facts), [`options.md`](options.md) (the menu).
**Durable-claims discipline:** every defect below names a command or file:line you
can re-run to confirm it is still true. wowsims is a moving upstream — treat every
"broken" claim as _true at the pinned fork commit_ and re-check before acting.

---

## 1. The decision, in one line

Ranking healer gear is blocked by the **wowsims simulator not implementing TBC
healing** — not by anything in this repo and not by engineering effort we control.
So healers stay present-but-unsupported (the tab already shows an `unsupported-spec`
message on their pages), and this report exists so the moment upstream fixes it is
not missed.

**Tanks are a different story — they came back trustworthy.** This report is only
about healers. If you are here to build, DPS + tanks is the live product; see
[`options.md`](options.md) "C-minus-healers" and the tank verdict in the probe.

---

## 2. Why healers are blocked (three upstream defects)

The probe tried to get an HPS number out of all three healer specs through the
pinned `wowsimcli`. None produced one, for three _distinct_ reasons — this is not
one bug with three symptoms, so fixing one does not unblock the others.

| Spec             | Defect                                                                                                                                                                                                                                                                                                               | Confirm it is still true                                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Holy Paladin** | The sim **crashes on the first healing crit**. `outcomeHealingCrit` (`sim/core/spell_outcome.go:150`) passes `attackTable = nil`, and `CritDamageMultiplier` (`sim/core/spell.go:753`) dereferences it → nil-pointer panic. All healing spells route through this path, so it is unavoidable, not a preset artifact. | Run the probe's holy-paladin sim with `--verbose`; it panics with that stack. See probe §Q1.                                                                                                |
| **Resto Shaman** | Heals **are written but not compiled**. The heal code lives in `sim/shaman/_heals.go`; the leading underscore makes Go **exclude the file from the build**. So the spec builds and sims, but casts no heals → zero HPS.                                                                                              | `ls vendor/tbc-new-fork/sim/shaman/ \| grep -i heal` → `_heals.go`. The `_` prefix is a Go build convention, not a typo we can rename around safely without knowing why upstream parked it. |
| **Resto Druid**  | Heals are **not implemented at all**. `sim/druid/restoration/restoration.go` has an empty `ApplyTalents()` and registers no heal spells (no Rejuvenation / Regrowth / Lifebloom / etc. anywhere in `sim/druid/`).                                                                                                    | `grep -rn "Rejuv\|Regrowth\|Lifebloom\|RegisterSpell" vendor/tbc-new-fork/sim/druid/restoration.go` → empty.                                                                                |

There is no fourth healer to fall back on: TBC wowsims has **no Holy or Discipline
priest** — its one priest spec is Shadow DPS (foundation §2).

**The WASM path shares this fate (untested but expected).** The tab runs sims
through the fork's WASM build, not the CLI — but WASM compiles the _same_ `sim/`
Go source, so it is expected to hit the identical crash and missing-spell defects.
This is untested; a future check should confirm rather than assume it.

---

## 3. What is NOT the blocker (so effort is not wasted later)

The probe checked the parts we _do_ control, and they are fine:

- **The EP presets are real.** All three healer specs ship non-empty, healing-shaped
  EP vectors in their `presets.ts` (e.g. holy paladin: Intellect 1.375, Spirit
  1.125, SpellDamage 1.0, with `epReferenceStat = StatSpellDamage`). They are not
  stubs or DPS copies. **Caveat:** these constants are unvalidated and stay
  meaningless until a working healing sim exists to measure against — do not trust
  the numbers, only their existence.
- **The engine-side objective refactor is the same one tanks need.** Reading a
  non-DPS metric off the sim result and un-hardcoding the `dps` name (foundation §3)
  is not healer-specific. If tanks ship first, that refactor is already done and
  healers inherit it for free — the healer-only remainder is then just data +
  the upstream sim.
- **The decodelink / preset / universe pipeline is role-agnostic** (foundation §4).
  A healer share link decodes and a healer universe assembles today.

So when upstream heals, the repo-side healer work is **small**: it is the leftover
after tanks, not a fresh start.

---

## 4. The trigger — how to know upstream fixed it

Healing support becomes viable when the fork's `sim/` actually casts heals and
survives a crit. Re-run the probe's Q1 against a fresh fork pin. Minimum bar to
declare healers unblocked:

1. **Holy paladin does not crash** — the `spell.go:753` nil-pointer panic is gone
   (a healing crit resolves). This is the load-bearing signal; the crash is the
   hardest of the three.
2. **At least one healer produces a non-zero, gear-sensitive HPS** across a gear
   tier — the same test tanks passed (probe §Q2: a full tier must move the metric
   by many multiples of its cross-seed SE, or the metric cannot rank gear).
3. **The heal file is in the build** — `sim/shaman/_heals.go` renamed to `heals.go`,
   or resto druid's heal spells registered.

A cheap way to spot the change without re-running sims: watch upstream for healing
work. The fork pin lives in `data/wowsims-fork.lock.json`; when it advances, grep
the new tree for the three defects above before assuming they persist.

---

## 5. If the trigger fires — the work to unblock healers

Assuming tanks shipped first (so the objective refactor exists), the healer
remainder is roughly:

1. **Advance the fork pin** to the commit that implements healing; re-run §4's bar.
2. **Choose the healer objective.** HPS is the obvious one, but confirm whether the
   sim also exposes a competing longevity dimension (time-to-OOM / `tto`) that makes
   "rank by HPS alone" ill-posed for a mana-constrained healer — the probe flagged
   this as an open question it could not answer without a working sim (probe §Q4).
3. **Validate the EP presets** against the now-working sim (finite-difference or the
   WASM `statWeightCompute` path, foundation §5) — the shipped constants are
   unvalidated (§3 above).
4. **Fill the per-spec data + tables** for the three healers the same mechanical way
   DPS specs were added (foundation §4): SpecId rows, presets, universes, cap
   profiles (mostly inert for healers), cutoff floors _in HPS units_, metas.
5. **Add the three healer trees to spec detection** (`classifySpec`, foundation §4).
6. **Add them to the tab allow-list** (`SPEC_ID_BY_PROTO_SPEC`).

None of this is large _once healing sims work_. The entire blocker is step 1, and
it is upstream.

---

## 6. Provenance

Everything here traces to the probe run on 2026-08-30 against fork pin as recorded
in `data/wowsims-fork.lock.json` at that date, using `wowsimcli-v0.0.119`. Sim
inputs/outputs are under `.scratch/probe/` (uncommitted); the assembler scripts
were in a scratchpad and are not retained — regenerate from the probe doc's §Q1
recipe if you need to reproduce. The three defect claims in §2 were independently
re-verified by hand after the probe, against the same fork tree.
