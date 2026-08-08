import type { EntityId } from "@game/core";
import type { EquipmentManager, MasteryService, StatsManager, ModifierId, StatId } from "@game/gameplay";
import { getMasteryItemPowerBonus } from "../data/itemPower.js";
import { ITEM_DEFINITIONS } from "../data/itemContentCatalog.js";

export const MASTERY_PHYSICAL_DAMAGE_MODIFIER = "mastery_weapon_physical_damage" as ModifierId;
export const MASTERY_MAGICAL_DAMAGE_MODIFIER = "mastery_weapon_magical_damage" as ModifierId;

const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_MAGICAL_DAMAGE = "stat_magical_damage" as StatId;

/**
 * Rebuild the weapon-only damage granted by mastery IP.
 * +100 bonus IP = +20% of the weapon's own primary damage.
 * Hero base damage, attack speed and defensive stats are never scaled.
 */
export function recalculateWeaponMasteryStats(
  statsManager: StatsManager,
  equipmentManager: EquipmentManager,
  masteryService: MasteryService,
  entityId: EntityId,
): void {
  statsManager.removeModifier(entityId, MASTERY_PHYSICAL_DAMAGE_MODIFIER);
  statsManager.removeModifier(entityId, MASTERY_MAGICAL_DAMAGE_MODIFIER);

  const equippedWeapon = equipmentManager.getEquippedItem(entityId, "weapon");
  if (equippedWeapon === undefined) return;

  const weaponDefinition = ITEM_DEFINITIONS[equippedWeapon.itemId];
  if (weaponDefinition === undefined) return;

  const masteries = [...masteryService.getAllMasteries().values()].map((mastery) => ({
    id: mastery.masteryId as string,
    level: mastery.level,
  }));
  const bonusIp = getMasteryItemPowerBonus(equippedWeapon.itemId, masteries);
  if (bonusIp <= 0) return;

  const physicalDamage = weaponDefinition.stats?.stat_physical_damage ?? 0;
  const magicalDamage = weaponDefinition.stats?.stat_magical_damage ?? 0;
  if (physicalDamage > 0) {
    statsManager.addModifier(entityId, {
      id: MASTERY_PHYSICAL_DAMAGE_MODIFIER,
      statId: STAT_PHYSICAL_DAMAGE,
      type: "flat",
      value: (physicalDamage * bonusIp) / 500,
      priority: 10,
      source: "mastery:weapon_ip",
    });
  }
  if (magicalDamage > 0) {
    statsManager.addModifier(entityId, {
      id: MASTERY_MAGICAL_DAMAGE_MODIFIER,
      statId: STAT_MAGICAL_DAMAGE,
      type: "flat",
      value: (magicalDamage * bonusIp) / 500,
      priority: 10,
      source: "mastery:weapon_ip",
    });
  }
}
