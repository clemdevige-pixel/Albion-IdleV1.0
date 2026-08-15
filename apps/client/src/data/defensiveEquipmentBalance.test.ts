import { describe, expect, it } from "vitest";
import {
  getEnchantmentStatMultiplier,
  roundEquipmentStatValue,
  type EnchantmentLevel,
  type StatId,
} from "@game/gameplay";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";

const STAT_MAX_HEALTH = "stat_max_health" as StatId;
const STAT_ARMOR = "stat_armor" as StatId;
const STAT_MAGIC_RESISTANCE = "stat_magic_resistance" as StatId;

const NAKED = { hp: 300, armor: 0, mr: 0 } as const;
const CAPE_ID = "item_traveler_cape";

const CORE_BY_TIER = {
  3: ["item_iron_helmet", "item_leather_armor", "item_leather_boots"],
  4: ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather"],
  5: ["item_helmet_t5_reinforced", "item_armor_t5_leather", "item_boots_t5_leather"],
} as const;

function roundedStat(itemId: string, statId: StatId, enchantment: EnchantmentLevel): number {
  const value = resolveEquipmentInfo(itemId)?.stats?.[String(statId)] ?? 0;
  return roundEquipmentStatValue(statId, value * getEnchantmentStatMultiplier(enchantment));
}

function fullTwoHandedDefense(tier: keyof typeof CORE_BY_TIER, enchantment: EnchantmentLevel) {
  let hp = NAKED.hp;
  let armor = NAKED.armor;
  let mr = NAKED.mr;

  for (const itemId of CORE_BY_TIER[tier]) {
    hp += roundedStat(itemId, STAT_MAX_HEALTH, enchantment);
    armor += roundedStat(itemId, STAT_ARMOR, enchantment);
    mr += roundedStat(itemId, STAT_MAGIC_RESISTANCE, enchantment);
  }

  // Traveler cape is the validated fixed T3 baseline accessory and is not part
  // of the enchantable core used to author this progression ladder.
  hp += resolveEquipmentInfo(CAPE_ID)?.stats?.stat_max_health ?? 0;
  armor += resolveEquipmentInfo(CAPE_ID)?.stats?.stat_armor ?? 0;
  mr += resolveEquipmentInfo(CAPE_ID)?.stats?.stat_magic_resistance ?? 0;

  return { hp, armor, mr };
}

describe("validated defensive equipment balance", () => {
  it("rounds real equipment stats with the authored gameplay contract", () => {
    expect(roundEquipmentStatValue(STAT_MAX_HEALTH, 142)).toBe(140);
    expect(roundEquipmentStatValue(STAT_MAX_HEALTH, 143)).toBe(145);
    expect(roundEquipmentStatValue(STAT_MAX_HEALTH, 147.5)).toBe(150);
    expect(roundEquipmentStatValue(STAT_ARMOR, 7.4)).toBe(7);
    expect(roundEquipmentStatValue(STAT_ARMOR, 7.5)).toBe(8);
    expect(roundEquipmentStatValue(STAT_MAGIC_RESISTANCE, 12.5)).toBe(13);
  });

  it.each([
    [3, 0, { hp: 530, armor: 21, mr: 19 }],
    [4, 0, { hp: 600, armor: 36, mr: 28 }],
    [4, 1, { hp: 630, armor: 40, mr: 31 }],
    [4, 2, { hp: 660, armor: 44, mr: 32 }],
    [4, 3, { hp: 690, armor: 46, mr: 36 }],
    [5, 0, { hp: 720, armor: 52, mr: 40 }],
    [5, 1, { hp: 760, armor: 58, mr: 44 }],
    [5, 2, { hp: 800, armor: 62, mr: 47 }],
    [5, 3, { hp: 850, armor: 68, mr: 50 }],
  ] as const)("keeps the full 2H defensive ladder at T%s.%s", (tier, enchantment, expected) => {
    expect(fullTwoHandedDefense(tier, enchantment)).toEqual(expected);
  });

  it("keeps one-handed shield defense separate from the 2H ladder", () => {
    expect(resolveEquipmentInfo("item_shield_t3_reinforced")?.stats).toMatchObject({
      stat_armor: 9,
      stat_magic_resistance: 5,
    });
    expect(resolveEquipmentInfo("item_shield_t4_reinforced")?.stats).toMatchObject({
      stat_armor: 15,
      stat_magic_resistance: 9,
    });
    expect(resolveEquipmentInfo("item_shield_t5_reinforced")?.stats).toMatchObject({
      stat_armor: 22,
      stat_magic_resistance: 13,
    });
  });
});
