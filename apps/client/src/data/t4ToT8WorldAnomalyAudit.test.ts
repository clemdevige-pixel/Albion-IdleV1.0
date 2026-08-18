import { describe, expect, it } from "vitest";
import { getEnemyCombatProfile } from "@game/gameplay";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS, getWorldZonePlacement, type WorldZoneKey } from "./worldContentCatalog.js";

const TIERS = [4, 5, 6, 7, 8] as const;
type Tier = (typeof TIERS)[number];

const WEAPONS_BY_TIER = {
  4: ["item_weapon_sword_t4_broadsword", "item_weapon_bow_t4_longbow", "item_weapon_staff_t4_infernal", "item_weapon_gloves_t4_spiked_gauntlets", "item_weapon_dagger_t4_pair"],
  5: ["item_weapon_sword_t5_broadsword", "item_weapon_bow_t5_longbow", "item_weapon_staff_t5_infernal", "item_weapon_gloves_t5_spiked_gauntlets", "item_weapon_dagger_t5_pair"],
  6: ["item_weapon_sword_t6_broadsword", "item_weapon_bow_t6_longbow", "item_weapon_staff_t6_infernal", "item_weapon_gloves_t6_spiked_gauntlets", "item_weapon_dagger_t6_pair"],
  7: ["item_weapon_sword_t7_broadsword", "item_weapon_bow_t7_longbow", "item_weapon_staff_t7_infernal", "item_weapon_gloves_t7_spiked_gauntlets", "item_weapon_dagger_t7_pair"],
  8: ["item_weapon_sword_t8_broadsword", "item_weapon_bow_t8_longbow", "item_weapon_staff_t8_infernal", "item_weapon_gloves_t8_spiked_gauntlets", "item_weapon_dagger_t8_pair"],
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
  4: "mountain",
  5: "ironveil",
  6: "ashenpeak",
  7: "doompeak",
  8: "blackspire",
} as const satisfies Readonly<Record<Tier, WorldZoneKey>>;

const MASTERY_BY_TIER = { 4: 20, 5: 35, 6: 45, 7: 55, 8: 65 } as const satisfies Readonly<Record<Tier, number>>;

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items: string[] = [...ARMOR_BY_TIER[tier]];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD_BY_TIER[tier]);
  return items;
}

function weaponLabel(weaponItemId: string, tier: Tier): string {
  return weaponItemId.replace("item_weapon_", "").replace(`_t${tier}_`, " ");
}

type AuditRow = {
  readonly tier: Tier;
  readonly band: string;
  readonly segment: number;
  readonly potion: boolean;
  readonly weapon: string;
  readonly clear: boolean;
  readonly seconds: number;
  readonly encounters: number;
  readonly hpPercent: number;
  readonly observedDps: number;
  readonly damageDealt: number;
  readonly damageReceived: number;
  readonly potionsUsed: number;
  readonly enemyArmor: number;
  readonly enemyMr: number;
};

/**
 * Diagnostic only.
 *
 * This audit intentionally does not encode balance targets and must not be used
 * as a tuning contract. It samples equivalent end-of-tier world checkpoints
 * across T4-T8 and emits anomaly candidates for later review. The only hard
 * assertions below protect benchmark/data integrity.
 */
