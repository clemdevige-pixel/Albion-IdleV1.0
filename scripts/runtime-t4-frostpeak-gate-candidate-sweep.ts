import { BLUE_WORLD_COMBAT_CURVE, type BossGateCombatProfile, type ZoneCombatCurve } from "@game/data";
import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { WEAPON_ITEM_DEFINITIONS } from "../apps/client/src/data/weaponContentCatalog.js";
import { WORLD_ZONE_IDS_BY_BAND } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

type MutableZone = ZoneCombatCurve & { bossGate?: BossGateCombatProfile };
type MutableStats = { stat_physical_damage?: number };

const WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;
const LONGBOW_ID = "item_weapon_bow_t4_longbow";
const zone = BLUE_WORLD_COMBAT_CURVE[4] as MutableZone;
const zoneDefId = WORLD_ZONE_IDS_BY_BAND.blue[4];
if (zoneDefId === undefined) throw new Error("Missing Frostpeak zone");
const longbow = WEAPON_ITEM_DEFINITIONS[LONGBOW_ID];
if (longbow?.stats === undefined) throw new Error("Missing T4 Longbow stats");
const longbowStats = longbow.stats as MutableStats;
const originalDamage = longbowStats.stat_physical_damage;
if (originalDamage === undefined) throw new Error("Missing T4 Longbow damage");
const originalBoss = zone.bossGate;

const LONGBOW_SCALES = [1, 0.995, 0.99, 0.985, 0.98, 0.975, 0.97, 0.965, 0.96, 0.95, 0.94, 0.93, 0.92, 0.9] as const;
const BOSS_HEALTH = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.75, 1.9, 2.1, 2.3, 2.5] as const;
const BOSS_DAMAGE = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.75, 1.9, 2.1] as const;
const BOSS_DEFENSE = [1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.4, 1.5] as const;
const MAX_RESULTS = 12;
const MAX_NEAR_MISSES = 20;

function equipmentFor(weaponItemId: string): readonly string[] {
  const items = ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push("item_shield_t4_reinforced");
  return items;
}

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace(/_t4_/, " ");
}

const candidates = LONGBOW_SCALES.flatMap((longbowScale) =>
  BOSS_HEALTH.flatMap((health) =>
    BOSS_DAMAGE.flatMap((damage) =>
      BOSS_DEFENSE.map((defense) => ({
        longbowScale,
        longbowDamage: Number((originalDamage * longbowScale).toFixed(2)),
        health,
        damage,
        defense,
        score: Number(((1 - longbowScale) + (health - 1) + (damage - 1) + (defense - 1)).toFixed(4)),
      })),
    ),
  ),
).sort((a, b) => a.score - b.score || b.longbowScale - a.longbowScale || a.health - b.health || a.damage - b.damage || a.defense - b.defense);

const valid: Array<Record<string, unknown>> = [];
const nearMisses: Array<Record<string, unknown> & { contractMisses: number; score: number }> = [];
try {
  for (const candidate of candidates) {
    longbowStats.stat_physical_damage = candidate.longbowDamage;
    zone.bossGate = {
      progressionRole: "boss_gate",
      healthMultiplier: candidate.health,
      damageMultiplier: candidate.damage,
      defenseMultiplier: candidate.defense,
    };

    let n2PotionClears = 0;
    let n3PotionClears = 0;
    let n3NoPotionClears = 0;
    let minN3PotionHp = 100;
    const n2Leakers: string[] = [];
    const n3Failures: string[] = [];
    const n3NoPotionLeakers: string[] = [];

    for (const weaponItemId of WEAPONS) {
      const common = {
        weaponItemId,
        zoneDefId,
        segmentIndex: 9,
        equipmentItemIds: equipmentFor(weaponItemId),
        masteryLevel: 30,
      } as const;
      const n2 = runCombatRuntimeBenchmark({ ...common, label: "t4_gate_n2", enchantment: 2, useHealthPotions: true });
      const n3NoPotion = runCombatRuntimeBenchmark({ ...common, label: "t4_gate_n3_no_potion", enchantment: 3, useHealthPotions: false });
      const n3Potion = runCombatRuntimeBenchmark({ ...common, label: "t4_gate_n3_potion", enchantment: 3, useHealthPotions: true });
      if (n2.clear) {
        n2PotionClears += 1;
        n2Leakers.push(shortWeaponName(weaponItemId));
      }
      if (n3NoPotion.clear) {
        n3NoPotionClears += 1;
        n3NoPotionLeakers.push(shortWeaponName(weaponItemId));
      }
      if (n3Potion.clear) {
        n3PotionClears += 1;
        minN3PotionHp = Math.min(minN3PotionHp, n3Potion.hpPercent);
      } else {
        n3Failures.push(shortWeaponName(weaponItemId));
      }
    }

    const contractMisses = n2PotionClears + (5 - n3PotionClears) + n3NoPotionClears;
    const row = {
      ...candidate,
      contractMisses,
      n2PotionClears,
      n3PotionClears,
      n3NoPotionClears,
      minN3PotionHp: n3PotionClears === 0 ? 0 : minN3PotionHp,
      n2Leakers,
      n3Failures,
      n3NoPotionLeakers,
    };

    if (contractMisses === 0) {
      valid.push(row);
      if (valid.length >= MAX_RESULTS) break;
    } else {
      nearMisses.push(row);
    }
  }
} finally {
  longbowStats.stat_physical_damage = originalDamage;
  zone.bossGate = originalBoss;
}

nearMisses.sort((a, b) => a.contractMisses - b.contractMisses || a.score - b.score);
const bestNearMisses = nearMisses.slice(0, MAX_NEAR_MISSES);

console.log("[T4_FROSTPEAK_GATE_CANDIDATES]");
console.table(valid);
console.log("[T4_FROSTPEAK_GATE_CANDIDATES_JSON]", JSON.stringify(valid, null, 2));
console.log("[T4_FROSTPEAK_GATE_NEAR_MISSES]");
console.table(bestNearMisses);
console.log("[T4_FROSTPEAK_GATE_NEAR_MISSES_JSON]", JSON.stringify(bestNearMisses, null, 2));
console.log("[T4_FROSTPEAK_GATE_SWEEP_CONTRACT]", {
  unchangedWeapons: "Broadsword, Infernal, Spiked, Dagger",
  tunedWeapon: "T4 Longbow only",
  target: "T4.2 + potion = 0/5; T4.3 + potion = 5/5; T4.3 no potion = 0/5",
  preference: "Smallest Longbow nerf first, then smallest boss-gate adjustment",
  nearMissPenalty: "n2 potion leaks + n3 potion failures + n3 no-potion leaks",
});
