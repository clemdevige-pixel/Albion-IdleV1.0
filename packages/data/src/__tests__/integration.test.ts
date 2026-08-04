import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineDataCategory } from "../category.js";
import { asDataId } from "../data-id.js";
import type { ValidationIssue } from "../diagnostics.js";
import { loadData } from "../loader/data-loader.js";
import { createInMemorySource } from "../source.js";
import type { SemanticValidator, SemanticValidationContext } from "../validation.js";

// -- Test schemas --
const ParentSchema = z.object({ id: z.string(), label: z.string() });
const ChildSchema = z.object({
  id: z.string(),
  parent_id: z.string(),
  weight: z.number(),
});

const parentCat = defineDataCategory({
  category: "test_parents" as const,
  schema: ParentSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
});

const childCat = defineDataCategory({
  category: "test_children" as const,
  schema: ChildSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
  getReferences: (r) => [{ targetCategory: "test_parents", targetId: r.parent_id }],
});

describe("Integration", () => {
  it("A: valid pipeline with 2 categories + reference", async () => {
    const result = await loadData({
      categories: [parentCat, childCat],
      sources: [
        createInMemorySource("parents", {
          version: 1,
          category: "test_parents",
          definitions: [
            { id: "parent_a", label: "Alpha" },
            { id: "parent_b", label: "Beta" },
          ],
        }),
        createInMemorySource("children", {
          version: 1,
          category: "test_children",
          definitions: [
            { id: "child_x", parent_id: "parent_a", weight: 10 },
            { id: "child_y", parent_id: "parent_b", weight: 20 },
          ],
        }),
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    const parents = result.value.getRegistry(parentCat);
    const children = result.value.getRegistry(childCat);
    expect(parents.getCount()).toBe(2);
    expect(children.getCount()).toBe(2);
    expect(children.get(asDataId("child_x")).parent_id).toBe("parent_a");
  });

  it("B: multiple errors aggregated (bad schema + dup ID + unknown ref)", async () => {
    const result = await loadData({
      categories: [parentCat, childCat],
      sources: [
        createInMemorySource("parents", {
          version: 1,
          category: "test_parents",
          definitions: [
            { id: "parent_a", label: "Alpha" },
            { id: "parent_a", label: "Duplicate" }, // dup
          ],
        }),
        createInMemorySource("children", {
          version: 1,
          category: "test_children",
          definitions: [
            { id: "child_x", parent_id: "nonexistent", weight: 10 }, // bad ref
            { id: "child_bad" }, // schema error (missing fields)
          ],
        }),
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain("DATA_DUPLICATE_ID");
    expect(codes).toContain("DATA_SCHEMA_INVALID");
    expect(codes).toContain("DATA_UNKNOWN_REFERENCE");
  });

  it("C: determinism — different source order produces same result", async () => {
    const parentSource = createInMemorySource("a_parents", {
      version: 1,
      category: "test_parents",
      definitions: [{ id: "parent_a", label: "A" }],
    });
    const childSource = createInMemorySource("b_children", {
      version: 1,
      category: "test_children",
      definitions: [{ id: "child_x", parent_id: "parent_a", weight: 5 }],
    });

    const r1 = await loadData({
      categories: [parentCat, childCat],
      sources: [childSource, parentSource],
    });
    const r2 = await loadData({
      categories: [parentCat, childCat],
      sources: [parentSource, childSource],
    });

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    if (!r1.success || !r2.success) return;
    expect(r1.value.getRegistry(parentCat).getAll()).toEqual(
      r2.value.getRegistry(parentCat).getAll(),
    );
    expect(r1.value.getRegistry(childCat).getAll()).toEqual(
      r2.value.getRegistry(childCat).getAll(),
    );
  });

  it("D: no partial registry on error", async () => {
    const result = await loadData({
      categories: [parentCat, childCat],
      sources: [
        createInMemorySource("parents", {
          version: 1,
          category: "test_parents",
          definitions: [{ id: "parent_a", label: "A" }],
        }),
        createInMemorySource("children", {
          version: 1,
          category: "test_children",
          definitions: [{ id: "child_x", parent_id: "nonexistent", weight: 10 }],
        }),
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    // No value property on failure
    expect("value" in result).toBe(false);
  });

  it("E: semantic validator integrated in full pipeline", async () => {
    const weightValidator: SemanticValidator = {
      name: "weight_validator",
      validate: (ctx: SemanticValidationContext): readonly ValidationIssue[] => {
        const children = ctx.getRecords(childCat);
        const issues: ValidationIssue[] = [];
        for (const c of children) {
          if (c.weight > 100) {
            issues.push({
              severity: "error",
              code: "DATA_SEMANTIC_ERROR",
              message: `Child "${c.id}" weight ${c.weight} exceeds max 100`,
              category: "test_children",
              recordId: c.id,
            });
          }
        }
        return issues;
      },
    };

    const result = await loadData({
      categories: [parentCat, childCat],
      sources: [
        createInMemorySource("parents", {
          version: 1,
          category: "test_parents",
          definitions: [{ id: "parent_a", label: "A" }],
        }),
        createInMemorySource("children", {
          version: 1,
          category: "test_children",
          definitions: [{ id: "child_x", parent_id: "parent_a", weight: 999 }],
        }),
      ],
      validators: [weightValidator],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((i) => i.code === "DATA_SEMANTIC_ERROR")).toBe(true);
  });
});
