import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import type { EntityId } from "@game/core";
import { DamageManager, HealthComponent } from "../../damage/index.js";
import { InventoryManager } from "../../inventory/inventory-manager.js";
import { StatsManager, createDefaultStatRegistry } from "../../stats/index.js";
import type { StatId } from "../../stats/types.js";
import { EquipmentManager } from "../equipment-manager.js";
import { EquipmentSaveProvider } from "../equipment-save-provider.js";
import { EquipmentStatSync } from "../equipment-stat-sync.js";
import type { EquipmentInfoLike, EquipmentInfoResolver } from "../types.js";

const HP = "stat_max_health" as StatId;
const DMG = "stat_physical_damage" as StatId;
const ARMOR = "stat_armor" as StatId;

const EQUIP_INFO: Record<string, EquipmentInfoLike> = {
  item_sword: {
    itemId: "item_sword",
    slot: "weapon",
    handling: "one_handed",
    stats: { stat_physical_damage: 15 },
  },
  item_axe: {
    itemId: "item_axe",
    slot: "weapon",
    handling: "one_handed",
    stats: { stat_physical_damage: 22 },
  },
  item_bow: {
    itemId: "item_bow",
    slot: "weapon",
    handling: "two_handed",
    stats: { stat_physical_damage: 30 },
  },
  item_shield: {
    itemId: "item_shield",
    slot: "off_hand",
    handling: "none",
    stats: { stat_armor: 8, stat_max_health: 20 },
  },
  item_helmet: {
    itemId: "item_helmet",
    slot: "head",
    handling: "none",
    stats: { stat_max_health: 20 },
  },
  item_chest: {
    itemId: "item_chest",
    slot: "chest",
    handling: "none",
    stats: { stat_max_health: 80, stat_armor: 6 },
  },
  item_plain_cape: { itemId: "item_plain_cape", slot: "cape", handling: "none" },
};

const resolveInfo: EquipmentInfoResolver = (itemId) => EQUIP_INFO[itemId];

interface Setup {
  world: World;
  statsManager: StatsManager;
  inventoryManager: InventoryManager;
  equipmentManager: EquipmentManager;
  damageManager: DamageManager;
}

function makeSetup(): Setup {
  const world = new World(createRuntimeServices());
  const statsManager = new StatsManager(world, createDefaultStatRegistry());
  const damageManager = new DamageManager(world, statsManager);
  const statSync = new EquipmentStatSync(statsManager, resolveInfo, (entityId, changedStats) => {
    if (changedStats.includes(HP) && world.hasComponent(entityId, HealthComponent)) {
      damageManager.syncMaxHealth(entityId);
    }
  });
  const inventoryManager = new InventoryManager(world);
  const equipmentManager = new EquipmentManager(world, inventoryManager, resolveInfo, statSync);
  return { world, statsManager, inventoryManager, equipmentManager, damageManager };
}

function makeEntity(s: Setup): EntityId {
  const entityId = s.world.createEntity();
  s.statsManager.attachStats(entityId);
  s.statsManager.setBaseStat(entityId, HP, 100);
  s.statsManager.setBaseStat(entityId, DMG, 10);
  s.inventoryManager.createInventory(entityId, 8);
  s.equipmentManager.attachEquipment(entityId);
  return entityId;
}

function addItem(s: Setup, entityId: EntityId, itemId: string, position: number): void {
  const result = s.inventoryManager.addEntry(entityId, itemId, position);
  if (!result.ok) {
    throw new Error(`test setup: ${result.reason}`);
  }
}

