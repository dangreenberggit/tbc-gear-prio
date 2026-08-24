# Pre-merge review — feat/phase-item-pool

Reviewed range: `8c4b1867cdcfbb3b668eff3edebcfd40c823a0f7..16f7a107855a0f97ee303f3975e16707b171beb4`

Dispatch, 2026-08-23: adversarial, domain, standards, spec — four fresh Opus
subagents (review lane), one parallel batch; `codex` not on `PATH`. Each axis
told it writes nothing and runs no tree-changing git command.

The change spans two repositories. This repo's range carries the two new
verify gates (`fork-universes:check`, `pool-listings:check`), the committed
pool listings, the core `view.ts` zone-bucket filter with its unit test,
ADR-0028, tickets, stage artifacts and the verification-log entry. The tab
code lives in the gitignored fork clone `vendor/tbc-new-fork`
(`feat/upgrades-tab`), range `cfcdd7ea1..eb65670` at dispatch: universe
refresh, phase naming + shared phase selector + locales-gate repair, and the
post-sim content filter. Fixes from this round landed after dispatch in
`f15cacf..7930345` here and `d49096e` in the fork;
`data/wowsims-fork.lock.json` points at `d49096e`.

## Adversarial

Both trees clean; both new gates pass; the new `upgrades_tab` schema is a
real object schema (`additionalProperties: false`, `required`), not
permissive. Verified sound with the mutation named: `matchesRaidFilter`'s two
cases are disjoint on real data (0 rows in `ret-p3.json` carry both a zone
and a zoneless source); reverting the matcher to `matchesZone` fails the new
"badge item under its bucket label" test; `sync_fork_universes.py --check`
compares all eight PROVENANCE rows byte-wise and states its CI-absence skip;
category `g`'s zero is reachable, not vacuous — 8 ret / 7 feral wowsims-only
in-zone drops exist and all are absorbed by the stub check tried first, which
is the gate working.

- **A1 (the finding that mattered).** `raidFilterOptions` falls through to
  `item.source.kind`, and the tab's "All" option used value `all` — inside
  the value space, so a zone or bucket keyed "all" would silently mean _no
  filter_ under a label promising one zone. Low likelihood on shipped data
  (no such zone), but a wrong-answer-no-error mode.
- **A2.** `sync_fork_universes.py --write` returned exit 1 on a missing
  source after already writing — the exit code called a mutating run a
  failure.
- **A3 (note, not a defect).** `test-locales.mjs` still exited 0 on zero
  matched files; the Windows false-green was fixed but no zero-match guard
  existed.

Unexamined: the ~4,600 lines of stage artifacts/tickets (not code); the
universe-refresh JSON payloads (covered by the byte gate); runtime behaviour
in a browser.

## Domain

**No domain contradictions found.** Seven items sampled across every
category against the pinned DB, all exact — including `32515` correctly
labelled p2 inside the p3 listing, the e1/e2 split honest (`12592`/`21670`
genuinely drop only outside phase zones; `32570` genuinely sourced and never
drops). The `token` bucket question resolved correctly: tier tokens carry a
`zone` and file under their raid — deliberately absent from
`ZONELESS_SOURCE_LABELS`, exactly what the verification log requires. Ticket
89's re-scope verified by running its own reproduce command (armour stub-only
true; the four weapons not stub-only; 33716/32014 already in a universe).
Swiftsteel/Swiftstrike correctly hedged everywhere ("hypothesis, untested");
the listings print `3` only as the DB's value under the ADR's declared
precedence. Fork phase labels (2.0-T4 … 2.4-SWP) correct for TBC and
pre-existing; the diff only interpolates them. ADR-0028's grounds re-ran and
matched (`Counter({'drop': 2821, 'crafted': 1113, 'rep': 111})`); the
legendary exclusion argument is sound (Warglaives are 1H sword/dagger).

- **D1 (cosmetic).** `rank-report.ts:225`'s label table claims to "mirror"
  `view.ts`'s — it is a superset (extra `heroic` key), so the mirror claim
  was not literally true.

Unexamined: the feral listing beyond the Swiftstrike rows (one generator,
one rule set); the 302 s discrepancy (labelled unexplained — honest framing).

## Standards + Spec

### Standards

- **S1 (hard).** Tickets 211/276/277 carried commentary on the `Status:`
  line — invisible to the gate's first-token regex, banned by
  `docs/agents/issue-tracker.md`; 211 also had prose between header and
  title.
