import { describe, expect, it } from "vitest";
import { YELLOW_WORLD_COMBAT_CURVE, type BossGateCombatProfile } from "@game/data";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { ITEM_DEFINITIONS, resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { buildWeaponOnlyBenchmark, buildWeaponPackageBenchmark } from "./weaponPackageBenchmark.js";

const WEAPONS = [
  "item_weapon_sword_t5_broadsword",
  "item_weapon_bow_t5_longbow",
  "item_weapon_staff_t5_infernal",
  "item_weapon_gloves_t5_spiked_gauntlets",
  "item_weapon_dagger_t5_pair",
] as const;

const ARMOR = [
  "item_helmet_t5_reinforced",
  "item_armor_t5_leather",
  "item_boots_t5_leather",
  "item_traveler_cape",
] as const;
const SHIELD = "item_shield_t5_reinforced";
const BROADSWORD = "item_weapon_sword_t5_broadsword";
const MASTERY = 35;
const DAMAGE_CANDIDATES = [110, 115, 120, 125, 130, 135, 140] as const;
const TARGET_GATE = {
  progressionRole: "boss_gate",
  healthMultiplier: 1.15,
  damageMultiplier: 1.325,
  defenseMultiplier: 1.05,
} as const;

type MutableBossGate = {
  progressionRole: "boss_gate";
  healthMultiplier: number;
  damageMultiplier: number;
  defenseMultiplier: number;
};

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD);
  return items;
}

function referenceLoadout(itemId: string) {
  return resolveEquipmentInfo(itemId)?.handling === "one_handed"
    ? { armorItemIds: ARMOR, offHandItemId: SHIELD }
    : { armorItemIds: ARMOR };
}

function run(weaponItemId: string, enchantment: 2 | 3) {
  return runCombatRuntimeBenchmark({
    label: `t5_broadsword_offense_${enchantment}`,
    weaponItemId,
    zoneDefId: WORLD_ZONE_IDS.ironveil,
    segmentIndex: 9,
    equipmentItemIds: equipmentFor(weaponItemId),
    masteryLevel: MASTERY,
    enchantment,
    useHealthPotions: true,
  });
}

describe("T5 Broadsword offense candidate sweep", () => {
  it("finds the smallest Broadsword offense increase that restores the strict T5 boss-gate contract", () => {
    const definition = ITEM_DEFINITIONS[BROADSWORD];
    if (definition === undefined) throw new Error("Missing T5 Broadsword definition");
    const originalDamage = Number(definition.stats?.stat_physical_damage ?? 0);
    const finalCurve = YELLOW_WORLD_COMBAT_CURVE[YELLOW_WORLD_COMBAT_CURVE.length - 1] as unknown as { bossGate: MutableBossGate };
    const originalGate: BossGateCombatProfile = { ...finalCurve.bossGate };
    const rows: Array<Record<string, number | boolean>> = [];

    try {
      finalCurve.bossGate.healthMultiplier = TARGET_GATE.healthMultiplier;
      finalCurve.bossGate.damageMultiplier = TARGET_GATE.damageMultiplier;
      finalCurve.bossGate.defenseMultiplier = TARGET_GATE.defenseMultiplier;

      for (const baseDamage of DAMAGE_CANDIDATES) {
        definition.stats = { ...definition.stats, stat_physical_damage: baseDamage };

        const weaponOnly = buildWeaponOnlyBenchmark(WEAPONS, MASTERY, 3);
        const packageRows = buildWeaponPackageBenchmark(WEAPONS, MASTERY, 3, referenceLoadout);
        const swordWeaponOnly = weaponOnly.find((row) => row.itemId === BROADSWORD);
        const swordPackage = packageRows.find((row) => row.itemId === BROADSWORD);
        if (swordWeaponOnly === undefined || swordPackage === undefined) throw new Error("Missing Broadsword benchmark row");

        const t52 = WEAPONS.map((weaponItemId) => run(weaponItemId, 2));
        const t53 = WEAPONS.map((weaponItemId) => run(weaponItemId, 3));
        const t52Clear = t52.filter((result) => result.clear).length;
        const t53Clear = t53.filter((result) => result.clear).length;
        const swordT53 = t53[0];
        if (swordT53 === undefined) throw new Error("Missing T5.3 Broadsword runtime row");

        rows.push({
          baseDamage,
          damageGainPercent: Number((((baseDamage / originalDamage) - 1) * 100).toFixed(1)),
          offenseIndex: swordWeaponOnly.offenseIndex,
          sustainedDps: swordWeaponOnly.sustainedDps,
          packageScore: swordPackage.packageScore,
          defenseIndex: swordPackage.defenseIndex,
          t52Clear,
          t53Clear,
          swordT53Clear: swordT53.clear,
          swordT53Hp: swordT53.hpPercent,
          strictContract: t52Clear === 0 && t53Clear === WEAPONS.length,
        });
      }
    } finally {
      definition.stats = { ...definition.stats, stat_physical_damage: originalDamage };
      finalCurve.bossGate.progressionRole = originalGate.progressionRole;
      finalCurve.bossGate.healthMultiplier = originalGate.healthMultiplier;
      finalCurve.bossGate.damageMultiplier = originalGate.damageMultiplier;
      finalCurve.bossGate.defenseMultiplier = originalGate.defenseMultiplier;
    }

    const valid = rows.filter((row) => row.strictContract === true);
    console.log("[T5_BROADSWORD_OFFENSE_CANDIDATE_SWEEP]");
    console.table(rows);
    console.log("[T5_BROADSWORD_OFFENSE_VALID_CANDIDATES]");
    console.table(valid);
    console.log("[T5_BROADSWORD_OFFENSE_VALID_CANDIDATES_JSON]", JSON.stringify(valid, null, 2));

    expect(rows).toHaveLength(DAMAGE_CANDIDATES.length);
  });
});
