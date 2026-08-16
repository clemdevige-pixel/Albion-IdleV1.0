import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import {
  AbilityManager,
  AutoAttackManager,
  BiomeRegistry,
  BiomeResolver,
  CombatOrchestrator,
  CombatService,
  DamageManager,
  DeathManager,
  EffectManager,
  EquipmentManager,
  EquipmentStatSync,
  InventoryManager,
  StatsManager,
  TargetManager,
  TargetValidator,
  createDefaultStatRegistry,
} from "@game/gameplay";
import { resolveEquipmentInfo, resolveItemStackInfo } from "../data/itemContentCatalog";
import { WORLD_ZONE_IDS } from "../data/worldContentCatalog";
import { CombatRuntime } from "./CombatRuntime";
import { setupCombatEntity } from "./combatEntityFactory";

function createRuntimeWithWeapon(weaponItemId: string) {
  const world = new World(createRuntimeServices());
  const statsManager = new StatsManager(world, createDefaultStatRegistry());
  const damageManager = new DamageManager(world, statsManager);
  const deathManager = new DeathManager(world, damageManager);
  const targetManager = new TargetManager(world, new TargetValidator(world));
  const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
  const abilityManager = new AbilityManager(world, statsManager);
  const effectManager = new EffectManager();
  const combatService = new CombatService(
    damageManager,
    deathManager,
    targetManager,
    autoAttackManager,
    statsManager,
  );
  const orchestrator = new CombatOrchestrator({ combatService, effectManager, abilityManager });
  orchestrator.initialize();

  const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
  const equipmentStatSync = new EquipmentStatSync(statsManager, resolveEquipmentInfo, () => {});
  const equipmentManager = new EquipmentManager(
    world,
    inventoryManager,
    resolveEquipmentInfo,
    equipmentStatSync,
  );
  const heroId = setupCombatEntity(
    { world, statsManager, damageManager, deathManager, targetManager, autoAttackManager, abilityManager },
    { maxHealth: 300, physDamage: 0, magDamage: 0, attackSpeed: 1, armor: 0, magicRes: 0 },
    { x: 0, y: 0 },
  );
  inventoryManager.createInventory(heroId, 8);
  equipmentManager.attachEquipment(heroId);
  const added = inventoryManager.addQuantity(heroId, weaponItemId, 1, {
    itemId: weaponItemId,
    stackable: false,
    maxStack: 1,
  });
  if (!added.ok || added.value.remainder !== 0) throw new Error(`Failed to seed ${weaponItemId}`);
  const position = added.value.affectedPositions[0];
  if (position === undefined) throw new Error(`Missing inventory position for ${weaponItemId}`);
  const equipped = equipmentManager.equipFromInventory(heroId, position);
  if (!equipped.ok) throw new Error(`Failed to equip ${weaponItemId}`);

  const runtime = new CombatRuntime({
    world,
    heroId,
    combatService,
    orchestrator,
    damageManager,
    deathManager,
    targetManager,
    autoAttackManager,
    abilityManager,
    effectManager,
    statsManager,
    equipmentManager,
    biomeResolver: new BiomeResolver(new BiomeRegistry()),
    ports: {
      onVictory: () => ({ enteredNewSegment: true }),
      onDefeat: () => {},
      isCombatSuspended: () => false,
      getLocationState: () => ({
        zoneIndex: 0,
        segmentIndex: 0,
        encounterIndex: 0,
        zoneDefId: WORLD_ZONE_IDS.forest,
        zoneName: "Forest",
        highestUnlockedSegment: 0,
        farmMode: false,
      }),
    },
  });

  return { runtime, combatService, damageManager };
}

describe("combat runtime weapon presentation behavior", () => {
  for (const weaponItemId of [
    "item_weapon_bow_t3_longbow",
    "item_weapon_staff_t3_infernal",
  ] as const) {
    it(`exposes a zero-HP enemy snapshot on the killing frame for ${weaponItemId}`, () => {
      const env = createRuntimeWithWeapon(weaponItemId);
      const first = env.runtime.tick(0.5, 1);
      expect(first.combatState).toBe("combat");

      const enemyId = env.combatService.getActiveSession()?.participants.enemies[0];
      expect(enemyId).toBeDefined();
      if (enemyId === undefined) throw new Error("Missing active enemy");
      env.damageManager.getHealth(enemyId).currentHealth = 1;

      const killed = env.runtime.tick(0.5, 2);
      expect(killed.combatState).toBe("victory");
      expect(killed.activeEnemy).toBeDefined();
      expect(killed.activeEnemy?.currentHealth).toBe(0);
    });
  }
});
