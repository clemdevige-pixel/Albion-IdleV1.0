import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import {
  EquipmentManager,
  EquipmentStatSync,
  InventoryManager,
  StatsManager,
  createDefaultStatRegistry,
  type StatId,
} from "@game/gameplay";
import {
  resolveEquipmentInfo,
  resolveItemStackInfo,
} from "./itemContentCatalog.js";
import {
  WEAPON_ITEM_DEFINITIONS,
} from "./weaponContentCatalog.js";
import { getWeaponAttackSpeed } from "./itemPower.js";

const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_MAGICAL_DAMAGE = "stat_magical_damage" as StatId;
const STAT_ATTACK_SPEED = "stat_attack_speed" as StatId;
const HERO_BASE_ATTACK_SPEED = 1.2;

const T3_WEAPONS = [
  "item_weapon_sword_t3_broadsword",
  "item_weapon_bow_t3_longbow",
  "item_weapon_staff_t3_infernal",
  "item_weapon_gloves_t3_spiked_gauntlets",
  "item_weapon_dagger_t3_pair",
] as const;

function inspectWeapon(itemId: string) {
  const authored = WEAPON_ITEM_DEFINITIONS[itemId];
  const resolved = resolveEquipmentInfo(itemId);
  if (authored === undefined || resolved === undefined) throw new Error(`Missing weapon definition: ${itemId}`);

  const world = new World(createRuntimeServices());
  const statsManager = new StatsManager(world, createDefaultStatRegistry());
  const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
  const equipmentStatSync = new EquipmentStatSync(statsManager, resolveEquipmentInfo);
  const equipmentManager = new EquipmentManager(world, inventoryManager, resolveEquipmentInfo, equipmentStatSync);

  const heroId = world.createEntity();
  const stats = statsManager.attachStats(heroId);
  stats.setBase(STAT_PHYSICAL_DAMAGE, 0);
  stats.setBase(STAT_MAGICAL_DAMAGE, 0);
  stats.setBase(STAT_ATTACK_SPEED, HERO_BASE_ATTACK_SPEED);
  stats.recalculate();

  inventoryManager.createInventory(heroId, 4);
  equipmentManager.attachEquipment(heroId);
  const added = inventoryManager.addQuantity(heroId, itemId, 1, { itemId, stackable: false, maxStack: 1 });
  if (!added.ok || added.value.remainder !== 0) throw new Error(`Failed to seed ${itemId}`);
  const position = added.value.affectedPositions[0];
  if (position === undefined) throw new Error(`Missing slot for ${itemId}`);
  const equipped = equipmentManager.equipFromInventory(heroId, position);
  if (!equipped.ok) throw new Error(`Failed to equip ${itemId}: ${equipped.reason}`);

  const authoredPhysical = authored.stats?.stat_physical_damage ?? 0;
  const authoredMagical = authored.stats?.stat_magical_damage ?? 0;
  const resolvedPhysical = resolved.stats?.stat_physical_damage ?? 0;
  const resolvedMagical = resolved.stats?.stat_magical_damage ?? 0;
  const runtimePhysical = statsManager.getStat(heroId, STAT_PHYSICAL_DAMAGE).computed;
  const runtimeMagical = statsManager.getStat(heroId, STAT_MAGICAL_DAMAGE).computed;
  const runtimeAttackSpeed = statsManager.getStat(heroId, STAT_ATTACK_SPEED).computed;
  const intrinsicAttackSpeed = getWeaponAttackSpeed(itemId) ?? 0;
  const offensiveAuthored = authoredPhysical > 0 ? authoredPhysical : authoredMagical;
  const offensiveResolved = resolvedPhysical > 0 ? resolvedPhysical : resolvedMagical;
  const offensiveRuntime = runtimePhysical > 0 ? runtimePhysical : runtimeMagical;

  return {
    weapon: itemId,
    handling: authored.handling,
    authoredDamage: offensiveAuthored,
    resolvedDamage: Number(offensiveResolved.toFixed(2)),
    runtimeDamage: Number(offensiveRuntime.toFixed(2)),
    intrinsicAttackSpeed: Number(intrinsicAttackSpeed.toFixed(3)),
    runtimeAttackSpeed: Number(runtimeAttackSpeed.toFixed(3)),
    authoredDps: Number((offensiveAuthored * intrinsicAttackSpeed).toFixed(2)),
    resolvedDps: Number((offensiveResolved * intrinsicAttackSpeed).toFixed(2)),
    damageMultiplier: offensiveAuthored > 0 ? Number((offensiveResolved / offensiveAuthored).toFixed(3)) : 0,
    modifiers: statsManager.getModifiers(heroId)
      .filter((modifier) => modifier.statId === STAT_PHYSICAL_DAMAGE || modifier.statId === STAT_MAGICAL_DAMAGE || modifier.statId === STAT_ATTACK_SPEED)
      .map((modifier) => `${String(modifier.id)}:${modifier.type}:${modifier.value}:${modifier.source}`)
      .join(" | "),
  };
}

describe("weapon runtime damage diagnostic", () => {
  it("compares authored, resolved and runtime T3 weapon damage", () => {
    const rows = T3_WEAPONS.map(inspectWeapon);
    console.log("[WEAPON_RUNTIME_DAMAGE_DIAGNOSTIC]");
    console.table(rows);
    console.log("[WEAPON_RUNTIME_DAMAGE_DIAGNOSTIC_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(T3_WEAPONS.length);
    expect(rows.every((row) => row.runtimeDamage === row.resolvedDamage)).toBe(true);
  });
});
