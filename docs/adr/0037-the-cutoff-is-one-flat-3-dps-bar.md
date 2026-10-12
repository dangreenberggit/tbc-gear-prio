# ADR-0037 — The cutoff is one flat 3 DPS bar for every spec

**Status:** accepted
**Date:** 2026-10-11
**Amends:** PLAN.md §10 (the dual threshold "3.4 DPS or 0.15%"); [ADR-0021](0021-a-mixed-semethod-tie-is-judged-on-the-coarser-se.md) (its derivation of 3.4 from `max(3.0, 2 × mean reported SE 1.678)`); [ADR-0032](0032-one-spec-registry-keyed-by-spec-id.md) (the registry no longer has a `cutoff` field)
**Related:** [ADR-0020](0020-the-cutoff-is-absolute-a-filter-never-moves-the-bar.md) (the cutoff is absolute; its `engineVersion` note applies); tickets `.scratch/carry-forward/issues/615-cutoff-absolute-bar-never-applies-below-2267-dps.md` (closed by this ADR), `617-report-hides-which-cutoff-rule-admitted-a-row.md`, `618-tab-pct-rule-note-hover-only-and-can-contradict-figure.md`, `105-consider-reducing-sim-noise-std-128-plus.md` (stays open)

## Context

Until this ADR a row cleared the cutoff when its DPS change met either of two
bars: an absolute bar or 0.15% of the baseline. The absolute bar was 3.4 DPS
for ret and the nine specs that borrowed ret's number, and 3.6 DPS for feral.
Each came from a five-seed spread, `max(3.0, 2 × mean reported SE)`
(`docs/verification-log.md` "Cutoff constant derived";
`docs/five-seed-spread.json`, `docs/five-seed-spread-feral.json`). The 0.15%
was carried over unchanged from the plan's dual threshold.

Because the two bars were joined by OR, the lower one decided. Ticket 615
found that for ret below about 2267 DPS (3.4 / 0.0015), and for feral below
2400 DPS, the absolute bar decided nothing, while every output stated
"3.4 DPS / 0.15%". The tab marked such rows "by % rule" (ticket 254), and
tickets 617 and 618 found faults in those markers.

## Decision

Asked on 2026-10-11 to choose between keeping "3.4 DPS or 0.15%, whichever
is lower" and requiring at least 3.4 DPS, the owner replied, as quoted in the
brief that dispatched this change:

> Just do 3 DPS then fuck it

and then:

> It was more about simming noise anyway probably, the methods of getting rid of it were arbitrary

So:

1. **One bar, in DPS, for every spec:** `CUTOFF = { absDps: 3 }`
   (`packages/core/src/cutoff.ts`, and its port
   `vendor/tbc-new-fork/ui/features/upgrades/model/engine/cutoff.ts`). A row
   is above the cutoff when its DPS change is at least 3.
2. **No percentage rule.** `meetsCutoff(deltaDps, cutoff)` reads the DPS
   change only. `Cutoff` has no `pct` field.
3. **No per-spec bar.** Feral's 3.6 (`CUTOFF_FERAL`), the per-spec registry
   field, `cutoffForSpec`, and the fork's `CUTOFF_BY_SPEC` are removed. The
   tab's console line "cutoff: borrowed from Retribution Paladin, unmeasured
   for this spec" is replaced by "cutoff: 3 DPS" for every spec.
4. **3 is a deliberate rough cut against sim noise, not a measured figure.**
   It is not derived from any spread, and nothing in this repo should cite it
   as 2 × SE. Reducing sim noise itself is ticket 105, which stays open.

## Consequences

- **The set-bonus noise floor moves.** `setBonusNoiseFloorDps` keeps its
  derivation, `√2 × absDps`, so the floor is now √2 × 3 ≈ 4.24 DPS for every
  spec, down from ≈4.81 (ret) and ≈5.09 (feral). Ticket 335's band scan was
  taken at the old ret floor and has not been re-run for 4.24 (untested).
- **Outputs state one number.** The CLI header prints `cutoff=3 DPS`, the
  HTML report lede "Cutoff 3 DPS.", and the tab's below-cutoff group "N
  item(s) below the 3 DPS cutoff" (the bar comes from the shown ranking, so a
  recorded fixture names the bar its rows were judged against). The report's
  "cleared by %-arm" note and the tab's "by % rule" note are removed, with
  `cutoffAdmittingArm`.
- **Which rows clear the cutoff changes**, and so does which rows paired
  replication spends its budget on (ADR-0021). Core `ENGINE_VERSION` moves
  to 9 so a cached ranking does not serve the old verdicts (ADR-0020).
- **The fork's `ENGINE_VERSION` stays 6.** The tab's ranking cache is a
  `MemoryStore` built once per mounted tab and kept only in memory
  (`vendor/tbc-new-fork/ui/features/upgrades/model/run.ts:66`, kept by
  `model/run_session.ts:87`). The tab's only `localStorage` writes hold its
  settings, sort, view and export choice, never a ranking
  (`model/saved_settings.ts:111`, `model/saved_entry.ts:38`). So no ranking
  judged under the old bar can reach a page that runs the new code, and the
  fork has no cached verdict to invalidate. These lines were read at fork
  commit `c4696b09`. The fork comment at `model/engine/content-hash.ts:49-53`
  says the value is "PORTED unchanged" from core; that is wrong, and ticket
  `.scratch/carry-forward/issues/622-fork-port-comments-and-dead-arm-test.md`
  tracks it.
- **Recorded outputs were re-judged or re-recorded.** The core synthetic
  roster fixture's above-cutoff sets were re-judged by replaying their
  committed observations; the tab fixtures and the desktop-gate golden were
  re-recorded. The commits that change them say how.
- **ADR-0021 still holds in every other respect.** The cutoff runs before
  replication and reads the first-seed `deltaDps` on the `independent` scale;
  only the number and its justification change.
- **Historical measurement scripts keep their old bars.**
  `packages/core/test/measure-*.ts` define the bar they were run against
  locally, so their recorded numbers stay re-runnable.

## Alternatives considered

- **Keep the OR rule and state the bar actually applied, per run, in DPS.**
  Ticket 615's second acceptance route. Rejected by the ruling: it keeps two
  bars whose derivations the owner called arbitrary.
- **Require at least 3.4 DPS (drop the percentage rule only).** Offered to
  the owner; the ruling chose 3 instead. Feral's separate 3.6 would also have
  stayed.
