import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineDataCategory } from "../category.js";
import { asDataId } from "../data-id.js";
import { loadData } from "../loader/data-loader.js";
import { createInMemorySource } from "../source.js";

const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.number().int().positive(),
});

const itemCategory = defineDataCategory({
  category: "items" as const,
  schema: ItemSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
});

function itemSource(defs: unknown[], sourceId = "items_src") {
  return createInMemorySource(sourceId, {
    version: 1,
    category: "items",
    definitions: defs,
  });
}

describe("loadData", () => {
  it("loads valid data into a registry", async () => {
    const result = await loadData({
      categories: [itemCategory],
      sources: [
        itemSource([
          { id: "sword_t1", name: "Sword", tier: 1 },
          { id: "bow_t2", name: "Bow", tier: 2 },
        ]),
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    const reg = result.value.getRegistry(itemCategory);
    expect(reg.getCount()).toBe(2);
    expect(reg.get(asDataId("sword_t1")).name).toBe("Sword");
  });

  it("fails on schema violation", async () => {
    const result = await loadData({
      categories: [itemCategory],
      sources: [itemSource([{ id: "bad", name: "Bad" }])], // missing tier
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((i) => i.code === "DATA_SCHEMA_INVALID")).toBe(true);
  });

  it("fails on duplicate id", async () => {
    const result = await loadData({
      categories: [itemCategory],
      sources: [
        itemSource([
          { id: "sword_t1", name: "Sword", tier: 1 },
          { id: "sword_t1", name: "Other Sword", tier: 1 },
        ]),
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((i) => i.code === "DATA_DUPLICATE_ID")).toBe(true);
  });

  it("fails on invalid id format", async () => {
    const result = await loadData({
      categories: [itemCategory],
      sources: [itemSource([{ id: "BadId", name: "Bad", tier: 1 }])],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((i) => i.code === "DATA_INVALID_ID")).toBe(true);
  });

  it("fails on wrong version", async () => {
    const result = await loadData({
      categories: [itemCategory],
      sources: [
        createInMemorySource("src", {
          version: 99,
          category: "items",
          definitions: [],
        }),
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((i) => i.code === "DATA_UNSUPPORTED_VERSION")).toBe(true);
  });

  it("fails on bad envelope", async () => {
    const result = await loadData({
      categories: [itemCategory],
      sources: [createInMemorySource("src", { bad: true })],
    });

    expect(result.success).toBe(false);
  });

  it("fails on unknown category", async () => {
    const result = await loadData({
      categories: [itemCategory],
      sources: [
        createInMemorySource("src", {
          version: 1,
          category: "nonexistent",
          definitions: [],
        }),
      ],
    });

    expect(result.success).toBe(false);
  });

  it("succeeds with zero sources and zero definitions", async () => {
    const result = await loadData({
      categories: [itemCategory],
      sources: [],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.getRegistry(itemCategory).getCount()).toBe(0);
  });

  it("handles load errors gracefully", async () => {
    const badSource = {
      sourceId: "broken",
      load: () => Promise.reject(new Error("disk on fire")),
    };
    const result = await loadData({
      categories: [itemCategory],
      sources: [badSource],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues[0]!.message).toContain("disk on fire");
  });
});
