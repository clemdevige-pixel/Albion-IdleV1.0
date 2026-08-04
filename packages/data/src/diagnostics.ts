/** Severity level for validation issues. */
export type Severity = "error" | "warning";

/** Issue codes emitted by the data pipeline. */
export type IssueCode =
  | "DATA_PARSE_ERROR"
  | "DATA_SCHEMA_INVALID"
  | "DATA_DUPLICATE_ID"
  | "DATA_UNKNOWN_REFERENCE"
  | "DATA_INVALID_ID"
  | "DATA_UNSUPPORTED_VERSION"
  | "DATA_SEMANTIC_ERROR";

/** A single validation issue produced during data loading. */
export interface ValidationIssue {
  readonly severity: Severity;
  readonly code: IssueCode;
  readonly message: string;
  readonly category?: string;
  readonly source?: string;
  readonly recordId?: string;
  readonly fieldPath?: readonly string[];
}

/** Discriminated result of a validation pipeline. */
export type ValidationResult<T> =
  | { readonly success: true; readonly value: T; readonly warnings: readonly ValidationIssue[] }
  | { readonly success: false; readonly issues: readonly ValidationIssue[] };

/** Helper to create a successful result. */
export function ok<T>(value: T, warnings: readonly ValidationIssue[] = []): ValidationResult<T> {
  return { success: true, value, warnings };
}

/** Helper to create a failed result. */
export function fail<T>(issues: readonly ValidationIssue[]): ValidationResult<T> {
  return { success: false, issues };
}
