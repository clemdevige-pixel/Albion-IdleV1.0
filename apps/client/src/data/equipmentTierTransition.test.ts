import { describe, expect, it } from "vitest";
import {
  getEnchantmentStatMultiplier,
  roundEquipmentStatValue,
  type StatId,
} from "@game/gameplay";
import { PROGRESSION_EQUIPMENT_CONTENT } from "./nonWeaponEquipmentContentCatalog.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";

const STANDARD_WEAPON_TIERS = [
  ["item_weapon_sword_t4_broadsword", "item_weapon_sword_t5_broadsword", "item_weapon_sword_t6_broadsword", "item_weapon_sword_t7_broadsword", "item_weapon_sword_t8_broadsword"],
  ["item_weapon_bow_t4_longbow", "item_weapon_bow_t5_longbow", "item_weapon_bow_t6_longbow", "item_weapon_bow_t7_longbow", "item_weapon_bow_t8_longbow"],
  ["item_weapon_staff_t4_infernal", "item_weapon_staff_t5_infernal", "item_weapon_staff_t6_infernal", "item_weapon_staff_t7_infernal", "item_weapon_staff_t8_infernal"],
  ["item_weapon_gloves_t4_spiked_gauntlets", "item_weapon_gloves_t5_spiked_gauntlets", "item_weapon_gloves_t6_spiked_gauntlets", "item_weapon_gloves_t7_spiked_gauntlets", "item_weapon_gloves_t8_spiked_gauntlets"],
  ["item_weapon_dagger_t4_pair", "item_weapon_dagger_t5_pair", "item_weapon_dagger_t6_pair", "item_weapon_dagger_t7_pair", "item_weapon_dagger_t8_pair"],
] as const;

function assertNextTierBeatsPreviousTierThree(previousItemId: string, nextItemId: string): void {
  const previous = resolveEquipmentInfo(previousItemId);
  const next = resolveEquipmentInfo(nextItemId);
  expect(previous, `${previousItemId} definition`).toBeDefined();
  expect(next, `${nextItemId} definition`).toBeDefined();
  if (previous?.stats === undefined || next?.stats === undefined) return;

  for (const [rawStatId, previousBase] of Object.entries(previous.stats)) {
    if (previousBase === undefined || previousBase <= 0) continue;
    const nextBase = next.stats[rawStatId as keyof typeof next.stats];
    expect(nextBase, `${nextItemId} ${rawStatId}`).toBeDefined();
    if (nextBase === undefined) continue;

    const statId = rawStatId as StatId;
    const previousTierThree = roundEquipmentStatValue(
      statId,
      previousBase * getEnchantmentStatMultiplier(3),
    );
    const nextTierZero = roundEquipmentStatValue(statId, nextBase);

    expect(
      nextTierZero,
      `${nextItemId} ${rawStatId} must beat ${previousItemId}.3 (${String(previousTierThree)})`,
    ).toBeGreaterThan(previousTierThree);
  }
}

describe("equipment tier transition contract", () => {
  it("keeps every conventional non-weapon Tn+1.0 stat above Tn.3", () => {
    for (const family of PROGRESSION_EQUIPMENT_CONTENT) {
      const enchantableTiers = family.items.filter((item) => item.tier >= 4);
      for (let index = 0; index < enchantableTiers.length - 1; index += 1) {
        const previous = enchantableTiers[index];
        const next = enchantableTiers[index + 1];
        if (previous === undefined || next === undefined) continue;
        assertNextTierBeatsPreviousTierThree(previous.itemId, next.itemId);
      }
    }
  });

  it("keeps every standard weapon Tn+1.0 damage above Tn.3", () => {
    for (const specialization of STANDARD_WEAPON_TIERS) {
      for (let index = 0; index < specialization.length - 1; index += 1) {
        const previousItemId = specialization[index];
        const nextItemId = specialization[index + 1];
        if (previousItemId === undefined || nextItemId === undefined) continue;
        assertNextTierBeatsPreviousTierThree(previousItemId, nextItemId);
      }
    }
  });
});
