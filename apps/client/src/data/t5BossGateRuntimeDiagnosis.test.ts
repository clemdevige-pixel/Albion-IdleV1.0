import { describe, expect, it } from "vitest";
import { YELLOW_WORLD_COMBAT_CURVE, type BossGateCombatProfile } from "@game/data";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

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

function shortName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t5_", " ");
}

describe("T5 boss gate runtime diagnosis", () => {
  it("separates pre-boss attrition from the Ironveil boss matchup", () => {
    const finalCurve = YELLOW_WORLD_COMBAT_CURVE[YELLOW_WORLD_COMBAT_CURVE.length - 1] as unknown as { bossGate: MutableBossGate };
    const original: BossGateCombatProfile = { ...finalCurve.bossGate };
    const rows: Array<Record<string, unknown>> = [];

    try {
      finalCurve.bossGate.healthMultiplier = 1;
      finalCurve.bossGate.damageMultiplier = 1.375;
      finalCurve.bossGate.defenseMultiplier = 1;

      for (const enchantment of [2, 3] as const) {
        for (const weaponItemId of WEAPONS) {
          for (const mode of ["full_segment", "isolated_boss"] as const) {
            const result = runCombatRuntimeBenchmark({
              label: `t5_gate_${mode}_${enchantment}`,
              weaponItemId,
              zoneDefId: WORLD_ZONE_IDS.ironveil,
              segmentIndex: 9,
              ...(mode === "isolated_boss" ? { startingEncounterIndex: 4 } : {}),
              equipmentItemIds: equipmentFor(weaponItemId),
              masteryLevel: 35,
              enchantment,
              useHealthPotions: true,
            });

            const boss = result.encounters[result.encounters.length - 1];
            rows.push({
              enchantment,
              mode,
              weapon: shortName(weaponItemId),
              clear: result.clear,
              seconds: result.seconds,
              hpPercent: result.hpPercent,
              maxHealth: result.maxHealth,
              armor: result.armor,
              mr: result.magicResistance,
              potions: result.potionsUsed,
              damageDealt: result.damageDealt,
              damageReceived: result.damageReceived,
              observedDps: result.observedDps,
              bossSeconds: boss?.seconds ?? 0,
              bossHpBefore: boss?.hpBeforePercent ?? 0,
              bossHpAfter: boss?.hpAfterPercent ?? 0,
              bossDamageReceived: boss?.damageReceived ?? 0,
              bossObservedDps: boss?.observedDps ?? 0,
              abilities: result.abilities.map((ability) => `${ability.abilityId}:${ability.casts}`).join(" | "),
            });
          }
        }
      }
    } finally {
      finalCurve.bossGate.progressionRole = original.progressionRole;
      finalCurve.bossGate.healthMultiplier = original.healthMultiplier;
      finalCurve.bossGate.damageMultiplier = original.damageMultiplier;
      finalCurve.bossGate.defenseMultiplier = original.defenseMultiplier;
    }

    console.log("[T5_BOSS_GATE_RUNTIME_DIAGNOSIS]");
    console.table(rows);
    console.log("[T5_BOSS_GATE_RUNTIME_DIAGNOSIS_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(WEAPONS.length * 2 * 2);
    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
  });
});