- **S2 (hard, pre-existing).** Ticket 89 lacked the header block entirely
  and the branch edited the file.
- **S3 (hard, systemic).** Commit bodies wrapped at 73–75 in both repos;
  five subjects over 50 (max 56).
- **S4 (minor).** `NEXT` was bumped in a separate commit from the tickets
  that consumed the numbers (the doc wants the same commit); disclosed
  honestly in that commit's message.
- Judgement calls: the zoneless-bucket rationale is written in near-identical
  prose in four places (comment duplication, not logic — the code has one
  table); `raid` is a bare string doing zone-or-bucket duty, disambiguated
  by set membership and pinned by a test — reasonable as shipped.
- Durable claims: **no violations** — called the strongest part of the
  change; the 302 s/61 s delta and the substitute wasm measurement are
  labelled exactly as the rule demands. Comment policy clean.

### Spec

Verdict: **no blocking or material findings.** Every Goal clause and every
Step acceptance criterion re-verified by re-running (both new gates, greps,
lockfile test, ajv, `test:locales` naming its three files). No unsanctioned
scope: no membership change (the C16a/C16b items went to ticket 276, not
into a universe), no boss filter (ticket 277), no pre-sim pruning, no
ranking-math change, nothing pushed; the two Gate C-accepted flags confirmed
as described (`poolSourceFor` is a read-only accessor). The property-based
Step 4 acceptance is non-vacuous in the shipped code: category `g` is a
genuine fall-through, `f` is conditional on `not sources`, and the a/b/d
structural zeros are disclosed rather than hidden. Step 9's (a)–(d) all
present with quoted evidence; the eight non-All filter values sum to the
17-row All view, so the exactly-one-bucket property is measured, not
asserted.

## Summary

Nine findings across four axes; **no blockers**. Domain and spec are clean
passes with every sampled claim re-derived. The one real code finding was
adversarial A1 — the raid filter's `all` sentinel living inside the value
space, a silent wrong-filter mode on hypothetical data — fixed with a named
`NO_RAID_FILTER = ''` constant at all three touchpoints. The fix round also
made `--write` refuse up front instead of mutating-then-failing, corrected
the "mirror" comment with the real reason `heroic` differs, brought four
tickets to the documented header form, and added the locale zero-match guard
— which immediately caught a pre-existing upstream gap (an orphan
`gear.schema.json` with no locale file, warned rather than fatal so the fork
gate is not permanently red for an upstream omission) plus a regressed
separator regex that would have broken Windows paths again. This round's
four commits: subjects ≤50, zero body lines over 72.

`pnpm merge-to-dev --check-only` result is recorded in the map line.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                     |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `NO_RAID_FILTER = ''` sentinel outside the value space (`zoneKeyOf` never returns ""); fork `d49096e`. Core's pre-existing `"all"` handling untouched.                                                                                                            |
| A2  | Adversarial | fixed       | `--write` now refuses up front on a missing source ("Nothing was written"); success path exits 0 (`4499b7e`).                                                                                                                                                     |
| A3  | Adversarial | fixed       | Zero-match guard in `test-locales.mjs`: aggregate zero-match is fatal; a single orphan schema warns (pre-existing upstream `gear.schema.json` gap, present at base `cbf6b75`); a shell-round-trip-regressed separator regex fixed in the same commit (`d49096e`). |
| D1  | Domain      | fixed       | `rank-report.ts` comment states the superset relationship and why `heroic` exists there (`4499b7e`).                                                                                                                                                              |
| S1  | Standards   | fixed       | 211/276/277 `Status:` lines bare; commentary in bodies; 211's floating prose moved (`f15cacf`).                                                                                                                                                                   |
| S2  | Standards   | fixed       | Ticket 89 given the documented header block (`f15cacf`).                                                                                                                                                                                                          |
| S3  | Standards   | wontfix     | History is not rewritten for wrapping; this round's four commits measure 0 lines over 72 and subjects ≤50.                                                                                                                                                        |
| S4  | Standards   | wontfix     | Already-landed separate NEXT commit, honestly disclosed; the counter is correct.                                                                                                                                                                                  |
| —   | Standards   | wontfix     | Four-place zoneless-rationale comment duplication: logic has a single table; noted, not worth churn.                                                                                                                                                              |
