import fs from "node:fs";
import path from "node:path";

import {
  BiomeRegistry,
  BiomeResolver,
  type EnchantmentLevel,
} from "@game/gameplay";

import { CombatRuntime } from "../apps/client/src/runtime/CombatRuntime.js";
import { ConsumableRuntime } from "../apps/client/src/runtime/ConsumableRuntime.js";
import { createCombatFoundation } from "../apps/client/src/runtime/bootstrap/createCombatFoundation.js";
import { createProgressionFoundation } from "../apps/client/src/runtime/bootstrap/createProgressionFoundation.js";
import { createCharacterEquipmentFoundation } from "../apps/client/src/runtime/bootstrap/createCharacterFoundation.js";
import { setupCombatEntity } from "../apps/client/src/runtime/combatEntityFactory.js";
import { recalculateWeaponMasteryStats } from "../apps/client/src/runtime/weaponMasteryStatSync.js";
import {
  HEALTH_POTION_HEAL_RATIO,
} from "../apps/client/src/data/economyContentCatalog.js";
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
const MAX_SEGMENT_SECONDS = 180;
const MASTERY_LEVELS = [1, 10, 30] as const;
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

function weaponsForTier(tier: Tier): readonly string[] {
  return Object.keys(WEAPON_ITEM_DEFINITIONS)
    .filter((itemId) => resolveWeaponTier(itemId) === tier)
    .sort();
}

function recommendedGearForIp(ip: number): string {
  if (ip <= 300) return "3.0";
  if (ip <= 400) return "4.0";
  if (ip <= 500) return "4.1";
  if (ip <= 600) return "4.2";
  return "4.3";
}

function totalXpForLevel(table: { getRequiredXp(level: number): number }, level: number): number {
  let total = 0;
  for (let current = 0; current < level; current += 1) {
    total += table.getRequiredXp(current);
  }
  return total;
}

interface RuntimeSegmentResult {
  readonly victory: boolean;
  readonly encounterReached: number;
  readonly elapsedSeconds: number;
  readonly hpLeft: number;
  readonly maxHp: number;
  readonly potionsUsed: number;
}

function runRuntimeSegment(args: {
  readonly zoneDefId: string;
  readonly segmentIndex: number;
  readonly weaponId: string;
  readonly masteryLevel: number;
  readonly gear: GearPreset;
  readonly mode: Mode;
}): RuntimeSegmentResult {
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

  const armor = args.gear.tier === 3 ? T3_ARMOR : T4_ARMOR;
  const weaponDefinition = WEAPON_ITEM_DEFINITIONS[args.weaponId];
  if (weaponDefinition === undefined) throw new Error(`Unknown weapon: ${args.weaponId}`);

  const items: string[] = [args.weaponId, ...armor];
  if (weaponDefinition.handling === "one_handed") {
    items.push(args.gear.tier === 3 ? "item_shield_t3_reinforced" : "item_shield_t4_reinforced");
  }

  items.forEach((itemId, position) => {
    const added = inventoryManager.addEntry(heroId, itemId, position, args.gear.enchantment);
    if (!added.ok) throw new Error(`Failed to add ${itemId}: ${added.reason}`);
    const equipped = equipmentManager.equipFromInventory(heroId, position);
    if (!equipped.ok) throw new Error(`Failed to equip ${itemId}: ${equipped.reason}`);
  });

  const masteryRoute = resolveWeaponMastery(args.weaponId);
  if (masteryRoute !== undefined) {
    for (const masteryId of [masteryRoute.familyId, masteryRoute.weaponId]) {
      progression.masteryService.discoverMastery(masteryId);
      const table = progression.masteryService._getTable(masteryId);
      if (table === undefined) throw new Error(`Missing mastery table: ${String(masteryId)}`);
      progression.experienceService._restore(
        masteryId,
        table,
        100,
        totalXpForLevel(table, args.masteryLevel),
      );
    }
  }

  recalculateWeaponMasteryStats(
    combat.statsManager,
    equipmentManager,
    progression.masteryService,
    heroId,
  );
  combat.damageManager.syncMaxHealth(heroId);
  const initialHealth = combat.damageManager.getHealth(heroId);
  combat.damageManager.healDamage(heroId, initialHealth.maxHealth - initialHealth.currentHealth);

  inventoryManager.addQuantity(heroId, "item_health_potion", 50);
  const consumables = new ConsumableRuntime({
    inventoryManager,
    damageManager: combat.damageManager,
    deathManager: combat.deathManager,
    heroId,
  });

  const placement = getWorldZonePlacement(args.zoneDefId as never);
  const zone = ZONE_DEFINITIONS.find(({ id }) => id === args.zoneDefId);
  if (zone === undefined) throw new Error(`Unknown zone: ${args.zoneDefId}`);

  let encounterIndex = 0;
  let potionsUsed = 0;

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
        encounterIndex += 1;
        return { enteredNewSegment: false };
      },
      onDefeat: () => {},
      isCombatSuspended: () => false,
      getLocationState: () => ({
        zoneIndex: placement.zoneIndexWithinBand,
        segmentIndex: args.segmentIndex,
        encounterIndex,
        zoneDefId: args.zoneDefId as never,
        zoneName: zone.name,
        highestUnlockedSegment: args.segmentIndex,
        farmMode: false,
      }),
    },
  });

  runtime.initialize();

  let elapsed = 0;
  let tick = 0;

  while (elapsed < MAX_SEGMENT_SECONDS) {
    tick += 1;
    elapsed += DT;

    consumables.tick(DT);

    if (args.mode === "ACTIVE" && combat.damageManager.isAlive(heroId)) {
      const health = combat.damageManager.getHealth(heroId);
      if (
        health.maxHealth > 0 &&
        health.currentHealth / health.maxHealth <= 1 - HEALTH_POTION_HEAL_RATIO
      ) {
        const used = consumables.useConsumable("item_health_potion");
        if (used.ok) potionsUsed += 1;
      }
    }

    const result = runtime.tick(DT, tick);

    if (result.combatState === "defeat") {
      const health = combat.damageManager.getHealth(heroId);
      return {
        victory: false,
        encounterReached: encounterIndex + 1,
        elapsedSeconds: Number(elapsed.toFixed(2)),
        hpLeft: Number(health.currentHealth.toFixed(2)),
        maxHp: Number(health.maxHealth.toFixed(2)),
        potionsUsed,
      };
    }

    if (result.combatState === "victory" && encounterIndex === 4) {
      const health = combat.damageManager.getHealth(heroId);
      return {
        victory: true,
        encounterReached: 5,
        elapsedSeconds: Number(elapsed.toFixed(2)),
        hpLeft: Number(health.currentHealth.toFixed(2)),
        maxHp: Number(health.maxHealth.toFixed(2)),
        potionsUsed,
      };
    }
  }

  const health = combat.damageManager.getHealth(heroId);
  return {
    victory: false,
    encounterReached: encounterIndex + 1,
    elapsedSeconds: MAX_SEGMENT_SECONDS,
    hpLeft: Number(health.currentHealth.toFixed(2)),
    maxHp: Number(health.maxHealth.toFixed(2)),
    potionsUsed,
  };
}

