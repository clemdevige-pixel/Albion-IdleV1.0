import type { EntityId } from "@game/core";
import {
  type AwakenedTraitId,
  type AwakenedWeaponService,
  type EquipmentManager,
  type MasteryService,
  type ModifierId,
  type StatId,
  type StatsManager,
} from "@game/gameplay";
import { getMasteryItemPowerBonus } from "../data/itemPower.js";
import { resolveEquipmentInfo } from "../data/itemContentCatalog.js";

export const MASTERY_PHYSICAL_DAMAGE_MODIFIER = "mastery_weapon_physical_damage" as ModifierId;
export const MASTERY_MAGICAL_DAMAGE_MODIFIER = "mastery_weapon_magical_damage" as ModifierId;

const AWAKENED_MODIFIER_PREFIX = "awakened_weapon_";
const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_MAGICAL_DAMAGE = "stat_magical_damage" as StatId;
const STAT_MAX_HEALTH = "stat_max_health" as StatId;
const STAT_ARMOR = "stat_armor" as StatId;
const STAT_MAGIC_RESISTANCE = "stat_magic_resistance" as StatId;
const STAT_ABILITY_POWER = "stat_ability_power" as StatId;
const STAT_COOLDOWN_REDUCTION = "stat_cooldown_reduction" as StatId;
const STAT_AUTO_ATTACK_DAMAGE_BONUS = "stat_auto_attack_damage_bonus" as StatId;
const STAT_LIFE_STEAL = "stat_life_steal" as StatId;

function getTraitValue(
  traits: readonly { readonly traitId: AwakenedTraitId; readonly value: number }[],
  traitId: AwakenedTraitId,
): number {
  return traits.find((trait) => trait.traitId === traitId)?.value ?? 0;
}

function removeAwakenedModifiers(statsManager: StatsManager, entityId: EntityId): void {
  for (const modifier of statsManager.getModifiers(entityId)) {
    if (String(modifier.id).startsWith(AWAKENED_MODIFIER_PREFIX)) {
      statsManager.removeModifier(entityId, modifier.id);
    }
  }
}

function addAwakenedFlat(
  statsManager: StatsManager,
  entityId: EntityId,
  suffix: string,
  statId: StatId,
  value: number,
): void {
  if (value <= 0) return;
  statsManager.addModifier(entityId, {
    id: `${AWAKENED_MODIFIER_PREFIX}${suffix}` as ModifierId,
    statId,
    type: "flat",
    value,
    priority: 20,
    source: "awakening:weapon",
  });
}

/**
 * Rebuild weapon progression modifiers from authoritative mastery + .4 state.
 * Mastery/IP keeps using the weapon offensive stat. Awake-specific effects are
 * regular stats consumed by their owning combat pipeline, avoiding ability or
 * resistance side effects from UI-level special cases.
 */
export function recalculateWeaponProgressionStats(
  statsManager: StatsManager,
  equipmentManager: EquipmentManager,
  masteryService: MasteryService,
  entityId: EntityId,
  awakenedWeaponService?: AwakenedWeaponService,
): void {
  statsManager.removeModifier(entityId, MASTERY_PHYSICAL_DAMAGE_MODIFIER);
  statsManager.removeModifier(entityId, MASTERY_MAGICAL_DAMAGE_MODIFIER);
  removeAwakenedModifiers(statsManager, entityId);

  const equippedWeapon = equipmentManager.getEquippedItem(entityId, "weapon");
  if (equippedWeapon === undefined) {
    statsManager.calculateStats(entityId);
    return;
  }

  const weaponDefinition = resolveEquipmentInfo(equippedWeapon.itemId);
  if (weaponDefinition === undefined) {
    statsManager.calculateStats(entityId);
    return;
  }

  const masteries = [...masteryService.getAllMasteries().values()].map((mastery) => ({
    id: mastery.masteryId,
    level: mastery.level,
  }));
  const masteryIp = getMasteryItemPowerBonus(equippedWeapon.itemId, masteries);
  const awakenedState = awakenedWeaponService?.getState(equippedWeapon.instanceId);
  const traits = awakenedState?.traits ?? [];
  const awakenedIp = getTraitValue(traits, "item_power");
  const totalBonusIp = masteryIp + awakenedIp;

  const physicalDamage = weaponDefinition.stats?.stat_physical_damage ?? 0;
  const magicalDamage = weaponDefinition.stats?.stat_magical_damage ?? 0;
  if (physicalDamage > 0 && totalBonusIp > 0) {
    statsManager.addModifier(entityId, {
      id: MASTERY_PHYSICAL_DAMAGE_MODIFIER,
      statId: STAT_PHYSICAL_DAMAGE,
      type: "flat",
      value: (physicalDamage * totalBonusIp) / 500,
      priority: 10,
      source: "progression:weapon_ip",
    });
  }
  if (magicalDamage > 0 && totalBonusIp > 0) {
    statsManager.addModifier(entityId, {
      id: MASTERY_MAGICAL_DAMAGE_MODIFIER,
      statId: STAT_MAGICAL_DAMAGE,
      type: "flat",
      value: (magicalDamage * totalBonusIp) / 500,
      priority: 10,
      source: "progression:weapon_ip",
    });
  }

  addAwakenedFlat(
    statsManager,
    entityId,
    "auto_attack_damage",
    STAT_AUTO_ATTACK_DAMAGE_BONUS,
    getTraitValue(traits, "auto_attack_damage"),
  );
  addAwakenedFlat(statsManager, entityId, "max_health", STAT_MAX_HEALTH, getTraitValue(traits, "max_health"));

  const defense = getTraitValue(traits, "defense");
  addAwakenedFlat(statsManager, entityId, "armor", STAT_ARMOR, defense);
  addAwakenedFlat(statsManager, entityId, "magic_resistance", STAT_MAGIC_RESISTANCE, defense);
  addAwakenedFlat(statsManager, entityId, "ability_power", STAT_ABILITY_POWER, getTraitValue(traits, "ability_power"));

  const cdrProgression = getTraitValue(traits, "cooldown_reduction");
  const effectiveCdr = awakenedWeaponService?.getDisplayTraitValue("cooldown_reduction", cdrProgression) ?? 0;
  addAwakenedFlat(statsManager, entityId, "cooldown_reduction", STAT_COOLDOWN_REDUCTION, effectiveCdr);

  const lifeStealProgression = getTraitValue(traits, "life_steal");
  const effectiveLifeSteal = awakenedWeaponService?.getDisplayTraitValue("life_steal", lifeStealProgression) ?? 0;
  addAwakenedFlat(statsManager, entityId, "life_steal", STAT_LIFE_STEAL, effectiveLifeSteal);

  statsManager.calculateStats(entityId);
}

/** @deprecated Use recalculateWeaponProgressionStats. */
export function recalculateWeaponMasteryStats(
  statsManager: StatsManager,
  equipmentManager: EquipmentManager,
  masteryService: MasteryService,
  entityId: EntityId,
): void {
  recalculateWeaponProgressionStats(
    statsManager,
    equipmentManager,
    masteryService,
    entityId,
  );
}
