import fs from "node:fs";
import path from "node:path";

import {
  BiomeRegistry,
  BiomeResolver,
  getEncounterRewards,
  type EnchantmentLevel,
} from "@game/gameplay";

import { CombatRuntime } from "../apps/client/src/runtime/CombatRuntime.js";
import { ConsumableRuntime } from "../apps/client/src/runtime/ConsumableRuntime.js";
import { createCombatFoundation } from "../apps/client/src/runtime/bootstrap/createCombatFoundation.js";
import { createProgressionFoundation } from "../apps/client/src/runtime/bootstrap/createProgressionFoundation.js";
import { createCharacterEquipmentFoundation } from "../apps/client/src/runtime/bootstrap/createCharacterFoundation.js";
import { setupCombatEntity } from "../apps/client/src/runtime/combatEntityFactory.js";
import { recalculateWeaponMasteryStats } from "../apps/client/src/runtime/weaponMasteryStatSync.js";
import { HEALTH_POTION_HEAL_RATIO } from "../apps/client/src/data/economyContentCatalog.js";
import {
  WEAPON_ITEM_DEFINITIONS,
  resolveWeaponMastery,
  resolveWeaponTier,
} from "../apps/client/src/data/weaponContentCatalog.js";
import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
  getWorldZonePlacement,
} from "../apps/client/src/data/worldContentCatalog.js";
import { getSegmentRecommendedItemPower } from "../apps/client/src/data/itemPower.js";

const DT = 0.05;
const MAX_TOTAL_SECONDS = 60 * 60;
const MODES = ["AFK", "ACTIVE"] as const;

type Mode = (typeof MODES)[number];
type Tier = 3 | 4;

interface GearPreset {
  readonly label: string;
  readonly tier: Tier;
  readonly enchantment: EnchantmentLevel;
}

const GEAR_PRESETS: readonly GearPreset[] = [
  { label: "3.0", tier: 3, enchantment: 0 },
  { label: "4.0", tier: 4, enchantment: 0 },
  { label: "4.1", tier: 4, enchantment: 1 },
  { label: "4.2", tier: 4, enchantment: 2 },
  { label: "4.3", tier: 4, enchantment: 3 },
];

const T3_ARMOR = [
  "item_iron_helmet",
  "item_leather_armor",
  "item_leather_boots",
] as const;

const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
] as const;

interface WeaponLineage {
  readonly specializationId: string;
  readonly t3WeaponId: string;
  readonly t4WeaponId: string;
}

function weaponLineages(): readonly WeaponLineage[] {
  const t3Weapons = Object.keys(WEAPON_ITEM_DEFINITIONS)
    .filter((itemId) => resolveWeaponTier(itemId) === 3)
    .sort();
  const t4Weapons = Object.keys(WEAPON_ITEM_DEFINITIONS)
    .filter((itemId) => resolveWeaponTier(itemId) === 4)
    .sort();

  return t3Weapons.flatMap((t3WeaponId) => {
    const route = resolveWeaponMastery(t3WeaponId);
    if (route === undefined) return [];
    const t4WeaponId = t4Weapons.find((candidate) => {
      const candidateRoute = resolveWeaponMastery(candidate);
      return candidateRoute !== undefined && String(candidateRoute.weaponId) === String(route.weaponId);
    });
    return t4WeaponId === undefined
      ? []
      : [{ specializationId: String(route.weaponId), t3WeaponId, t4WeaponId }];
  });
}

function recommendedGearForIp(ip: number): string {
  if (ip <= 300) return "3.0";
  if (ip <= 400) return "4.0";
  if (ip <= 500) return "4.1";
  if (ip <= 600) return "4.2";
  return "4.3";
}

interface SegmentProgressionRow {
  mode: Mode;
  specialization: string;
  zone: string;
  segment: number;
  ip: number;
  recommended: string;
  gearStarted: string;
  gearCleared: string;
  masteryStarted: number;
  masteryCleared: number;
  fameEarned: number;
  deaths: number;
  upgrades: number;
  potions: number;
  elapsedSeconds: number;
  result: "CLEARED" | "BLOCKED";
}

interface UpgradeEvent {
  mode: Mode;
  specialization: string;
  zone: string;
  segment: number;
  encounter: number;
  mastery: number;
  fromGear: string;
  toGear: string;
}

