/**
 * vitest's JSON reporter, plus the error of a failed `describe` in the
 * file's `message` when the file has no error of its own (ticket 859).
 *
 * vitest 3.2.7's JSON reporter fills `message` only from the file's own
 * errors. A `beforeAll` that fails inside a `describe` puts its error on the
 * describe and marks the tests skipped, so the report held no error text and
 * `pnpm verify` printed a bare `FAIL <file>`.
 */
import { JsonReporter } from "vitest/reporters";

export default class JsonReporterWithSuiteErrors extends JsonReporter {
  async writeReport(json) {
    const report = JSON.parse(json);
    const files = new Map(
      this.ctx.state.getFiles().map((file) => [file.filepath, file])
    );
    for (const result of report.testResults) {
      const error = result.message
        ? null
        : firstSuiteError(files.get(result.name));
      if (error) result.message = error.message;
    }
    await super.writeReport(JSON.stringify(report));
  }
}

function firstSuiteError(task) {
  for (const child of task?.tasks ?? []) {
    if (child.type !== "suite") continue;
    const error = child.result?.errors?.[0] ?? firstSuiteError(child);
    if (error) return error;
  }
  return null;
}
