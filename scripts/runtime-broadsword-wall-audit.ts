import type { ZoneDefinitionId } from "@game/gameplay";

import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { WORLD_ZONE_IDS, ZONE_DEFINITIONS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const BROADSWORD = "item_weapon_sword_t4_broadsword";
const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  "item_traveler_cape",
] as const;
const T4_SHIELD = "item_shield_t4_reinforced";

type Enchantment = 0 | 1 | 2 | 3;
interface WallProbe {
  readonly id: string;
  readonly zoneDefId: ZoneDefinitionId;
  readonly segmentIndex: number;
  readonly mastery: number;
  readonly enchantment: Enchantment;
}

const PROBES: readonly WallProbe[] = [
  { id: "highland_s10_full_t4", zoneDefId: WORLD_ZONE_IDS.highland, segmentIndex: 9, mastery: 14, enchantment: 0 },
  { id: "steppe_s6_full_t4_0", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 5, mastery: 16, enchantment: 0 },
  { id: "steppe_s10_full_t4_1", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 9, mastery: 18, enchantment: 1 },
  { id: "frostpeak_s10_full_t4_3", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 9, mastery: 22, enchantment: 3 },
];

function zoneName(zoneDefId: ZoneDefinitionId): string {
  return ZONE_DEFINITIONS.find(({ id }) => id === zoneDefId)?.name ?? String(zoneDefId);
}

function equipment(): readonly string[] {
  const items: string[] = [...T4_ARMOR];
  if (resolveEquipmentInfo(BROADSWORD)?.handling === "one_handed") items.push(T4_SHIELD);
  return items;
}

function main(): void {
  const rows = PROBES.map((probe) => {
    const result = runCombatRuntimeBenchmark({
      label: probe.id,
      weaponItemId: BROADSWORD,
      zoneDefId: probe.zoneDefId,
      segmentIndex: probe.segmentIndex,
      equipmentItemIds: equipment(),
      masteryLevel: probe.mastery,
      enchantment: probe.enchantment,
      useHealthPotions: false,
    });
    const q = result.abilities.find((ability) => ability.abilityId === "ability_sword_heroic_strike");
    const w = result.abilities.find((ability) => ability.abilityId === "ability_sword_guard_breaker");
    const e = result.abilities.find((ability) => ability.abilityId === "ability_sword_execution");
    const total = result.damageDealt || 1;
    return {
      checkpoint: probe.id,
      zone: zoneName(probe.zoneDefId),
      clear: result.clear,
      seconds: result.seconds,
      encounters: result.encounterReached,
      hp: result.hpPercent,
      dps: result.observedDps,
      damageTaken: result.damageReceived,
      autoDamage: result.damageBySource.autoAttack,
      autoShare: Number(((result.damageBySource.autoAttack / total) * 100).toFixed(1)),
      abilityDamage: result.damageBySource.ability,
      abilityShare: Number(((result.damageBySource.ability / total) * 100).toFixed(1)),
      qCasts: q?.casts ?? 0,
      qDamage: q?.directDamage ?? 0,
      wCasts: w?.casts ?? 0,
      wDamage: w?.directDamage ?? 0,
      eCasts: e?.casts ?? 0,
      eDamage: e?.directDamage ?? 0,
    };
  });

  console.log("[BROADSWORD_WALL_RUNTIME_TELEMETRY]");
  console.table(rows);

  console.log("[BROADSWORD_WALL_ABILITY_BREAKDOWN]");
  for (const probe of PROBES) {
    const result = runCombatRuntimeBenchmark({
      label: probe.id,
      weaponItemId: BROADSWORD,
      zoneDefId: probe.zoneDefId,
      segmentIndex: probe.segmentIndex,
      equipmentItemIds: equipment(),
      masteryLevel: probe.mastery,
      enchantment: probe.enchantment,
      useHealthPotions: false,
    });
    console.log(`${probe.id} | ${zoneName(probe.zoneDefId)} | ${result.seconds}s | ${result.observedDps} DPS`);
    console.table(result.abilities.map((ability) => ({
      ability: ability.abilityId,
      casts: ability.casts,
      directDamage: ability.directDamage,
      damagePerCast: ability.casts > 0 ? Number((ability.directDamage / ability.casts).toFixed(1)) : 0,
    })));
  }
}

main();
