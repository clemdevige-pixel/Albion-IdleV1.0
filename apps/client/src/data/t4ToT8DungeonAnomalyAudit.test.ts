import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const WEAPONS_BY_TIER = {
  4: [
    "item_weapon_sword_t4_broadsword",
    "item_weapon_bow_t4_longbow",
    "item_weapon_staff_t4_infernal",
    "item_weapon_gloves_t4_spiked_gauntlets",
    "item_weapon_dagger_t4_pair",
  ],
  5: [
    "item_weapon_sword_t5_broadsword",
    "item_weapon_bow_t5_longbow",
    "item_weapon_staff_t5_infernal",
    "item_weapon_gloves_t5_spiked_gauntlets",
    "item_weapon_dagger_t5_pair",
  ],
  6: [
    "item_weapon_sword_t6_broadsword",
    "item_weapon_bow_t6_longbow",
    "item_weapon_staff_t6_infernal",
    "item_weapon_gloves_t6_spiked_gauntlets",
    "item_weapon_dagger_t6_pair",
  ],
  7: [
    "item_weapon_sword_t7_broadsword",
    "item_weapon_bow_t7_longbow",
    "item_weapon_staff_t7_infernal",
    "item_weapon_gloves_t7_spiked_gauntlets",
    "item_weapon_dagger_t7_pair",
  ],
  8: [
    "item_weapon_sword_t8_broadsword",
    "item_weapon_bow_t8_longbow",
    "item_weapon_staff_t8_infernal",
    "item_weapon_gloves_t8_spiked_gauntlets",
    "item_weapon_dagger_t8_pair",
  ],
} as const;

const ARMOR_BY_TIER = {
  4: ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"],
  5: ["item_helmet_t5_reinforced", "item_armor_t5_leather", "item_boots_t5_leather", "item_traveler_cape"],
  6: ["item_helmet_t6_reinforced", "item_armor_t6_leather", "item_boots_t6_leather", "item_traveler_cape"],
  7: ["item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather", "item_traveler_cape"],
  8: ["item_helmet_t8_reinforced", "item_armor_t8_leather", "item_boots_t8_leather", "item_traveler_cape"],
} as const;

const SHIELD_BY_TIER = {
  4: "item_shield_t4_reinforced",
  5: "item_shield_t5_reinforced",
  6: "item_shield_t6_reinforced",
  7: "item_shield_t7_reinforced",
  8: "item_shield_t8_reinforced",
} as const;

const FINAL_ZONE_BY_TIER = {
  4: WORLD_ZONE_IDS.mountain,
  5: WORLD_ZONE_IDS.ironveil,
  6: WORLD_ZONE_IDS.ashenpeak,
  7: WORLD_ZONE_IDS.doompeak,
  8: WORLD_ZONE_IDS.blackspire,
} as const;

const TARGET_MASTERY_BY_TIER = {
  4: 25,
  5: 35,
  6: 45,
  7: 55,
  8: 65,
} as const;

type Tier = keyof typeof WEAPONS_BY_TIER;

type Probe = {
  readonly id: "base" | "mastery" | "mastery_potion";
  readonly mastery: (tier: Tier) => number;
  readonly useHealthPotions: boolean;
};

const PROBES: readonly Probe[] = [
  { id: "base", mastery: () => 1, useHealthPotions: false },
  { id: "mastery", mastery: (tier) => TARGET_MASTERY_BY_TIER[tier], useHealthPotions: false },
  { id: "mastery_potion", mastery: (tier) => TARGET_MASTERY_BY_TIER[tier], useHealthPotions: true },
];

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items: string[] = [...ARMOR_BY_TIER[tier]];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD_BY_TIER[tier]);
  return items;
}

function weaponLabel(itemId: string, tier: Tier): string {
  return itemId.replace("item_weapon_", "").replace(`_t${tier}_`, " ").replace("dagger pair", "dagger");
}

