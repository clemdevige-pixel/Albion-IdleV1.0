import type { EntityId, World } from "@game/core";
import type {
  AbilityManager,
  AutoAttackManager,
  BiomeResolver,
  CombatOrchestrator,
  CombatService,
  DamageManager,
  DeathManager,
  EffectManager,
  EquipmentManager,
  MasteryService,
  StatsManager,
  TargetManager} from "@game/gameplay";
import {
  DeathComponent,
  asEncounterId,
  type AbilityId,
  type CombatState,
  type StatusEffectType,
  type StatId,
  type ZoneDefinitionId,
} from "@game/gameplay";
import {
  CLIENT_ABILITIES,
  resolveUnlockedWeaponAbilities,
  resolveWeaponMastery,
} from "../data/weaponContentCatalog";
import { getMonsterAbilityDefinition } from "../data/monsterAbilityContentCatalog";
import {
  spawnEnemyForSegment,
  type SpawnedEnemyResult,
} from "./combatEntityFactory.js";
import { ENCOUNTERS_PER_SEGMENT } from "@game/data";

const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_MAGICAL_DAMAGE = "stat_magical_damage" as StatId;

export interface CombatLocationState {
  readonly zoneIndex: number;
  readonly segmentIndex: number;
  readonly encounterIndex: number;
  readonly zoneDefId: ZoneDefinitionId;
  readonly zoneName: string;
  readonly highestUnlockedSegment: number;
  readonly farmMode: boolean;
}

export interface CombatRuntimePorts {
  readonly onVictory: () => { enteredNewSegment: boolean };
  readonly onDefeat: () => void;
  readonly getLocationState: () => CombatLocationState;
  readonly isCombatSuspended: () => boolean;
}

export interface CombatRuntimeDependencies {
  readonly world: World;
  readonly heroId: EntityId;
  readonly combatService: CombatService;
  readonly orchestrator: CombatOrchestrator;
  readonly damageManager: DamageManager;
  readonly deathManager: DeathManager;
  readonly targetManager: TargetManager;
  readonly autoAttackManager: AutoAttackManager;
  readonly abilityManager: AbilityManager;
  readonly effectManager: EffectManager;
  readonly statsManager: StatsManager;
  readonly equipmentManager: EquipmentManager;
  readonly masteryService?: MasteryService;
  readonly biomeResolver: BiomeResolver;
  readonly ports: CombatRuntimePorts;
}

export interface CombatDomainTickResult {
  readonly combatState: CombatState;
  readonly activeEnemy?: { readonly id: EntityId; readonly currentHealth: number; readonly maxHealth: number; readonly name: string; readonly visualManifestId: string } | undefined;
  readonly playerHealth?: { readonly currentHealth: number; readonly maxHealth: number } | undefined;
  readonly activeEffects?: Array<{ readonly id: string; readonly definitionId: string; readonly effectType: StatusEffectType; readonly remainingDuration: number }> | undefined;
  readonly spawnedEnemy?: SpawnedEnemyResult | undefined;
}

export class CombatRuntime {
  private readonly world: World;
  private readonly heroId: EntityId;
  private readonly combatService: CombatService;
  private readonly orchestrator: CombatOrchestrator;
  private readonly damageManager: DamageManager;
  private readonly deathManager: DeathManager;
  private readonly targetManager: TargetManager;
  private readonly autoAttackManager: AutoAttackManager;
  private readonly abilityManager: AbilityManager;
  private readonly effectManager: EffectManager;
  private readonly statsManager: StatsManager;
  private readonly equipmentManager: EquipmentManager;
  private readonly masteryService: MasteryService | undefined;
  private readonly biomeResolver: BiomeResolver;
  private readonly ports: CombatRuntimePorts;

  private activeEnemyId: EntityId = 0 as EntityId;
  private encounterCounter = 0;
  private completedEncounterResult: "victory" | "defeat" | null = null;
  private awaitingResumeAfterDefeat = false;
  private primaryAbilityAutoCast = true;
  private currentTick = 0;

