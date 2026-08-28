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
    expect(resolveEquipmentPresentation("item_weapon_dagger_demonfang_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_dagger_demonfang_t8"));
    expect(resolveEquipmentPresentation("item_weapon_dagger_deathgivers_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_dagger_deathgivers_t8"));
    expect(resolveEquipmentPresentation("item_weapon_dagger_claws_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_dagger_claws_t8"));
  });

  it("keeps specialization-specific actor/profile/icon choices explicit", () => {
    expect(resolveEquipmentPresentation("item_weapon_sword_t4_broadsword")).toEqual({
      itemIcon: "icons/armes/broadsword.png",
      actorManifestId: "hero_broadsword",
      combatProfileId: "melee",
    });

    expect(resolveEquipmentPresentation("item_weapon_bow_t4_longbow")).toEqual({
      itemIcon: "icons/armes/longbow.png",
      actorManifestId: "hero_longbow",
      combatProfileId: "projectile",
      combatPresentation: {
        kind: "projectile",
        projectileId: "arrow",
        releaseDelayMs: 355,
      },
    });

    expect(resolveEquipmentPresentation("item_weapon_bow_t4_badon")).toEqual({
      itemIcon: "icons/armes/badon bow.png",
      actorManifestId: "hero_bow",
      combatProfileId: "projectile",
      combatPresentation: {
        kind: "projectile",
        projectileId: "badon_arrow",
        releaseDelayMs: 355,
      },
    });

    expect(resolveEquipmentPresentation("item_weapon_staff_t4_infernal")).toEqual({
      itemIcon: "icons/armes/infernal staff.png",
      actorManifestId: "hero_fire_staff",
      combatProfileId: "projectile",
      combatPresentation: {
        kind: "projectile",
        projectileId: "fireball",
        releaseDelayMs: 355,
      },
    });

    expect(resolveEquipmentPresentation("item_weapon_dagger_bloodletter_t4")).toEqual({
      itemIcon: "icons/armes/bloodletter.png",
      actorManifestId: "hero_bloodletter",
      combatProfileId: "melee",
    });

    expect(resolveEquipmentPresentation("item_weapon_dagger_demonfang_t4")).toEqual({
      itemIcon: "icons/armes/demonfang.png",
      actorManifestId: "hero_demonfang",
      combatProfileId: "melee",
    });

    expect(resolveEquipmentPresentation("item_weapon_dagger_deathgivers_t4")).toEqual({
      itemIcon: "icons/armes/deathgivers.png",
      actorManifestId: "hero_deathgivers",
      combatProfileId: "melee",
    });

    expect(resolveEquipmentPresentation("item_weapon_dagger_claws_t4")).toEqual({
      itemIcon: "icons/armes/claws.png",
      actorManifestId: "hero_claws",
      combatProfileId: "melee",
    });
  });

  it("falls back to family combat art until specialization sheets exist", () => {
    expect(resolveEquipmentPresentation("item_weapon_sword_clarent_t4")).toEqual({
      itemIcon: "icons/armes/clarent blade.png",
      actorManifestId: "hero_broadsword",
      combatProfileId: "melee",
    });

    expect(resolveEquipmentPresentation("item_weapon_bow_wailing_t4")).toEqual({
      itemIcon: "icons/armes/wailing bow.png",
      actorManifestId: "hero_longbow",
      combatProfileId: "projectile",
      combatPresentation: {
        kind: "projectile",
        projectileId: "arrow",
        releaseDelayMs: 355,
      },
    });

    expect(resolveEquipmentPresentation("item_weapon_staff_wildfire_t4")).toEqual({
      itemIcon: "icons/armes/wildfire staff.png",
      actorManifestId: "hero_fire_staff",
      combatProfileId: "projectile",
      combatPresentation: {
        kind: "projectile",
        projectileId: "fireball",
        releaseDelayMs: 355,
      },
    });

    expect(resolveEquipmentPresentation("item_weapon_gloves_ursine_t4")).toEqual({
      itemIcon: "icons/armes/ursine maulers.png",
      actorManifestId: "hero_spiked_gauntlets",
      combatProfileId: "melee",
    });
  });

  it("does not add projectile presentation to melee weapons", () => {
    expect(resolveEquipmentPresentation("item_weapon_sword_t4_broadsword")?.combatPresentation)
      .toBeUndefined();

    expect(resolveEquipmentPresentation("item_weapon_gloves_t4_spiked_gauntlets")?.combatPresentation)
      .toBeUndefined();

    expect(resolveEquipmentPresentation("item_weapon_dagger_t4_pair")?.combatPresentation)
      .toBeUndefined();

    expect(resolveEquipmentPresentation("item_weapon_dagger_demonfang_t4")?.combatPresentation)
      .toBeUndefined();

    expect(resolveEquipmentPresentation("item_weapon_dagger_deathgivers_t4")?.combatPresentation)
      .toBeUndefined();

    expect(resolveEquipmentPresentation("item_weapon_dagger_claws_t4")?.combatPresentation)
      .toBeUndefined();
  });

  it("does not infer presentation for unknown weapon ids", () => {
    expect(resolveEquipmentPresentation("item_weapon_bow_t9_fake")).toBeUndefined();
    expect(resolveEquipmentPresentation(undefined)).toBeUndefined();
  });
});