describe("T4-T8 world anomaly audit", () => {
  it("prints comparable end-of-tier runtime probes and anomaly candidates", () => {
    const rows: AuditRow[] = [];

    for (const tier of TIERS) {
      const zoneKey = FINAL_ZONE_BY_TIER[tier];
      const zoneDefId = WORLD_ZONE_IDS[zoneKey];
      const placement = getWorldZonePlacement(zoneDefId);

      for (const segmentIndex of [0, 4, 9] as const) {
        const enemy = getEnemyCombatProfile(placement.zoneIndexWithinBand, segmentIndex, 4, placement.bandId);
        for (const weaponItemId of WEAPONS_BY_TIER[tier]) {
          const result = runCombatRuntimeBenchmark({
            label: `audit_t${tier}_${String(zoneKey)}_s${String(segmentIndex + 1)}`,
            weaponItemId,
            zoneDefId,
            segmentIndex,
            equipmentItemIds: equipmentFor(weaponItemId, tier),
            masteryLevel: MASTERY_BY_TIER[tier],
            enchantment: 3,
            useHealthPotions: false,
          });
          rows.push({
            tier,
            band: placement.bandId,
            segment: segmentIndex + 1,
            potion: false,
            weapon: weaponLabel(weaponItemId, tier),
            clear: result.clear,
            seconds: result.seconds,
            encounters: result.encounterReached,
            hpPercent: result.hpPercent,
            observedDps: result.observedDps,
            damageDealt: result.damageDealt,
            damageReceived: result.damageReceived,
            potionsUsed: result.potionsUsed,
            enemyArmor: enemy.armor,
            enemyMr: enemy.magicResistance,
          });
        }
      }

      const enemy = getEnemyCombatProfile(placement.zoneIndexWithinBand, 9, 4, placement.bandId);
      for (const weaponItemId of WEAPONS_BY_TIER[tier]) {
        const result = runCombatRuntimeBenchmark({
          label: `audit_t${tier}_${String(zoneKey)}_s10_potion`,
          weaponItemId,
          zoneDefId,
          segmentIndex: 9,
          equipmentItemIds: equipmentFor(weaponItemId, tier),
          masteryLevel: MASTERY_BY_TIER[tier],
          enchantment: 3,
          useHealthPotions: true,
        });
        rows.push({
          tier,
          band: placement.bandId,
          segment: 10,
          potion: true,
          weapon: weaponLabel(weaponItemId, tier),
          clear: result.clear,
          seconds: result.seconds,
          encounters: result.encounterReached,
          hpPercent: result.hpPercent,
          observedDps: result.observedDps,
          damageDealt: result.damageDealt,
          damageReceived: result.damageReceived,
          potionsUsed: result.potionsUsed,
          enemyArmor: enemy.armor,
          enemyMr: enemy.magicResistance,
        });
      }
    }

    const summaries = TIERS.map((tier) => {
      const tierRows = rows.filter((row) => row.tier === tier && !row.potion);
      const finalRows = tierRows.filter((row) => row.segment === 10);
      const dpsValues = finalRows.map((row) => row.observedDps);
      const maxDps = Math.max(...dpsValues);
      const minDps = Math.min(...dpsValues);
      return {
        tier,
        band: tierRows[0]?.band ?? "unknown",
        s1Clears: tierRows.filter((row) => row.segment === 1 && row.clear).length,
        s5Clears: tierRows.filter((row) => row.segment === 5 && row.clear).length,
        s10Clears: finalRows.filter((row) => row.clear).length,
        s10PotionClears: rows.filter((row) => row.tier === tier && row.segment === 10 && row.potion && row.clear).length,
        s10MaxDps: Number(maxDps.toFixed(1)),
        s10MinDps: Number(minDps.toFixed(1)),
        s10DpsSpread: minDps > 0 ? Number((maxDps / minDps).toFixed(2)) : null,
        enemyArmor: finalRows[0]?.enemyArmor ?? 0,
        enemyMr: finalRows[0]?.enemyMr ?? 0,
      };
    });

    const anomalies: string[] = [];
    for (const summary of summaries) {
      if (summary.s1Clears > 0 && summary.s5Clears === 0) anomalies.push(`T${summary.tier}: abrupt S1->S5 clear wall`);
      if (summary.s5Clears > 0 && summary.s10Clears === 0) anomalies.push(`T${summary.tier}: abrupt S5->S10 clear wall`);
      if (summary.s10Clears === 0 && summary.s10PotionClears === 0) anomalies.push(`T${summary.tier}: final checkpoint remains 0/5 with potions`);
      if (summary.s10DpsSpread !== null && summary.s10DpsSpread >= 1.35) anomalies.push(`T${summary.tier}: high S10 weapon DPS spread x${summary.s10DpsSpread}`);
      if (summary.enemyArmor !== summary.enemyMr) anomalies.push(`T${summary.tier}: final enemy Armor/MR mismatch ${summary.enemyArmor}/${summary.enemyMr}`);
    }

    const perWeapon = rows
      .filter((row) => !row.potion)
      .reduce<Record<string, { probes: number; clears: number; dpsTotal: number }>>((acc, row) => {
        const weapon = row.weapon.split(" ").at(-1) ?? row.weapon;
        const current = acc[weapon] ?? { probes: 0, clears: 0, dpsTotal: 0 };
        current.probes += 1;
        current.clears += row.clear ? 1 : 0;
        current.dpsTotal += row.observedDps;
        acc[weapon] = current;
        return acc;
      }, {});

    const weaponSummary = Object.entries(perWeapon).map(([weapon, value]) => ({
      weapon,
      probes: value.probes,
      clears: value.clears,
      clearRate: Number((value.clears / value.probes).toFixed(2)),
      avgDps: Number((value.dpsTotal / value.probes).toFixed(1)),
    }));

    console.table(summaries);
    console.table(weaponSummary);
    console.log("[T4_T8_WORLD_ANOMALY_CANDIDATES]", JSON.stringify(anomalies, null, 2));
    console.log("[T4_T8_WORLD_AUDIT_ROWS]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(TIERS.length * 20);
    expect(rows.every((row) => Number.isFinite(row.observedDps) && row.observedDps >= 0)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
    expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
    expect(summaries).toHaveLength(TIERS.length);
  });
});
