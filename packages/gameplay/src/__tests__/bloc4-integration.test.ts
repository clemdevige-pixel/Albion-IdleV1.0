import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import {
  CharacterFactory,
  CharacterManager,
  CharacterSaveProvider,
} from "../character/index.js";
import {
  StatsManager,
  createDefaultStatRegistry,
} from "../stats/index.js";
import type { StatId } from "../stats/types.js";
import { InventoryManager } from "../inventory/index.js";
import { EquipmentManager, EquipmentStatSync } from "../equipment/index.js";
import type { EquipmentInfoLike, EquipmentInfoResolver } from "../equipment/types.js";
import { AbilityManager } from "../abilities/index.js";
import type { AbilityDefinitionLike, AbilityId } from "../abilities/types.js";

function sid(id: string): StatId {
  return id as StatId;
}

function aid(id: string): AbilityId {
  return id as AbilityId;
}

const EQUIP_INFO: Record<string, EquipmentInfoLike> = {
  item_iron_sword: {
    itemId: "item_iron_sword",
    slot: "weapon",
    handling: "one_handed",
    stats: { stat_physical_damage: 15 },
  },
  item_steel_sword: {
    itemId: "item_steel_sword",
    slot: "weapon",
    handling: "one_handed",
    stats: { stat_physical_damage: 25 },
  },
  item_iron_helmet: {
    itemId: "item_iron_helmet",
    slot: "head",
    handling: "none",
    stats: { stat_max_health: 20 },
  },
};

const resolveEquipInfo: EquipmentInfoResolver = (itemId) => EQUIP_INFO[itemId];

function makeWorld(): { world: World } {
  const services = createRuntimeServices();
  const world = new World(services);
  return { world };
}

function makeManagers(world: World): {
  statsManager: StatsManager;
  inventoryManager: InventoryManager;
  equipmentManager: EquipmentManager;
  abilityManager: AbilityManager;
  characterFactory: CharacterFactory;
  characterManager: CharacterManager;
} {
  const registry = createDefaultStatRegistry();
  const statsManager = new StatsManager(world, registry);
  const inventoryManager = new InventoryManager(world);
  const statSync = new EquipmentStatSync(statsManager, resolveEquipInfo);
  const equipmentManager = new EquipmentManager(world, inventoryManager, resolveEquipInfo, statSync);
  const abilityManager = new AbilityManager(world, statsManager);
  const characterFactory = new CharacterFactory(world);
  const characterManager = new CharacterManager(world, characterFactory);
  return {
    statsManager,
    inventoryManager,
    equipmentManager,
    abilityManager,
    characterFactory,
    characterManager,
  };
}

function makeAbilityDef(overrides: Partial<AbilityDefinitionLike> = {}): AbilityDefinitionLike {
  return {
    id: overrides.id ?? "fireball",
    cooldown: overrides.cooldown ?? 5,
    castTime: overrides.castTime ?? 0,
    resourceCost: overrides.resourceCost ?? {},
    interruptible: overrides.interruptible ?? true,
  };
}

describe("Bloc 4 — Full Lifecycle Integration", () => {
  let world: World;
  let statsManager: StatsManager;
  let inventoryManager: InventoryManager;
  let equipmentManager: EquipmentManager;
  let abilityManager: AbilityManager;
  let characterManager: CharacterManager;

  beforeEach(() => {
    ({ world } = makeWorld());
    ({ statsManager, inventoryManager, equipmentManager, abilityManager, characterManager } =
      makeManagers(world));
  });

  it("full lifecycle: create → stats → equip → ability → cast → tick → unequip → save → load", () => {
    const charId = characterManager.createCharacter({ name: "Hero", tick: 0 });
    const char = characterManager.getCharacter(charId)!;
    expect(char).toBeDefined();
    const entityId = char.entityId;

    statsManager.attachStats(entityId);
    statsManager.setBaseStat(entityId, sid("stat_max_health"), 100);
    statsManager.calculateStats(entityId);

    inventoryManager.createInventory(entityId, 8);
    equipmentManager.attachEquipment(entityId);
    const added = inventoryManager.addEntry(entityId, "item_iron_sword", 0);
    expect(added.ok).toBe(true);
    const equipResult = equipmentManager.equipFromInventory(entityId, 0);
    expect(equipResult.ok).toBe(true);
    expect(equipmentManager.getEquippedItem(entityId, "weapon")!.itemId).toBe("item_iron_sword");
    expect(inventoryManager.getOccupiedCount(entityId)).toBe(0);
    expect(statsManager.getStat(entityId, sid("stat_physical_damage")).computed).toBe(
      statsManager.getStat(entityId, sid("stat_physical_damage")).base + 15,
    );

    abilityManager.attachAbilities(entityId);
    const abilityDef = makeAbilityDef({
      id: "slash",
      cooldown: 3,
      castTime: 0,
      resourceCost: {},
    });
    abilityManager.learnAbility(entityId, abilityDef);

    const castResult = abilityManager.castAbility(entityId, aid("slash"));
    expect(castResult).toBe(true);

    expect(abilityManager.isAbilityReady(entityId, aid("slash"))).toBe(false);
    abilityManager.tickAbilities(entityId, 3);
    expect(abilityManager.isAbilityReady(entityId, aid("slash"))).toBe(true);

    const unequipResult = equipmentManager.unequipToInventory(entityId, "weapon");
    expect(unequipResult.ok).toBe(true);
    expect(statsManager.getStat(entityId, sid("stat_physical_damage")).computed).toBe(
      statsManager.getStat(entityId, sid("stat_physical_damage")).base,
    );
    expect(equipmentManager.getEquippedItem(entityId, "weapon")).toBeUndefined();
    expect(inventoryManager.getOccupiedCount(entityId)).toBe(1);

    const saveProvider = new CharacterSaveProvider(characterManager, world);
    const savedData = saveProvider.save();

    const { world: world2 } = makeWorld();
    const managers2 = makeManagers(world2);
    const saveProvider2 = new CharacterSaveProvider(managers2.characterManager, world2);
    saveProvider2.load(savedData);

    const charIds2 = managers2.characterManager.listCharacters();
    expect(charIds2).toHaveLength(1);
    const char2 = managers2.characterManager.getCharacter(charIds2[0]!)!;
    expect(char2.profile.name).toBe("Hero");
    expect(char2.state.state).toBe("idle");
  });
});

