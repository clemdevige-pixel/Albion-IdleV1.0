import { describe, expect, it } from "vitest";
import { EquipmentManager } from "@game/gameplay";
import { resolveEquipmentInfo, resolveItemStackInfo } from "../../data/itemContentCatalog.js";
import { PlayerInventoryManager } from "../PlayerInventoryManager.js";
import { createCombatFoundation } from "./createCombatFoundation.js";
import { createEconomyFoundation } from "./createEconomyFoundation.js";

function setup() {
  const combat = createCombatFoundation();
  const heroId = combat.world.createEntity();
  const bankId = combat.world.createEntity();
  const inventoryManager = new PlayerInventoryManager(combat.world, resolveItemStackInfo);
  inventoryManager.createInventory(heroId, 1);
  inventoryManager.createInventory(bankId, 8);
  inventoryManager.setAccessibleStorageOwners(heroId, [heroId, bankId]);
  const equipmentManager = new EquipmentManager(
    combat.world,
    inventoryManager,
    resolveEquipmentInfo,
  );
  equipmentManager.attachEquipment(heroId);
  const economy = createEconomyFoundation({ inventoryManager, equipmentManager });
  return { combat, heroId, bankId, inventoryManager, equipmentManager, economy };
}

describe("economy accessible player storage integration", () => {
  it("routes vendor purchases to Bank when Inventory is full", () => {
    const env = setup();
    const blocker = env.inventoryManager.addQuantity(
      env.heroId,
      "item_health_potion",
      999,
    );
    expect(blocker.ok).toBe(true);
    expect(env.inventoryManager.isFull(env.heroId)).toBe(true);

    const vendor = env.economy.vendorRegistry.get("vendor_general");
    const offer = vendor?.offers.find((entry) => entry.enabled && entry.buyPrice !== null);
    expect(offer).toBeDefined();
    if (offer === undefined) return;

    const result = env.economy.vendorService.buyFromVendor({
      playerEntityId: env.heroId,
      walletId: env.economy.walletId,
      vendorId: "vendor_general",
      itemId: offer.itemId,
      quantity: 1,
    });

    expect(result.ok).toBe(true);
    expect(env.inventoryManager.getTotalQuantity(env.bankId, offer.itemId)).toBe(1);
    env.combat.orchestrator.dispose();
  });

  it("bulk repair includes damaged equipment stored in Bank", () => {
    const env = setup();
    const itemId = "item_weapon_sword_t3_broadsword";
    const added = env.inventoryManager.addQuantity(env.bankId, itemId, 1);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const position = added.value.affectedPositions[0];
    expect(position).toBeDefined();
    if (position === undefined) return;
    const slot = env.inventoryManager.getSlot(env.bankId, position);
    expect(slot.ok).toBe(true);
    if (!slot.ok || slot.value.entry === undefined) return;

    expect(env.economy.durabilityStore.attach(slot.value.entry.instanceId, 100, 50).ok).toBe(true);
    const result = env.economy.repairService.bulkRepair({
      transactionId: "tx_bank_repair",
      playerEntityId: env.heroId,
      walletId: env.economy.walletId,
      stationId: "station_general",
    });

    expect(result.ok).toBe(true);
    expect(env.economy.durabilityStore.get(slot.value.entry.instanceId)).toEqual({
      current: 100,
      max: 100,
    });
    env.combat.orchestrator.dispose();
  });
});
