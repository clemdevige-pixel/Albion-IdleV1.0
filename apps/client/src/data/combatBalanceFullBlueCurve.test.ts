import { describe, expect, it } from "vitest";
import {
  calculateDamage,
  getEnemyCombatProfile,
  getEnchantmentStatMultiplier,
} from "@game/gameplay";
import {
  COMBAT_BALANCE_LOADOUTS,
  COMBAT_BALANCE_REALLOCATIONS,
  type CombatBalanceLoadoutDefinition,
  type CombatBalanceReallocationDefinition,
} from "./combatBalanceMatrix.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { getItemTier, getWeaponAttackSpeed } from "./itemPower.js";
import { resolveUnlockedWeaponAbilities } from "./weaponContentCatalog.js";

interface BlueCheckpoint {
  readonly id: string;
  readonly label: string;
  readonly zoneIndex: number;
  readonly segmentIndex: number;
}

interface ProjectedPlayer {
  readonly maxHealth: number;
  readonly armor: number;
  readonly magicResistance: number;
  readonly physicalDamage: number;
  readonly magicalDamage: number;
  readonly attackSpeed: number;
  readonly abilityDamageRatio: number;
  readonly abilityCooldownSeconds: number | null;
  readonly damageType: "physical" | "magical";
}

const BLUE_ZONE_NAMES = [
  "Birch Forest",
  "Dark Swamp",
  "Stone Highlands",
  "Golden Steppe",
  "Frostpeak Mountain",
] as const;

const FULL_BLUE_CHECKPOINTS: readonly BlueCheckpoint[] = BLUE_ZONE_NAMES.flatMap(
  (zoneName, zoneIndex) => Array.from({ length: 10 }, (_, segmentIndex) => ({
    id: `blue_z${String(zoneIndex + 1)}_s${String(segmentIndex + 1)}`,
    label: `${zoneName} S${String(segmentIndex + 1)}`,
    zoneIndex,
    segmentIndex,
  })),
);

const IDENTITY = { maxHealth: 1, armor: 1, magicResistance: 1 } as const;

function requireCentralModel(): CombatBalanceReallocationDefinition {
  const candidate = COMBAT_BALANCE_REALLOCATIONS.find(
    (entry) => entry.id === "candidate_300_central_t3_t43",
  );
  if (candidate === undefined) throw new Error("Missing central T3/T4.3 balance model");
  return candidate;
}

function requireLoadout(id: string): CombatBalanceLoadoutDefinition {
  const loadout = COMBAT_BALANCE_LOADOUTS.find((entry) => entry.id === id);
  if (loadout === undefined) throw new Error(`Missing balance loadout: ${id}`);
  return loadout;
}

function getIpMultiplier(itemId: string, loadout: CombatBalanceLoadoutDefinition): number {
  const tier = getItemTier(itemId);
  if (tier === undefined || tier < 4) return 1;
  return getEnchantmentStatMultiplier(loadout.enchantment);
}

function getDefensiveMultiplier(
  itemId: string,
  loadout: CombatBalanceLoadoutDefinition,
  model: CombatBalanceReallocationDefinition,
) {
  const definition = resolveEquipmentInfo(itemId);
  if (definition === undefined) throw new Error(`Unknown balance item: ${itemId}`);
  if (definition.slot === "weapon" || definition.slot === "cape") return IDENTITY;
  if (definition.slot === "off_hand") return model.offHandStatMultiplier;
  const weaponTier = getItemTier(loadout.weaponItemId) ?? 3;
  return weaponTier >= 4 ? model.t4CoreStatMultiplier : model.t3CoreStatMultiplier;
}

function projectPlayer(
  loadout: CombatBalanceLoadoutDefinition,
  model: CombatBalanceReallocationDefinition,
): ProjectedPlayer {
  let maxHealth = model.hero.maxHealth;
  let armor = model.hero.armor;
  let magicResistance = model.hero.magicResistance;
  let physicalDamage = 0;
  let magicalDamage = 0;

  for (const itemId of [loadout.weaponItemId, ...loadout.equipmentItemIds]) {
    const definition = resolveEquipmentInfo(itemId);
    if (definition === undefined) throw new Error(`Unknown balance item: ${itemId}`);
    const stats = definition.stats ?? {};
    const ipMultiplier = getIpMultiplier(itemId, loadout);
    const defensiveMultiplier = getDefensiveMultiplier(itemId, loadout, model);

    maxHealth += (stats.stat_max_health ?? 0) * defensiveMultiplier.maxHealth * ipMultiplier;
    armor += (stats.stat_armor ?? 0) * defensiveMultiplier.armor * ipMultiplier;
    magicResistance += (stats.stat_magic_resistance ?? 0) * defensiveMultiplier.magicResistance * ipMultiplier;
    physicalDamage += (stats.stat_physical_damage ?? 0) * ipMultiplier;
    magicalDamage += (stats.stat_magical_damage ?? 0) * ipMultiplier;
  }

  const attackSpeed = getWeaponAttackSpeed(loadout.weaponItemId);
  if (attackSpeed === undefined) throw new Error(`Missing attack speed for ${loadout.weaponItemId}`);
  const primaryAbility = resolveUnlockedWeaponAbilities(
    loadout.weaponItemId,
    loadout.specializationMasteryLevel,
  )[0];

  return {
    maxHealth,
    armor,
    magicResistance,
    physicalDamage,
    magicalDamage,
    attackSpeed,
    abilityDamageRatio: primaryAbility?.bonusDamageRatio ?? 0,
    abilityCooldownSeconds: primaryAbility?.cooldown ?? null,
    damageType: physicalDamage > 0 ? "physical" : "magical",
  };
}

