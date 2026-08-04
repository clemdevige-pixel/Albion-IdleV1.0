/**
 * Raised when a content or asset source fails to load or validate.
 *
 * Carries actionable context (the offending source path and a list of issues)
 * so callers — in particular the validation CLIs — can report precisely and
 * exit with a non-zero status.
 */
export class DataValidationError extends Error {
  public readonly sourcePath: string;
  public readonly issues: readonly string[];

  constructor(sourcePath: string, issues: readonly string[], options?: { cause?: unknown }) {
    super(`Validation failed for "${sourcePath}":\n  - ${issues.join("\n  - ")}`, options);
    this.name = "DataValidationError";
    this.sourcePath = sourcePath;
    this.issues = issues;
  }
}