  constructor(deps: CombatRuntimeDependencies) {
    this.world = deps.world;
    this.heroId = deps.heroId;
    this.combatService = deps.combatService;
    this.orchestrator = deps.orchestrator;
    this.damageManager = deps.damageManager;
    this.deathManager = deps.deathManager;
    this.targetManager = deps.targetManager;
    this.autoAttackManager = deps.autoAttackManager;
    this.abilityManager = deps.abilityManager;
    this.effectManager = deps.effectManager;
    this.statsManager = deps.statsManager;
    this.equipmentManager = deps.equipmentManager;
    this.masteryService = deps.masteryService;
    this.biomeResolver = deps.biomeResolver;
    this.ports = deps.ports;
  }

  private get combatEntityFactoryDeps() {
    return { world: this.world, statsManager: this.statsManager, damageManager: this.damageManager, deathManager: this.deathManager, targetManager: this.targetManager, autoAttackManager: this.autoAttackManager, abilityManager: this.abilityManager };
  }

  private getEquippedWeaponId(): string | undefined {
    return this.equipmentManager.getEquippedItem(this.heroId, "weapon")?.itemId;
  }

  private getUnlockedHeroWeaponAbilities() {
    const equippedWeaponId = this.getEquippedWeaponId();
    if (equippedWeaponId === undefined) return [];
    const masteryRoute = resolveWeaponMastery(equippedWeaponId);
    const masteryLevel = masteryRoute === undefined
      ? 0
      : this.masteryService?.getMasteryState(masteryRoute.weaponId)?.level ?? 1;
    return resolveUnlockedWeaponAbilities(equippedWeaponId, masteryLevel);
  }

  private useReadyEnemyAbility(): boolean {
    if (!this.damageManager.isAlive(this.activeEnemyId) || !this.damageManager.isAlive(this.heroId)) return false;
    const readyAbility = this.abilityManager.getAbilities(this.activeEnemyId).find((entry) => entry.state === "ready" && entry.definition.category !== "passive");
    if (readyAbility === undefined) return false;
    const definition = getMonsterAbilityDefinition(String(readyAbility.abilityId));
    const execution = this.abilityManager.executeIntent({ entityId: this.activeEnemyId, abilityId: readyAbility.abilityId, primaryTarget: this.heroId, tick: this.currentTick });
    if (!execution.ok) return false;
    this.autoAttackManager.stopAutoAttack(this.activeEnemyId);
    this.autoAttackManager.startAutoAttack(this.activeEnemyId);
    const sourceStat = definition.damageType === "magical" ? STAT_MAGICAL_DAMAGE : STAT_PHYSICAL_DAMAGE;
    const sourceDamage = this.statsManager.getStat(this.activeEnemyId, sourceStat).computed;
    const result = this.damageManager.processDamage({ source: this.activeEnemyId, target: this.heroId, baseDamage: sourceDamage * definition.damageMultiplier, damageType: definition.damageType, source_type: "ability" });
    if (result?.targetDied === true) this.deathManager.checkDeath(this.heroId, this.activeEnemyId, this.currentTick);
    return result !== null;
  }

  private useNextReadyHeroAbility(): boolean {
    const unlockedAbilities = this.getUnlockedHeroWeaponAbilities();
    for (let slotIndex = 0; slotIndex < unlockedAbilities.length; slotIndex += 1) {
      if (this.useWeaponAbility(slotIndex)) return true;
    }
    return false;
  }

  public spawnEnemy(): SpawnedEnemyResult {
    const loc = this.ports.getLocationState();
    return spawnEnemyForSegment(this.combatEntityFactoryDeps, this.biomeResolver, { zoneIndex: loc.zoneIndex, segmentIndex: loc.segmentIndex, encounterIndex: loc.encounterIndex, zoneDefId: loc.zoneDefId, zoneName: loc.zoneName });
  }

