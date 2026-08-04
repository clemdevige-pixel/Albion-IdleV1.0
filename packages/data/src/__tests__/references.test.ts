import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineDataCategory } from "../category.js";
import { asDataId } from "../data-id.js";
import { loadData } from "../loader/data-loader.js";
import { createInMemorySource } from "../source.js";

const ParentSchema = z.object({ id: z.string(), name: z.string() });
const ChildSchema = z.object({ id: z.string(), parent_id: z.string() });

const parentCategory = defineDataCategory({
  category: "parents" as const,
  schema: ParentSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
});

const childCategory = defineDataCategory({
  category: "children" as const,
  schema: ChildSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
  getReferences: (r) => [{ targetCategory: "parents", targetId: r.parent_id }],
});

describe("reference resolution", () => {
  it("succeeds when all references exist", async () => {
    const result = await loadData({
      categories: [parentCategory, childCategory],
      sources: [
        createInMemorySource("parents_src", {
          version: 1,
          category: "parents",
          definitions: [{ id: "parent_a", name: "A" }],
        }),
        createInMemorySource("children_src", {
          version: 1,
          category: "children",
          definitions: [{ id: "child_x", parent_id: "parent_a" }],
        }),
      ],
    });

    expect(result.success).toBe(true);
  });

  it("fails on unknown reference target", async () => {
    const result = await loadData({
      categories: [parentCategory, childCategory],
      sources: [
        createInMemorySource("parents_src", {
          version: 1,
          category: "parents",
          definitions: [{ id: "parent_a", name: "A" }],
        }),
        createInMemorySource("children_src", {
          version: 1,
          category: "children",
          definitions: [{ id: "child_x", parent_id: "nonexistent" }],
        }),
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((i) => i.code === "DATA_UNKNOWN_REFERENCE")).toBe(true);
  });

  it("fails when reference targets an unknown category", async () => {
    const badChildCategory = defineDataCategory({
      category: "bad_children" as const,
      schema: ChildSchema,
      version: 1,
      getId: (r) => asDataId(r.id),
      getReferences: (r) => [{ targetCategory: "nonexistent_cat", targetId: r.parent_id }],
    });

    const result = await loadData({
      categories: [badChildCategory],
      sources: [
        createInMemorySource("src", {
          version: 1,
          category: "bad_children",
          definitions: [{ id: "child_x", parent_id: "whatever" }],
        }),
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((i) => i.code === "DATA_UNKNOWN_REFERENCE")).toBe(true);
  });

  it("resolves references regardless of source order", async () => {
    // Children source sorted before parents source — should still work
    const result = await loadData({
      categories: [parentCategory, childCategory],
      sources: [
        createInMemorySource("a_children", {
          version: 1,
          category: "children",
          definitions: [{ id: "child_x", parent_id: "parent_a" }],
        }),
        createInMemorySource("b_parents", {
          version: 1,
          category: "parents",
          definitions: [{ id: "parent_a", name: "A" }],
        }),
      ],
    });

    expect(result.success).toBe(true);
  });
});
