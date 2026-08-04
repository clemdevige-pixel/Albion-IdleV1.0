import { describe, expect, it } from "vitest";
import { validateDataId, asDataId } from "../data-id.js";

describe("validateDataId", () => {
  it("accepts a valid snake_case id", () => {
    expect(validateDataId("item_broadsword_t4", "items")).toBeNull();
  });

  it("accepts a single lowercase letter", () => {
    expect(validateDataId("a", "items")).toBeNull();
  });

  it("accepts letters and digits", () => {
    expect(validateDataId("weapon3", "items")).toBeNull();
  });

  it("rejects an empty string", () => {
    const issue = validateDataId("", "items");
    expect(issue).not.toBeNull();
    expect(issue!.code).toBe("DATA_INVALID_ID");
  });

  it("rejects uppercase letters", () => {
    const issue = validateDataId("Item_Sword", "items");
    expect(issue).not.toBeNull();
    expect(issue!.code).toBe("DATA_INVALID_ID");
  });

  it("rejects leading digit", () => {
    const issue = validateDataId("3sword", "items");
    expect(issue).not.toBeNull();
  });

  it("rejects hyphens", () => {
    const issue = validateDataId("item-sword", "items");
    expect(issue).not.toBeNull();
  });

  it("rejects spaces", () => {
    const issue = validateDataId("item sword", "items");
    expect(issue).not.toBeNull();
  });

  it("includes source in the issue when provided", () => {
    const issue = validateDataId("", "items", "test-source");
    expect(issue!.source).toBe("test-source");
  });
});

describe("asDataId", () => {
  it("returns the string typed as DataId", () => {
    const id = asDataId<"items">("item_sword_t1");
    expect(id).toBe("item_sword_t1");
  });
});
