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
import { CombatRuntime } from "../runtime/CombatRuntime.js";
import { setupCombatEntity } from "../runtime/combatEntityFactory.js";
import { createProgressionFoundation } from "../runtime/bootstrap/createProgressionFoundation.js";
import { resolveEquipmentInfo, resolveItemStackInfo } from "./itemContentCatalog.js";
import { resolveWeaponMastery } from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const DT = 1 / 20;
const MAX_TICKS = 20 * 180;

const CASES = [
  { weaponItemId: "item_weapon_sword_t3_broadsword", zoneDefId: WORLD_ZONE_IDS.forest, segmentIndex: 9, label: "broadsword_forest_s10" },
  { weaponItemId: "item_weapon_staff_t3_infernal", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 1, label: "infernal_swamp_s2" },
  { weaponItemId: "item_weapon_dagger_t3_pair", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 1, label: "dagger_swamp_s2" },
  { weaponItemId: "item_weapon_bow_t3_longbow", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 2, label: "longbow_swamp_s3" },
  { weaponItemId: "item_weapon_gloves_t3_spiked_gauntlets", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 2, label: "spiked_swamp_s3" },
] as const;

function runRuntimeSegment(input: (typeof CASES)[number]) {
  const world = new World(createRuntimeServices());
  const statRegistry = createDefaultStatRegistry();
  const statsManager = new StatsManager(world, statRegistry);
  const damageManager = new DamageManager(world, statsManager);
  const deathManager = new DeathManager(world, damageManager);
  const targetManager = new TargetManager(world, new TargetValidator(world));
  const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
  const abilityManager = new AbilityManager(world, statsManager);
  const effectManager = new EffectManager();
  const combatService = new CombatService(damageManager, deathManager, targetManager, autoAttackManager, statsManager);
  const orchestrator = new CombatOrchestrator({ combatService, effectManager, abilityManager });
  orchestrator.initialize();

  const { masteryService } = createProgressionFoundation();
  let equipmentManager!: EquipmentManager;
  const equipmentStatSync = new EquipmentStatSync(statsManager, resolveEquipmentInfo, () => {});
  const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
  equipmentManager = new EquipmentManager(world, inventoryManager, resolveEquipmentInfo, equipmentStatSync);

  // Exact live naked-hero baseline from GameContext.
  const heroId = setupCombatEntity(
    { world, statsManager, damageManager, deathManager, targetManager, autoAttackManager, abilityManager },
    { maxHealth: 300, physDamage: 0, attackSpeed: 1.2, armor: 0, magicRes: 0 },
    { x: 0, y: 0 },
  );
  inventoryManager.createInventory(heroId, 24);
  equipmentManager.attachEquipment(heroId);

  const added = inventoryManager.addQuantity(heroId, input.weaponItemId, 1, {
    itemId: input.weaponItemId,
    stackable: false,
    maxStack: 1,
  });
  if (!added.ok || added.value.remainder !== 0) throw new Error(`Failed to seed ${input.weaponItemId}`);
  const position = added.value.affectedPositions[0];
  if (position === undefined) throw new Error("Missing starter weapon slot");
  const equipped = equipmentManager.equipFromInventory(heroId, position);
  if (!equipped.ok) throw new Error(`Failed to equip ${input.weaponItemId}`);

  const route = resolveWeaponMastery(input.weaponItemId);
  if (route !== undefined) {
    masteryService.discoverMastery(route.familyId);
    masteryService.discoverMastery(route.weaponId);
  }

  let encounterIndex = 0;
  let finishedSegment = false;
  let defeated = false;
  const zoneName = input.zoneDefId === WORLD_ZONE_IDS.forest ? "Birch Forest" : "Dark Swamp";

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
    masteryService,
    biomeResolver: new BiomeResolver(new BiomeRegistry()),
    ports: {
      isCombatSuspended: () => false,
      onDefeat: () => { defeated = true; },
      onVictory: () => {
        if (encounterIndex >= 4) {
          finishedSegment = true;
          return { enteredNewSegment: true };
        }
        encounterIndex += 1;
        return { enteredNewSegment: false };
      },
      getLocationState: () => ({
        zoneIndex: input.zoneDefId === WORLD_ZONE_IDS.forest ? 0 : 1,
        segmentIndex: input.segmentIndex,
        encounterIndex,
        zoneDefId: input.zoneDefId,
        zoneName,
        highestUnlockedSegment: input.segmentIndex,
        farmMode: false,
      }),
    },
  });

  let ticks = 0;
  while (!finishedSegment && !defeated && ticks < MAX_TICKS) {
    ticks += 1;
    runtime.tick(DT, ticks);
  }

  const health = damageManager.getHealth(heroId);
  return {
    label: input.label,
    clear: finishedSegment && !defeated,
    seconds: Number((ticks * DT).toFixed(1)),
    hpPercent: Number(((health.currentHealth / health.maxHealth) * 100).toFixed(1)),
    encounterReached: encounterIndex + 1,
    maxHealth: health.maxHealth,
  };
}

describe("Blue runtime parity", () => {
  it("runs the calibration checkpoints through the exact live CombatRuntime", () => {
    const rows = CASES.map(runRuntimeSegment);
    console.table(rows);
    console.log("[BLUE_RUNTIME_PARITY]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CASES.length);
    expect(rows.every((row) => row.maxHealth === 300)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.seconds))).toBe(true);
  });
});
