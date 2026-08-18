import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { WORLD_ZONE_IDS, ZONE_DEFINITIONS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const BROADSWORD = "item_weapon_sword_t4_broadsword";
const DAGGER = "item_weapon_dagger_t4_pair";
const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  "item_traveler_cape",
] as const;
const T4_SHIELD = "item_shield_t4_reinforced";

const CHECKPOINTS = [
  {
    id: "steppe_s6_t4_0",
    zoneDefId: WORLD_ZONE_IDS.steppe,
    segmentIndex: 5,
    mastery: 16,
    enchantment: 0 as const,
    useHealthPotions: false,
  },
  {
    id: "frostpeak_s10_t4_2_potion",
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex: 9,
    mastery: 22,
    enchantment: 2 as const,
    useHealthPotions: true,
  },
  {
    id: "frostpeak_s10_t4_3",
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex: 9,
    mastery: 22,
    enchantment: 3 as const,
    useHealthPotions: false,
  },
] as const;

function zoneName(zoneDefId: (typeof CHECKPOINTS)[number]["zoneDefId"]): string {
  return ZONE_DEFINITIONS.find(({ id }) => id === zoneDefId)?.name ?? String(zoneDefId);
}

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...T4_ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T4_SHIELD);
  return items;
}

function shortWeaponName(itemId: string): string {
  return itemId === BROADSWORD ? "broadsword" : "dagger_pair";
}

const rows = CHECKPOINTS.flatMap((checkpoint) => [BROADSWORD, DAGGER].flatMap((weaponItemId) => {
  const result = runCombatRuntimeBenchmark({
    label: `${checkpoint.id}_${shortWeaponName(weaponItemId)}`,
    weaponItemId,
    zoneDefId: checkpoint.zoneDefId,
    segmentIndex: checkpoint.segmentIndex,
    equipmentItemIds: equipmentFor(weaponItemId),
    masteryLevel: checkpoint.mastery,
    enchantment: checkpoint.enchantment,
    useHealthPotions: checkpoint.useHealthPotions,
  });

  return result.encounters.map((encounter) => ({
    checkpoint: checkpoint.id,
    zone: zoneName(checkpoint.zoneDefId),
    weapon: shortWeaponName(weaponItemId),
    armor: Number(result.armor.toFixed(1)),
    mr: Number(result.magicResistance.toFixed(1)),
    maxHp: Number(result.maxHealth.toFixed(1)),
    encounter: encounter.encounterIndex,
    cleared: encounter.cleared,
    seconds: encounter.seconds,
    hpBefore: encounter.hpBeforePercent,
    hpAfter: encounter.hpAfterPercent,
    hpDelta: Number((encounter.hpAfterPercent - encounter.hpBeforePercent).toFixed(1)),
    potions: encounter.potionsUsed,
    damageDealt: encounter.damageDealt,
    damageTaken: encounter.damageReceived,
    dps: encounter.observedDps,
    autoDamage: encounter.damageBySource.autoAttack,
    abilityDamage: encounter.damageBySource.ability,
    effectDamage: encounter.damageBySource.effect,
    casts: encounter.abilities
      .filter((ability) => ability.casts > 0)
      .map((ability) => `${ability.abilityId}:${ability.casts}`)
      .join(" | ") || "-",
  }));
}));

console.log("[BROADSWORD_VS_DAGGER_ENCOUNTER_TELEMETRY]");
console.table(rows);

const comparison = CHECKPOINTS.map((checkpoint) => {
  const checkpointRows = rows.filter((row) => row.checkpoint === checkpoint.id);
  const broadswordRows = checkpointRows.filter((row) => row.weapon === "broadsword");
  const daggerRows = checkpointRows.filter((row) => row.weapon === "dagger_pair");
  const broadswordFinal = broadswordRows.at(-1);
  const daggerFinal = daggerRows.at(-1);
  return {
    checkpoint: checkpoint.id,
    broadswordEncounters: broadswordRows.length,
    daggerEncounters: daggerRows.length,
    broadswordFinalEncounter: broadswordFinal?.encounter ?? 0,
    daggerFinalEncounter: daggerFinal?.encounter ?? 0,
    broadswordFinalHp: broadswordFinal?.hpAfter ?? 0,
    daggerFinalHp: daggerFinal?.hpAfter ?? 0,
    broadswordDamageTaken: Number(broadswordRows.reduce((sum, row) => sum + row.damageTaken, 0).toFixed(1)),
    daggerDamageTaken: Number(daggerRows.reduce((sum, row) => sum + row.damageTaken, 0).toFixed(1)),
    broadswordSeconds: Number(broadswordRows.reduce((sum, row) => sum + row.seconds, 0).toFixed(1)),
    daggerSeconds: Number(daggerRows.reduce((sum, row) => sum + row.seconds, 0).toFixed(1)),
  };
});

console.log("[BROADSWORD_VS_DAGGER_ENCOUNTER_SUMMARY]");
console.table(comparison);