describe("Bloc 4 — Character + Stats", () => {
  it("creates character and attaches stats", () => {
    const { world } = makeWorld();
    const { characterManager, statsManager } = makeManagers(world);

    const charId = characterManager.createCharacter({ name: "Warrior", tick: 1 });
    const char = characterManager.getCharacter(charId)!;
    statsManager.attachStats(char.entityId);
    statsManager.setBaseStat(char.entityId, sid("stat_max_health"), 200);
    statsManager.calculateStats(char.entityId);

    const hp = statsManager.getStat(char.entityId, sid("stat_max_health"));
    expect(hp.base).toBe(200);
    expect(hp.computed).toBe(200);
  });
});

describe("Bloc 4 — Character + Equipment + Inventory", () => {
  it("character equips gear from its inventory and gains its stat bonuses", () => {
    const { world } = makeWorld();
    const { characterManager, statsManager, inventoryManager, equipmentManager } =
      makeManagers(world);

    const charId = characterManager.createCharacter({ name: "Knight", tick: 0 });
    const entityId = characterManager.getCharacter(charId)!.entityId;

    statsManager.attachStats(entityId);
    statsManager.setBaseStat(entityId, sid("stat_max_health"), 100);
    inventoryManager.createInventory(entityId, 4);
    equipmentManager.attachEquipment(entityId);
    inventoryManager.addEntry(entityId, "item_iron_helmet", 0);

    const result = equipmentManager.equipFromInventory(entityId, 0);
    expect(result.ok).toBe(true);
    expect(equipmentManager.getEquippedItem(entityId, "head")!.itemId).toBe("item_iron_helmet");
    expect(inventoryManager.getOccupiedCount(entityId)).toBe(0);
    expect(statsManager.getStat(entityId, sid("stat_max_health")).computed).toBe(120);

    equipmentManager.unequipToInventory(entityId, "head");
    expect(statsManager.getStat(entityId, sid("stat_max_health")).computed).toBe(100);
  });
});

describe("Bloc 4 — Character + Abilities + Stats", () => {
  it("casting an ability is governed by cooldown", () => {
    const { world } = makeWorld();
    const { characterManager, statsManager, abilityManager } = makeManagers(world);

    const charId = characterManager.createCharacter({ name: "Mage", tick: 0 });
    const entityId = characterManager.getCharacter(charId)!.entityId;

    statsManager.attachStats(entityId);
    abilityManager.attachAbilities(entityId);

    const def = makeAbilityDef({ resourceCost: {}, castTime: 0, cooldown: 2 });
    abilityManager.learnAbility(entityId, def);
    expect(abilityManager.castAbility(entityId, aid("fireball"))).toBe(true);
    expect(abilityManager.castAbility(entityId, aid("fireball"))).toBe(false);
    abilityManager.tickAbilities(entityId, 2);
    expect(abilityManager.castAbility(entityId, aid("fireball"))).toBe(true);
  });
});

