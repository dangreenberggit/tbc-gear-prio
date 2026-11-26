// The Chromium the tab harnesses drive: the headless shell the pinned
// `playwright` devDependency installs beside full Chromium. Asking
// Playwright's registry for the path, instead of searching its cache folder,
// follows its own per-OS layout and the browser revision this repo pins, and
// honors PLAYWRIGHT_BROWSERS_PATH.
//
// Why the headless shell (ticket 901): full Chromium aborts at startup inside
// the agent sandbox, whose seccomp filter refuses the Unix socket it needs,
// and the two do not lay text out alike (the shell rounds each glyph's advance
// to a whole pixel), so one browser everywhere keeps every run's geometry the
// same. It is also what Playwright itself launches for headless Chromium
// (playwright-core lib/server/chromium/chromium.js, getExecutableName).
//
// package.json pins `playwright` to an exact version because each Playwright
// release names its own Chromium build (in playwright-core's browsers.json),
// and whether a different build moves the measured geometry is untested. The
// layout gate's digest includes that build (`--build` below, read by
// `_chromium_build` in scripts/check_layout_gate.py), so a bump that changes
// the build reruns the gate.
//
// Run directly, it prints the path and exits 0, or prints why there is none
// and exits 2 (NOT_INSTALLED_EXIT). Any other failure, such as a `playwright`
// package that cannot be imported, exits 1, so the Python gates
// (check_layout_gate.py) can tell a missing browser from a broken lookup.
// With `--build` it prints the headless shell's entry of Playwright's browsers.json
// as JSON.
//
// Install the browser once per machine:
//   pnpm exec playwright install chromium

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Installs full Chromium and the headless shell (without --no-shell).
export const INSTALL_HINT = "pnpm exec playwright install chromium";
const BROWSER = "chromium-headless-shell";
// check_layout_gate.py's CHROMIUM_NOT_INSTALLED_EXIT must match.
const NOT_INSTALLED_EXIT = 2;
const NOT_INSTALLED = "CHROMIUM_NOT_INSTALLED";
// playwright-core is resolved from playwright's own folder because pnpm does
// not link it into the root node_modules.
const fromPlaywright = createRequire(
  createRequire(import.meta.url).resolve("playwright")
);

/**
 * The `chromium` entry (revision, browserVersion, any per-host overrides) of
 * the browsers.json that the resolved `playwright` package's playwright-core
 * reads to choose the build it launches. It is the same on every OS, unlike
 * the executable path.
 */
export function chromiumBuild() {
  const coreDir = path.dirname(
    fromPlaywright.resolve("playwright-core/package.json")
  );
  const { browsers } = JSON.parse(
    fs.readFileSync(path.join(coreDir, "browsers.json"), "utf8")
  );
  const entry = browsers.find((b) => b.name === BROWSER);
  if (!entry)
    throw new Error(`no ${BROWSER} entry in ${coreDir}/browsers.json`);
  return entry;
}

/** Where the headless shell is, or would be once installed. */
export function chromiumExecutablePath() {
  // Playwright's public API names only full Chromium's path; the registry
  // subpath is in playwright-core's package exports.
  const { registry } = fromPlaywright(
    "playwright-core/lib/server/registry/index"
  );
  const exe = registry.findExecutable(BROWSER)?.executablePath("javascript");
  if (!exe) throw new Error(`Playwright's registry has no path for ${BROWSER}`);
  return exe;
}

/** The headless shell's path; throws when it is not installed. */
export function findChromium() {
  const exe = chromiumExecutablePath();
  if (!fs.existsSync(exe))
    throw Object.assign(
      new Error(
        `Playwright's Chromium headless shell is not installed (expected ${exe}). Run: ${INSTALL_HINT}`
      ),
      { code: NOT_INSTALLED }
    );
  return exe;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes("--build"))
      console.log(JSON.stringify(chromiumBuild()));
    else console.log(findChromium());
  } catch (err) {
    console.error(err.message);
    process.exit(err.code === NOT_INSTALLED ? NOT_INSTALLED_EXIT : 1);
  }
}
