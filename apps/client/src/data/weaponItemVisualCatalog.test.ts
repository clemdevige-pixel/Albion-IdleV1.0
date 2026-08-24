import { describe, expect, it } from "vitest";
import {
  WEAPON_ITEM_DEFINITIONS,
  resolveWeaponMastery,
} from "./weaponContentCatalog.js";
import { resolveWeaponItemIcon } from "./weaponItemVisualCatalog.js";

describe("weapon item visual catalog", () => {
  it("covers every authored weapon specialization with one icon", () => {
    const iconByMastery = new Map<string, string>();

    for (const itemId of Object.keys(WEAPON_ITEM_DEFINITIONS)) {
      const mastery = resolveWeaponMastery(itemId);
      const icon = resolveWeaponItemIcon(itemId);
      expect(mastery, `${itemId}: mastery`).toBeDefined();
      expect(icon, `${itemId}: item icon`).toBeDefined();
      if (mastery !== undefined && icon !== undefined) {
        const existing = iconByMastery.get(mastery.weaponId);
        if (existing === undefined) iconByMastery.set(mastery.weaponId, icon);
        else expect(icon, `${itemId}: stable specialization icon`).toBe(existing);
      }
    }

    expect(iconByMastery.size).toBe(25);
    expect(new Set(iconByMastery.values()).size).toBe(25);
  });

  it("uses the newly authored filenames", () => {
    expect(resolveWeaponItemIcon("item_weapon_sword_t4_broadsword")).toBe("broadsword.png");
    expect(resolveWeaponItemIcon("item_weapon_bow_t4_badon")).toBe("badon bow.png");
    expect(resolveWeaponItemIcon("item_weapon_staff_brimstone_t8")).toBe("brimestone staff.png");
    expect(resolveWeaponItemIcon("item_weapon_dagger_deathgivers_t8")).toBe("deathgivers.png");
  });
});
