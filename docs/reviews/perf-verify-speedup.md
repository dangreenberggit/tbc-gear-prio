# Pre-merge review — perf/verify-speedup

Reviewed range: `dc83b5542cd00146e7f2f2d697b15aefbbb51977..012e873d2d526bbd3510efc258919d7269b62489`

Dispatch: three axes, fresh-context subagents on the review lane (Opus). Adversarial
and Standards ran; Domain was not dispatched — the diff is a two-line tooling change
(`--cache` flags on eslint/prettier) with zero TBC/WCL/wowsims factual content, so the
domain axis has nothing to review. Recorded as **not applicable**, not skipped.

## Adversarial

**Clean — nothing survives scrutiny.** The specific silent-pass risk (verify passing
green while a real lint/format violation exists on disk) does not materialize:

- ESLint `--cache` defaults to a metadata strategy that _could_ miss a content change
  preserving size+mtime, but that risk is bounded to a local incremental run. CI does a
  fresh `actions/checkout` with no `.cache` restore (only pnpm's store is cached), so every
  CI `pnpm verify` builds the lint/format cache from zero — the authoritative gate is never
  served a stale entry.
- Prettier `--cache` defaults to the `content` strategy (hashes file contents), so it cannot
  mark a content-changed file clean.
- Cache location `node_modules/.cache/` is gitignored (`git check-ignore` → `.gitignore:1`),
  so a poisoned cache can't be committed or shared.
- The diff changes only the `lint`/`format:check` script bodies — same file set (`.`), no
  removed checks.

Non-defect note: the speedup is local-only (CI restores no cache), which matches the branch's
stated intent. A wrong local cache at worst produces a false _red_ on a later local run, never
a false green on CI.

## Domain

Not applicable — no game-mechanic claims in the diff.

## Standards + Spec

**Clean — safe to merge.**

- Cache paths gitignored under the `node_modules/` entry; no redundant `.gitignore` entry
  needed (correct to omit).
- Durable-claims policy respected: the commit body's perf/correctness claims name how each was
  checked and qualify scope with "On this machine" — honest framing, no unobserved-environment
  claim as fact.
- Spec match is exact: `verify` calls both edited scripts; coverage preserved (both tools
  content-hash their cache; only _unchanged_ files are skipped); no rule-set or glob change.

Minor non-blocking observation: eslint's cache location is pinned explicitly while prettier's
uses its default — a cosmetic asymmetry, both resolve under `node_modules/.cache/`, no effect.

## Summary

A two-line change adding `--cache` to eslint and prettier in the verify chain. Measured
`pnpm verify` 171s → ~92s on repeat runs. All dispatched axes clean; the one real risk
(cached run passing green over a real violation) was investigated and cleared, backed by the
fact that CI never carries the cache forward. No blocking findings. Ready to merge.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                             |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | wontfix     | Cache-invalidation false-green investigated and cleared; CI never restores the cache, so the authoritative gate is never served a stale entry. No defect. |
| S1  | Standards   | wontfix     | eslint pins cache-location, prettier uses default — cosmetic asymmetry, no effect.                                                                        |
| S2  | Spec        | wontfix     | Diff matches stated intent exactly; coverage preserved.                                                                                                   |
