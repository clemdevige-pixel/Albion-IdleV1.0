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

function createFixture() {
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
    { maxHealth: 500, physDamage: 0, attackSpeed: 1.2, armor: 10, magicRes: 5 },
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
  return { combat, progression, equipment, economy, heroId, storage };
}

describe("createCharacterFoundation", () => {
  it("grants a full T3 starter set and off-hand for a one-handed weapon", () => {
    const fixture = createFixture();
    const granted = initializeStarterLoadout({
      heroId: fixture.heroId,
      inventoryManager: fixture.equipment.inventoryManager,
      equipmentManager: fixture.equipment.equipmentManager,
      durabilityStore: fixture.economy.durabilityStore,
      masteryService: fixture.progression.masteryService,
      weaponItemId: "item_weapon_sword_t3_broadsword",
    });

    expect(granted).toBe(true);
    const equipped = fixture.equipment.equipmentManager.getEquipped(fixture.heroId);
    expect(equipped.get("weapon")?.itemId).toBe("item_weapon_sword_t3_broadsword");
    expect(equipped.get("off_hand")?.itemId).toBe("item_shield_t3_reinforced");
    expect(equipped.get("head")?.itemId).toBe("item_iron_helmet");
    expect(equipped.get("chest")?.itemId).toBe("item_leather_armor");
    expect(equipped.get("boots")?.itemId).toBe("item_leather_boots");
    expect(equipped.get("cape")?.itemId).toBe("item_traveler_cape");
    expect(fixture.equipment.inventoryManager.getBaseCapacity(fixture.heroId)).toBe(24);
    expect(fixture.equipment.inventoryManager.getBaseCapacity(fixture.storage.bankId)).toBe(64);
    expect(fixture.equipment.inventoryManager.getBaseCapacity(fixture.storage.productionStorageId)).toBe(256);

    fixture.combat.orchestrator.dispose();
  });

  it("does not grant an off-hand or unused weapons for a two-handed starter", () => {
    const fixture = createFixture();
    const granted = initializeStarterLoadout({
      heroId: fixture.heroId,
      inventoryManager: fixture.equipment.inventoryManager,
      equipmentManager: fixture.equipment.equipmentManager,
      durabilityStore: fixture.economy.durabilityStore,
      masteryService: fixture.progression.masteryService,
      weaponItemId: "item_weapon_bow_t3_longbow",
    });

    expect(granted).toBe(true);
    const equipped = fixture.equipment.equipmentManager.getEquipped(fixture.heroId);
    expect(equipped.get("weapon")?.itemId).toBe("item_weapon_bow_t3_longbow");
    expect(equipped.get("off_hand")).toBeUndefined();
    const inventoryItems = fixture.equipment.inventoryManager
      .listSlots(fixture.heroId)
      .flatMap((slot) => slot.entry === undefined ? [] : [slot.entry.itemId]);
    expect(inventoryItems).not.toContain("item_weapon_sword_t3_broadsword");
    expect(inventoryItems).not.toContain("item_weapon_staff_t3_infernal");

    fixture.combat.orchestrator.dispose();
  });
});
