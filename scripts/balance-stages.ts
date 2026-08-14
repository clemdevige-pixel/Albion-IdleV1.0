import fs from "node:fs";
import path from "node:path";

import { getEnemyCombatProfile } from "@game/gameplay";

import {
  simulateCombatSegment,
  type CombatBalanceEnemyProfile,
  type CombatBalanceLoadout,
} from "../apps/client/src/data/combatBalanceSimulator.js";

import { getSegmentRecommendedItemPower } from "../apps/client/src/data/itemPower.js";
import { resolveMonsterForEncounter } from "../apps/client/src/data/monsterContentCatalog.js";

import {
  WEAPON_ITEM_DEFINITIONS,
  resolveWeaponTier,
} from "../apps/client/src/data/weaponContentCatalog.js";

import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
  getWorldZonePlacement,
} from "../apps/client/src/data/worldContentCatalog.js";

type Enchantment = 0 | 1 | 2 | 3;
type FarmMode = "AFK" | "ACTIVE";

const ENCOUNTERS_PER_SEGMENT = 5;
const MASTERY_LEVELS = [1, 10, 30] as const;
const ENCHANTMENTS = [0, 1, 2, 3] as const;
const FARM_MODES = ["AFK", "ACTIVE"] as const;

const weapons = Object.keys(WEAPON_ITEM_DEFINITIONS)
  .filter((weaponId) => resolveWeaponTier(weaponId) === 4)
  .sort();

const armor = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
] as const;

function enchantmentForIp(ip: number): Enchantment {
  return Math.max(0, Math.min(3, Math.ceil((ip - 400) / 100))) as Enchantment;
}

function gearLabel(enchantment: Enchantment): string {
  return "4." + enchantment;
}

function makeLoadout(
  weaponId: string,
  masteryLevel: number,
  enchantment: Enchantment,
  mode: FarmMode,
): CombatBalanceLoadout {
  const weapon = WEAPON_ITEM_DEFINITIONS[weaponId];

  if (weapon === undefined) {
    throw new Error("Unknown benchmark weapon: " + weaponId);
  }

  const usesOffHand = weapon.handling === "one_handed";

  return {
    weaponId,
    masteryLevel,
    weaponEnchantment: enchantment,
    equipment: armor.map((itemId) => ({
      itemId,
      enchantment,
    })),
    ...(usesOffHand
      ? {
          offHandId: "item_shield_t4_reinforced",
          offHandEnchantment: enchantment,
        }
      : {}),
    consumables: {
      healthPotion: mode === "ACTIVE" ? "auto" : "disabled",
    },
  };
}

function realEnemy(
  zoneDefId: string,
  segmentIndex: number,
  encounterIndex: number,
): CombatBalanceEnemyProfile {
  const placement = getWorldZonePlacement(zoneDefId);

  const profile = getEnemyCombatProfile(
    placement.zoneIndexWithinBand,
    segmentIndex,
    encounterIndex,
    placement.bandId,
  );

  const monster = resolveMonsterForEncounter(
    zoneDefId as never,
    segmentIndex,
    encounterIndex,
  );

  const magical = monster.combat.damageType === "magical";

  return {
    id:
      zoneDefId +
      "_s" +
      (segmentIndex + 1) +
      "_e" +
      (encounterIndex + 1) +
      "_" +
      monster.id,
    health: profile.hp,
    armor: profile.armor,
    magicResistance: profile.magicResistance,
    physicalDamage: magical ? 0 : profile.damage,
    magicalDamage: magical ? profile.damage : 0,
    attackSpeed: profile.attackSpeed,
  };
}

interface BenchmarkRow {
  zone: string;
  segment: number;
  ip: number;
  recommendedGear: string;
  isRecommendedGear: boolean;
  weapon: string;
  mastery: number;
  gear: string;
  mode: FarmMode;
  victory: boolean;
  encounterReached: number;
  totalTime: number;
  hpLeft: number;
  potions: number;
  healing: number;
  autoAttackDamage: number;
  abilityDamage: number;
  dotDamage: number;
  damageTaken: number;
}

