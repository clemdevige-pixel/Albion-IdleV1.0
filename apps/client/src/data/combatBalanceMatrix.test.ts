import { describe, expect, it } from "vitest";
import {
  calculateDamage,
  getEnemyCombatProfile,
  getEnchantmentStatMultiplier,
} from "@game/gameplay";
import {
  COMBAT_BALANCE_CHECKPOINTS,
  COMBAT_BALANCE_LOADOUTS,
  COMBAT_BALANCE_SYNTHETIC_HERO,
  type CombatBalanceLoadoutDefinition,
} from "./combatBalanceMatrix.js";
import {
  resolveEquipmentInfo,
} from "./itemContentCatalog.js";
import {
  getItemTier,
  getWeaponAttackSpeed,
} from "./itemPower.js";
import {
  resolveUnlockedWeaponAbilities,
} from "./weaponContentCatalog.js";

interface ProjectedPlayerProfile {
  readonly maxHealth: number;
  readonly armor: number;
  readonly magicResistance: number;
  readonly physicalDamage: number;
  readonly magicalDamage: number;
  readonly attackSpeed: number;
  readonly abilityDamageRatio: number;
  readonly abilityCooldownSeconds: number | null;
  readonly damageType: "physical" | "magical";
  readonly physicalEffectiveHealth: number;
  readonly magicalEffectiveHealth: number;
}

interface ProjectedCheckpointResult {
  readonly loadoutId: string;
  readonly checkpointId: string;
  readonly checkpointLabel: string;
  readonly clearWithoutPotion: boolean;
  readonly normalWaveDamageTaken: number;
  readonly eliteDamageTaken: number;
  readonly eliteTimeToKillSeconds: number;
  readonly healthRemainingAfterElite: number;
  readonly healthRemainingRatio: number;
}

const capResistance = (value: number): number => Math.min(80, Math.max(0, value));

function getEquipmentStatMultiplier(itemId: string, loadout: CombatBalanceLoadoutDefinition): number {
  const tier = getItemTier(itemId);
  if (tier === undefined || tier < 4) return 1;
  return getEnchantmentStatMultiplier(loadout.enchantment);
}

function projectPlayer(loadout: CombatBalanceLoadoutDefinition): ProjectedPlayerProfile {
  const allItemIds = [loadout.weaponItemId, ...loadout.equipmentItemIds];
  let maxHealth = COMBAT_BALANCE_SYNTHETIC_HERO.maxHealth;
  let armor = COMBAT_BALANCE_SYNTHETIC_HERO.armor;
  let magicResistance = COMBAT_BALANCE_SYNTHETIC_HERO.magicResistance;
  let physicalDamage = 0;
  let magicalDamage = 0;

  for (const itemId of allItemIds) {
    const definition = resolveEquipmentInfo(itemId);
    if (definition === undefined) throw new Error(`Unknown balance item: ${itemId}`);
    const multiplier = getEquipmentStatMultiplier(itemId, loadout);
    const stats = definition.stats ?? {};
    maxHealth += (stats.stat_max_health ?? 0) * multiplier;
    armor += (stats.stat_armor ?? 0) * multiplier;
    magicResistance += (stats.stat_magic_resistance ?? 0) * multiplier;
    physicalDamage += (stats.stat_physical_damage ?? 0) * multiplier;
    magicalDamage += (stats.stat_magical_damage ?? 0) * multiplier;
  }

  const attackSpeed = getWeaponAttackSpeed(loadout.weaponItemId);
  if (attackSpeed === undefined) throw new Error(`Missing attack speed for ${loadout.weaponItemId}`);

  const abilities = resolveUnlockedWeaponAbilities(
    loadout.weaponItemId,
    loadout.specializationMasteryLevel,
  );
  const primaryAbility = abilities[0];
  const damageType = physicalDamage > 0 ? "physical" as const : "magical" as const;
  const resistanceForEhp = damageType === "physical" ? armor : magicResistance;

  return {
    maxHealth,
    armor,
    magicResistance,
    physicalDamage,
    magicalDamage,
    attackSpeed,
    abilityDamageRatio: primaryAbility?.bonusDamageRatio ?? 0,
    abilityCooldownSeconds: primaryAbility?.cooldown ?? null,
    damageType,
    physicalEffectiveHealth: maxHealth / (1 - capResistance(armor) / 100),
    magicalEffectiveHealth: maxHealth / (1 - capResistance(magicResistance) / 100),
  };
}

function getPlayerSustainedDpsAgainstEnemy(
  player: ProjectedPlayerProfile,
  enemy: ReturnType<typeof getEnemyCombatProfile>,
): number {
  const primaryDamage = player.damageType === "physical"
    ? player.physicalDamage
    : player.magicalDamage;
  const defenderStats = {
    armor: enemy.armor,
    magicResistance: enemy.magicResistance,
  };
  const autoDamage = calculateDamage(
    primaryDamage,
    { physicalDamage: 0, magicalDamage: 0 },
    defenderStats,
    player.damageType,
  ).mitigatedDamage;
  const autoDps = autoDamage * player.attackSpeed;

  if (player.abilityCooldownSeconds === null || player.abilityCooldownSeconds <= 0) {
    return autoDps;
  }

  const abilityRawDamage = primaryDamage * (1 + player.abilityDamageRatio);
  const abilityDamage = calculateDamage(
    abilityRawDamage,
    { physicalDamage: 0, magicalDamage: 0 },
    defenderStats,
    player.damageType,
  ).mitigatedDamage;
  return autoDps + abilityDamage / player.abilityCooldownSeconds;
}