describe("Equipment stat integration", () => {
  let s: Setup;
  let entityId: EntityId;

  beforeEach(() => {
    s = makeSetup();
    entityId = makeEntity(s);
  });

  it("equipping an item applies its stat bonuses", () => {
    addItem(s, entityId, "item_sword", 0);
    expect(s.equipmentManager.equipFromInventory(entityId, 0).ok).toBe(true);
    expect(s.statsManager.getStat(entityId, DMG).computed).toBe(25);
    expect(s.statsManager.getStat(entityId, DMG).base).toBe(10);
  });

  it("unequipping removes the bonuses", () => {
    addItem(s, entityId, "item_sword", 0);
    s.equipmentManager.equipFromInventory(entityId, 0);
    expect(s.equipmentManager.unequipToInventory(entityId, "weapon").ok).toBe(true);
    expect(s.statsManager.getStat(entityId, DMG).computed).toBe(10);
    expect(s.statsManager.getModifiers(entityId)).toHaveLength(0);
  });

  it("swap removes old bonuses and applies new ones with no leftovers", () => {
    addItem(s, entityId, "item_sword", 0);
    addItem(s, entityId, "item_axe", 1);
    s.equipmentManager.equipFromInventory(entityId, 0);
    expect(s.equipmentManager.equipFromInventory(entityId, 1).ok).toBe(true);
    expect(s.statsManager.getStat(entityId, DMG).computed).toBe(32);
    expect(s.statsManager.getModifiers(entityId)).toHaveLength(1);
  });

  it("bonuses from multiple items cumulate across slots and stats", () => {
    addItem(s, entityId, "item_helmet", 0);
    addItem(s, entityId, "item_chest", 1);
    addItem(s, entityId, "item_sword", 2);
    s.equipmentManager.equipFromInventory(entityId, 0);
    s.equipmentManager.equipFromInventory(entityId, 1);
    s.equipmentManager.equipFromInventory(entityId, 2);
    expect(s.statsManager.getStat(entityId, HP).computed).toBe(200);
    expect(s.statsManager.getStat(entityId, ARMOR).computed).toBe(6);
    expect(s.statsManager.getStat(entityId, DMG).computed).toBe(25);
  });

  it("two-handed weapon displacing the off-hand removes its bonuses", () => {
    addItem(s, entityId, "item_shield", 0);
    addItem(s, entityId, "item_bow", 1);
    s.equipmentManager.equipFromInventory(entityId, 0);
    expect(s.statsManager.getStat(entityId, ARMOR).computed).toBe(8);
    expect(s.equipmentManager.equipFromInventory(entityId, 1).ok).toBe(true);
    expect(s.statsManager.getStat(entityId, ARMOR).computed).toBe(0);
    expect(s.statsManager.getStat(entityId, HP).computed).toBe(100);
    expect(s.statsManager.getStat(entityId, DMG).computed).toBe(40);
    expect(s.statsManager.getModifiers(entityId)).toHaveLength(1);
  });

  it("failed equip leaves stats untouched", () => {
    addItem(s, entityId, "item_bow", 0);
    addItem(s, entityId, "item_shield", 1);
    s.equipmentManager.equipFromInventory(entityId, 0);
    const before = s.statsManager.getStat(entityId, DMG).computed;
    const result = s.equipmentManager.equipFromInventory(entityId, 1);
    expect(result).toEqual({ ok: false, reason: "two_handed_conflict" });
    expect(s.statsManager.getStat(entityId, DMG).computed).toBe(before);
    expect(s.statsManager.getModifiers(entityId)).toHaveLength(1);
  });

  it("repeated equip/unequip cycles never duplicate modifiers", () => {
    addItem(s, entityId, "item_sword", 0);
    for (let i = 0; i < 5; i++) {
      expect(s.equipmentManager.equipFromInventory(entityId, 0).ok).toBe(true);
      expect(s.statsManager.getModifiers(entityId)).toHaveLength(1);
      expect(s.equipmentManager.unequipToInventory(entityId, "weapon").ok).toBe(true);
      expect(s.statsManager.getModifiers(entityId)).toHaveLength(0);
    }
    expect(s.statsManager.getStat(entityId, DMG).computed).toBe(10);
  });

  it("items without stat bonuses equip cleanly with zero modifiers", () => {
    addItem(s, entityId, "item_plain_cape", 0);
    expect(s.equipmentManager.equipFromInventory(entityId, 0).ok).toBe(true);
    expect(s.statsManager.getModifiers(entityId)).toHaveLength(0);
  });

  it("equipping is a graceful no-op for an entity without stats", () => {
    const bare = s.world.createEntity();
    s.inventoryManager.createInventory(bare, 4);
    s.equipmentManager.attachEquipment(bare);
    addItem(s, bare, "item_sword", 0);
    expect(s.equipmentManager.equipFromInventory(bare, 0).ok).toBe(true);
    expect(s.statsManager.hasStats(bare)).toBe(false);
  });

  it("max health changes preserve the health ratio via syncMaxHealth", () => {
    s.damageManager.attachHealth(entityId);
    const health = s.damageManager.getHealth(entityId);
    health.currentHealth = 50;
    addItem(s, entityId, "item_helmet", 0);
    s.equipmentManager.equipFromInventory(entityId, 0);
    expect(s.damageManager.getHealth(entityId).maxHealth).toBe(120);
    expect(s.damageManager.getHealth(entityId).currentHealth).toBe(60);
    s.equipmentManager.unequipToInventory(entityId, "head");
    expect(s.damageManager.getHealth(entityId).maxHealth).toBe(100);
    expect(s.damageManager.getHealth(entityId).currentHealth).toBe(50);
  });

  it("determinism: identical operations produce identical stats", () => {
    const runs: number[][] = [];
    for (let run = 0; run < 2; run++) {
      const setup = makeSetup();
      const id = makeEntity(setup);
      addItem(setup, id, "item_sword", 0);
      addItem(setup, id, "item_helmet", 1);
      addItem(setup, id, "item_axe", 2);
      setup.equipmentManager.equipFromInventory(id, 0);
      setup.equipmentManager.equipFromInventory(id, 1);
      setup.equipmentManager.equipFromInventory(id, 2);
      setup.equipmentManager.unequipToInventory(id, "head");
      runs.push([
        setup.statsManager.getStat(id, HP).computed,
        setup.statsManager.getStat(id, DMG).computed,
        setup.statsManager.getStat(id, ARMOR).computed,
      ]);
    }
    expect(runs[0]).toEqual(runs[1]);
  });

  it("save → fresh world → load rebuilds modifiers instead of persisting them", () => {
    addItem(s, entityId, "item_sword", 0);
    addItem(s, entityId, "item_chest", 1);
    s.equipmentManager.equipFromInventory(entityId, 0);
    s.equipmentManager.equipFromInventory(entityId, 1);
    const provider = new EquipmentSaveProvider(s.equipmentManager, s.world);
    const saved = provider.save();
    expect(JSON.stringify(saved)).not.toContain("modifier");

    const s2 = makeSetup();
    const provider2 = new EquipmentSaveProvider(s2.equipmentManager, s2.world);
    provider2.load(saved);
    const restored = s2.equipmentManager.listEquippedEntities()[0]!;
    s2.statsManager.attachStats(restored);
    s2.statsManager.setBaseStat(restored, HP, 100);
    s2.statsManager.setBaseStat(restored, DMG, 10);
    s2.equipmentManager.syncStats(restored);

    expect(s2.statsManager.getStat(restored, HP).computed).toBe(
      s.statsManager.getStat(entityId, HP).computed,
    );
    expect(s2.statsManager.getStat(restored, DMG).computed).toBe(
      s.statsManager.getStat(entityId, DMG).computed,
    );
    expect(s2.statsManager.getStat(restored, ARMOR).computed).toBe(
      s.statsManager.getStat(entityId, ARMOR).computed,
    );
    expect(s2.statsManager.getModifiers(restored)).toHaveLength(
      s.statsManager.getModifiers(entityId).length,
    );
  });
});
