/**
 * wowsims attribution (PLAN.md §12), on every page from the first UI commit.
 *
 * `simVersion` is whatever the binary that ran the job reported, so it is a
 * prop rather than a constant here: a hardcoded number would keep printing
 * the old version after the pin moves, which is the one way this line can
 * mislead.
 */
export function Footer({ simVersion }: { simVersion?: string }) {
  return (
    <footer className="footer page">
      <span>Simulations by wowsims (tbc)</span>
      {simVersion !== undefined && <span> — sim version {simVersion}</span>}
    </footer>
  );
}
