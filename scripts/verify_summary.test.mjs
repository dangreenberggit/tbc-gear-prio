import { describe, expect, it } from "vitest";
import {
  extractPythonSkips,
  extractVitestSkips,
  formatSummary,
  formatVitestFailures,
} from "./verify_summary.mjs";

describe("extractPythonSkips", () => {
  it("finds no skips in output with no skip line", () => {
    expect(extractPythonSkips("ep presets check: ok\n")).toEqual([]);
  });

  it("extracts a single '<name>: skipped -- <reason>' line", () => {
    const output =
      "some other output\n" +
      "ep presets check: skipped -- vendor/tbc-new-fork is absent (it is " +
      "gitignored, so a fresh clone has none)\n" +
      "trailing\n";
    expect(extractPythonSkips(output)).toEqual([
      "ep presets check: skipped -- vendor/tbc-new-fork is absent (it is " +
        "gitignored, so a fresh clone has none)",
    ]);
  });

  it("extracts every skip line when a step prints more than one", () => {
    // sync_fork_universes.py has two distinct skip sites (absent fork,
    // absent PROVENANCE.md) -- only one fires per run, but the parser must
    // not assume exactly one match.
    const output =
      "fork universes check: skipped -- vendor/tbc-new-fork is absent " +
      "(gitignored)\n" +
      "fork universes check: skipped -- PROVENANCE.md missing\n";
    expect(extractPythonSkips(output)).toHaveLength(2);
  });

  it("matches a skip line whose 'skipped' is not right after the colon", () => {
    // check_equip_eligibility.py:239 reads "equip eligibility check: slug
    // map total and injective. Fork diff skipped -- vendor/... is absent
    // ...", not "<name>: skipped -- ...". The shared contract across all
    // seven fork-gated scripts is the substring "skipped -- <reason>", not a
    // fixed prefix.
    const output =
      "equip eligibility check: slug map total and injective. Fork diff " +
      "skipped -- vendor/tbc-new-fork is absent (it is gitignored, so a " +
      "fresh clone has none). Clone the fork to check the committed " +
      "data/equip-eligibility.json against it.\n";
    expect(extractPythonSkips(output)).toEqual([output.trim()]);
  });
});

describe("extractVitestSkips", () => {
  it("returns zero skipped and zero total when there are no test results", () => {
    const report = { numTotalTests: 0, numPendingTests: 0, testResults: [] };
    expect(extractVitestSkips(report)).toEqual({
      ran: 0,
      skipped: 0,
      reasons: [],
    });
  });

  it("counts passed and skipped assertions, and carries the skipped fullName as the reason", () => {
    // Mirrors the wowsims-fork-parity.test.ts model: the skipIf counterpart
    // is a real `it()` whose body's only content is naming why it skipped,
    // so its fullName IS the reason -- no separate reason field exists in
    // vitest's JSON reporter for a skipped assertion.
    const report = {
      numTotalTests: 2,
      numPendingTests: 1,
      testResults: [
        {
          name: "/repo/packages/core/test/wowsims-fork-parity.test.ts",
          assertionResults: [
            {
              status: "passed",
              fullName: "wowsims-fork-parity (E-W3) reproduces deltas",
            },
            {
              status: "skipped",
              fullName:
                "wowsims-fork-parity (E-W3) skipped: vendor/tbc-new-fork is present but its protos are not generated",
            },
          ],
        },
      ],
    };
    expect(extractVitestSkips(report)).toEqual({
      ran: 1,
      skipped: 1,
      reasons: [
        "wowsims-fork-parity (E-W3) skipped: vendor/tbc-new-fork is present but its protos are not generated",
      ],
    });
  });

  it("ignores files with no skipped assertions", () => {
    const report = {
      numTotalTests: 7,
      numPendingTests: 0,
      testResults: [
        {
          name: "/repo/packages/core/test/bulk-partition.test.ts",
          assertionResults: Array.from({ length: 7 }, (_, i) => ({
            status: "passed",
            fullName: `partitionForBulkScreen case ${i}`,
          })),
        },
      ],
    };
    expect(extractVitestSkips(report)).toEqual({
      ran: 7,
      skipped: 0,
      reasons: [],
    });
  });
});

