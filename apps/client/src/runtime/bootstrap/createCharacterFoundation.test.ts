import { describe, expect, it } from "vitest";
import { setupCombatEntity } from "../combatEntityFactory";
import { createCombatFoundation } from "./createCombatFoundation";
import {
  createCharacterEquipmentFoundation,
  createCharacterStorageFoundation,
  initializeStarterLoadout,
} from "./createCharacterFoundation";
import { createEconomyFoundation } from "./createEconomyFoundation";
import { createProgressionFoundation } from "./createProgressionFoundation";

describe("createCharacterFoundation", () => {
  it("assembles player storage, equipment, enchantment and starter weapons", () => {
    const combat = createCombatFoundation();
    const progression = createProgressionFoundation();
    const equipment = createCharacterEquipmentFoundation({
      world: combat.world,
      statsManager: combat.statsManager,
      damageManager: combat.damageManager,
      masteryService: progression.masteryService,
      onPlayerHealthChanged: () => undefined,
      onStatsChanged: () => undefined,
    });
    const economy = createEconomyFoundation(equipment);
    const heroId = setupCombatEntity(
      combat,
      {
        maxHealth: 500,
        physDamage: 0,
        attackSpeed: 1.2,
        armor: 10,
        magicRes: 5,
      },
      { x: 0, y: 0 },
    );
    const storage = createCharacterStorageFoundation({
      world: combat.world,
      heroId,
      inventoryManager: equipment.inventoryManager,
      equipmentManager: equipment.equipmentManager,
      currencyService: economy.currencyService,
      walletId: economy.walletId,
    });

    initializeStarterLoadout({
      heroId,
      inventoryManager: equipment.inventoryManager,
      equipmentManager: equipment.equipmentManager,
      durabilityStore: economy.durabilityStore,
      masteryService: progression.masteryService,
    });

    expect(equipment.inventoryManager.getBaseCapacity(heroId)).toBe(24);
    expect(equipment.inventoryManager.getBaseCapacity(storage.bankId)).toBe(64);
    expect(
      equipment.inventoryManager.getBaseCapacity(storage.productionStorageId),
    ).toBe(256);
    expect(
      equipment.equipmentManager.getEquipped(heroId).get("weapon")?.itemId,
    ).toBe("item_weapon_sword_t3_broadsword");

    const inventoryItems = equipment.inventoryManager
      .listSlots(heroId)
      .flatMap((slot) => slot.entry === undefined ? [] : [slot.entry.itemId]);
    expect(inventoryItems).toContain("item_weapon_bow_t3_longbow");
    expect(inventoryItems).toContain("item_weapon_staff_t3_fire");
    expect(storage.enchantmentService).toBeDefined();

    combat.orchestrator.dispose();
  });
});