function runProgression(lineage: WeaponLineage, mode: Mode): {
  readonly rows: readonly SegmentProgressionRow[];
  readonly upgrades: readonly UpgradeEvent[];
} {
  const combat = createCombatFoundation();
  const progression = createProgressionFoundation();

  const heroId = setupCombatEntity(
    {
      world: combat.world,
      statsManager: combat.statsManager,
      damageManager: combat.damageManager,
      deathManager: combat.deathManager,
      targetManager: combat.targetManager,
      autoAttackManager: combat.autoAttackManager,
      abilityManager: combat.abilityManager,
    },
    {
      maxHealth: 500,
      physDamage: 0,
      magDamage: 0,
      attackSpeed: 1.2,
      armor: 10,
      magicRes: 5,
    },
    { x: 0, y: 0 },
  );

  const { inventoryManager, equipmentManager } = createCharacterEquipmentFoundation({
    world: combat.world,
    statsManager: combat.statsManager,
    damageManager: combat.damageManager,
    masteryService: progression.masteryService,
    onPlayerHealthChanged: () => {},
    onStatsChanged: () => {},
  });

  inventoryManager.createInventory(heroId, 64);
  equipmentManager.attachEquipment(heroId);

  const route = resolveWeaponMastery(lineage.t3WeaponId);
  if (route === undefined) throw new Error(`Missing mastery route: ${lineage.t3WeaponId}`);
  progression.progressionOrchestrator.onEquipmentAcquired(route.familyId);
  progression.progressionOrchestrator.onEquipmentAcquired(route.weaponId);

  let gearIndex = 0;
  let currentWeaponId = lineage.t3WeaponId;

  const equipGear = (preset: GearPreset): void => {
    currentWeaponId = preset.tier === 3 ? lineage.t3WeaponId : lineage.t4WeaponId;
    const definition = WEAPON_ITEM_DEFINITIONS[currentWeaponId];
    if (definition === undefined) throw new Error(`Unknown weapon: ${currentWeaponId}`);
    const armor = preset.tier === 3 ? T3_ARMOR : T4_ARMOR;
    const items: string[] = [currentWeaponId, ...armor];
    if (definition.handling === "one_handed") {
      items.push(preset.tier === 3 ? "item_shield_t3_reinforced" : "item_shield_t4_reinforced");
    }

    for (const itemId of items) {
      const position = inventoryManager.findFreeSlots(heroId)[0];
      if (position === undefined) throw new Error("Progression benchmark inventory full");
      const added = inventoryManager.addEntry(heroId, itemId, position, preset.enchantment);
      if (!added.ok) throw new Error(`Failed to add ${itemId}: ${added.reason}`);
      const equipped = equipmentManager.equipFromInventory(heroId, position);
      if (!equipped.ok) throw new Error(`Failed to equip ${itemId}: ${equipped.reason}`);
    }

    recalculateWeaponMasteryStats(
      combat.statsManager,
      equipmentManager,
      progression.masteryService,
      heroId,
    );
    combat.damageManager.syncMaxHealth(heroId);
    const health = combat.damageManager.getHealth(heroId);
    combat.damageManager.healDamage(heroId, health.maxHealth - health.currentHealth);
  };

  equipGear(GEAR_PRESETS[gearIndex]!);

  const potionAdd = inventoryManager.addQuantity(heroId, "item_health_potion", 200);
  if (!potionAdd.ok) throw new Error(`Failed to seed potions: ${potionAdd.reason}`);
  const consumables = new ConsumableRuntime({
    inventoryManager,
    damageManager: combat.damageManager,
    deathManager: combat.deathManager,
    heroId,
  });

  let zoneListIndex = 0;
  let segmentIndex = 0;
  let encounterIndex = 0;
  let finished = false;
  let blocked = false;
  let tick = 0;
  let totalElapsed = 0;
  let totalPotions = 0;

  let segmentGearStarted = GEAR_PRESETS[gearIndex]!.label;
  let segmentMasteryStarted = progression.masteryService.getMasteryState(route.weaponId)?.level ?? 0;
  let segmentFame = 0;
  let segmentDeaths = 0;
  let segmentUpgrades = 0;
  let segmentPotionsStart = 0;
  let segmentElapsedStart = 0;

  const rows: SegmentProgressionRow[] = [];
  const upgrades: UpgradeEvent[] = [];

  const currentZoneId = () => WORLD_ZONE_IDS_BY_BAND.blue[zoneListIndex]!;
  const currentZone = () => {
    const zone = ZONE_DEFINITIONS.find(({ id }) => id === currentZoneId());
    if (zone === undefined) throw new Error(`Unknown zone ${String(currentZoneId())}`);
    return zone;
  };
  const masteryLevel = () => progression.masteryService.getMasteryState(route.weaponId)?.level ?? 0;

  const awardCurrentEncounterFame = (): number => {
    const placement = getWorldZonePlacement(currentZoneId());
    const reward = getEncounterRewards(
      placement.zoneIndexWithinBand,
      segmentIndex,
      encounterIndex,
      placement.bandId,
    );
    progression.progressionOrchestrator.onFameEarned(route.weaponId, reward.fame, "combat");
    progression.experienceService.addExperience(route.familyId, reward.fame, "combat");
    recalculateWeaponMasteryStats(
      combat.statsManager,
      equipmentManager,
      progression.masteryService,
      heroId,
    );
    segmentFame += reward.fame;
    return reward.fame;
  };

  const closeSegmentRow = (result: "CLEARED" | "BLOCKED"): void => {
    const placement = getWorldZonePlacement(currentZoneId());
    const ip = getSegmentRecommendedItemPower(
      placement.zoneIndexWithinBand + 1,
      segmentIndex + 1,
      placement.bandId,
    );
    rows.push({
      mode,
      specialization: lineage.specializationId,
      zone: currentZone().name,
      segment: segmentIndex + 1,
      ip,
      recommended: recommendedGearForIp(ip),
      gearStarted: segmentGearStarted,
      gearCleared: GEAR_PRESETS[gearIndex]!.label,
      masteryStarted: segmentMasteryStarted,
      masteryCleared: masteryLevel(),
      fameEarned: segmentFame,
      deaths: segmentDeaths,
      upgrades: segmentUpgrades,
      potions: totalPotions - segmentPotionsStart,
      elapsedSeconds: Number((totalElapsed - segmentElapsedStart).toFixed(2)),
      result,
    });
  };

  const beginNextSegmentTracking = (): void => {
    segmentGearStarted = GEAR_PRESETS[gearIndex]!.label;
    segmentMasteryStarted = masteryLevel();
    segmentFame = 0;
    segmentDeaths = 0;
    segmentUpgrades = 0;
    segmentPotionsStart = totalPotions;
    segmentElapsedStart = totalElapsed;
  };

  const runtime = new CombatRuntime({
    world: combat.world,
    heroId,
    combatService: combat.combatService,
    orchestrator: combat.orchestrator,
    damageManager: combat.damageManager,
    deathManager: combat.deathManager,
    targetManager: combat.targetManager,
    autoAttackManager: combat.autoAttackManager,
    abilityManager: combat.abilityManager,
    effectManager: combat.effectManager,
    statsManager: combat.statsManager,
    equipmentManager,
    masteryService: progression.masteryService,
    biomeResolver: new BiomeResolver(new BiomeRegistry()),
    ports: {
      onVictory: () => {
        awardCurrentEncounterFame();
        if (encounterIndex < 4) {
          encounterIndex += 1;
          return { enteredNewSegment: false };
        }

        closeSegmentRow("CLEARED");
        encounterIndex = 0;
        if (segmentIndex < 9) {
          segmentIndex += 1;
        } else if (zoneListIndex < WORLD_ZONE_IDS_BY_BAND.blue.length - 1) {
          zoneListIndex += 1;
          segmentIndex = 0;
        } else {
          finished = true;
          return { enteredNewSegment: true };
        }
        beginNextSegmentTracking();
        return { enteredNewSegment: true };
      },
      onDefeat: () => {},
      isCombatSuspended: () => false,
      getLocationState: () => {
        const placement = getWorldZonePlacement(currentZoneId());
        return {
          zoneIndex: placement.zoneIndexWithinBand,
          segmentIndex,
          encounterIndex,
          zoneDefId: currentZoneId(),
          zoneName: currentZone().name,
          highestUnlockedSegment: segmentIndex,
          farmMode: false,
        };
      },
    },
  });

  runtime.initialize();

  while (!finished && !blocked && totalElapsed < MAX_TOTAL_SECONDS) {
    tick += 1;
    totalElapsed += DT;
    consumables.tick(DT);

    if (mode === "ACTIVE" && combat.damageManager.isAlive(heroId)) {
      const health = combat.damageManager.getHealth(heroId);
      if (
        health.maxHealth > 0 &&
        health.currentHealth / health.maxHealth <= 1 - HEALTH_POTION_HEAL_RATIO
      ) {
        const used = consumables.useConsumable("item_health_potion");
        if (used.ok) totalPotions += 1;
      }
    }

    const result = runtime.tick(DT, tick);
    if (result.combatState !== "defeat") continue;

    segmentDeaths += 1;
    if (gearIndex >= GEAR_PRESETS.length - 1) {
      closeSegmentRow("BLOCKED");
      blocked = true;
      break;
    }

    const fromGear = GEAR_PRESETS[gearIndex]!.label;
    gearIndex += 1;
    const toGear = GEAR_PRESETS[gearIndex]!.label;
    segmentUpgrades += 1;
    upgrades.push({
      mode,
      specialization: lineage.specializationId,
      zone: currentZone().name,
      segment: segmentIndex + 1,
      encounter: encounterIndex + 1,
      mastery: masteryLevel(),
      fromGear,
      toGear,
    });

    const enemyId = runtime.getActiveEnemyId();
    combat.effectManager.removeAllEffects(enemyId);
    if (combat.world.hasEntity(enemyId)) combat.world.destroyEntity(enemyId);
    runtime.interruptEncounter();
    equipGear(GEAR_PRESETS[gearIndex]!);
  }

  if (!finished && !blocked && totalElapsed >= MAX_TOTAL_SECONDS) {
    closeSegmentRow("BLOCKED");
  }

  return { rows, upgrades };
}

