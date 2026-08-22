import { describe, expect, it } from "vitest";
import { placeholder } from "../server/main.js";

// Proves the workspace is wired: apps/web compiles, vitest collects from
// here, and the server entry is importable. The slices that fill in the
// server and the UI replace this with their own tests.
describe("apps/web scaffold", () => {
  it("imports the server entry point", () => {
    expect(placeholder()).toContain("tbc gear prio");
  });
});
