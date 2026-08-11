import type { EntityId, World } from "@game/core";
import {
  AbilityManager,
  AutoAttackManager,
  BiomeResolver,
  DamageManager,
  DeathManager,
  PositionComponent,
  StatsManager,
  TargetManager,
  getEnemyCombatProfile,
  type StatId,
  type ZoneDefinitionId,
} from "@game/gameplay";
import { ENCOUNTERS_PER_SEGMENT, SEGMENTS_PER_ZONE } from "@game/data";
import { resolveMonsterForEncounter } from "../data/monsterContentCatalog";
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

export interface SpawnedEnemyResult {
  readonly id: EntityId;
  readonly maxHealth: number;
  readonly name: string;
  readonly visualManifestId: string;
  readonly monsterDefinitionId: string;
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

export function spawnEnemyForSegment(
  deps: CombatEntityFactoryDependencies,
  _biomeResolver: BiomeResolver,
  ctx: EnemySpawnContext,
): SpawnedEnemyResult {
  const isBoss = ctx.encounterIndex === ENCOUNTERS_PER_SEGMENT - 1;
  const isBiomeBoss = isBoss && ctx.segmentIndex === SEGMENTS_PER_ZONE - 1;
  const monster = resolveMonsterForEncounter(
    ctx.zoneDefId,
    ctx.segmentIndex,
    ctx.encounterIndex,
  );
  const profile = getEnemyCombatProfile(
    ctx.zoneIndex,
    ctx.segmentIndex,
    ctx.encounterIndex,
  );
  const maxHealth = profile.hp;
  const damage = profile.damage;
  const armor = profile.armor;
  const magicResistance = profile.magicResistance;
  const physicalDamage = monster.combat.damageType === "physical" ? damage : 0;
  const magicalDamage = monster.combat.damageType === "magical" ? damage : 0;

  const enemyId = setupCombatEntity(
    deps,
    {
      maxHealth,
      physDamage: physicalDamage,
      magDamage: magicalDamage,
      attackSpeed: profile.attackSpeed,
      armor,
      magicRes: magicResistance,
    },
    { x: 100, y: 0 },
  );
  setActiveMonsterIdentity(enemyId, monster.id);

  for (const ability of buildMonsterRuntimeAbilities(monster.category, monster.abilityIds)) {
    deps.abilityManager.learnAbility(enemyId, ability);
  }

  const prefix = isBiomeBoss
    ? "[BIOME BOSS] "
    : isBoss
      ? "[BOSS] "
      : "";

  return {
    id: enemyId,
    maxHealth,
    name: `${prefix}${monster.name} - ${ctx.zoneName}`,
    visualManifestId: monster.visualManifestId,
    monsterDefinitionId: monster.id,
  };
}
