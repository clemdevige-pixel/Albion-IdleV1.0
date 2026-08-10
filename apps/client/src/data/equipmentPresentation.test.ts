import { describe, expect, it } from "vitest";
import { resolveEquipmentPresentation } from "./equipmentPresentation.js";

describe("weapon equipment presentation", () => {
  it("reuses one presentation definition across tiers of the same specialization", () => {
    expect(resolveEquipmentPresentation("item_weapon_sword_t3_broadsword"))
      .toEqual(resolveEquipmentPresentation("item_weapon_sword_t4_broadsword"));
    expect(resolveEquipmentPresentation("item_weapon_bow_t3_longbow"))
      .toEqual(resolveEquipmentPresentation("item_weapon_bow_t4_longbow"));
    expect(resolveEquipmentPresentation("item_weapon_staff_t3_fire"))
      .toEqual(resolveEquipmentPresentation("item_weapon_staff_t4_fire"));
    expect(resolveEquipmentPresentation("item_weapon_gloves_t3_spiked_gauntlets"))
      .toEqual(resolveEquipmentPresentation("item_weapon_gloves_t4_spiked_gauntlets"));
  });

  it("keeps specialization-specific actor/profile/icon choices explicit", () => {
    expect(resolveEquipmentPresentation("item_weapon_sword_t4_broadsword")).toEqual({
      itemIcon: "item-broadsword-pixel-v1.png",
      actorManifestId: "hero_broadsword",
      combatProfileId: "melee",
    });
    expect(resolveEquipmentPresentation("item_weapon_bow_t4_badon")).toEqual({
      itemIcon: "item-badon-pixel-v1.png",
      actorManifestId: "hero_bow",
      combatProfileId: "badon",
    });
  });

  it("does not infer presentation for unknown weapon ids", () => {
    expect(resolveEquipmentPresentation("item_weapon_bow_t9_fake")).toBeUndefined();
    expect(resolveEquipmentPresentation(undefined)).toBeUndefined();
  });
});
