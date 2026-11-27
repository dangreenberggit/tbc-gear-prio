import path from "node:path";

import { describe, expect, it } from "vitest";

import { chromiumBuild, chromiumExecutablePath } from "./chromium.mjs";

// Ticket 901: full Chromium aborts inside the agent sandbox, and it measures
// text a little wider or narrower than the headless shell does (glyph
// advances), so the harnesses run the headless shell everywhere and the
// gate's digest names that build.
describe("the Chromium the tab harnesses drive", () => {
  it("is Playwright's headless shell", () => {
    expect(path.basename(chromiumExecutablePath())).toMatch(
      /^chrome-headless-shell(\.exe)?$/
    );
  });

  it("is the build the layout digest records", () => {
    expect(chromiumBuild().name).toBe("chromium-headless-shell");
  });
});
