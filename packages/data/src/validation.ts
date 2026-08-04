import type { DataCategory } from "./category.js";
import type { ValidationIssue } from "./diagnostics.js";

/** Context passed to semantic validators — provides read access to all loaded records. */
export interface SemanticValidationContext {
  getRecords<TRecord, TCategory extends string>(
    category: DataCategory<TRecord, TCategory>,
  ): readonly TRecord[];
}

/** A custom semantic validator that runs after schema + reference validation. */
export interface SemanticValidator {
  readonly name: string;
  validate(context: SemanticValidationContext): readonly ValidationIssue[];
}