const rows: BenchmarkRow[] = [];

console.log("");
console.log("=== Albion Idle complete combat benchmark ===");
console.log(
  "Weapons: " +
    weapons.length +
    " | Masteries: " +
    MASTERY_LEVELS.join("/") +
    " | Gear: 4.0/4.1/4.2/4.3 | Modes: AFK/ACTIVE",
);

for (const weapon of weapons) {
  console.log(" - " + weapon);
}

for (const zoneDefId of WORLD_ZONE_IDS_BY_BAND.blue) {
  const placement = getWorldZonePlacement(zoneDefId);
  const zone = ZONE_DEFINITIONS.find(({ id }) => id === zoneDefId);

  if (zone === undefined) continue;

  for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
    const segmentNumber = segmentIndex + 1;

    const ip = getSegmentRecommendedItemPower(
      placement.zoneIndexWithinBand + 1,
      segmentNumber,
      placement.bandId,
    );

    const recommendedEnchantment = enchantmentForIp(ip);

    const enemies = Array.from(
      { length: ENCOUNTERS_PER_SEGMENT },
      (_, encounterIndex) =>
        realEnemy(zoneDefId, segmentIndex, encounterIndex),
    );

    for (const mastery of MASTERY_LEVELS) {
      for (const enchantment of ENCHANTMENTS) {
        for (const mode of FARM_MODES) {
          for (const weaponId of weapons) {
            const result = simulateCombatSegment(
              makeLoadout(weaponId, mastery, enchantment, mode),
              enemies,
              { fullHealBeforeEncounter: 5 },
            );

            rows.push({
              zone: zone.name,
              segment: segmentNumber,
              ip,
              recommendedGear: gearLabel(recommendedEnchantment),
              isRecommendedGear: enchantment === recommendedEnchantment,
              weapon: weaponId.replace("item_weapon_", ""),
              mastery,
              gear: gearLabel(enchantment),
              mode,
              victory: result.victory,
              encounterReached: result.encounterReached,
              totalTime: result.elapsedSeconds,
              hpLeft: result.heroHealthRemaining,
              potions: result.breakdown.healthPotionsUsed,
              healing: result.breakdown.healingReceived,
              autoAttackDamage: result.breakdown.autoAttackDamage,
              abilityDamage: result.breakdown.abilityDamage,
              dotDamage: result.breakdown.dotDamage,
              damageTaken: result.breakdown.damageTaken,
            });
          }
        }
      }
    }
  }
}

const outputDir = path.resolve("node_modules", ".cache", "albion-idle");
fs.mkdirSync(outputDir, { recursive: true });

const csvPath = path.join(outputDir, "combat-balance.csv");

const headers = Object.keys(rows[0] ?? {});

const csvEscape = (value: unknown): string => {
  const text = String(value ?? "");
  return text.includes(",") || text.includes('"') || text.includes("\n")
    ? '"' + text.replace(/"/g, '""') + '"'
    : text;
};

const csv = [
  headers.join(","),
  ...rows.map((row) =>
    headers
      .map((header) =>
        csvEscape(row[header as keyof BenchmarkRow]),
      )
      .join(","),
  ),
].join("\n");

fs.writeFileSync(csvPath, csv, "utf8");

console.log("");
console.log("Generated " + rows.length + " benchmark results.");
console.log("Full CSV: " + csvPath);

console.log("");
console.log("=== Mountain diagnostic - M30 - 4.2 vs 4.3 ===");

const mountainRows = rows.filter(
  (row) =>
    row.zone === "Frostpeak Mountain" &&
    row.mastery === 30 &&
    (row.gear === "4.2" || row.gear === "4.3"),
);

console.table(
  mountainRows.map((row) => ({
    segment: row.segment,
    mode: row.mode,
    gear: row.gear,
    weapon: row.weapon,
    result: row.victory
      ? "WIN"
      : "LOSS E" + row.encounterReached,
    time: row.totalTime,
    hpLeft: row.hpLeft,
    potions: row.potions,
  })),
);