const allRows: SegmentProgressionRow[] = [];
const allUpgrades: UpgradeEvent[] = [];
const lineages = weaponLineages();

console.log("\n=== Albion Idle REAL persistent Blue progression run ===");
console.log("One hero per weapon lineage, mastery starts at M0 and grows from real encounter Fame.");
console.log("Gear upgrades only after a real defeat: 3.0 -> 4.0 -> 4.1 -> 4.2 -> 4.3.");
console.log("Standard T3->T4 lineages only; artifact-only T4 weapons are excluded from natural-start runs.\n");

for (const lineage of lineages) {
  for (const mode of MODES) {
    const result = runProgression(lineage, mode);
    allRows.push(...result.rows);
    allUpgrades.push(...result.upgrades);
  }
}

console.log("=== UPGRADE WALLS ===");
console.table(allUpgrades);

console.log("\n=== PROGRESSION SUMMARY ===");
console.table(
  allRows.map((row) => ({
    mode: row.mode,
    weapon: row.specialization.replace("mastery_", ""),
    zone: row.zone,
    segment: row.segment,
    recommended: row.recommended,
    gear: row.gearCleared,
    mastery: `${row.masteryStarted}->${row.masteryCleared}`,
    fame: row.fameEarned,
    deaths: row.deaths,
    upgrades: row.upgrades,
    potions: row.potions,
    result: row.result,
  })),
);

const outputDir = path.resolve("node_modules", ".cache", "albion-idle");
fs.mkdirSync(outputDir, { recursive: true });
const csvPath = path.join(outputDir, "runtime-blue-persistent-progression.csv");
const headers = Object.keys(allRows[0] ?? {});
const escape = (value: unknown): string => {
  const text = String(value ?? "");
  return text.includes(",") || text.includes('"') || text.includes("\n")
    ? `"${text.replace(/"/g, '""')}"`
    : text;
};
fs.writeFileSync(
  csvPath,
  [
    headers.join(","),
    ...allRows.map((row) =>
      headers.map((header) => escape(row[header as keyof SegmentProgressionRow])).join(","),
    ),
  ].join("\n"),
  "utf8",
);

console.log(`\nGenerated ${allRows.length} persistent progression segment results.`);
console.log(`Upgrade events: ${allUpgrades.length}`);
console.log(`CSV: ${csvPath}`);
