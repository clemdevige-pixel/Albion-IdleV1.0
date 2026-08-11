import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import type { EntityId } from "@game/core";
import { InventoryManager } from "../../inventory/inventory-manager.js";
import type { ItemInstanceId } from "../../inventory/types.js";
import { EquipmentComponent } from "../components.js";
import { EquipmentManager } from "../equipment-manager.js";
import { EquipmentSaveProvider } from "../equipment-save-provider.js";
import { isValidSlot, validateEquipmentState } from "../equipment-validator.js";
import type { EquipmentInfoLike, EquipmentInfoResolver } from "../types.js";

const EQUIP_INFO: Record<string, EquipmentInfoLike> = {
  item_iron_helmet: { itemId: "item_iron_helmet", slot: "head", handling: "none" },
  item_steel_helmet: { itemId: "item_steel_helmet", slot: "head", handling: "none" },
  item_iron_chest: { itemId: "item_iron_chest", slot: "chest", handling: "none" },
  item_iron_boots: { itemId: "item_iron_boots", slot: "boots", handling: "none" },
  item_cape: { itemId: "item_cape", slot: "cape", handling: "none" },
  item_sword: { itemId: "item_sword", slot: "weapon", handling: "one_handed" },
  item_axe: { itemId: "item_axe", slot: "weapon", handling: "one_handed" },
  item_bow: { itemId: "item_bow", slot: "weapon", handling: "two_handed" },
  item_great_hammer: { itemId: "item_great_hammer", slot: "weapon", handling: "two_handed" },
  item_shield: { itemId: "item_shield", slot: "off_hand", handling: "none" },
  item_torch: { itemId: "item_torch", slot: "off_hand", handling: "none" },
};

const resolveInfo: EquipmentInfoResolver = (itemId) => EQUIP_INFO[itemId];

describe("EquipmentValidator", () => {
  it("isValidSlot accepts the six V1 slots and rejects disabled ones", () => {
    for (const slot of ["head", "chest", "boots", "weapon", "off_hand", "cape"]) {
      expect(isValidSlot(slot)).toBe(true);
    }
    for (const slot of ["bag", "mount", "food", "potion", "", "pants"]) {
      expect(isValidSlot(slot)).toBe(false);
    }
  });

  it("validateEquipmentState flags slot mismatch, bad quantity, duplicates, 2H conflict", () => {
    const iid = (n: number): ItemInstanceId => `item_${String(n)}` as ItemInstanceId;
    const errors = validateEquipmentState(
      {
        slots: new Map([
          ["head", { instanceId: iid(0), itemId: "item_sword", quantity: 1 }],
          ["weapon", { instanceId: iid(0), itemId: "item_bow", quantity: 2 }],
          ["off_hand", { instanceId: iid(1), itemId: "item_shield", quantity: 1 }],
        ]),
      },
      resolveInfo,
    );
    expect(errors.some((e) => e.includes('belongs to "weapon"'))).toBe(true);
    expect(errors.some((e) => e.includes("invalid quantity 2"))).toBe(true);
    expect(errors.some((e) => e.includes("Duplicate instance id"))).toBe(true);
    expect(errors.some((e) => e.includes("two-handed"))).toBe(true);
  });
});

