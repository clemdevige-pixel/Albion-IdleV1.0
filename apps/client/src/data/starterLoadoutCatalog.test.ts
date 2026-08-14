import { describe, expect, it } from "vitest";
import {
  STARTER_ONE_HANDED_OFFHAND_ITEM_ID,
  getStarterLoadoutItemIds,
  getStarterWeaponOptions,
} from "./starterLoadoutCatalog";

describe("starterLoadoutCatalog", () => {
  it("offers every authored T3 weapon and excludes artifact-only T4 weapons", () => {
    const itemIds = getStarterWeaponOptions().map((option) => option.itemId);

    expect(itemIds).toEqual(expect.arrayContaining([
      "item_weapon_sword_t3_broadsword",
      "item_weapon_bow_t3_longbow",
      "item_weapon_staff_t3_infernal",
      "item_weapon_gloves_t3_spiked_gauntlets",
      "item_weapon_dagger_t3_pair",
    ]));
    expect(itemIds).not.toContain("item_weapon_bow_t4_badon");
  });

  it("adds the T3 off-hand only to one-handed starter loadouts", () => {
    expect(getStarterLoadoutItemIds("item_weapon_sword_t3_broadsword"))
      .toContain(STARTER_ONE_HANDED_OFFHAND_ITEM_ID);
    expect(getStarterLoadoutItemIds("item_weapon_bow_t3_longbow"))
      .not.toContain(STARTER_ONE_HANDED_OFFHAND_ITEM_ID);
  });
});
