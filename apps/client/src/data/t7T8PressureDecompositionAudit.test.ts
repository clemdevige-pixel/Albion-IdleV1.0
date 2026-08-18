import { describe, expect, it } from "vitest";
import { getEnemyCombatProfile } from "@game/gameplay";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS, getWorldZonePlacement, type WorldZoneKey } from "./worldContentCatalog.js";

const TIERS = {
  7: {
    zone: "doompeak" as WorldZoneKey,
    mastery: 55,
    weapons: [
      "item_weapon_sword_t7_broadsword",
      "item_weapon_bow_t7_longbow",
      "item_weapon_staff_t7_infernal",
      "item_weapon_gloves_t7_spiked_gauntlets",
      "item_weapon_dagger_t7_pair",
    ],
    armor: ["item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather", "item_traveler_cape"],
    shield: "item_shield_t7_reinforced",
  },
  8: {
    zone: "blackspire" as WorldZoneKey,
    mastery: 65,
    weapons: [
      "item_weapon_sword_t8_broadsword",
      "item_weapon_bow_t8_longbow",
      "item_weapon_staff_t8_infernal",
      "item_weapon_gloves_t8_spiked_gauntlets",
      "item_weapon_dagger_t8_pair",
    ],
    armor: ["item_helmet_t8_reinforced", "item_armor_t8_leather", "item_boots_t8_leather", "item_traveler_cape"],
    shield: "item_shield_t8_reinforced",
  },
} as const;

type Tier = keyof typeof TIERS;

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const config = TIERS[tier];
  const items: string[] = [...config.armor];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(config.shield);
  return items;
}

function shortWeapon(itemId: string, tier: Tier): string {
  return itemId.replace("item_weapon_", "").replace(`_t${tier}_`, " ");
}

/**
 * Diagnostic only. This audit decomposes the T7/T8 S5->S10 wall and the
 * Broadsword/Dagger early deaths without authoring or asserting balance targets.
 */