describe("formatSummary", () => {
  it("reports 0 skipped when nothing was skipped", () => {
    const text = formatSummary({
      pythonSkips: [],
      vitest: { ran: 42, skipped: 0, reasons: [] },
      layout: null,
    });
    expect(text).toContain("gates: 42 ran, 0 skipped");
    expect(text).not.toContain("skip reasons:");
  });

  it("names every skip reason, one line each, distinguishing python steps from vitest", () => {
    const text = formatSummary({
      pythonSkips: [
        "ep presets check: skipped -- vendor/tbc-new-fork is absent",
      ],
      vitest: {
        ran: 8,
        skipped: 1,
        reasons: [
          "wowsims-fork-parity (E-W3) skipped: vendor/tbc-new-fork is present but its protos are not generated",
        ],
      },
      layout: null,
    });
    expect(text).toContain("gates: 8 ran, 2 skipped");
    expect(text).toContain(
      "ep presets check: skipped -- vendor/tbc-new-fork is absent"
    );
    expect(text).toContain(
      "wowsims-fork-parity (E-W3) skipped: vendor/tbc-new-fork is present but its protos are not generated"
    );
  });

  it("prints the layout line separately when given, since it is not a verify step", () => {
    const text = formatSummary({
      pythonSkips: [],
      vitest: { ran: 0, skipped: 0, reasons: [] },
      layout: "layout: skipped -- vendor/tbc-new-fork is absent",
    });
    expect(text).toContain("layout: skipped -- vendor/tbc-new-fork is absent");
  });
});

describe("formatVitestFailures", () => {
  it("returns an empty string when nothing failed", () => {
    const report = {
      testResults: [
        {
          name: "/repo/a.test.ts",
          status: "passed",
          assertionResults: [{ fullName: "a works", status: "passed" }],
        },
      ],
    };
    expect(formatVitestFailures(report, "/repo")).toBe("");
  });

  it("names each failed test with its file and the start of its message", () => {
    const report = {
      testResults: [
        {
          name: "/repo/packages/core/test/rank.test.ts",
          status: "failed",
          assertionResults: [
            { fullName: "rank keeps order", status: "passed" },
            {
              fullName: "rank drops heroic items",
              status: "failed",
              failureMessages: [
                "AssertionError: expected 3 to be 2\n    at rank.test.ts:40:5",
              ],
            },
          ],
        },
      ],
    };
    expect(formatVitestFailures(report, "/repo")).toBe(
      [
        "vitest failures (1):",
        "  FAIL packages/core/test/rank.test.ts > rank drops heroic items",
        "    AssertionError: expected 3 to be 2",
        "        at rank.test.ts:40:5",
      ].join("\n")
    );
  });

  it("reports a file that failed without any failed test, such as an import error", () => {
    const report = {
      testResults: [
        {
          name: "/repo/b.test.ts",
          status: "failed",
          message: "Failed to load url ./missing.mjs",
          assertionResults: [],
        },
      ],
    };
    expect(formatVitestFailures(report, "/repo")).toBe(
      [
        "vitest failures (1):",
        "  FAIL b.test.ts",
        "    Failed to load url ./missing.mjs",
      ].join("\n")
    );
  });

  it("keeps only the first lines of a long message", () => {
    const long = Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n");
    const report = {
      testResults: [
        {
          name: "/repo/c.test.ts",
          status: "failed",
          assertionResults: [
            { fullName: "c", status: "failed", failureMessages: [long] },
          ],
        },
      ],
    };
    const text = formatVitestFailures(report, "/repo");
    expect(text).toContain("    line 3");
    expect(text).not.toContain("line 4\n");
    expect(text).toContain("    ... (26 more lines in the JSON report)");
  });
});
