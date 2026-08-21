import { BLACK_WORLD_COMBAT_CURVE, type ZoneCombatCurve } from "@game/data";
import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { WORLD_ZONE_IDS_BY_BAND, ZONE_DEFINITIONS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

type Enchantment = 0 | 1 | 2 | 3;
type MutableZone = {
  healthStart: number;
  healthEnd: number;
  damageStart: number;
  damageEnd: number;
  defenseStart: number;
  defenseEnd: number;
  defenseModel: ZoneCombatCurve["defenseModel"];
  bossGate?: ZoneCombatCurve["bossGate"];
};

const WEAPONS = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;

const TARGETS = [
  { zoneIndex: 2, enchantment: 1 as Enchantment, mastery: 74, segmentIndex: 9 },
  { zoneIndex: 3, enchantment: 2 as Enchantment, mastery: 77, segmentIndex: 9 },
  { zoneIndex: 4, enchantment: 2 as Enchantment, mastery: 80, segmentIndex: 8 },
] as const;

const HEALTH = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.75, 1.9, 2.1, 2.3, 2.5, 2.75, 3] as const;
const DAMAGE = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.75, 1.9, 2.1, 2.3, 2.5, 2.75, 3] as const;
const DEFENSE = [1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.4, 1.5, 1.65, 1.8, 2] as const;
const MAX_RESULTS = 12;

function weaponIds(tier: 7 | 8): readonly string[] {
  return WEAPONS.map(([family, spec]) => `item_weapon_${family}_t${String(tier)}_${spec}`);
}

function equipmentFor(weaponItemId: string, tier: 7 | 8): readonly string[] {
  const items = [
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
    "item_traveler_cape",
  ];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(`item_shield_t${String(tier)}_reinforced`);
  return items;
}

function zoneName(zoneDefId: string): string {
  return ZONE_DEFINITIONS.find(({ id }) => String(id) === zoneDefId)?.name ?? zoneDefId;
}

const candidates = HEALTH.flatMap((health) => DAMAGE.flatMap((damage) => DEFENSE.map((defense) => ({
  health,
  damage,
  defense,
  score: Number(((health - 1) + (damage - 1) + (defense - 1)).toFixed(4)),
})))).sort((a, b) => a.score - b.score || a.health - b.health || a.damage - b.damage || a.defense - b.defense);

const best: Record<string, unknown>[] = [];
for (const target of TARGETS) {
  const readonlyZone = BLACK_WORLD_COMBAT_CURVE[target.zoneIndex];
  const zoneDefId = WORLD_ZONE_IDS_BY_BAND.black[target.zoneIndex];
  if (readonlyZone === undefined || zoneDefId === undefined) throw new Error(`Missing black zone ${String(target.zoneIndex + 1)}`);
  const zone = readonlyZone as MutableZone;
  const original = { ...readonlyZone };
  const valid: Record<string, unknown>[] = [];

  try {
    for (const candidate of candidates) {
      zone.healthStart = original.healthStart * candidate.health;
      zone.healthEnd = original.healthEnd * candidate.health;
      zone.damageStart = original.damageStart * candidate.damage;
      zone.damageEnd = original.damageEnd * candidate.damage;
      zone.defenseStart = original.defenseStart * candidate.defense;
      zone.defenseEnd = original.defenseEnd * candidate.defense;

      let expectedClears = 0;
      let expectedMinHp = 100;
      for (const weaponItemId of weaponIds(8)) {
        const result = runCombatRuntimeBenchmark({
          label: "t8_late_expected",
          weaponItemId,
          zoneDefId,
          segmentIndex: target.segmentIndex,
          equipmentItemIds: equipmentFor(weaponItemId, 8),
          masteryLevel: target.mastery,
          enchantment: target.enchantment,
          useHealthPotions: true,
        });
        if (result.clear) {
          expectedClears += 1;
          expectedMinHp = Math.min(expectedMinHp, result.hpPercent);
        }
      }

      let undergearClears = 0;
      const undergear = [
        { tier: 7 as const, enchantment: 3 as Enchantment },
        ...(target.enchantment > 0 ? [{ tier: 8 as const, enchantment: (target.enchantment - 1) as Enchantment }] : []),
      ];
      for (const loadout of undergear) {
        for (const weaponItemId of weaponIds(loadout.tier)) {
          const result = runCombatRuntimeBenchmark({
            label: "t8_late_undergear",
            weaponItemId,
            zoneDefId,
            segmentIndex: target.segmentIndex,
            equipmentItemIds: equipmentFor(weaponItemId, loadout.tier),
            masteryLevel: target.mastery,
            enchantment: loadout.enchantment,
            useHealthPotions: true,
          });
          if (result.clear) undergearClears += 1;
        }
      }

      if (undergearClears === 0 && expectedClears >= 2) {
        valid.push({
          zone: zoneName(String(zoneDefId)),
          segment: `S${String(target.segmentIndex + 1)}`,
          expectedGear: `T8.${String(target.enchantment)}`,
          ...candidate,
          expectedClears,
          expectedMinHp,
          undergearClears,
        });
        if (valid.length >= MAX_RESULTS) break;
      }
    }
  } finally {
    zone.healthStart = original.healthStart;
    zone.healthEnd = original.healthEnd;
    zone.damageStart = original.damageStart;
    zone.damageEnd = original.damageEnd;
    zone.defenseStart = original.defenseStart;
    zone.defenseEnd = original.defenseEnd;
  }

  console.log(`[T8_Z${String(target.zoneIndex + 1)}_LATE_VALID_CANDIDATES]`);
  console.table(valid);
  console.log(`[T8_Z${String(target.zoneIndex + 1)}_LATE_VALID_CANDIDATES_JSON]`, JSON.stringify(valid, null, 2));
  if (valid[0] !== undefined) best.push(valid[0]);
}

console.log("[T8_LATE_BEST_CANDIDATES_JSON]", JSON.stringify(best, null, 2));
console.log("[T8_LATE_SWEEP_CONTRACT]", {
  zones: "Obsidian S10, Duskfall S10, Blackspire S9",
  undergearPotionClearsRequired: 0,
  minimumExpectedPotionClears: 2,
  note: "Blackspire S10 is excluded so a future/endgame boss gate can be calibrated independently.",
});
