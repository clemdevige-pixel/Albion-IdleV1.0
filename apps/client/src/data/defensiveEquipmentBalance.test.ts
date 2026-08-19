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
  6: ["item_helmet_t6_reinforced", "item_armor_t6_leather", "item_boots_t6_leather"],
  7: ["item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather"],
  8: ["item_helmet_t8_reinforced", "item_armor_t8_leather", "item_boots_t8_leather"],
} as const;

const BOOTS_HP_BY_TIER = {
  3: 35,
  4: 50,
  5: 60,
  6: 100,
  7: 125,
  8: 155,
} as const;

function authoredStat(itemId: string, statId: StatId): number {
  const stats = resolveEquipmentInfo(itemId)?.stats as Readonly<Record<string, number | undefined>> | undefined;
  return stats?.[String(statId)] ?? 0;
}

function roundedStat(itemId: string, statId: StatId, enchantment: EnchantmentLevel): number {
  return roundEquipmentStatValue(
    statId,
    authoredStat(itemId, statId) * getEnchantmentStatMultiplier(enchantment),
  );
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

  hp += authoredStat(CAPE_ID, STAT_MAX_HEALTH);
  armor += authoredStat(CAPE_ID, STAT_ARMOR);
  mr += authoredStat(CAPE_ID, STAT_MAGIC_RESISTANCE);

  return { hp, armor, mr };
}

function bootsItemId(tier: keyof typeof CORE_BY_TIER): string {
  return tier === 3 ? "item_leather_boots" : `item_boots_t${String(tier)}_leather`;
}

describe("validated defensive equipment balance", () => {
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
    [6, 0, { hp: 880, armor: 71, mr: 53 }],
    [6, 1, { hp: 935, armor: 79, mr: 58 }],
    [6, 2, { hp: 995, armor: 85, mr: 63 }],
    [6, 3, { hp: 1055, armor: 93, mr: 68 }],
    [7, 0, { hp: 1080, armor: 93, mr: 70 }],
    [7, 1, { hp: 1160, armor: 103, mr: 76 }],
    [7, 2, { hp: 1235, armor: 112, mr: 83 }],
    [7, 3, { hp: 1315, armor: 121, mr: 90 }],
    [8, 0, { hp: 1320, armor: 118, mr: 89 }],
    [8, 1, { hp: 1425, armor: 131, mr: 98 }],
    [8, 2, { hp: 1520, armor: 141, mr: 106 }],
    [8, 3, { hp: 1625, armor: 154, mr: 115 }],
  ] as const)("keeps the full 2H defensive ladder at T%s.%s", (tier, enchantment, expected) => {
    expect(fullTwoHandedDefense(tier, enchantment)).toEqual(expected);
  });

  it("gives boots a meaningful HP budget while keeping chest > head > boots", () => {
    for (const tier of Object.keys(CORE_BY_TIER).map(Number) as Array<keyof typeof CORE_BY_TIER>) {
      const [head, chest, boots] = CORE_BY_TIER[tier];
      const headHp = authoredStat(head, STAT_MAX_HEALTH);
      const chestHp = authoredStat(chest, STAT_MAX_HEALTH);
      const bootsHp = authoredStat(boots, STAT_MAX_HEALTH);
      expect(bootsHp).toBe(BOOTS_HP_BY_TIER[tier]);
      expect(chestHp).toBeGreaterThan(headHp);
      expect(headHp).toBeGreaterThan(bootsHp);
    }
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