describe("EquipmentManager", () => {
  let world: World;
  let inventoryManager: InventoryManager;
  let equipmentManager: EquipmentManager;
  let entityId: EntityId;

  beforeEach(() => {
    world = new World(createRuntimeServices());
    inventoryManager = new InventoryManager(world);
    equipmentManager = new EquipmentManager(world, inventoryManager, resolveInfo);
    entityId = world.createEntity();
    inventoryManager.createInventory(entityId, 4);
    equipmentManager.attachEquipment(entityId);
  });

  function addItem(itemId: string, position?: number): { instanceId: ItemInstanceId; position: number } {
    const result = inventoryManager.addEntry(entityId, itemId, position);
    if (!result.ok) {
      throw new Error(`test setup: ${result.reason}`);
    }
    const slot = inventoryManager.findEntryByInstanceId(entityId, result.value.instanceId)!;
    return { instanceId: result.value.instanceId, position: slot.position };
  }

  it("attach/detach equipment component", () => {
    const e = world.createEntity();
    expect(equipmentManager.hasEquipment(e)).toBe(false);
    equipmentManager.attachEquipment(e);
    expect(equipmentManager.hasEquipment(e)).toBe(true);
    equipmentManager.detachEquipment(e);
    expect(equipmentManager.hasEquipment(e)).toBe(false);
  });

  it("detach refuses while items are equipped (no item loss)", () => {
    addItem("item_iron_helmet", 0);
    equipmentManager.equipFromInventory(entityId, 0);
    expect(() => equipmentManager.detachEquipment(entityId)).toThrow("no item loss");
  });

  it("equips a valid item from inventory into its slot and removes it from inventory", () => {
    const { instanceId } = addItem("item_iron_helmet", 0);
    const result = equipmentManager.equipFromInventory(entityId, 0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.slot).toBe("head");
      expect(result.value.equipped.instanceId).toBe(instanceId);
      expect(result.value.replaced).toBeUndefined();
    }
    expect(equipmentManager.getEquippedItem(entityId, "head")!.instanceId).toBe(instanceId);
    expect(inventoryManager.getOccupiedCount(entityId)).toBe(0);
    expect(inventoryManager.findEntryByInstanceId(entityId, instanceId)).toBeUndefined();
  });

  it("refuses a non-equippable item", () => {
    addItem("item_wood", 0);
    const result = equipmentManager.equipFromInventory(entityId, 0);
    expect(result).toEqual({ ok: false, reason: "not_equippable" });
    expect(inventoryManager.getOccupiedCount(entityId)).toBe(1);
  });

  it("refuses empty or invalid inventory positions", () => {
    expect(equipmentManager.equipFromInventory(entityId, 0)).toEqual({
      ok: false,
      reason: "entry_not_found",
    });
    expect(equipmentManager.equipFromInventory(entityId, 99)).toEqual({
      ok: false,
      reason: "invalid_position",
    });
  });

  it("equips one item from a stacked entry and preserves the remainder", () => {
    inventoryManager.addQuantity(entityId, "item_iron_helmet", 2, {
      itemId: "item_iron_helmet",
      stackable: true,
      maxStack: 10,
    });
    const result = equipmentManager.equipFromInventory(entityId, 0);
    expect(result.ok).toBe(true);
    expect(equipmentManager.getEquippedItem(entityId, "head")?.quantity).toBe(1);
    expect(inventoryManager.getSlot(entityId, 0)).toMatchObject({
      ok: true,
      value: { entry: { itemId: "item_iron_helmet", quantity: 1 } },
    });
  });

  it("unequips back to the first free inventory slot", () => {
    const { instanceId } = addItem("item_iron_helmet", 2);
    equipmentManager.equipFromInventory(entityId, 2);
    const result = equipmentManager.unequipToInventory(entityId, "head");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.position).toBe(0);
      expect(result.value.entry.instanceId).toBe(instanceId);
    }
    expect(equipmentManager.getEquippedItem(entityId, "head")).toBeUndefined();
    expect(inventoryManager.findEntryByInstanceId(entityId, instanceId)!.position).toBe(0);
  });

  it("unequip of an empty slot fails explicitly", () => {
    expect(equipmentManager.unequipToInventory(entityId, "head")).toEqual({
      ok: false,
      reason: "slot_empty",
    });
  });

  it("unequip fails when inventory is full and item stays equipped", () => {
    const { instanceId } = addItem("item_iron_helmet", 0);
    equipmentManager.equipFromInventory(entityId, 0);
    inventoryManager.addQuantity(entityId, "item_stone", 4);
    expect(inventoryManager.isFull(entityId)).toBe(true);

    const result = equipmentManager.unequipToInventory(entityId, "head");
    expect(result).toEqual({ ok: false, reason: "inventory_full" });
    expect(equipmentManager.getEquippedItem(entityId, "head")!.instanceId).toBe(instanceId);
  });

  it("replacing equipment swaps: old item returns to the vacated inventory position", () => {
    const iron = addItem("item_iron_helmet", 0);
    equipmentManager.equipFromInventory(entityId, 0);
    const steel = addItem("item_steel_helmet", 3);

    const result = equipmentManager.equipFromInventory(entityId, 3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.replaced!.instanceId).toBe(iron.instanceId);
    }
    expect(equipmentManager.getEquippedItem(entityId, "head")!.instanceId).toBe(steel.instanceId);
    expect(inventoryManager.findEntryByInstanceId(entityId, iron.instanceId)!.position).toBe(3);
    expect(inventoryManager.getOccupiedCount(entityId)).toBe(1);
  });

  it("one-handed weapon and off-hand coexist", () => {
    addItem("item_sword", 0);
    addItem("item_shield", 1);
    expect(equipmentManager.equipFromInventory(entityId, 0).ok).toBe(true);
    expect(equipmentManager.equipFromInventory(entityId, 1).ok).toBe(true);
    expect(equipmentManager.getEquipped(entityId).size).toBe(2);
  });

  it("refuses an off-hand while a two-handed weapon is equipped (31_EQUIPMENT)", () => {
    addItem("item_bow", 0);
    addItem("item_shield", 1);
    equipmentManager.equipFromInventory(entityId, 0);
    expect(equipmentManager.equipFromInventory(entityId, 1)).toEqual({
      ok: false,
      reason: "two_handed_conflict",
    });
  });

  it("equipping a two-handed weapon displaces the off-hand back to inventory", () => {
    const shield = addItem("item_shield", 0);
    equipmentManager.equipFromInventory(entityId, 0);
    const bow = addItem("item_bow", 1);
    const sword = addItem("item_sword", 2);
    equipmentManager.equipFromInventory(entityId, 2);

    const result = equipmentManager.equipFromInventory(entityId, 1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.replaced!.instanceId).toBe(sword.instanceId);
      expect(result.value.displacedOffHand!.instanceId).toBe(shield.instanceId);
    }
    expect(equipmentManager.getEquippedItem(entityId, "weapon")!.instanceId).toBe(bow.instanceId);
    expect(equipmentManager.getEquippedItem(entityId, "off_hand")).toBeUndefined();
    expect(inventoryManager.findEntryByInstanceId(entityId, sword.instanceId)!.position).toBe(1);
    expect(inventoryManager.findEntryByInstanceId(entityId, shield.instanceId)).toBeDefined();
  });

  it("two-handed equip fails without mutation when the swap does not fit in inventory", () => {
    addItem("item_shield", 0);
    equipmentManager.equipFromInventory(entityId, 0);
    addItem("item_sword", 0);
    equipmentManager.equipFromInventory(entityId, 0);
    const bow = addItem("item_bow", 0);
    inventoryManager.addQuantity(entityId, "item_stone", 3);
    expect(inventoryManager.isFull(entityId)).toBe(true);

    const result = equipmentManager.equipFromInventory(entityId, 0);
    expect(result).toEqual({ ok: false, reason: "inventory_full" });
    expect(equipmentManager.getEquippedItem(entityId, "weapon")!.itemId).toBe("item_sword");
    expect(equipmentManager.getEquippedItem(entityId, "off_hand")!.itemId).toBe("item_shield");
    expect(inventoryManager.findEntryByInstanceId(entityId, bow.instanceId)!.position).toBe(0);
  });

  it("canEquip checks compatibility without mutating state", () => {
    addItem("item_bow", 0);
    equipmentManager.equipFromInventory(entityId, 0);
    expect(equipmentManager.canEquip(entityId, "item_shield")).toEqual({
      ok: false,
      reason: "two_handed_conflict",
    });
    expect(equipmentManager.canEquip(entityId, "item_wood")).toEqual({
      ok: false,
      reason: "not_equippable",
    });
    const ok = equipmentManager.canEquip(entityId, "item_iron_helmet");
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.slot).toBe("head");
    }
    expect(equipmentManager.getEquipped(entityId).size).toBe(1);
  });

  it("preserves instanceIds across a full equip/unequip/re-equip cycle with no duplication", () => {
    const helmet = addItem("item_iron_helmet", 0);
    equipmentManager.equipFromInventory(entityId, 0);
    equipmentManager.unequipToInventory(entityId, "head");
    equipmentManager.equipFromInventory(entityId, 0);

    expect(equipmentManager.getEquippedItem(entityId, "head")!.instanceId).toBe(helmet.instanceId);
    expect(inventoryManager.getOccupiedCount(entityId)).toBe(0);
    expect(inventoryManager.validateIntegrity(entityId)).toEqual([]);
  });
});

