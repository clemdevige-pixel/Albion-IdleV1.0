import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineDataCategory } from "../category.js";
import { asDataId } from "../data-id.js";

const TestSchema = z.object({
  id: z.string(),
  name: z.string(),
});

describe("defineDataCategory", () => {
  it("creates a category with the given properties", () => {
    const cat = defineDataCategory({
      category: "test_items" as const,
      schema: TestSchema,
      version: 1,
      getId: (r) => asDataId(r.id),
    });

    expect(cat.category).toBe("test_items");
    expect(cat.version).toBe(1);
  });

  it("getId extracts the id from a record", () => {
    const cat = defineDataCategory({
      category: "test_items" as const,
      schema: TestSchema,
      version: 1,
      getId: (r) => asDataId(r.id),
    });

    const id = cat.getId({ id: "sword_t1", name: "Sword" });
    expect(id).toBe("sword_t1");
  });

  it("schema validates records", () => {
    const cat = defineDataCategory({
      category: "test_items" as const,
      schema: TestSchema,
      version: 1,
      getId: (r) => asDataId(r.id),
    });

    const result = cat.schema.safeParse({ id: "x", name: "y" });
    expect(result.success).toBe(true);

    const bad = cat.schema.safeParse({ id: 123 });
    expect(bad.success).toBe(false);
  });

  it("supports getReferences", () => {
    const cat = defineDataCategory({
      category: "test_items" as const,
      schema: TestSchema,
      version: 1,
      getId: (r) => asDataId(r.id),
      getReferences: (r) => [{ targetCategory: "other", targetId: r.name }],
    });

    expect("getReferences" in cat).toBe(true);
    const refs = cat.getReferences!({ id: "x", name: "ref_target" });
    expect(refs).toEqual([{ targetCategory: "other", targetId: "ref_target" }]);
  });
});