  public initialize(): CombatDomainTickResult {
    const firstEnemy = this.spawnEnemy();
    this.activeEnemyId = firstEnemy.id;
    for (const definition of Object.values(CLIENT_ABILITIES)) this.abilityManager.learnAbility(this.heroId, definition);
    const encounterResult = this.combatService.startEncounter({ id: asEncounterId(`encounter_${String(this.encounterCounter)}`), enemies: [{ entityId: firstEnemy.id }] }, this.heroId);
    const enemyHealth = this.damageManager.getHealth(firstEnemy.id);
    const heroHealth = this.damageManager.getHealth(this.heroId);
    return { combatState: encounterResult.ok ? "combat" : "idle", activeEnemy: { id: firstEnemy.id, currentHealth: enemyHealth.currentHealth, maxHealth: enemyHealth.maxHealth, name: firstEnemy.name, visualManifestId: firstEnemy.visualManifestId }, playerHealth: { currentHealth: heroHealth.currentHealth, maxHealth: heroHealth.maxHealth }, spawnedEnemy: firstEnemy };
  }

  public getActiveEnemyId(): EntityId { return this.activeEnemyId; }
  public isAutoCastEnabled(): boolean { return this.primaryAbilityAutoCast; }
  public setPrimaryAbilityAutoCast(enabled: boolean): void { this.primaryAbilityAutoCast = enabled; }
  public isAwaitingResumeAfterDefeat(): boolean { return this.awaitingResumeAfterDefeat; }

  public restoreHeroHealth(): void {
    const health = this.damageManager.getHealth(this.heroId);
    this.damageManager.healDamage(this.heroId, health.maxHealth - health.currentHealth);
  }

  public reviveHero(): void {
    const heroDeathData = this.world.tryGetComponent(this.heroId, DeathComponent);
    if (heroDeathData !== undefined) { heroDeathData.isDead = false; heroDeathData.processed = false; }
    this.restoreHeroHealth();
  }

  public interruptEncounter(): void {
    const session = this.combatService.getActiveSession();
    if (session !== undefined) {
      this.combatService.cancelEncounter();
      this.effectManager.removeAllEffects(this.heroId);
      for (const enemyId of session.participants.enemies) {
        this.effectManager.removeAllEffects(enemyId);
        if (this.world.hasEntity(enemyId)) this.world.destroyEntity(enemyId);
      }
    }
    this.completedEncounterResult = null;
    this.awaitingResumeAfterDefeat = false;
    this.reviveHero();
  }

  public resumeExploration(): boolean {
    if (!this.awaitingResumeAfterDefeat) return false;
    this.awaitingResumeAfterDefeat = false;
    this.reviveHero();
    return true;
  }

  public finalizeActiveEnemyDeath(tickCounter: number): boolean {
    if (this.damageManager.isAlive(this.activeEnemyId)) return false;
    const death = this.deathManager.checkDeath(this.activeEnemyId, this.heroId, tickCounter);
    if (death === null) return true;
    const session = this.combatService.getActiveSession();
    if (session !== undefined) this.combatService.events.publish("enemyKilled", { sessionId: session.sessionId, entityId: this.activeEnemyId });
    return true;
  }

  public useWeaponAbility(slotIndex: number): boolean {
    const definition = this.getUnlockedHeroWeaponAbilities()[slotIndex];
    if (definition === undefined || !this.damageManager.isAlive(this.activeEnemyId)) return false;
    const execution = this.abilityManager.executeIntent({ entityId: this.heroId, abilityId: definition.id as AbilityId, primaryTarget: this.activeEnemyId, tick: this.currentTick });
    if (!execution.ok) return false;

    // Hero abilities are instant actions layered on top of the normal attack
    // cadence. They must not restart AutoAttackManager, otherwise unlocking W/E
    // can reduce real DPS by repeatedly delaying the next basic attack.
    const sourceStat = definition.damageType === "magical" ? STAT_MAGICAL_DAMAGE : STAT_PHYSICAL_DAMAGE;
    const sourceDamage = this.statsManager.getStat(this.heroId, sourceStat).computed;
    const result = this.damageManager.processDamage({ source: this.heroId, target: this.activeEnemyId, baseDamage: sourceDamage * definition.bonusDamageRatio, damageType: definition.damageType, source_type: "ability" });
    if (result?.targetDied === true) this.finalizeActiveEnemyDeath(this.currentTick);
    return result !== null;
  }

