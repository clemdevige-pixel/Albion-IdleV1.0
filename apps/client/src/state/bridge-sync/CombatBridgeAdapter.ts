import type { EntityId, EventBus } from "@game/core";
import type {
  AbilityManager,
  DamageEventMap,
  DamageManager,
  StatsManager,
} from "@game/gameplay";
import type { GameBridge } from "../../game/GameBridge";
import type {
  CombatDomainTickResult,
  CombatRuntime,
} from "../../runtime/CombatRuntime";
import { resolveProjectedSegmentRates } from "../../runtime/projectedRateResolver";
import { isRuntimePresentationSuppressed } from "../../runtime/RuntimePresentationSuppression.js";
import type { WorldRuntime } from "../../runtime/WorldRuntime";
import { syncAbilitiesToBridge } from "../bridgeSync";
import {
  getCombatStartBlockGeneration,
  getCombatStartBlockReason,
} from "../../runtime/CombatStartGuard.js";

interface CombatBridgeAdapterDependencies {
  readonly bridge: GameBridge;
  readonly heroId: EntityId;
  readonly abilityManager: AbilityManager;
  readonly damageManager: DamageManager;
  /** Kept in the adapter contract because existing construction owns this service. */
  readonly statsManager: StatsManager;
  readonly combatRuntime: CombatRuntime;
  readonly worldRuntime: WorldRuntime;
  readonly updateWorldBridge: () => void;
}

export class CombatBridgeAdapter {
  readonly #bridge: GameBridge;
  readonly #heroId: EntityId;
  readonly #abilityManager: AbilityManager;
  readonly #damageManager: DamageManager;
  readonly #combatRuntime: CombatRuntime;
  readonly #worldRuntime: WorldRuntime;
  readonly #updateWorldBridge: () => void;
  #pendingHeroAbilityId: string | undefined;
  #lastCombatStartBlockGeneration = getCombatStartBlockGeneration();

  constructor(dependencies: CombatBridgeAdapterDependencies) {
    this.#bridge = dependencies.bridge;
    this.#heroId = dependencies.heroId;
    this.#abilityManager = dependencies.abilityManager;
    this.#damageManager = dependencies.damageManager;
    this.#combatRuntime = dependencies.combatRuntime;
    this.#worldRuntime = dependencies.worldRuntime;
    this.#updateWorldBridge = dependencies.updateWorldBridge;
  }

