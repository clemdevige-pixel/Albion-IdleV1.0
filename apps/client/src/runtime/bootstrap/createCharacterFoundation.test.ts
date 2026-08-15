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
  it("grants only the selected one-handed starter weapon", () => {
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
    expect(equipped.get("off_hand")).toBeUndefined();
    expect(equipped.get("head")).toBeUndefined();
    expect(equipped.get("chest")).toBeUndefined();
    expect(equipped.get("boots")).toBeUndefined();
    expect(equipped.get("cape")).toBeUndefined();
    expect([...equipped.values()]).toHaveLength(1);
    expect(fixture.equipment.inventoryManager.getBaseCapacity(fixture.heroId)).toBe(24);
    expect(fixture.equipment.inventoryManager.getBaseCapacity(fixture.storage.bankId)).toBe(64);
    expect(fixture.equipment.inventoryManager.getBaseCapacity(fixture.storage.productionStorageId)).toBe(256);

    fixture.combat.orchestrator.dispose();
  });

  it("grants only the selected two-handed starter weapon", () => {
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
    expect(equipped.get("head")).toBeUndefined();
    expect(equipped.get("chest")).toBeUndefined();
    expect(equipped.get("boots")).toBeUndefined();
    expect(equipped.get("cape")).toBeUndefined();
    expect([...equipped.values()]).toHaveLength(1);
    const inventoryItems = fixture.equipment.inventoryManager
      .listSlots(fixture.heroId)
      .flatMap((slot) => slot.entry === undefined ? [] : [slot.entry.itemId]);
    expect(inventoryItems).not.toContain("item_weapon_sword_t3_broadsword");
    expect(inventoryItems).not.toContain("item_weapon_staff_t3_infernal");

    fixture.combat.orchestrator.dispose();
  });
});
