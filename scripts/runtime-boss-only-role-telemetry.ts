import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { WORLD_ZONE_IDS_BY_BAND, ZONE_DEFINITIONS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const MASTERY_LEVEL = 30;
const ENCHANTMENT = 2 as const;
const SEGMENT_INDEX = 9;
const BOSS_ENCOUNTER_INDEX = 4;
const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  "item_traveler_cape",
] as const;
const T4_SHIELD = "item_shield_t4_reinforced";

const WEAPONS = [
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_dagger_t4_pair",
] as const;

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t4_", " ");
}

function zoneName(zoneDefId: (typeof WORLD_ZONE_IDS_BY_BAND.blue)[number]): string {
  return ZONE_DEFINITIONS.find(({ id }) => id === zoneDefId)?.name ?? String(zoneDefId);
}

function equipmentFor(weaponItemId: string): readonly string[] {
  const items = [...T4_ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T4_SHIELD);
  return items;
}

function percent(part: number, total: number): number {
  return total > 0 ? Number(((part / total) * 100).toFixed(1)) : 0;
}

const rows = WORLD_ZONE_IDS_BY_BAND.blue.flatMap((zoneDefId) => WEAPONS.map((weaponItemId) => {
  const result = runCombatRuntimeBenchmark({
    label: `${String(zoneDefId)}_boss_only`,
    weaponItemId,
    zoneDefId,
    segmentIndex: SEGMENT_INDEX,
    startingEncounterIndex: BOSS_ENCOUNTER_INDEX,
    equipmentItemIds: equipmentFor(weaponItemId),
    enchantment: ENCHANTMENT,
    masteryLevel: MASTERY_LEVEL,
    useHealthPotions: true,
  });

  return {
    weapon: shortWeaponName(weaponItemId),
    zone: zoneName(zoneDefId),
    clear: result.clear,
    seconds: result.seconds,
    hp: result.hpPercent,
    potions: result.potionsUsed,
    dps: result.observedDps,
    totalDamage: result.damageDealt,
    autoDamage: result.damageBySource.autoAttack,
    autoShare: percent(result.damageBySource.autoAttack, result.damageDealt),
    abilityDamage: result.damageBySource.ability,
    abilityShare: percent(result.damageBySource.ability, result.damageDealt),
    dotDamage: result.damageBySource.effect,
    dotShare: percent(result.damageBySource.effect, result.damageDealt),
    abilities: result.abilities,
  };
}));

console.log("[BOSS_ONLY_ROLE_RUNTIME_TELEMETRY_REFERENCE]", {
  masteryLevel: MASTERY_LEVEL,
  enchantment: ENCHANTMENT,
  fullT4Armor: true,
  healthPotions: true,
  segment: 10,
  encounter: 5,
  cooldownsReadyAtStart: true,
});

console.log("[BOSS_ONLY_ROLE_RUNTIME_TELEMETRY]");
console.table(rows.map(({ abilities: _abilities, ...row }) => row));

console.log("[BOSS_ONLY_ROLE_RUNTIME_ABILITY_BREAKDOWN]");
for (const row of rows) {
  console.log(`${row.weapon} | ${row.zone} | ${row.seconds}s | ${row.dps} DPS`);
  console.table(row.abilities.map((ability) => ({
    ability: ability.abilityId,
    casts: ability.casts,
    directDamage: ability.directDamage,
    damagePerCast: ability.casts > 0 ? Number((ability.directDamage / ability.casts).toFixed(1)) : 0,
  })));
}
