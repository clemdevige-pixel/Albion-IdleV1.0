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
    expect(resolveEquipmentPresentation("item_weapon_staff_wildfire_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_staff_wildfire_t8"));
    expect(resolveEquipmentPresentation("item_weapon_staff_blazing_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_staff_blazing_t8"));
    expect(resolveEquipmentPresentation("item_weapon_staff_brimstone_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_staff_brimstone_t8"));
    expect(resolveEquipmentPresentation("item_weapon_staff_great_fire_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_staff_great_fire_t8"));
    expect(resolveEquipmentPresentation("item_weapon_gloves_t3_spiked_gauntlets"))
      .toEqual(resolveEquipmentPresentation("item_weapon_gloves_t4_spiked_gauntlets"));
    expect(resolveEquipmentPresentation("item_weapon_gloves_ursine_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_gloves_ursine_t8"));
    expect(resolveEquipmentPresentation("item_weapon_gloves_ravenstrike_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_gloves_ravenstrike_t8"));
    expect(resolveEquipmentPresentation("item_weapon_gloves_hellfire_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_gloves_hellfire_t8"));
    expect(resolveEquipmentPresentation("item_weapon_gloves_battle_bracers_t4"))
      .toEqual(resolveEquipmentPresentation("item_weapon_gloves_battle_bracers_t8"));
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

    for (const [itemId, itemIcon, actorManifestId] of [
      ["item_weapon_staff_t4_infernal", "icons/armes/infernal staff.png", "hero_infernal"],
      ["item_weapon_staff_wildfire_t4", "icons/armes/wildfire staff.png", "hero_wildfire"],
      ["item_weapon_staff_blazing_t4", "icons/armes/blazing staff.png", "hero_blazing"],
      ["item_weapon_staff_brimstone_t4", "icons/armes/brimestone staff.png", "hero_brimstone"],
      ["item_weapon_staff_great_fire_t4", "icons/armes/great fire staff.png", "hero_great_fire"],
    ] as const) {
      expect(resolveEquipmentPresentation(itemId)).toEqual({
        itemIcon,
        actorManifestId,
        combatProfileId: "projectile",
        combatPresentation: {
          kind: "projectile",
          projectileId: "fireball",
          releaseDelayMs: 355,
        },
      });
    }

    for (const [itemId, itemIcon, actorManifestId] of [
      ["item_weapon_gloves_t4_spiked_gauntlets", "icons/armes/spike.png", "hero_spiked_gauntlets"],
      ["item_weapon_gloves_ursine_t4", "icons/armes/ursine maulers.png", "hero_ursine_maulers"],
      ["item_weapon_gloves_ravenstrike_t4", "icons/armes/ravenstrike cestus.png", "hero_ravenstrike_cestus"],
      ["item_weapon_gloves_hellfire_t4", "icons/armes/hellfire hands.png", "hero_hellfire_hands"],
      ["item_weapon_gloves_battle_bracers_t4", "icons/armes/battle bracers.png", "hero_battle_bracers"],
    ] as const) {
      expect(resolveEquipmentPresentation(itemId)).toEqual({
        itemIcon,
        actorManifestId,
        combatProfileId: "melee",
      });
    }

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

  it("uses dedicated sword art once a specialization sheet exists", () => {
    expect(resolveEquipmentPresentation("item_weapon_sword_clarent_t4")).toEqual({
      itemIcon: "icons/armes/clarent blade.png",
      actorManifestId: "hero_clarent",
      combatProfileId: "melee",
    });
  });

  it("does not add projectile presentation to melee weapons", () => {
    for (const itemId of [
      "item_weapon_sword_t4_broadsword",
      "item_weapon_sword_clarent_t4",
      "item_weapon_gloves_t4_spiked_gauntlets",
      "item_weapon_gloves_ursine_t4",
      "item_weapon_gloves_ravenstrike_t4",
      "item_weapon_gloves_hellfire_t4",
      "item_weapon_gloves_battle_bracers_t4",
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
