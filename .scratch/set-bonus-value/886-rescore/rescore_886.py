"""Ticket 886: re-score the set screen's rule family with the self-crossing
taken out of the M2 estimate, on the same 11 recordings K5E scored.

usage: python -I rescore_886.py <path to .../511-512-set-credit/k5e/score_screen.py>

Prints, for the tab's rule (M2 N=300 K=2 c=1 rule1=on, sigma bound):
the per-set M2 before and after for every set with a nonzero correction,
the kept sets per character before and after, whether the rule still keeps
every set worth collecting with mean kept <= 3, and which rule the original
`choose` picks before and after.
"""
import importlib.util
import sys

spec = importlib.util.spec_from_file_location("score_screen", sys.argv[1])
ss = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ss)

orig_stats = ss.Char.stats


def crossing_value(ch, sid):
    """B_{w+1}: rung(w+1) - rung(w), at the highest N both rungs have."""
    s, _, rungs = ch.readings(sid)
    w = s["worn"]
    for n in (1000, 300, 100):
        a, b = rungs.get((n, w + 1)), rungs.get((n, w))
        if a and b and a.get("dps") is not None and b.get("dps") is not None:
            return a["dps"] - b["dps"], n
    return None, None


def fixed_stats(self, sid, t):
    est, why = orig_stats(self, sid, t)
    if est is None:
        return est, why
    w = self.screen[sid]["worn"]
    if w < 1:
        return est, why
    b, _ = crossing_value(self, sid)
    if b is None:
        return None, "no crossing value"
    return est - (t - w) * b, None


def load():
    chars = []
    for name, chunk, stem in ss.CHARS:
        chars.append(ss.Char(name, chunk, stem))
    return chars


TAB_RULE = ("M2", 300, 2, 1, True)


def run(label, chars, truths):
    res = ss.score(chars, truths, "bound")
    tab = next(r for r in res if r["rule"] == TAB_RULE)
    passing = [r for r in res if r["pass"]]
    c1 = next(ch for ch in chars if ch.name == "C1")
    best = ss.choose(passing, c1, 0)
    return tab, best, len(passing)


chars = load()
truths = {ch.name: ch.truth() for ch in chars}

print("Sets with a self-crossing correction (worn >= 1):")
for ch in chars:
    for sid, s in sorted(ch.screen.items()):
        if s["worn"] < 1:
            continue
        b, n = crossing_value(ch, sid)
        before = ss.Char.measure(ch, sid, "M2", 300)[0]
        ss.Char.stats = fixed_stats
        after = ss.Char.measure(ch, sid, "M2", 300)[0]
        ss.Char.stats = orig_stats
        print(f"  {ch.name} set {sid} worn {s['worn']} reach {s['reach']}: B(w+1) {b} (N={n}); M2@300 before {before} after {after}")

tab0, best0, np0 = run("before", chars, truths)
ss.Char.stats = fixed_stats
tab1, best1, np1 = run("after", chars, truths)

print(f"\nTab rule {ss.rule_str(TAB_RULE)}:")
print(f"  before: pass={tab0['pass']} keepsAll={tab0['keepsAll']} meanKept={tab0['meanKept']:.3f} near={tab0['near']}")
print(f"  after:  pass={tab1['pass']} keepsAll={tab1['keepsAll']} meanKept={tab1['meanKept']:.3f} near={tab1['near']}")
print("\nKept per character (before -> after), truths:")
for ch in chars:
    a, b = tab0["per"][ch.name], tab1["per"][ch.name]
    moved = "" if a["kept"] == b["kept"] else "   <-- MOVED"
    print(f"  {ch.name}: {a['kept']} -> {b['kept']}; missed {a['missed']} -> {b['missed']}; band {a['band']} -> {b['band']}; truths {sorted(truths[ch.name])}{moved}")
print(f"\nPassing rules: before {np0}, after {np1}")
print(f"Chosen by `choose` before: {ss.rule_str(best0[1]['rule']) if best0 else None}")
print(f"Chosen by `choose` after:  {ss.rule_str(best1[1]['rule']) if best1 else None}")


# C203's four checks (plan-k5on-patch.md:104): primary sigma, 1.5 x bound,
# own pairedSe, and absent sets dropped.
def tab_under(mode, absent):
    res = ss.score(chars, truths, mode, absent)
    return next(r for r in res if r["rule"] == TAB_RULE)


print("\nC203 checks for the tab rule (pass / keepsAll / meanKept):")
for mode, absent in (("bound", "keep"), ("bound1.5", "keep"), ("own", "keep"), ("bound", "drop")):
    ss.Char.stats = orig_stats
    a = tab_under(mode, absent)
    ss.Char.stats = fixed_stats
    b = tab_under(mode, absent)
    moved = [c.name for c in chars if a["per"][c.name]["kept"] != b["per"][c.name]["kept"]]
    print(f"  {mode}/{absent}: before {a['pass']} {a['keepsAll']} {a['meanKept']:.2f} near {a['near']}; after {b['pass']} {b['keepsAll']} {b['meanKept']:.2f} near {b['near']}; kept sets moved on {moved or 'none'}")