  public usePrimaryAbility(): boolean { return this.useWeaponAbility(0); }

  public tick(dt: number, tickCounter: number): CombatDomainTickResult {
    this.currentTick = tickCounter;
    if (this.ports.isCombatSuspended()) return { combatState: "idle" };
    const session = this.combatService.getActiveSession();
    if (session === undefined) {
      let enteredNewSegment = false;
      if (this.awaitingResumeAfterDefeat) return { combatState: "defeat" };
      if (this.completedEncounterResult === "defeat") { this.completedEncounterResult = null; this.awaitingResumeAfterDefeat = true; this.ports.onDefeat(); return { combatState: "defeat" }; }
      if (this.completedEncounterResult === "victory") { const res = this.ports.onVictory(); enteredNewSegment = res.enteredNewSegment; }
      this.completedEncounterResult = null;
      const loc = this.ports.getLocationState();
      const enteringBoss = loc.encounterIndex === ENCOUNTERS_PER_SEGMENT - 1;
      this.encounterCounter += 1;
      const enemy = this.spawnEnemy();
      this.activeEnemyId = enemy.id;
      if (enteredNewSegment || enteringBoss) this.restoreHeroHealth();
      const encounterResult = this.combatService.startEncounter({ id: asEncounterId(`encounter_${String(this.encounterCounter)}`), enemies: [{ entityId: enemy.id }] }, this.heroId);
      const enemyHealth = this.damageManager.getHealth(enemy.id);
      const heroHealth = this.damageManager.getHealth(this.heroId);
      return { combatState: encounterResult.ok ? "combat" : "idle", activeEnemy: { id: enemy.id, currentHealth: enemyHealth.currentHealth, maxHealth: enemyHealth.maxHealth, name: enemy.name, visualManifestId: enemy.visualManifestId }, playerHealth: { currentHealth: heroHealth.currentHealth, maxHealth: heroHealth.maxHealth }, spawnedEnemy: enemy };
    }

    this.abilityManager.tickAbilities(this.heroId, dt);
    this.abilityManager.tickAbilities(this.activeEnemyId, dt);
    if (this.primaryAbilityAutoCast) this.useNextReadyHeroAbility();
    this.useReadyEnemyAbility();
    const tickResult = this.orchestrator.tick(dt);
    this.finalizeActiveEnemyDeath(tickCounter);
    const activeSession = this.combatService.getActiveSession();
    if (activeSession?.state === "victory" || activeSession?.state === "defeat") { this.completedEncounterResult = activeSession.state; this.combatService.endEncounter(); return { combatState: activeSession.state }; }

    const activeEffects: Array<{ id: string; definitionId: string; effectType: StatusEffectType; remainingDuration: number }> = [];
    for (const [, effects] of this.orchestrator.getState().activeEffects) for (const eff of effects) activeEffects.push({ id: eff.id, definitionId: eff.definition.id, effectType: eff.effectType, remainingDuration: eff.remainingDuration });
    const enemyHealth = this.damageManager.isAlive(this.activeEnemyId) ? this.damageManager.getHealth(this.activeEnemyId) : undefined;
    const heroHealth = this.damageManager.getHealth(this.heroId);
    return { combatState: tickResult.ok ? tickResult.value.state : "combat", activeEnemy: enemyHealth ? { id: this.activeEnemyId, currentHealth: enemyHealth.currentHealth, maxHealth: enemyHealth.maxHealth, name: "", visualManifestId: "" } : undefined, playerHealth: { currentHealth: heroHealth.currentHealth, maxHealth: heroHealth.maxHealth }, activeEffects };
  }
}