describe("T7-T8 world pressure decomposition audit", () => {
  it("prints authored enemy pressure by encounter and live weapon survival probes", () => {
    const enemyRows = ([7, 8] as const).flatMap((tier) => {
      const config = TIERS[tier];
      const zoneDefId = WORLD_ZONE_IDS[config.zone];
      const placement = getWorldZonePlacement(zoneDefId);
      return [4, 9].flatMap((segmentIndex) =>
        [0, 1, 2, 3, 4].map((encounterIndex) => {
          const profile = getEnemyCombatProfile(
            placement.zoneIndexWithinBand,
            segmentIndex,
            encounterIndex,
            placement.bandId,
          );
          return {
            tier,
            band: placement.bandId,
            segment: segmentIndex + 1,
            encounter: encounterIndex + 1,
            hp: profile.hp,
            damage: profile.damage,
            armor: profile.armor,
            mr: profile.magicResistance,
            attackSpeed: profile.attackSpeed,
          };
        }),
      );
    });

    const runtimeRows = ([7, 8] as const).flatMap((tier) => {
      const config = TIERS[tier];
      return [0, 4, 9].flatMap((segmentIndex) =>
        [false, true].flatMap((useHealthPotions) =>
          config.weapons.map((weaponItemId) => {
            const result = runCombatRuntimeBenchmark({
              label: `t${tier}_s${segmentIndex + 1}_${useHealthPotions ? "potion" : "base"}`,
              weaponItemId,
              zoneDefId: WORLD_ZONE_IDS[config.zone],
              segmentIndex,
              equipmentItemIds: equipmentFor(weaponItemId, tier),
              masteryLevel: config.mastery,
              enchantment: 3,
              useHealthPotions,
            });
            return {
              tier,
              segment: segmentIndex + 1,
              potion: useHealthPotions,
              weapon: shortWeapon(weaponItemId, tier),
              handling: resolveEquipmentInfo(weaponItemId)?.handling ?? "unknown",
              clear: result.clear,
              encounters: result.encounterReached,
              seconds: result.seconds,
              hpPercent: result.hpPercent,
              heroHp: result.maxHealth,
              heroArmor: result.armor,
              heroMr: result.magicResistance,
              damageDealt: result.damageDealt,
              damageReceived: result.damageReceived,
              incomingPerSecond: result.seconds > 0 ? Number((result.damageReceived / result.seconds).toFixed(1)) : 0,
              observedDps: result.observedDps,
              potionsUsed: result.potionsUsed,
            };
          }),
        ),
      );
    });

    const wallRows = ([7, 8] as const).map((tier) => {
      const s5 = enemyRows.filter((row) => row.tier === tier && row.segment === 5);
      const s10 = enemyRows.filter((row) => row.tier === tier && row.segment === 10);
      const sum = (rows: typeof enemyRows, key: "hp" | "damage" | "armor" | "mr") => rows.reduce((total, row) => total + row[key], 0);
      const ratio = (a: number, b: number) => Number((b / Math.max(1, a)).toFixed(2));
      return {
        tier,
        hpPressureRatioS10ToS5: ratio(sum(s5, "hp"), sum(s10, "hp")),
        damagePressureRatioS10ToS5: ratio(sum(s5, "damage"), sum(s10, "damage")),
        armorRatioS10ToS5: ratio(sum(s5, "armor"), sum(s10, "armor")),
        mrRatioS10ToS5: ratio(sum(s5, "mr"), sum(s10, "mr")),
      };
    });

    const anomalyCandidates: string[] = [];
    for (const tier of [7, 8] as const) {
      const baseS1 = runtimeRows.filter((row) => row.tier === tier && row.segment === 1 && !row.potion);
      const sword = baseS1.find((row) => row.weapon.includes("broadsword"));
      const dagger = baseS1.find((row) => row.weapon.includes("dagger"));
      const survivingLowerArmor = baseS1.find((row) => row.clear && row.heroArmor < (sword?.heroArmor ?? 0));
      if (sword !== undefined && !sword.clear && survivingLowerArmor !== undefined) {
        anomalyCandidates.push(`T${tier}: Broadsword dies at S1 despite higher armor than a clearing 2H loadout`);
      }
      if (dagger !== undefined && !dagger.clear) {
        const lowerDpsClear = baseS1.find((row) => row.clear && row.observedDps < dagger.observedDps);
        if (lowerDpsClear !== undefined) anomalyCandidates.push(`T${tier}: Dagger dies at S1 despite higher observed DPS than a clearing weapon`);
      }
      const wall = wallRows.find((row) => row.tier === tier);
      if (wall !== undefined && (wall.hpPressureRatioS10ToS5 >= 1.35 || wall.damagePressureRatioS10ToS5 >= 1.35 || wall.armorRatioS10ToS5 >= 1.35)) {
        anomalyCandidates.push(`T${tier}: S5->S10 authored pressure jump >=35% on at least one axis`);
      }
    }

    console.table(enemyRows);
    console.table(wallRows);
    console.table(runtimeRows);
    console.log("[T7_T8_PRESSURE_ANOMALY_CANDIDATES]", JSON.stringify(anomalyCandidates, null, 2));
    console.log("[T7_T8_ENEMY_PRESSURE_ROWS]", JSON.stringify(enemyRows, null, 2));
    console.log("[T7_T8_RUNTIME_SURVIVAL_ROWS]", JSON.stringify(runtimeRows, null, 2));

    expect(enemyRows).toHaveLength(2 * 2 * 5);
    expect(runtimeRows).toHaveLength(2 * 3 * 2 * 5);
    expect(enemyRows.every((row) => row.hp > 0 && row.damage > 0 && row.armor >= 0 && row.mr >= 0)).toBe(true);
    expect(runtimeRows.every((row) => Number.isFinite(row.incomingPerSecond) && Number.isFinite(row.observedDps))).toBe(true);
  });
});
