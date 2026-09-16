# Desktop gate goldens

`golden-<spec>-p<phase>-cap<N>.json` is a recorded ranking output from a
known-good run of the upgrades tab on the desktop (HTTP) transport. Check (h) of
`scripts/check_desktop_tab.py` compares every run against it.

**Three fields are compared, exactly, with no tolerance:** `rows` (including
order), `aboveCutoffItems` (including order) and `baselineDps`. Everything else
in the file is provenance and is ignored by the comparison — the check is a
whitelist in code, so a field not named here is ignored whether or not this list
mentions it. Exact equality is safe because the per-candidate loop is
deterministic on one machine at fixed seeds; two cap-150 runs agreed on all 134
rows when the gate was written.

**A red gate is a finding, not a prompt to regenerate.** It means the tab's
output changed. Find out why before you touch this file.

**Regenerating is a deliberate act.** It is legitimate when a change is *meant*
to alter the output — a fork re-pin, a universe regen, an intended ranking
change. Run `pnpm desktop-gate:check --update-golden`, read the diff it prints,
and commit the new file with the reason the output changed in the commit body.
The write is gated on checks (a)-(g) passing, which stops a *broken* run
(timeout, panic, wrong worker, wrong row count) from becoming a golden. It does
**not** stop a ranking regression: that preserves shape and passes (a)-(g). The
only thing standing between a regression and a committed golden is you reading
the printed diff.

**Without a golden the gate exits 2** ("could not run") and names the missing
path. It never passes silently and never writes one on its own. `--full` skips
(h) — a 601-row golden would cost a full-pool run per regeneration.

**`forkCommit` and `cpuCount` are recorded so a mismatch is explainable.** The
native server splits each sim over `runtime.NumCPU()`, so a different core count
moves results in the last digits; the tab's renderer rounds displayed DPS to 0.1
(`upgrades_tab.tsx:250`), so the golden is portable across machines except at a
rounding boundary. A mismatch right after a re-pin or on a different machine
should be checked against these two fields first.

The gate is never run by CI, by `pnpm verify`, or by either git hook — its only
entry point is `pnpm desktop-gate:check`. A mismatch can only surface on a
developer's own machine, on demand, with the diagnostic in front of them.