describe("Bloc 4 — Equipment slot lifecycle", () => {
  it("equip fills the slot, unequip returns the item to inventory", () => {
    const { world } = makeWorld();
    const { inventoryManager, equipmentManager } = makeManagers(world);

    const entityId = world.createEntity();
    inventoryManager.createInventory(entityId, 4);
    equipmentManager.attachEquipment(entityId);
    inventoryManager.addEntry(entityId, "item_iron_sword", 0);

    equipmentManager.equipFromInventory(entityId, 0);
    expect(equipmentManager.getEquippedItem(entityId, "weapon")).toBeDefined();

    equipmentManager.unequipToInventory(entityId, "weapon");
    expect(equipmentManager.getEquippedItem(entityId, "weapon")).toBeUndefined();
    expect(inventoryManager.getOccupiedCount(entityId)).toBe(1);
  });

  it("swapping equipment preserves both item instances", () => {
    const { world } = makeWorld();
    const { inventoryManager, equipmentManager } = makeManagers(world);

    const entityId = world.createEntity();
    inventoryManager.createInventory(entityId, 4);
    equipmentManager.attachEquipment(entityId);
    const iron = inventoryManager.addEntry(entityId, "item_iron_sword", 0);
    const steel = inventoryManager.addEntry(entityId, "item_steel_sword", 1);
    expect(iron.ok && steel.ok).toBe(true);
    if (!iron.ok || !steel.ok) {
      return;
    }

    equipmentManager.equipFromInventory(entityId, 0);
    const swap = equipmentManager.equipFromInventory(entityId, 1);
    expect(swap.ok).toBe(true);
    expect(equipmentManager.getEquippedItem(entityId, "weapon")!.instanceId).toBe(
      steel.value.instanceId,
    );
    expect(inventoryManager.findEntryByInstanceId(entityId, iron.value.instanceId)!.position).toBe(
      1,
    );
  });
});

describe("Bloc 4 — Multiple components on same entity", () => {
  it("all component types coexist on one entity", () => {
    const { world } = makeWorld();
    const { characterManager, statsManager, inventoryManager, equipmentManager, abilityManager } =
      makeManagers(world);

    const charId = characterManager.createCharacter({ name: "All-in-one", tick: 0 });
    const entityId = characterManager.getCharacter(charId)!.entityId;

    statsManager.attachStats(entityId);
    inventoryManager.createInventory(entityId, 4);
    equipmentManager.attachEquipment(entityId);
    abilityManager.attachAbilities(entityId);

    expect(statsManager.hasStats(entityId)).toBe(true);
    expect(equipmentManager.hasEquipment(entityId)).toBe(true);
    expect(abilityManager.getAbilities(entityId)).toHaveLength(0);

    inventoryManager.addEntry(entityId, "item_iron_sword", 0);
    equipmentManager.equipFromInventory(entityId, 0);
    const def = makeAbilityDef({ castTime: 1, cooldown: 2 });
    abilityManager.learnAbility(entityId, def);

    expect(equipmentManager.getEquippedItem(entityId, "weapon")).toBeDefined();
    expect(abilityManager.hasAbility(entityId, aid("fireball"))).toBe(true);
  });
});

describe("Bloc 4 — Determinism", () => {
  it("running the full scenario twice produces identical results", () => {
    const results: {
      hp: number;
      weaponInstanceId: string | undefined;
      abilityState: string;
      cooldown: number;
    }[] = [];

    for (let run = 0; run < 2; run++) {
      const { world } = makeWorld();
      const { characterManager, statsManager, inventoryManager, equipmentManager, abilityManager } =
        makeManagers(world);

      const charId = characterManager.createCharacter({ name: "Test", tick: 0 });
      const entityId = characterManager.getCharacter(charId)!.entityId;

      statsManager.attachStats(entityId);
      statsManager.setBaseStat(entityId, sid("stat_max_health"), 100);
      inventoryManager.createInventory(entityId, 4);
      equipmentManager.attachEquipment(entityId);
      inventoryManager.addEntry(entityId, "item_iron_sword", 0);
      equipmentManager.equipFromInventory(entityId, 0);
      abilityManager.attachAbilities(entityId);

      const def = makeAbilityDef({ id: "strike", castTime: 1, cooldown: 3, resourceCost: {} });
      abilityManager.learnAbility(entityId, def);
      abilityManager.castAbility(entityId, aid("strike"));
      abilityManager.tickAbilities(entityId, 0.5);
      abilityManager.tickAbilities(entityId, 0.5);
      abilityManager.tickAbilities(entityId, 1);

      statsManager.calculateStats(entityId);

      const entry = abilityManager.getAbility(entityId, aid("strike"))!;
      results.push({
        hp: statsManager.getStat(entityId, sid("stat_max_health")).computed,
        weaponInstanceId: equipmentManager.getEquippedItem(entityId, "weapon")?.instanceId,
        abilityState: entry.state,
        cooldown: entry.cooldownRemaining,
      });
    }

    expect(results[0]).toEqual(results[1]);
  });
});
