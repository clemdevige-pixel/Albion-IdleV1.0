import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { buildWeaponOnlyBenchmark } from "./weaponPackageBenchmark.js";
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
const MASTERY = 35;

type Enchantment = 2 | 3;

function shortName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t5_", " ");
}

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD);
  return items;
}

function runIronveil(weaponItemId: string, enchantment: Enchantment, isolatedBoss: boolean) {
  return runCombatRuntimeBenchmark({
    label: `t5_weapon_ironveil_${enchantment}_${isolatedBoss ? "boss" : "segment"}`,
    weaponItemId,
    zoneDefId: WORLD_ZONE_IDS.ironveil,
    segmentIndex: 9,
    ...(isolatedBoss ? { startingEncounterIndex: 4 } : {}),
    equipmentItemIds: equipmentFor(weaponItemId),
    masteryLevel: MASTERY,
    enchantment,
    useHealthPotions: true,
  });
}

describe("T5 weapon Ironveil comparison", () => {
  it("compares intrinsic offense and live Ironveil scaling from .2 to .3", () => {
    const offense2 = new Map(buildWeaponOnlyBenchmark(WEAPONS, MASTERY, 2).map((row) => [row.itemId, row]));
    const offense3 = new Map(buildWeaponOnlyBenchmark(WEAPONS, MASTERY, 3).map((row) => [row.itemId, row]));

    const rows = WEAPONS.flatMap((weaponItemId) => ([2, 3] as const).map((enchantment) => {
      const full = runIronveil(weaponItemId, enchantment, false);
      const boss = runIronveil(weaponItemId, enchantment, true);
      const offense = enchantment === 2 ? offense2.get(weaponItemId) : offense3.get(weaponItemId);
      if (offense === undefined) throw new Error(`Missing offense profile for ${weaponItemId}`);

      return {
        weapon: shortName(weaponItemId),
        enchantment,
        sustainedDps: offense.sustainedDps,
        offenseIndex: offense.offenseIndex,
        opener5Index: offense.opener5Index,
        fullClear: full.clear,
        fullSeconds: full.seconds,
        fullHpPercent: full.hpPercent,
        fullObservedDps: full.observedDps,
        fullDamageReceived: full.damageReceived,
        bossClear: boss.clear,
        bossSeconds: boss.seconds,
        bossHpPercent: boss.hpPercent,
        bossObservedDps: boss.observedDps,
        bossDamageReceived: boss.damageReceived,
        maxHealth: full.maxHealth,
        armor: full.armor,
        mr: full.magicResistance,
      };
    }));

    const scalingRows = WEAPONS.map((weaponItemId) => {
      const weapon = shortName(weaponItemId);
      const e2 = rows.find((row) => row.weapon === weapon && row.enchantment === 2);
      const e3 = rows.find((row) => row.weapon === weapon && row.enchantment === 3);
      if (e2 === undefined || e3 === undefined) throw new Error(`Missing scaling rows for ${weapon}`);
      return {
        weapon,
        sustainedDpsGainPercent: Number((((e3.sustainedDps / e2.sustainedDps) - 1) * 100).toFixed(1)),
        fullObservedDpsGainPercent: Number((((e3.fullObservedDps / e2.fullObservedDps) - 1) * 100).toFixed(1)),
        bossObservedDpsGainPercent: Number((((e3.bossObservedDps / e2.bossObservedDps) - 1) * 100).toFixed(1)),
        hpSwing: Number((e3.fullHpPercent - e2.fullHpPercent).toFixed(1)),
        bossHpSwing: Number((e3.bossHpPercent - e2.bossHpPercent).toFixed(1)),
      };
    });

    console.log("[T5_WEAPON_IRONVEIL_COMPARISON]");
    console.table(rows);
    console.log("[T5_WEAPON_IRONVEIL_SCALING]");
    console.table(scalingRows);
    console.log("[T5_WEAPON_IRONVEIL_COMPARISON_JSON]", JSON.stringify({ rows, scalingRows }, null, 2));

    expect(rows).toHaveLength(WEAPONS.length * 2);
    expect(rows.every((row) => Number.isFinite(row.sustainedDps))).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.fullObservedDps))).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.bossObservedDps))).toBe(true);
  });
});
