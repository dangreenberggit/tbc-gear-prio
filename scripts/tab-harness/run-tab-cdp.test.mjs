import { describe, expect, it } from "vitest";

import { parseArgs } from "./run-tab-cdp.mjs";

const ORIGIN = ["--origin", "http://localhost:5173"];

describe("parseArgs --build", () => {
  it("takes a build chip with the gear chip, its phase tab and spec", () => {
    const args = parseArgs([
      ...ORIGIN,
      "--preset-tab",
      "Phase 3",
      "--preset-spec",
      "Survival",
      "--build",
      "DW - 6% hit",
      "--preset",
      "DW - 6% hit",
    ]);
    expect(args).toMatchObject({
      presetTab: "Phase 3",
      presetSpec: "Survival",
      build: "DW - 6% hit",
      preset: "DW - 6% hit",
    });
  });

  it("leaves build null when the flag is absent", () => {
    expect(parseArgs([...ORIGIN, "--preset", "BIS"]).build).toBeNull();
  });

  it("refuses a build without a gear chip, which must load last", () => {
    expect(() => parseArgs([...ORIGIN, "--build", "Arms"])).toThrow(
      /--build needs --preset <chip>/
    );
  });

  it('lists build chips with --build "?" and no gear chip', () => {
    const args = parseArgs([...ORIGIN, "--preset-tab", "?", "--build", "?"]);
    expect(args).toMatchObject({ presetTab: "?", build: "?", preset: null });
  });

  it('refuses --preset-spec with --build "?"', () => {
    expect(() =>
      parseArgs([
        ...ORIGIN,
        "--preset-tab",
        "Phase 3",
        "--preset-spec",
        "Arms",
        "--build",
        "?",
      ])
    ).toThrow(/--preset-spec does not work with/);
  });

  it('still refuses --preset-tab "?" with no list asked for', () => {
    expect(() =>
      parseArgs([...ORIGIN, "--preset-tab", "?", "--preset", "BIS"])
    ).toThrow(/--preset-tab "\?" needs --preset "\?" or --build "\?"/);
  });
});
