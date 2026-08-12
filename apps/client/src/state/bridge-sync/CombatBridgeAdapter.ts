import type { EntityId, EventBus } from "@game/core";
import type {
  AbilityEventMap,
  AbilityManager,
  DamageEventMap,
  DamageManager,
  StatId,
  StatsManager,
} from "@game/gameplay";
import type { GameBridge } from "../../game/GameBridge";
import type {
  CombatDomainTickResult,
  CombatRuntime,
} from "../../runtime/CombatRuntime";
import { calculateProjectedSegmentRates } from "../../runtime/projectedRateCalculator";
import type { WorldRuntime } from "../../runtime/WorldRuntime";
import { syncAbilitiesToBridge } from "../bridgeSync";

const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_MAGICAL_DAMAGE = "stat_magical_damage" as StatId;
const STAT_ATTACK_SPEED = "stat_attack_speed" as StatId;

interface CombatBridgeAdapterDependencies {
  readonly bridge: GameBridge;
  readonly heroId: EntityId;
  readonly abilityManager: AbilityManager;
  readonly damageManager: DamageManager;
  readonly statsManager: StatsManager;
  readonly combatRuntime: CombatRuntime;
  readonly worldRuntime: WorldRuntime;
  readonly updateWorldBridge: () => void;
}

/** Translates authoritative combat runtime state into presentation state. */
export class CombatBridgeAdapter {
  readonly #bridge: GameBridge;
  readonly #heroId: EntityId;
  readonly #abilityManager: AbilityManager;
  readonly #damageManager: DamageManager;
  readonly #statsManager: StatsManager;
  readonly #combatRuntime: CombatRuntime;
  readonly #worldRuntime: WorldRuntime;
  readonly #updateWorldBridge: () => void;
  #pendingHeroAbilityId: string | undefined;

  constructor(dependencies: CombatBridgeAdapterDependencies) {
    this.#bridge = dependencies.bridge;
    this.#heroId = dependencies.heroId;
    this.#abilityManager = dependencies.abilityManager;
    this.#damageManager = dependencies.damageManager;
    this.#statsManager = dependencies.statsManager;
    this.#combatRuntime = dependencies.combatRuntime;
    this.#worldRuntime = dependencies.worldRuntime;
    this.#updateWorldBridge = dependencies.updateWorldBridge;
  }

  bindAbilityEvents(eventBus: EventBus<AbilityEventMap>): () => void {
    return eventBus.subscribe("AbilityExecuted", (event) => {
      if (event.entityId === this.#heroId) {
        this.#pendingHeroAbilityId = String(event.abilityId);
      }
    });
  }

  bindDamageEvents(eventBus: EventBus<DamageEventMap>): () => void {
    const unsubscribeHealth = eventBus.subscribe("HealthChanged", (event) => {
      if (event.entityId === this.#heroId) {
        this.#bridge.updatePlayerHealth(event.newHealth, event.maxHealth);
      } else {
        this.#bridge.updateEnemyHealth(event.newHealth, event.maxHealth);
      }
    });
    const unsubscribeDamage = eventBus.subscribe("DamageDealt", (event) => {
      const target = event.target === this.#heroId ? "player" : "enemy";
      const abilityId = event.source === this.#heroId && target === "enemy"
        ? this.#consumePendingHeroAbilityId()
        : undefined;
      this.#bridge.addDamageNumber(event.finalDamage, target, abilityId);
    });

    return () => {
      unsubscribeHealth();
      unsubscribeDamage();
    };
  }

  syncProjectedSegmentRates(): void {
    const rates = calculateProjectedSegmentRates({
      physicalDamage: this.#statsManager.getStat(
        this.#heroId,
        STAT_PHYSICAL_DAMAGE,
      ).computed,
      magicalDamage: this.#statsManager.getStat(
        this.#heroId,
        STAT_MAGICAL_DAMAGE,
      ).computed,
      attackSpeed: this.#statsManager.getStat(
        this.#heroId,
        STAT_ATTACK_SPEED,
      ).computed,
      equippedWeaponId: this.#getEquippedWeaponId(),
      primaryAbilityAutoCast: this.#combatRuntime.isAutoCastEnabled(),
      currentZoneIndex: this.#worldRuntime.currentZoneIndex,
      currentSegment: this.#worldRuntime.currentSegment,
    });
    this.#bridge.updateSegmentRates(rates.silverPerHour, rates.famePerHour);
  }

  syncAbilities(): void {
    syncAbilitiesToBridge(
      this.#bridge,
      this.#abilityManager,
      this.#heroId,
      this.#getEquippedWeaponId(),
      this.#combatRuntime.isAutoCastEnabled(),
    );
  }

  useWeaponAbility(slotIndex: number): boolean {
    if (this.#bridge.combatState !== "combat") return false;
    const used = this.#combatRuntime.useWeaponAbility(slotIndex);
    this.syncAbilities();
    return used;
  }

  usePrimaryAbility(): boolean {
    return this.useWeaponAbility(0);
  }

  setPrimaryAbilityAutoCast(enabled: boolean): void {
    this.#combatRuntime.setPrimaryAbilityAutoCast(enabled);
    this.syncAbilities();
  }

  presentInitialCombat(result: CombatDomainTickResult): void {
    if (result.activeEnemy !== undefined) {
      this.#bridge.setEnemyPresentation(
        result.activeEnemy.name,
        result.activeEnemy.visualManifestId,
      );
      this.#bridge.updateEnemyHealth(
        result.activeEnemy.currentHealth,
        result.activeEnemy.maxHealth,
      );
    }
    this.#bridge.setCombatState(result.combatState);
    this.syncAbilities();
  }

  presentTick(result: CombatDomainTickResult): void {
    if (result.spawnedEnemy !== undefined) {
      const health = this.#damageManager.getHealth(result.spawnedEnemy.id);
      this.#bridge.updateEnemyHealth(health.currentHealth, health.maxHealth);
      this.#bridge.setEnemyPresentation(
        result.spawnedEnemy.name,
        result.spawnedEnemy.visualManifestId,
      );
      this.#updateWorldBridge();
    } else if (result.activeEnemy !== undefined && result.activeEnemy.id !== 0) {
      this.#bridge.updateEnemyHealth(
        result.activeEnemy.currentHealth,
        result.activeEnemy.maxHealth,
      );
    }

    if (result.playerHealth !== undefined) {
      this.#bridge.updatePlayerHealth(
        result.playerHealth.currentHealth,
        result.playerHealth.maxHealth,
      );
    }
    this.#bridge.setCombatState(result.combatState);

    if (result.activeEffects !== undefined) {
      this.#bridge.setActiveEffects(
        result.activeEffects.map((effect) => ({
          id: effect.id,
          name: effect.definitionId,
          type: effect.effectType,
          remainingDuration: effect.remainingDuration,
        })),
      );
    }
    this.syncAbilities();
  }

  #consumePendingHeroAbilityId(): string | undefined {
    const abilityId = this.#pendingHeroAbilityId;
    this.#pendingHeroAbilityId = undefined;
    return abilityId;
  }

  #getEquippedWeaponId(): string | undefined {
    return this.#bridge.equipment.slots
      .find((slot) => slot.slot === "weapon")?.itemId;
  }
}
