# W5 — regenerate both reports after the fix round (2026-08-11)

Both reports regenerated on branch `feat/set-bonus-value` at commit 96ec2d5,
run in parallel under Node 22, both exit 0, roughly nine minutes wall.

## Commands (re-runnable)

```
pnpm rank --offline --region US --realm dreamscythe --character shredzepelin --spec feral --max-phase 3 --with-set-potential --report .scratch/rank-reports/shredzepelin-p3.html
pnpm rank --offline --region US --realm dreamscythe --character slamaltman --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report .scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.html
```

The ret report is written straight to the archived artifact path
(`ret-catchup/artifacts/slamaltman-p3.html`, JSON beside it), so anything
reading that artifact sees the fresh file at the same path. The previous run
had written a timestamped file and hand-copied it there. Console logs for both
runs are in this folder (`05-feral-run.log`, `05-ret-run.log`). The old
`artifacts/slamaltman-p3.console.log` still describes the previous run — left
in place as the record of that run; the new run's console log is
`05-ret-run.log`.

Checks below were made with the two helper scripts in this folder
(`check_ret_html.cjs`, `check_rows2.cjs`) plus grep; every claim can be
re-produced by re-running them against the named files.

## Ret confirmations (slamaltman)

Baseline 2003.51 ± 118.93, unchanged from the previous artifact.

- **Both package figures in the row detail — yes.** Every Lightbringer member
  row's detail line reads `2pc package +11.31 (2 pieces) / 4pc package -6.83
  (4 pieces)` followed by the gem-model qualifier, which now says
  "auto-gemmed with **rare-or-lower** gems of the run's phase" (ticket 117's
  wording).
- **Two-figure chip marker — yes.** The chips carry
  `<span class="pkg">pkg 2pc +11.31 / 4pc -6.83</span>`.
- **Package mode sorts on the positive 2pc figure — yes.** All four
  Lightbringer members (30990 chest, 30993 legs, 30989 head, 30997 shoulder)
  carry `data-package="11.3140886…"`, the best measured figure, including the
  two below-cutoff members that only appear as `package-only muted` rows.
- **Actual figures (from the new JSON):** Lightbringer 2pc bonus +0.55,
  package **+11.31**; Lightbringer 4pc bonus −9.31, package **−6.83**;
  Crystalforge 4pc bonus −9.92, package **−26.77**; Justicar 4pc bonus −3.88,
  package **−80.56**. These are identical to the previous artifact — see
  Surprises.
- **Crystalforge 2pc (1 worn, one piece short) — now unmeasurable, yes.**
  JSON row carries `"unmeasured": "unmeasurable-at-this-worn-count"`; the HTML
  set-potential entry reads "can't be measured from this starting gear — one
  piece short of this threshold, so the completing piece's own swap already
  carries the bonus" and shows no 0.00 package line (ticket 119).
- **30892 substitution trimmed — yes.** The HTML entry ends at the first
  error line ("…missing method GetHunter … (full text in the JSON report)");
  no goroutine dump, no stack trace in the HTML (ticket 123). The full text
  is still in the JSON.
- **Plausibility warnings — none fired.** No `plausibilityWarnings` key in
  the JSON and no warning section in the HTML. No ret bonus is large enough
  in either direction to cross the band.

## Feral confirmations (shredzepelin)

Baseline 2152.10 ± 128.18. Package mode is intact.

- Thunderheart block positive: 2pc bonus +32.26, package **+74.11**; 4pc
  bonus +196.29 (flagged, breaks Malorne 2pc), package **+64.09**. All four
  member rows and chips carry `data-package="74.1144…"` — the set's best
  measured figure (2pc +74.11 over 4pc +64.09), including the two
  below-cutoff members (31048 shoulder, 31042 chest) shown as package-only.
- Chips show the two-figure marker `pkg 2pc +74.11 / 4pc +64.09`; single-
  measured sets show one figure (`pkg 4pc -21.18` Nordrassil, `pkg 4pc
  +14.78` Malorne).
- Plausibility warnings (ticket 120's surface) fire and render: a
  "Plausibility warnings (5)" panel — Thunderheart 4pc 196.29 (~9.1% of
  baseline) and Nordrassil 4pc 185.10 (~8.6%) over the 7.5% band, plus three
  dead-slot warnings (chest and shoulder behind Malorne's set-break toll,
  head behind Wolfshead Helm's unique effect). All are on the large-positive
  side; none is a negative-side warning.

## Surprises

- **No figure moved on either spec.** Every package and bonus figure in both
  new JSONs is identical to the previous artifacts (ret: +11.31 / −6.83 /
  −26.77 / −80.56; feral: +74.11 / +64.09 / −21.18 / +14.78), even though
  ticket 117 capped meta-repair gem swaps at rare quality. These are
  `--offline` runs replaying recorded sims, so identical figures mean the
  sim payloads did not change — hypothesis: the auto-filled gems in these
  two characters' packages were already rare-or-lower, so the cap changed
  nothing here. Untested; a character whose old fill picked an epic gem
  would be the test. The qualifier text did change ("rare-or-lower"), so the
  display reflects the cap even where the numbers do not.
- Could not compare the old feral JSON's plausibility block: the old file was
  overwritten by the regeneration before that key was checked. Old set-bonus
  figures were captured first and are quoted above.
- The rest of `ret-catchup/` (worker logs 01–06, DIRECTOR.md, the old console
  log) was already untracked before this round and is left uncommitted; only
  the regenerated artifact pair is committed from that folder.

## What was committed vs left

- Committed: this log, the two run logs, the two helper scripts, and the
  regenerated `ret-catchup/artifacts/slamaltman-p3.html` + `.json`
  (`.scratch/set-bonus-value/` is re-included by `.gitignore` and excluded
  from prettier by `.prettierignore`, so the artifacts commit unreformatted).
- Left: everything under `.scratch/rank-reports/` (including the regenerated
  `shredzepelin-p3.html`/`.json`) — that folder is gitignored, so those are
  untracked scratch outputs by convention.
