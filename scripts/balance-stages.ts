import { getEnemyCombatProfile } from "@game/gameplay";
import {
  compareCombatBalance,
  simulateCombatBalance,
  type CombatBalanceEnemyProfile,
  type CombatBalanceLoadout,
} from "../apps/client/src/data/combatBalanceSimulator.js";
import { getSegmentRecommendedItemPower } from "../apps/client/src/data/itemPower.js";
import { resolveMonsterForEncounter } from "../apps/client/src/data/monsterContentCatalog.js";
import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
  getWorldZonePlacement,
} from "../apps/client/src/data/worldContentCatalog.js";

const weapons = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_bow_t4_badon",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;
const armor = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
] as const;
const ENCOUNTERS_PER_SEGMENT = 5;

type Enchantment = 0 | 1 | 2 | 3;
type FarmMode = "AFK" | "ACTIVE";

function enchantmentForIp(ip: number): Enchantment {
  return Math.max(0, Math.min(3, Math.ceil((ip - 400) / 100))) as Enchantment;
}

function make(
  weaponId: string,
  masteryLevel: number,
  enchantment: Enchantment,
  mode: FarmMode = "AFK",
): CombatBalanceLoadout {
  return {
    weaponId,
    masteryLevel,
    weaponEnchantment: enchantment,
    equipment: armor.map((itemId) => ({ itemId, enchantment })),
    ...(weaponId.includes("sword")
      ? {
          offHandId: "item_shield_t4_reinforced",
          offHandEnchantment: enchantment,
        }
      : {}),
    consumables: { healthPotion: mode === "ACTIVE" ? "auto" : "disabled" },
  };
}

function realEnemy(
  zoneDefId: string,
  segmentIndex: number,
  encounterIndex: number,
): { readonly profile: CombatBalanceEnemyProfile; readonly monsterName: string; readonly category: string } {
  const placement = getWorldZonePlacement(zoneDefId);
  const profile = getEnemyCombatProfile(
    placement.zoneIndexWithinBand,
    segmentIndex,
    encounterIndex,
    placement.bandId,
  );
  const monster = resolveMonsterForEncounter(zoneDefId as never, segmentIndex, encounterIndex);
  const magical = monster.combat.damageType === "magical";
  return {
    profile: {
      id: `${zoneDefId}_s${String(segmentIndex + 1)}_e${String(encounterIndex + 1)}_${monster.id}`,
      health: profile.hp,
      armor: profile.armor,
      magicResistance: profile.magicResistance,
      physicalDamage: magical ? 0 : profile.damage,
      magicalDamage: magical ? profile.damage : 0,
      attackSpeed: profile.attackSpeed,
    },
    monsterName: monster.name,
    category: monster.category,
  };
}

console.log("\n=== T4 equipment progression by Blue stage ===");
for (let zone = 1; zone <= 5; zone += 1) {
  for (let segment = 1; segment <= 10; segment += 1) {
    const ip = getSegmentRecommendedItemPower(zone, segment, "blue");
    console.log(`Z${zone} S${segment}: ${ip} IP -> T4.${enchantmentForIp(ip)}`);
  }
}

console.log("\n=== Real Blue encounters — M30, stage-recommended T4 enchantment ===");
const blueZones = WORLD_ZONE_IDS_BY_BAND.blue;
for (const zoneDefId of blueZones) {
  const placement = getWorldZonePlacement(zoneDefId);
  const zone = ZONE_DEFINITIONS.find(({ id }) => id === zoneDefId);
  if (zone === undefined) continue;

  console.log(`\n## ${zone.name}`);
  const rows: Record<string, unknown>[] = [];

  for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
    const ip = getSegmentRecommendedItemPower(
      placement.zoneIndexWithinBand + 1,
      segmentIndex + 1,
      placement.bandId,
    );
    const enchantment = enchantmentForIp(ip);

    for (let encounterIndex = 0; encounterIndex < ENCOUNTERS_PER_SEGMENT; encounterIndex += 1) {
      const enemy = realEnemy(zoneDefId, segmentIndex, encounterIndex);
      for (const mode of ["AFK", "ACTIVE"] as const) {
        const results = compareCombatBalance(
          weapons.map((weaponId) => make(weaponId, 30, enchantment, mode)),
          enemy.profile,
        );
        const wins = results.filter((result) => result.victory);
        const fastest = wins[0];
        const slowestWinner = wins.at(-1);
        const mostPotions = Math.max(...results.map((result) => result.breakdown.healthPotionsUsed));
        rows.push({
          segment: segmentIndex + 1,
          encounter: encounterIndex + 1,
          monster: enemy.monsterName,
          category: enemy.category,
          mode,
          ip,
          gear: `4.${enchantment}`,
          wins: `${wins.length}/${results.length}`,
          fastest: fastest?.weaponId.replace("item_weapon_", "") ?? "—",
          fastestTtk: fastest?.elapsedSeconds ?? "—",
          slowestWinnerTtk: slowestWinner?.elapsedSeconds ?? "—",
          maxPotions: mostPotions,
        });
      }
    }
  }
  console.table(rows);
}

console.log("\n=== Focus: Sword M10 4.3 vs Daggers M30 4.3, AFK vs ACTIVE ===");
const referenceEnemy: CombatBalanceEnemyProfile = {
  id: "t4_reference_target",
  health: 3000,
  armor: 25,
  magicResistance: 25,
  physicalDamage: 44,
  magicalDamage: 0,
  attackSpeed: 0.9,
};
for (const mode of ["AFK", "ACTIVE"] as const) {
  const results = [
    simulateCombatBalance(make("item_weapon_sword_t4_broadsword", 10, 3, mode), referenceEnemy),
    simulateCombatBalance(make("item_weapon_dagger_t4_pair", 30, 3, mode), referenceEnemy),
  ];
  console.log(`\n${mode}`);
  console.table(results.map((result) => ({
    weapon: result.weaponId.replace("item_weapon_", ""),
    mastery: result.masteryLevel,
    win: result.victory,
    ttk: result.elapsedSeconds,
    hpLeft: result.heroHealthRemaining,
    dps: result.dps,
    potions: result.breakdown.healthPotionsUsed,
    healing: result.breakdown.healingReceived,
  })));
}