function sustainedDps(
  player: ProjectedPlayer,
  enemy: ReturnType<typeof getEnemyCombatProfile>,
): number {
  const primaryDamage = player.damageType === "physical" ? player.physicalDamage : player.magicalDamage;
  const defenderStats = { armor: enemy.armor, magicResistance: enemy.magicResistance };
  const autoDamage = calculateDamage(
    primaryDamage,
    { physicalDamage: 0, magicalDamage: 0 },
    defenderStats,
    player.damageType,
  ).mitigatedDamage;
  const autoDps = autoDamage * player.attackSpeed;
  if (player.abilityCooldownSeconds === null || player.abilityCooldownSeconds <= 0) return autoDps;

  const abilityDamage = calculateDamage(
    primaryDamage * (1 + player.abilityDamageRatio),
    { physicalDamage: 0, magicalDamage: 0 },
    defenderStats,
    player.damageType,
  ).mitigatedDamage;
  return autoDps + abilityDamage / player.abilityCooldownSeconds;
}

function encounterDamageTaken(
  player: ProjectedPlayer,
  checkpoint: BlueCheckpoint,
  encounterIndex: number,
): { readonly damageTaken: number; readonly ttk: number } {
  const enemy = getEnemyCombatProfile(
    checkpoint.zoneIndex,
    checkpoint.segmentIndex,
    encounterIndex,
    "blue",
  );
  const ttk = enemy.hp / Math.max(1, sustainedDps(player, enemy));
  const enemyHit = calculateDamage(
    enemy.damage,
    { physicalDamage: 0, magicalDamage: 0 },
    { armor: player.armor, magicResistance: player.magicResistance },
    "physical",
  ).mitigatedDamage;
  return { damageTaken: enemyHit * enemy.attackSpeed * ttk, ttk };
}

function clearsCheckpoint(player: ProjectedPlayer, checkpoint: BlueCheckpoint): boolean {
  const normalWaveDamage = [0, 1, 2, 3]
    .map((encounterIndex) => encounterDamageTaken(player, checkpoint, encounterIndex).damageTaken)
    .reduce((sum, value) => sum + value, 0);
  const eliteDamage = encounterDamageTaken(player, checkpoint, 4).damageTaken;
  return normalWaveDamage < player.maxHealth && eliteDamage < player.maxHealth;
}

function deepestClearIndex(player: ProjectedPlayer): number {
  for (let index = FULL_BLUE_CHECKPOINTS.length - 1; index >= 0; index -= 1) {
    if (clearsCheckpoint(player, FULL_BLUE_CHECKPOINTS[index])) return index;
  }
  return -1;
}

const CURVE_LOADOUT_IDS = [
  "broadsword_t3_full",
  "broadsword_t4_full_0",
  "broadsword_t4_full_1",
  "broadsword_t4_full_2",
  "broadsword_t4_full_3",
  "longbow_t3_full",
  "longbow_t4_full_0",
  "longbow_t4_full_1",
  "longbow_t4_full_2",
  "longbow_t4_full_3",
  "infernal_t3_full",
  "infernal_t4_full_0",
  "infernal_t4_full_1",
  "infernal_t4_full_2",
  "infernal_t4_full_3",
] as const;

describe("central model full Blue progression curve", () => {
  it("reports T3 -> T4.0 -> T4.1 -> T4.2 -> T4.3 across all 50 Blue checkpoints", () => {
    const model = requireCentralModel();
    const rows = CURVE_LOADOUT_IDS.map((id) => {
      const loadout = requireLoadout(id);
      const player = projectPlayer(loadout, model);
      const index = deepestClearIndex(player);
      return {
        loadout: id,
        hp: Number(player.maxHealth.toFixed(1)),
        armor: Number(player.armor.toFixed(1)),
        mr: Number(player.magicResistance.toFixed(1)),
        deepestProjectedClear: index >= 0 ? FULL_BLUE_CHECKPOINTS[index].label : "Aucun checkpoint",
        progressionIndex: index,
      };
    });

    console.table(rows);
    expect(rows).toHaveLength(CURVE_LOADOUT_IDS.length);

    for (const prefix of ["broadsword", "longbow", "infernal"] as const) {
      const progression = rows
        .filter((row) => row.loadout.startsWith(prefix))
        .map((row) => row.progressionIndex);
      for (let index = 1; index < progression.length; index += 1) {
        expect(progression[index]).toBeGreaterThanOrEqual(progression[index - 1]);
      }
    }
  });
});
