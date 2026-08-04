import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineDataCategory } from "../category.js";
import { asDataId } from "../data-id.js";
import type { ValidationIssue } from "../diagnostics.js";
import { loadData } from "../loader/data-loader.js";
import { createInMemorySource } from "../source.js";
import type { SemanticValidator, SemanticValidationContext } from "../validation.js";

const TestSchema = z.object({ id: z.string(), value: z.number() });
const testCategory = defineDataCategory({
  category: "test_items" as const,
  schema: TestSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
});

function testSource(defs: unknown[]) {
  return createInMemorySource("src", {
    version: 1,
    category: "test_items",
    definitions: defs,
  });
}

describe("SemanticValidator", () => {
  it("passes when validator returns no issues", async () => {
    const validator: SemanticValidator = {
      name: "noop",
      validate: () => [],
    };

    const result = await loadData({
      categories: [testCategory],
      sources: [testSource([{ id: "item_a", value: 10 }])],
      validators: [validator],
    });

    expect(result.success).toBe(true);
  });

  it("fails when validator returns errors", async () => {
    const validator: SemanticValidator = {
      name: "value_check",
      validate: (ctx: SemanticValidationContext): readonly ValidationIssue[] => {
        const records = ctx.getRecords(testCategory);
        const issues: ValidationIssue[] = [];
        for (const r of records) {
          if (r.value < 0) {
            issues.push({
              severity: "error",
              code: "DATA_SEMANTIC_ERROR",
              message: `Record "${r.id}" has negative value`,
              category: "test_items",
              recordId: r.id,
            });
          }
        }
        return issues;
      },
    };

    const result = await loadData({
      categories: [testCategory],
      sources: [testSource([{ id: "bad_item", value: -5 }])],
      validators: [validator],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((i) => i.code === "DATA_SEMANTIC_ERROR")).toBe(true);
  });

  it("collects warnings without failing", async () => {
    const validator: SemanticValidator = {
      name: "warn_check",
      validate: (): readonly ValidationIssue[] => [
        {
          severity: "warning",
          code: "DATA_SEMANTIC_ERROR",
          message: "Just a warning",
        },
      ],
    };

    const result = await loadData({
      categories: [testCategory],
      sources: [testSource([{ id: "item_a", value: 1 }])],
      validators: [validator],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.severity).toBe("warning");
  });

  it("aggregates issues from multiple validators", async () => {
    const v1: SemanticValidator = {
      name: "v1",
      validate: (): readonly ValidationIssue[] => [
        { severity: "warning", code: "DATA_SEMANTIC_ERROR", message: "w1" },
      ],
    };
    const v2: SemanticValidator = {
      name: "v2",
      validate: (): readonly ValidationIssue[] => [
        { severity: "warning", code: "DATA_SEMANTIC_ERROR", message: "w2" },
      ],
    };

    const result = await loadData({
      categories: [testCategory],
      sources: [testSource([{ id: "item_a", value: 1 }])],
      validators: [v1, v2],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.warnings).toHaveLength(2);
  });
});