interface BenchmarkRow {
  zone: string;
  segment: number;
  ip: number;
  recommended: string;
  gear: string;
  mastery: number;
  mode: Mode;
  weapon: string;
  victory: boolean;
  encounterReached: number;
  time: number;
  hpLeft: number;
  maxHp: number;
  potions: number;
}

const rows: BenchmarkRow[] = [];

console.log("\n=== Albion Idle REAL RUNTIME Blue benchmark ===");
console.log("CombatRuntime + EquipmentManager + MasteryService + spawnEnemyForSegment");
console.log("Gear: 3.0 -> 4.0 -> 4.1 -> 4.2 -> 4.3 | M1/M10/M30 | AFK/ACTIVE\n");

for (const zoneDefId of WORLD_ZONE_IDS_BY_BAND.blue) {
  const placement = getWorldZonePlacement(zoneDefId);
  const zone = ZONE_DEFINITIONS.find(({ id }) => id === zoneDefId);
  if (zone === undefined) continue;

  for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
    const segment = segmentIndex + 1;
    const ip = getSegmentRecommendedItemPower(
      placement.zoneIndexWithinBand + 1,
      segment,
      placement.bandId,
    );

    for (const gear of GEAR_PRESETS) {
      for (const mastery of MASTERY_LEVELS) {
        for (const mode of MODES) {
          for (const weaponId of weaponsForTier(gear.tier)) {
            const result = runRuntimeSegment({
              zoneDefId,
              segmentIndex,
              weaponId,
              masteryLevel: mastery,
              gear,
              mode,
            });

            rows.push({
              zone: zone.name,
              segment,
              ip,
              recommended: recommendedGearForIp(ip),
              gear: gear.label,
              mastery,
              mode,
              weapon: weaponId.replace("item_weapon_", ""),
              victory: result.victory,
              encounterReached: result.encounterReached,
              time: result.elapsedSeconds,
              hpLeft: result.hpLeft,
              maxHp: result.maxHp,
              potions: result.potionsUsed,
            });
          }
        }
      }
    }
  }
}

const outputDir = path.resolve("node_modules", ".cache", "albion-idle");
fs.mkdirSync(outputDir, { recursive: true });
const csvPath = path.join(outputDir, "runtime-blue-progression.csv");
const headers = Object.keys(rows[0] ?? {});
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
    ...rows.map((row) =>
      headers.map((header) => escape(row[header as keyof BenchmarkRow])).join(","),
    ),
  ].join("\n"),
  "utf8",
);

console.log("\n=== REAL RUNTIME - minimum viable gear - M30 ===");
const summary: Record<string, unknown>[] = [];
for (const zone of [...new Set(rows.map((row) => row.zone))]) {
  for (let segment = 1; segment <= 10; segment += 1) {
    for (const mode of MODES) {
      const groups = GEAR_PRESETS.map((gear) => {
        const group = rows.filter(
          (row) =>
            row.zone === zone &&
            row.segment === segment &&
            row.mastery === 30 &&
            row.mode === mode &&
            row.gear === gear.label,
        );
        const wins = group.filter((row) => row.victory).length;
        return {
          gear: gear.label,
          wins,
          total: group.length,
          any: wins > 0,
          all: group.length > 0 && wins === group.length,
        };
      });
      const sample = rows.find((row) => row.zone === zone && row.segment === segment);
      summary.push({
        zone,
        segment,
        ip: sample?.ip ?? "—",
        recommended: sample?.recommended ?? "—",
        mode,
        firstViable: groups.find((group) => group.any)?.gear ?? "NONE",
        universal: groups.find((group) => group.all)?.gear ?? "NONE",
        progression: groups
          .map((group) => `${group.gear}:${group.wins}/${group.total}`)
          .join(" | "),
      });
    }
  }
}
console.table(summary);

console.log(`\nGenerated ${rows.length} REAL runtime simulations.`);
console.log(`CSV: ${csvPath}`);
