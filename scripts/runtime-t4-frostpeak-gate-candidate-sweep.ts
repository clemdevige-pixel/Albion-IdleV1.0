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
const DAGGER_ID = "item_weapon_dagger_t4_pair";
const zone = BLUE_WORLD_COMBAT_CURVE[4] as MutableZone;
const zoneDefId = WORLD_ZONE_IDS_BY_BAND.blue[4];
if (zoneDefId === undefined) throw new Error("Missing Frostpeak zone");
const dagger = WEAPON_ITEM_DEFINITIONS[DAGGER_ID];
if (dagger?.stats === undefined) throw new Error("Missing T4 dagger stats");
const daggerStats = dagger.stats as MutableStats;
const originalDamage = daggerStats.stat_physical_damage;
if (originalDamage === undefined) throw new Error("Missing T4 dagger damage");
const originalBoss = zone.bossGate;

const DAGGER_SCALES = [1, 1.025, 1.05, 1.075, 1.1, 1.125, 1.15, 1.175, 1.2, 1.25, 1.3] as const;
const BOSS_HEALTH = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.75, 1.9, 2.1, 2.3, 2.5] as const;
const BOSS_DAMAGE = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.75, 1.9, 2.1] as const;
const BOSS_DEFENSE = [1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.4, 1.5] as const;
const MAX_RESULTS = 12;

function equipmentFor(weaponItemId: string): readonly string[] {
  const items = ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push("item_shield_t4_reinforced");
  return items;
}

const candidates = DAGGER_SCALES.flatMap((daggerScale) =>
  BOSS_HEALTH.flatMap((health) =>
    BOSS_DAMAGE.flatMap((damage) =>
      BOSS_DEFENSE.map((defense) => ({
        daggerScale,
        daggerDamage: Number((originalDamage * daggerScale).toFixed(2)),
        health,
        damage,
        defense,
        score: Number(((daggerScale - 1) + (health - 1) + (damage - 1) + (defense - 1)).toFixed(4)),
      })),
    ),
  ),
).sort((a, b) => a.score - b.score || a.daggerScale - b.daggerScale || a.health - b.health || a.damage - b.damage || a.defense - b.defense);

const valid: Array<Record<string, unknown>> = [];
try {
  for (const candidate of candidates) {
    daggerStats.stat_physical_damage = candidate.daggerDamage;
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
      if (n2.clear) { n2PotionClears += 1; n2Leakers.push(weaponItemId); }
      if (n3NoPotion.clear) n3NoPotionClears += 1;
      if (n3Potion.clear) { n3PotionClears += 1; minN3PotionHp = Math.min(minN3PotionHp, n3Potion.hpPercent); }
      else n3Failures.push(weaponItemId);
    }

    if (n2PotionClears === 0 && n3PotionClears === 5 && n3NoPotionClears === 0) {
      valid.push({ ...candidate, n2PotionClears, n3PotionClears, n3NoPotionClears, minN3PotionHp, n2Leakers, n3Failures });
      if (valid.length >= MAX_RESULTS) break;
    }
  }
} finally {
  daggerStats.stat_physical_damage = originalDamage;
  zone.bossGate = originalBoss;
}

console.log("[T4_FROSTPEAK_GATE_CANDIDATES]");
console.table(valid);
console.log("[T4_FROSTPEAK_GATE_CANDIDATES_JSON]", JSON.stringify(valid, null, 2));
console.log("[T4_FROSTPEAK_GATE_SWEEP_CONTRACT]", {
  unchangedWeapons: "Broadsword, Longbow, Infernal, Spiked",
  tunedWeapon: "T4 Dagger Pair only",
  target: "T4.2 + potion = 0/5; T4.3 + potion = 5/5; T4.3 no potion = 0/5",
});