  bindDamageEvents(eventBus: EventBus<DamageEventMap>): () => void {
    const unsubscribeAbility = this.#abilityManager.subscribeAbilityExecuted((event) => {
      if (event.entityId !== this.#heroId) return;
      if (isRuntimePresentationSuppressed()) {
        this.#pendingHeroAbilityId = undefined;
        return;
      }
      this.#pendingHeroAbilityId = String(event.abilityId);
    });
    const unsubscribeHealth = eventBus.subscribe("HealthChanged", (event) => {
      if (isRuntimePresentationSuppressed()) return;
      if (event.entityId === this.#heroId) {
        this.#bridge.updatePlayerHealth(event.newHealth, event.maxHealth);
      } else {
        this.#bridge.updateEnemyHealth(event.newHealth, event.maxHealth);
      }
    });
    const unsubscribeDamage = eventBus.subscribe("DamageDealt", (event) => {
      if (isRuntimePresentationSuppressed()) return;
      const target = event.target === this.#heroId ? "player" : "enemy";
      const abilityId = event.source === this.#heroId
        && target === "enemy"
        && event.sourceType === "ability"
        ? this.#consumePendingHeroAbilityId()
        : undefined;
      const encounterKey = target === "enemy" ? this.#getCurrentEncounterKey() : undefined;
      this.#bridge.addDamageNumber(
        event.finalDamage,
        target,
        abilityId,
        event.sourceType,
        event.targetHealthAfter,
        encounterKey,
      );
    });
    const unsubscribeHeal = eventBus.subscribe("HealApplied", (event) => {
      if (isRuntimePresentationSuppressed()) return;
      if (event.entityId !== this.#heroId || event.amount <= 0) return;
      this.#bridge.addDamageNumber(
        event.amount,
        "player",
        undefined,
        "heal",
        event.newHealth,
      );
    });

    return () => {
      unsubscribeAbility();
      unsubscribeHealth();
      unsubscribeDamage();
      unsubscribeHeal();
    };
  }

  syncProjectedSegmentRates(): void {
    const rates = resolveProjectedSegmentRates(this.#bridge.getSnapshot(), {
      zoneDefId: String(this.#worldRuntime.getActiveZoneDef().defId),
      segmentIndex: this.#worldRuntime.currentSegment,
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
    const loopState = this.#combatRuntime.getLoopState();
    if (loopState !== "combat" && loopState !== "stop_requested") return false;
    const used = this.#combatRuntime.useWeaponAbility(slotIndex);
    this.syncAbilities();
    return used;
  }

  usePrimaryAbility(): boolean { return this.useWeaponAbility(0); }

  setPrimaryAbilityAutoCast(enabled: boolean): void {
    this.#combatRuntime.setPrimaryAbilityAutoCast(enabled);
    this.syncAbilities();
  }

  presentInitialCombat(result: CombatDomainTickResult): void {
    if (result.activeEnemy !== undefined) {
      this.#bridge.setEnemySnapshot({
        encounterKey: this.#getCurrentEncounterKey(),
        name: result.activeEnemy.name,
        visualManifestId: result.activeEnemy.visualManifestId,
        currentHealth: result.activeEnemy.currentHealth,
        maxHealth: result.activeEnemy.maxHealth,
      });
    }
    if (result.playerHealth !== undefined) {
      this.#bridge.updatePlayerHealth(result.playerHealth.currentHealth, result.playerHealth.maxHealth);
    }
    this.#bridge.setCombatState(result.combatState);
    this.#syncCombatStartBlockNotification();
    this.syncAbilities();
  }

  presentTick(result: CombatDomainTickResult): void {
    if (isRuntimePresentationSuppressed()) return;

    const combatStoppedAtBoundary = result.combatState === "defeat"
      || result.combatState === "walking"
      || (result.combatState === "victory" && this.#combatRuntime.getLoopState() === "paused");

    if (combatStoppedAtBoundary) {
      // Only clear presentation when the encounter boundary is also a real stop.
      // A normal victory is an in-combat handoff to the next encounter: keeping
      // the defeated snapshot avoids exposing the renderer fallback between mobs.
      this.#bridge.clearEnemyPresentation();
    } else if (result.spawnedEnemy !== undefined) {
      const health = this.#damageManager.getHealth(result.spawnedEnemy.id);
      this.#bridge.setEnemySnapshot({
        encounterKey: this.#getCurrentEncounterKey(),
        name: result.spawnedEnemy.name,
        visualManifestId: result.spawnedEnemy.visualManifestId,
        currentHealth: health.currentHealth,
        maxHealth: health.maxHealth,
      });
      this.#updateWorldBridge();
    } else if (result.activeEnemy !== undefined && result.activeEnemy.id !== 0) {
      this.#bridge.updateEnemyHealth(result.activeEnemy.currentHealth, result.activeEnemy.maxHealth);
    }

    if (result.playerHealth !== undefined) {
      this.#bridge.updatePlayerHealth(result.playerHealth.currentHealth, result.playerHealth.maxHealth);
    }
    this.#bridge.setCombatState(result.combatState);

    if (result.activeEffects !== undefined) {
      this.#bridge.setActiveEffects(result.activeEffects.map((effect) => ({
        id: effect.id,
        name: effect.definitionId,
        type: effect.effectType,
        remainingDuration: effect.remainingDuration,
      })));
    }
    this.#syncCombatStartBlockNotification();
    this.syncAbilities();
  }

  #syncCombatStartBlockNotification(): void {
    const generation = getCombatStartBlockGeneration();
    if (generation === this.#lastCombatStartBlockGeneration) return;

    this.#lastCombatStartBlockGeneration = generation;
    if (getCombatStartBlockReason() === "weapon_required") {
      this.#bridge.clearEnemyPresentation();
      this.#bridge.addEconomyNotification({
        id: `notif_combat_weapon_required_${String(generation)}`,
        type: "error",
        message: "Équipez une arme pour commencer le combat.",
        timestamp: Date.now(),
      });
    }
  }

  #consumePendingHeroAbilityId(): string | undefined {
    const abilityId = this.#pendingHeroAbilityId;
    this.#pendingHeroAbilityId = undefined;
    return abilityId;
  }

  /**
   * Runtime enemy identity is the encounter identity for presentation.
   * World location is not sufficient because Tower/Dungeon encounters can
   * advance while the underlying WorldRuntime location remains unchanged.
   */
  #getCurrentEncounterKey(): string {
    return `enemy:${String(this.#combatRuntime.getActiveEnemyId())}`;
  }

  #getEquippedWeaponId(): string | undefined {
    return this.#bridge.equipment.slots.find((slot) => slot.slot === "weapon")?.itemId;
  }
}
