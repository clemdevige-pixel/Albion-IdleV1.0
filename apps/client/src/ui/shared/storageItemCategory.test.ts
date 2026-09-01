import { describe, expect, it } from "vitest";
import { getStorageItemCategory } from "./storageItemCategory";

describe("shared storage item categories", () => {
  it("classifies authored equipment consistently", () => {
    expect(getStorageItemCategory("item_weapon_sword_t4_broadsword")).toBe("equipment");
    expect(getStorageItemCategory("item_cape_t4_heretic")).toBe("equipment");
  });

  it("keeps special dungeon loot out of generic resources", () => {
    expect(getStorageItemCategory("item_resource_dungeon_key_t4")).toBe("special");
    expect(getStorageItemCategory("item_resource_artifact_heretic")).toBe("special");
  });

  it("uses resources as the default non-equipment storage category", () => {
    expect(getStorageItemCategory("item_resource_wood_t4")).toBe("resources");
    expect(getStorageItemCategory("item_health_potion")).toBe("resources");
  });
});