describe("T4-T8 dungeon anomaly audit", () => {
  it("prints comparable optimization probes without freezing balance expectations", () => {
    const tiers = [4, 5, 6, 7, 8] as const;

    const rows = tiers.flatMap((tier) => {
      const dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === tier);
      return dungeons.flatMap((dungeon) =>
        PROBES.flatMap((probe) =>
          WEAPONS_BY_TIER[tier].map((weaponItemId) => {
            const result = runCombatRuntimeBenchmark({
              label: `t${tier}_${dungeon.faction.toLowerCase()}_${probe.id}`,
              weaponItemId,
              zoneDefId: FINAL_ZONE_BY_TIER[tier],
              segmentIndex: 9,
              equipmentItemIds: equipmentFor(weaponItemId, tier),
              enchantment: 3,
              masteryLevel: probe.mastery(tier),
              useHealthPotions: probe.useHealthPotions,
              dungeonDefinitionId: dungeon.id,
            });
            return {
              tier,
              faction: dungeon.faction,
              probe: probe.id,
              weapon: weaponLabel(weaponItemId, tier),
              clear: result.clear,
              encounters: result.encounterReached,
              seconds: result.seconds,
              hpPercent: result.hpPercent,
              observedDps: result.observedDps,
              damageDealt: result.damageDealt,
              damageReceived: result.damageReceived,
              incomingPerSecond: result.seconds > 0 ? Number((result.damageReceived / result.seconds).toFixed(1)) : 0,
              potionsUsed: result.potionsUsed,
              heroHp: result.maxHealth,
              heroArmor: result.armor,
              heroMr: result.magicResistance,
              mastery: result.masteryLevel,
            };
          }),
        ),
      );
    });

    const tierSummary = tiers.map((tier) => {
      const tierRows = rows.filter((row) => row.tier === tier);
      const base = tierRows.filter((row) => row.probe === "base");
      const mastery = tierRows.filter((row) => row.probe === "mastery");
      const potion = tierRows.filter((row) => row.probe === "mastery_potion");
      const dpsValues = mastery.map((row) => row.observedDps);
      return {
        tier,
        baseClears: base.filter((row) => row.clear).length,
        masteryClears: mastery.filter((row) => row.clear).length,
        potionClears: potion.filter((row) => row.clear).length,
        totalPerProbe: base.length,
        minMasteryDps: Number(Math.min(...dpsValues).toFixed(1)),
        maxMasteryDps: Number(Math.max(...dpsValues).toFixed(1)),
        masteryDpsSpread: Number((Math.max(...dpsValues) / Math.max(1, Math.min(...dpsValues))).toFixed(2)),
      };
    });

    const factionSummary = ["Keeper", "Heretic", "Undead", "Morgana"].flatMap((faction) =>
      tiers.map((tier) => {
        const factionRows = rows.filter((row) => row.tier === tier && row.faction === faction && row.probe === "mastery_potion");
        return {
          tier,
          faction,
          clears: factionRows.filter((row) => row.clear).length,
          avgSeconds: Number((factionRows.reduce((sum, row) => sum + row.seconds, 0) / Math.max(1, factionRows.length)).toFixed(1)),
          avgIncomingPerSecond: Number((factionRows.reduce((sum, row) => sum + row.incomingPerSecond, 0) / Math.max(1, factionRows.length)).toFixed(1)),
        };
      }),
    );

    const weaponSummary = ["sword broadsword", "bow longbow", "staff infernal", "gloves spiked_gauntlets", "dagger"].map((weapon) => {
      const weaponRows = rows.filter((row) => row.weapon === weapon && row.probe === "mastery_potion");
      return {
        weapon,
        probes: weaponRows.length,
        clears: weaponRows.filter((row) => row.clear).length,
        clearRate: Number((weaponRows.filter((row) => row.clear).length / Math.max(1, weaponRows.length)).toFixed(2)),
        avgDps: Number((weaponRows.reduce((sum, row) => sum + row.observedDps, 0) / Math.max(1, weaponRows.length)).toFixed(1)),
        avgIncomingPerSecond: Number((weaponRows.reduce((sum, row) => sum + row.incomingPerSecond, 0) / Math.max(1, weaponRows.length)).toFixed(1)),
      };
    });

    const anomalyCandidates: string[] = [];

    for (const summary of tierSummary) {
      if (summary.potionClears === 0) anomalyCandidates.push(`T${summary.tier}: 0/${summary.totalPerProbe} clears at Tn.3 + target mastery + potions`);
      if (summary.masteryDpsSpread >= 1.35) anomalyCandidates.push(`T${summary.tier}: high dungeon mastery DPS spread x${summary.masteryDpsSpread}`);
    }

    for (const tier of tiers) {
      const perFaction = factionSummary.filter((row) => row.tier === tier);
      const clearCounts = perFaction.map((row) => row.clears);
      if (Math.max(...clearCounts) - Math.min(...clearCounts) >= 2) {
        anomalyCandidates.push(`T${tier}: faction clear divergence (${perFaction.map((row) => `${row.faction}:${row.clears}/5`).join(", ")})`);
      }
    }

    const bestWeaponClearRate = Math.max(...weaponSummary.map((row) => row.clearRate));
    for (const summary of weaponSummary) {
      if (bestWeaponClearRate - summary.clearRate >= 0.25) anomalyCandidates.push(`${summary.weapon}: dungeon clear-rate gap ${(bestWeaponClearRate - summary.clearRate).toFixed(2)} vs best weapon`);
    }

    console.table(tierSummary);
    console.table(factionSummary);
    console.table(weaponSummary);
    console.log("[T4_T8_DUNGEON_ANOMALY_CANDIDATES]", JSON.stringify(anomalyCandidates, null, 2));
    console.log("[T4_T8_DUNGEON_AUDIT_ROWS]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(5 * 4 * PROBES.length * 5);
    expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.observedDps) && row.observedDps >= 0)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.incomingPerSecond) && row.incomingPerSecond >= 0)).toBe(true);
  });
});
