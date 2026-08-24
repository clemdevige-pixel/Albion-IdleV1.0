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
      itemIcon: "broadsword.png",
      actorManifestId: "hero_broadsword",
      combatProfileId: "melee",
    });

    expect(resolveEquipmentPresentation("item_weapon_bow_t4_longbow")).toEqual({
      itemIcon: "longbow.png",
      actorManifestId: "hero_longbow",
      combatProfileId: "projectile",
      combatPresentation: {
        kind: "projectile",
        projectileId: "arrow",
        releaseDelayMs: 355,
      },
    });

    expect(resolveEquipmentPresentation("item_weapon_bow_t4_badon")).toEqual({
      itemIcon: "badon bow.png",
      actorManifestId: "hero_bow",
      combatProfileId: "projectile",
      combatPresentation: {
        kind: "projectile",
        projectileId: "badon_arrow",
        releaseDelayMs: 355,
      },
    });

    expect(resolveEquipmentPresentation("item_weapon_staff_t4_infernal")).toEqual({
      itemIcon: "infernal staff.png",
      actorManifestId: "hero_fire_staff",
      combatProfileId: "projectile",
      combatPresentation: {
        kind: "projectile",
        projectileId: "fireball",
        releaseDelayMs: 355,
      },
    });
  });

  it("exposes artifact item icons without inventing combat actor art", () => {
    expect(resolveEquipmentPresentation("item_weapon_sword_clarent_t4")).toEqual({
      itemIcon: "clarent blade.png",
    });
    expect(resolveEquipmentPresentation("item_weapon_dagger_deathgivers_t8")).toEqual({
      itemIcon: "deathgivers.png",
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
