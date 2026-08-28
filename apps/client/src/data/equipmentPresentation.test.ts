import { describe, expect, it } from "vitest";
import { resolveEquipmentPresentation } from "./equipmentPresentation.js";

describe("weapon equipment presentation", () => {
  it("reuses one presentation definition across tiers of the same specialization", () => {
    expect(resolveEquipmentPresentation("item_weapon_sword_t3_broadsword"))
      .toEqual(resolveEquipmentPresentation("item_weapon_sword_t4_broadsword"));
    expect(resolveEquipmentPresentation("item_weapon_bow_t3_longbow"))
      .toEqual(resolveEquipmentPresentation("item_weapon_bow_t4_longbow"));
    expect(resolveEquipmentPresentation("item_weapon_bow_t4_badon"))
      .toEqual(resolveEquipmentPresentation("item_weapon_bow_t8_badon"));
    expect(resolveEquipmentPresentation("item_weapon_bow_wailing_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_bow_wailing_t8"));
    expect(resolveEquipmentPresentation("item_weapon_bow_whispering_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_bow_whispering_t8"));
    expect(resolveEquipmentPresentation("item_weapon_bow_warbow_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_bow_warbow_t8"));
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
      actorManifestId: "hero_badon",
      combatProfileId: "projectile",
      combatPresentation: {
        kind: "projectile",
        projectileId: "badon_arrow",
        releaseDelayMs: 355,
      },
    });

    for (const [itemId, itemIcon, actorManifestId] of [
      ["item_weapon_bow_wailing_t4", "icons/armes/wailing bow.png", "hero_wailing"],
      ["item_weapon_bow_whispering_t4", "icons/armes/whispering bow.png", "hero_whispering"],
      ["item_weapon_bow_warbow_t4", "icons/armes/warbow.png", "hero_warbow"],
    ] as const) {
      expect(resolveEquipmentPresentation(itemId)).toEqual({
        itemIcon,
        actorManifestId,
        combatProfileId: "projectile",
        combatPresentation: {
          kind: "projectile",
          projectileId: "arrow",
          releaseDelayMs: 355,
        },
      });
    }

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

    for (const [itemId, itemIcon, actorManifestId] of [
      ["item_weapon_dagger_bloodletter_t4", "icons/armes/bloodletter.png", "hero_bloodletter"],
      ["item_weapon_dagger_demonfang_t4", "icons/armes/demonfang.png", "hero_demonfang"],
      ["item_weapon_dagger_deathgivers_t4", "icons/armes/deathgivers.png", "hero_deathgivers"],
      ["item_weapon_dagger_claws_t4", "icons/armes/claws.png", "hero_claws"],
    ] as const) {
      expect(resolveEquipmentPresentation(itemId)).toEqual({
        itemIcon,
        actorManifestId,
        combatProfileId: "melee",
      });
    }
  });

  it("falls back to family combat art until specialization sheets exist", () => {
    expect(resolveEquipmentPresentation("item_weapon_sword_clarent_t4")).toEqual({
      itemIcon: "icons/armes/clarent blade.png",
      actorManifestId: "hero_broadsword",
      combatProfileId: "melee",
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
    for (const itemId of [
      "item_weapon_sword_t4_broadsword",
      "item_weapon_gloves_t4_spiked_gauntlets",
      "item_weapon_dagger_t4_pair",
      "item_weapon_dagger_demonfang_t4",
      "item_weapon_dagger_deathgivers_t4",
      "item_weapon_dagger_claws_t4",
    ]) {
      expect(resolveEquipmentPresentation(itemId)?.combatPresentation).toBeUndefined();
    }
  });

  it("does not infer presentation for unknown weapon ids", () => {
    expect(resolveEquipmentPresentation("item_weapon_bow_t9_fake")).toBeUndefined();
    expect(resolveEquipmentPresentation(undefined)).toBeUndefined();
  });
});
