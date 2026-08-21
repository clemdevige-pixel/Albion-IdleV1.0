import type { EntityId, World } from "@game/core";
import type {
  AbilityManager,
  AutoAttackManager,
  BiomeResolver,
  DamageManager,
  DeathManager,
  StatsManager,
  TargetManager} from "@game/gameplay";
import {
  PositionComponent,
  getEnemyCombatProfile,
  type StatId,
  type ZoneDefinitionId,
} from "@game/gameplay";
import {
  getMonsterDefinition,
  resolveMonsterForEncounter,
  type MonsterContentDefinition,
} from "../data/monsterContentCatalog";
import { getWorldZonePlacement } from "../data/worldContentCatalog";
import { buildMonsterRuntimeAbilities } from "../data/monsterAbilityContentCatalog";
import { setActiveMonsterIdentity } from "./activeMonsterIdentity";

const STAT_MAX_HEALTH = "stat_max_health" as StatId;
const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_ATTACK_SPEED = "stat_attack_speed" as StatId;
const STAT_ARMOR = "stat_armor" as StatId;
const STAT_MAGIC_RESISTANCE = "stat_magic_resistance" as StatId;
const STAT_MAGICAL_DAMAGE = "stat_magical_damage" as StatId;

export interface CombatEntityFactoryDependencies {
  readonly world: World;
  readonly statsManager: StatsManager;
  readonly damageManager: DamageManager;
  readonly deathManager: DeathManager;
  readonly targetManager: TargetManager;
  readonly autoAttackManager: AutoAttackManager;
  readonly abilityManager: AbilityManager;
}

export interface EnemySpawnContext {
  readonly zoneIndex: number;
  readonly segmentIndex: number;
  readonly encounterIndex: number;
  readonly zoneDefId: ZoneDefinitionId;
  readonly zoneName: string;
}

export interface AuthoredEnemyCombatProfile {
  readonly hp: number;
  readonly damage: number;
  readonly attackSpeed: number;
  readonly armor: number;
  readonly magicResistance: number;
}

export interface AuthoredEnemySpawnInput {
  readonly monsterDefinitionId: string;
  readonly profile: AuthoredEnemyCombatProfile;
}

export interface SpawnedEnemyResult {
  readonly id: EntityId;
  readonly maxHealth: number;
  readonly name: string;
  readonly visualManifestId: string;
  readonly monsterDefinitionId: string;
}

/**
 * Keeps the pre-polish enemy damage budget stable when authored abilities are
 * executed in addition to auto attacks.
 *
 * Before Combat Identity, expected raw DPS is `profileDamage * attackSpeed`.
 * With abilities, both auto attacks and abilities use the same adjusted damage
 * stat. Solving
 *
 *   adjusted * (attackSpeed + sum(multiplier / cooldown)) = old DPS
 *
 * gives an adjusted base damage that preserves the previous long-run budget.
 * This deliberately changes delivery/timing, not progression difficulty.
 */
export function calculateAbilityBudgetedEnemyDamage(
  profileDamage: number,
  attackSpeed: number,
  abilities: readonly { readonly cooldown: number; readonly damageMultiplier: number }[],
): number {
  if (profileDamage <= 0 || attackSpeed <= 0 || abilities.length === 0) {
    return profileDamage;
  }
  const abilityPressure = abilities.reduce((total, ability) => {
    if (ability.cooldown <= 0 || ability.damageMultiplier <= 0) return total;
    return total + (ability.damageMultiplier / ability.cooldown);
  }, 0);
  if (abilityPressure <= 0) return profileDamage;
  return profileDamage * attackSpeed / (attackSpeed + abilityPressure);
}

export function setupCombatEntity(
  deps: CombatEntityFactoryDependencies,
  baseStats: {
    maxHealth: number;
    physDamage: number;
    magDamage?: number;
    attackSpeed: number;
    armor: number;
    magicRes: number;
  },
  position: { x: number; y: number },
): EntityId {
  const {
    world,
    statsManager,
    damageManager,
    deathManager,
    targetManager,
    autoAttackManager,
    abilityManager,
  } = deps;

  const id = world.createEntity();
  const container = statsManager.attachStats(id);

  container.setBase(STAT_MAX_HEALTH, baseStats.maxHealth);
  container.setBase(STAT_PHYSICAL_DAMAGE, baseStats.physDamage);
  container.setBase(STAT_ATTACK_SPEED, baseStats.attackSpeed);
  container.setBase(STAT_ARMOR, baseStats.armor);
  container.setBase(STAT_MAGIC_RESISTANCE, baseStats.magicRes);
  container.setBase(STAT_MAGICAL_DAMAGE, baseStats.magDamage ?? 0);
  container.recalculate();

  damageManager.attachHealth(id);
  deathManager.attachDeath(id);
  targetManager.attachTargeting(id);
  autoAttackManager.attachAutoAttack(id);
  abilityManager.attachAbilities(id);

  world.addComponent(id, PositionComponent, position);

  return id;
}

function spawnMonsterWithProfile(
  deps: CombatEntityFactoryDependencies,
  monster: MonsterContentDefinition,
  profile: AuthoredEnemyCombatProfile,
): SpawnedEnemyResult {
  const runtimeAbilities = buildMonsterRuntimeAbilities(monster.category, monster.abilityIds);
  const damage = calculateAbilityBudgetedEnemyDamage(
    profile.damage,
    profile.attackSpeed,
    runtimeAbilities,
  );
  const physicalDamage = monster.combat.damageType === "physical" ? damage : 0;
  const magicalDamage = monster.combat.damageType === "magical" ? damage : 0;

  const enemyId = setupCombatEntity(
    deps,
    {
      maxHealth: profile.hp,
      physDamage: physicalDamage,
      magDamage: magicalDamage,
      attackSpeed: profile.attackSpeed,
      armor: profile.armor,
      magicRes: profile.magicResistance,
    },
    { x: 100, y: 0 },
  );
  setActiveMonsterIdentity(enemyId, monster.id);

  for (const ability of runtimeAbilities) deps.abilityManager.learnAbility(enemyId, ability);

  return {
    id: enemyId,
    maxHealth: profile.hp,
    name: monster.name,
    visualManifestId: monster.visualManifestId,
    monsterDefinitionId: monster.id,
  };
}

/**
 * Generic authored spawn path used by non-World combat content (dungeons,
 * future instanced encounters). Monster identity stays in the existing content
 * catalog while combat numbers are supplied by that content's own data curve.
 */
export function spawnAuthoredEnemy(
  deps: CombatEntityFactoryDependencies,
  input: AuthoredEnemySpawnInput,
): SpawnedEnemyResult {
  return spawnMonsterWithProfile(
    deps,
    getMonsterDefinition(input.monsterDefinitionId),
    input.profile,
  );
}

export function spawnEnemyForSegment(
  deps: CombatEntityFactoryDependencies,
  _biomeResolver: BiomeResolver,
  ctx: EnemySpawnContext,
): SpawnedEnemyResult {
  const monster = resolveMonsterForEncounter(
    ctx.zoneDefId,
    ctx.segmentIndex,
    ctx.encounterIndex,
  );
  const placement = getWorldZonePlacement(ctx.zoneDefId);
  const profile = getEnemyCombatProfile(
    placement.zoneIndexWithinBand,
    ctx.segmentIndex,
    ctx.encounterIndex,
    placement.bandId,
  );
  return spawnMonsterWithProfile(deps, monster, profile);
}
