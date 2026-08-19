import { beforeEach, describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { InventoryManager } from "../../inventory/inventory-manager.js";
import type { ItemInstanceId } from "../../inventory/types.js";
import { EquipmentManager } from "../equipment-manager.js";
import { EquipmentSaveProvider } from "../equipment-save-provider.js";
import type { EquipmentInfoLike, EquipmentInfoResolver } from "../types.js";

const EQUIPMENT: Record<string, EquipmentInfoLike> = {
  item_t4_helmet: { itemId: "item_t4_helmet", slot: "head", handling: "none", tier: 4 },
  item_t5_helmet: { itemId: "item_t5_helmet", slot: "head", handling: "none", tier: 5 },
  item_t4_chest: { itemId: "item_t4_chest", slot: "chest", handling: "none", tier: 4 },
  item_t5_chest: { itemId: "item_t5_chest", slot: "chest", handling: "none", tier: 5 },
  item_t4_sword: { itemId: "item_t4_sword", slot: "weapon", handling: "one_handed", tier: 4 },
  item_t5_sword: { itemId: "item_t5_sword", slot: "weapon", handling: "one_handed", tier: 5 },
  item_t4_shield: { itemId: "item_t4_shield", slot: "off_hand", handling: "none", tier: 4 },
  item_t5_bow: { itemId: "item_t5_bow", slot: "weapon", handling: "two_handed", tier: 5 },
};

const resolveInfo: EquipmentInfoResolver = (itemId) => EQUIPMENT[itemId];

function setup(capacity = 12) {
  const world = new World(createRuntimeServices());
  const inventoryManager = new InventoryManager(world);
  const equipmentManager = new EquipmentManager(world, inventoryManager, resolveInfo);
  const heroId = world.createEntity();
  inventoryManager.createInventory(heroId, capacity);
  equipmentManager.attachEquipment(heroId);
  return { world, inventoryManager, equipmentManager, heroId };
}

function addAndEquip(
  env: ReturnType<typeof setup>,
  itemId: string,
): ItemInstanceId {
  const added = env.inventoryManager.addEntry(env.heroId, itemId);
  if (!added.ok) throw new Error(added.reason);
  const slot = env.inventoryManager.findEntryByInstanceId(env.heroId, added.value.instanceId);
  if (slot === undefined) throw new Error("missing added item");
  const equipped = env.equipmentManager.equipFromInventory(env.heroId, slot.position);
  if (!equipped.ok) throw new Error(equipped.reason);
  return added.value.instanceId;
}

describe("EquipmentManager loadouts", () => {
  let env: ReturnType<typeof setup>;

  beforeEach(() => {
    env = setup();
  });

  it("restores an entire saved set in one operation", () => {
    const t4Helmet = addAndEquip(env, "item_t4_helmet");
    const t4Chest = addAndEquip(env, "item_t4_chest");
    const t4Sword = addAndEquip(env, "item_t4_sword");
    expect(env.equipmentManager.saveCurrentLoadout(env.heroId, "t4", "Set T4").ok).toBe(true);

    addAndEquip(env, "item_t5_helmet");
    addAndEquip(env, "item_t5_chest");
    addAndEquip(env, "item_t5_sword");
    expect(env.equipmentManager.saveCurrentLoadout(env.heroId, "t5", "Set T5").ok).toBe(true);

    const result = env.equipmentManager.applyLoadout(env.heroId, "t4", 4);
    expect(result.ok).toBe(true);
    expect(env.equipmentManager.getEquippedItem(env.heroId, "head")?.instanceId).toBe(t4Helmet);
    expect(env.equipmentManager.getEquippedItem(env.heroId, "chest")?.instanceId).toBe(t4Chest);
    expect(env.equipmentManager.getEquippedItem(env.heroId, "weapon")?.instanceId).toBe(t4Sword);
  });

  it("accepts an enchanted item when its base tier matches the zone cap", () => {
    const awakenedT4 = addAndEquip(env, "item_t4_sword");
    expect(env.equipmentManager.changeEquippedEnchantment(env.heroId, awakenedT4, 4)).toBe(true);
    expect(env.equipmentManager.saveCurrentLoadout(env.heroId, "t4_4", "T4.4").ok).toBe(true);

    addAndEquip(env, "item_t5_sword");

    const result = env.equipmentManager.applyLoadout(env.heroId, "t4_4", 4);
    expect(result.ok).toBe(true);
    expect(env.equipmentManager.getEquippedItem(env.heroId, "weapon")).toMatchObject({
      instanceId: awakenedT4,
      itemId: "item_t4_sword",
      enchantment: 4,
    });
  });

  it("refuses the whole loadout before mutation when one piece exceeds the zone cap", () => {
    addAndEquip(env, "item_t4_helmet");
    const currentWeapon = addAndEquip(env, "item_t4_sword");

    addAndEquip(env, "item_t5_helmet");
    const t5Weapon = addAndEquip(env, "item_t5_sword");
    expect(env.equipmentManager.saveCurrentLoadout(env.heroId, "t5", "Set T5").ok).toBe(true);

    const t4HelmetInInventory = env.inventoryManager.findEntriesByItemId(env.heroId, "item_t4_helmet")[0];
    const t4SwordInInventory = env.inventoryManager.findEntriesByItemId(env.heroId, "item_t4_sword")[0];
    if (t4HelmetInInventory === undefined || t4SwordInInventory === undefined) throw new Error("missing T4 set");
    expect(env.equipmentManager.equipFromInventory(env.heroId, t4HelmetInInventory.position).ok).toBe(true);
    expect(env.equipmentManager.equipFromInventory(env.heroId, t4SwordInInventory.position).ok).toBe(true);
    expect(env.equipmentManager.getEquippedItem(env.heroId, "weapon")?.instanceId).toBe(currentWeapon);

    const before = [...env.equipmentManager.getEquipped(env.heroId).entries()]
      .map(([slot, entry]) => [slot, entry.instanceId] as const);
    const result = env.equipmentManager.applyLoadout(env.heroId, "t5", 4);

    expect(result).toEqual({ ok: false, reason: "tier_cap_exceeded" });
    const after = [...env.equipmentManager.getEquipped(env.heroId).entries()]
      .map(([slot, entry]) => [slot, entry.instanceId] as const);
    expect(after).toEqual(before);
    expect(env.inventoryManager.findEntryByInstanceId(env.heroId, t5Weapon)).toBeDefined();
  });

  it("refuses the whole loadout without mutation when a referenced piece is missing", () => {
    const helmet = addAndEquip(env, "item_t4_helmet");
    const sword = addAndEquip(env, "item_t4_sword");
    expect(env.equipmentManager.saveCurrentLoadout(env.heroId, "main", "Main").ok).toBe(true);

    expect(env.equipmentManager.unequipToInventory(env.heroId, "head").ok).toBe(true);
    const helmetSlot = env.inventoryManager.findEntryByInstanceId(env.heroId, helmet);
    if (helmetSlot === undefined) throw new Error("missing helmet");
    expect(env.inventoryManager.removeEntryAt(env.heroId, helmetSlot.position).ok).toBe(true);

    const beforeWeapon = env.equipmentManager.getEquippedItem(env.heroId, "weapon")?.instanceId;
    const result = env.equipmentManager.applyLoadout(env.heroId, "main", 4);

    expect(result).toEqual({ ok: false, reason: "loadout_item_missing" });
    expect(env.equipmentManager.getEquippedItem(env.heroId, "weapon")?.instanceId).toBe(beforeWeapon ?? sword);
  });

  it("preserves equipped instance identity when items return to inventory", () => {
    const first = addAndEquip(env, "item_t4_helmet");
    const secondAdded = env.inventoryManager.addEntry(env.heroId, "item_t4_helmet");
    if (!secondAdded.ok) throw new Error(secondAdded.reason);

    expect(env.equipmentManager.unequipToInventory(env.heroId, "head").ok).toBe(true);

    expect(env.inventoryManager.findEntryByInstanceId(env.heroId, first)).toBeDefined();
    expect(env.inventoryManager.findEntryByInstanceId(env.heroId, secondAdded.value.instanceId)).toBeDefined();
  });

  it("persists loadouts through the existing equipment save provider", () => {
    addAndEquip(env, "item_t4_helmet");
    addAndEquip(env, "item_t4_sword");
    expect(env.equipmentManager.saveCurrentLoadout(env.heroId, "main", "Main").ok).toBe(true);

    const provider = new EquipmentSaveProvider(env.equipmentManager, env.world, () => env.heroId);
    const saved = JSON.parse(JSON.stringify(provider.save())) as unknown;

    const restored = setup();
    const restoredProvider = new EquipmentSaveProvider(
      restored.equipmentManager,
      restored.world,
      () => restored.heroId,
    );
    restoredProvider.load(saved);

    expect(restored.equipmentManager.getLoadouts(restored.heroId)).toEqual(
      env.equipmentManager.getLoadouts(env.heroId),
    );
  });
});