function projectEncounter(
  player: ProjectedPlayerProfile,
  zoneIndex: number,
  segmentIndex: number,
  encounterIndex: number,
  worldBandId: "blue",
): { readonly timeToKillSeconds: number; readonly damageTaken: number } {
  const enemy = getEnemyCombatProfile(zoneIndex, segmentIndex, encounterIndex, worldBandId);
  const playerDps = getPlayerSustainedDpsAgainstEnemy(player, enemy);
  const timeToKillSeconds = enemy.hp / Math.max(1, playerDps);
  const enemyHit = calculateDamage(
    enemy.damage,
    { physicalDamage: 0, magicalDamage: 0 },
    { armor: player.armor, magicResistance: player.magicResistance },
    "physical",
  ).mitigatedDamage;
  return {
    timeToKillSeconds,
    damageTaken: enemyHit * enemy.attackSpeed * timeToKillSeconds,
  };
}

function projectCheckpoint(
  loadout: CombatBalanceLoadoutDefinition,
  checkpoint: (typeof COMBAT_BALANCE_CHECKPOINTS)[number],
): ProjectedCheckpointResult {
  const player = projectPlayer(loadout);
  const normalEncounters = [0, 1, 2, 3].map((encounterIndex) =>
    projectEncounter(
      player,
      checkpoint.zoneIndex,
      checkpoint.segmentIndex,
      encounterIndex,
      checkpoint.worldBandId,
    ),
  );
  const elite = projectEncounter(
    player,
    checkpoint.zoneIndex,
    checkpoint.segmentIndex,
    4,
    checkpoint.worldBandId,
  );
  const normalWaveDamageTaken = normalEncounters.reduce(
    (total, encounter) => total + encounter.damageTaken,
    0,
  );

  // Runtime contract: encounter five has a separate full-heal budget. The
  // diagnostic therefore evaluates the normal wave and encounter five as two
  // survival envelopes rather than silently adding an invented heal rule.
  const clearWithoutPotion =
    normalWaveDamageTaken < player.maxHealth
    && elite.damageTaken < player.maxHealth;
  const healthRemainingAfterElite = Math.max(0, player.maxHealth - elite.damageTaken);

  return {
    loadoutId: loadout.id,
    checkpointId: checkpoint.id,
    checkpointLabel: checkpoint.label,
    clearWithoutPotion,
    normalWaveDamageTaken,
    eliteDamageTaken: elite.damageTaken,
    eliteTimeToKillSeconds: elite.timeToKillSeconds,
    healthRemainingAfterElite,
    healthRemainingRatio: healthRemainingAfterElite / player.maxHealth,
  };
}

function getDeepestClear(results: readonly ProjectedCheckpointResult[]): string {
  const deepest = [...results].reverse().find((result) => result.clearWithoutPotion);
  return deepest?.checkpointLabel ?? "Aucun checkpoint";
}

describe("data-driven combat balance matrix", () => {
  it("resolves every authored loadout and checkpoint without test-owned balance thresholds", () => {
    expect(COMBAT_BALANCE_LOADOUTS.length).toBeGreaterThan(0);
    expect(COMBAT_BALANCE_CHECKPOINTS.length).toBeGreaterThan(0);

    for (const loadout of COMBAT_BALANCE_LOADOUTS) {
      expect(resolveEquipmentInfo(loadout.weaponItemId)).toBeDefined();
      for (const itemId of loadout.equipmentItemIds) {
        expect(resolveEquipmentInfo(itemId)).toBeDefined();
      }
      expect(projectPlayer(loadout).maxHealth).toBeGreaterThan(0);
    }
  });

  it("projects the current early-Blue baseline for every authored loadout", () => {
    const rows = COMBAT_BALANCE_LOADOUTS.map((loadout) => {
      const player = projectPlayer(loadout);
      const results = COMBAT_BALANCE_CHECKPOINTS.map((checkpoint) =>
        projectCheckpoint(loadout, checkpoint),
      );
      return {
        id: loadout.id,
        role: loadout.role,
        hp: Math.round(player.maxHealth),
        armor: Number(player.armor.toFixed(1)),
        magicResistance: Number(player.magicResistance.toFixed(1)),
        physicalEhp: Math.round(player.physicalEffectiveHealth),
        magicalEhp: Math.round(player.magicalEffectiveHealth),
        deepestProjectedClear: getDeepestClear(results),
      };
    });

    console.table(rows);

    for (const row of rows) {
      expect(Number.isFinite(row.hp)).toBe(true);
      expect(Number.isFinite(row.physicalEhp)).toBe(true);
      expect(Number.isFinite(row.magicalEhp)).toBe(true);
    }
  });

  it("reports marginal defensive value for each authored loadout stage", () => {
    const rows = COMBAT_BALANCE_LOADOUTS.map((loadout) => {
      const player = projectPlayer(loadout);
      return {
        id: loadout.id,
        hp: Math.round(player.maxHealth),
        armor: Number(player.armor.toFixed(1)),
        magicResistance: Number(player.magicResistance.toFixed(1)),
        physicalEhp: Math.round(player.physicalEffectiveHealth),
        magicalEhp: Math.round(player.magicalEffectiveHealth),
      };
    });

    console.table(rows);
    expect(rows.every((row) => row.physicalEhp > 0 && row.magicalEhp > 0)).toBe(true);
  });
});