describe("EquipmentSaveProvider", () => {
  it("save/load roundtrip restores slots and instanceIds exactly, no loss, no duplication", () => {
    const world = new World(createRuntimeServices());
    const inventoryManager = new InventoryManager(world);
    const equipmentManager = new EquipmentManager(world, inventoryManager, resolveInfo);
    const entityId = world.createEntity();
    inventoryManager.createInventory(entityId, 6);
    equipmentManager.attachEquipment(entityId);

    for (const itemId of ["item_iron_helmet", "item_iron_chest", "item_sword", "item_shield", "item_cape"]) {
      inventoryManager.addEntry(entityId, itemId);
    }
    for (let i = 0; i < 5; i += 1) {
      const slot = inventoryManager
        .listSlots(entityId)
        .find((s) => s.entry !== undefined)!;
      expect(equipmentManager.equipFromInventory(entityId, slot.position).ok).toBe(true);
    }

    const provider = new EquipmentSaveProvider(equipmentManager, world);
    const saved = JSON.parse(JSON.stringify(provider.save())) as unknown;

    const world2 = new World(createRuntimeServices());
    const inventoryManager2 = new InventoryManager(world2);
    const equipmentManager2 = new EquipmentManager(world2, inventoryManager2, resolveInfo);
    const provider2 = new EquipmentSaveProvider(equipmentManager2, world2);
    provider2.load(saved);

    const entities = equipmentManager2.listEquippedEntities();
    expect(entities).toHaveLength(1);
    const restored = equipmentManager2.getEquipped(entities[0]!);
    const original = equipmentManager.getEquipped(entityId);
    expect(restored.size).toBe(original.size);
    for (const [slot, entry] of original) {
      const restoredEntry = restored.get(slot)!;
      expect(restoredEntry.instanceId).toBe(entry.instanceId);
      expect(restoredEntry.itemId).toBe(entry.itemId);
      expect(restoredEntry.quantity).toBe(entry.quantity);
    }
    const restoredEntity = entities[0]!;
    expect(world2.hasComponent(restoredEntity, EquipmentComponent)).toBe(true);
    expect(provider2.save()).toEqual(provider.save());
  });

  it("load rejects corrupt payloads (unknown slot, slot mismatch)", () => {
    const world = new World(createRuntimeServices());
    const inventoryManager = new InventoryManager(world);
    const equipmentManager = new EquipmentManager(world, inventoryManager, resolveInfo);
    const provider = new EquipmentSaveProvider(equipmentManager, world);

    expect(() =>
      provider.load({
        equipments: [
          { slots: [{ slot: "bag", instanceId: "item_0", itemId: "item_sword", quantity: 1 }] },
        ],
      }),
    ).toThrow("unknown slot");

    expect(() =>
      provider.load({
        equipments: [
          { slots: [{ slot: "head", instanceId: "item_0", itemId: "item_sword", quantity: 1 }] },
        ],
      }),
    ).toThrow("Invalid equipment save data");
  });
});
