import { describe, expect, it } from "vitest";
import { resolveEquipmentPresentation } from "./equipmentPresentation.js";

describe("weapon equipment presentation", () => {
  it("reuses one presentation definition across tiers of the same specialization", () => {
    expect(resolveEquipmentPresentation("item_weapon_sword_t3_broadsword"))
      .toEqual(resolveEquipmentPresentation("item_weapon_sword_t4_broadsword"));
    expect(resolveEquipmentPresentation("item_weapon_bow_t3_longbow"))
      .toEqual(resolveEquipmentPresentation("item_weapon_bow_t4_longbow"));
    expect(resolveEquipmentPresentation("item_weapon_staff_t3_infernal"))
      .toEqual(resolveEquipmentPresentation("item_weapon_staff_t4_infernal"));
    expect(resolveEquipmentPresentation("item_weapon_gloves_t3_spiked_gauntlets"))
      .toEqual(resolveEquipmentPresentation("item_weapon_gloves_t4_spiked_gauntlets"));
  });

  it("keeps specialization-specific actor/profile/icon choices explicit", () => {
    expect(resolveEquipmentPresentation("item_weapon_sword_t4_broadsword")).toEqual({
      itemIcon: "item-broadsword-pixel-v1.png",
      actorManifestId: "hero_broadsword",
      combatProfileId: "melee",
    });

    expect(resolveEquipmentPresentation("item_weapon_bow_t4_longbow")).toEqual({
      itemIcon: "item-longbow-pixel-v1.png",
      actorManifestId: "hero_longbow",
      combatProfileId: "projectile",
      combatPresentation: {
        kind: "projectile",
        projectileId: "arrow",
        releaseDelayMs: 355,
      },
    });

    expect(resolveEquipmentPresentation("item_weapon_bow_t4_badon")).toEqual({
      itemIcon: "item-badon-pixel-v1.png",
      actorManifestId: "hero_bow",
      combatProfileId: "projectile",
      combatPresentation: {
        kind: "projectile",
        projectileId: "badon_arrow",
        releaseDelayMs: 355,
      },
    });

    expect(resolveEquipmentPresentation("item_weapon_staff_t4_infernal")).toEqual({
      itemIcon: "item-fire-staff-pixel-v1.png",
      actorManifestId: "hero_fire_staff",
      combatProfileId: "projectile",
      combatPresentation: {
        kind: "projectile",
        projectileId: "fireball",
        releaseDelayMs: 355,
      },
    });
  });

  it("does not add projectile presentation to melee weapons", () => {
    expect(resolveEquipmentPresentation("item_weapon_sword_t4_broadsword")?.combatPresentation)
      .toBeUndefined();

    expect(resolveEquipmentPresentation("item_weapon_gloves_t4_spiked_gauntlets")?.combatPresentation)
      .toBeUndefined();

    expect(resolveEquipmentPresentation("item_weapon_dagger_t4_pair")?.combatPresentation)
      .toBeUndefined();
  });

  it("does not infer presentation for unknown weapon ids", () => {
    expect(resolveEquipmentPresentation("item_weapon_bow_t9_fake")).toBeUndefined();
    expect(resolveEquipmentPresentation(undefined)).toBeUndefined();
  });
});
