import type { EntityId, EventBus } from "@game/core";
import type {
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
import { getWorldZonePlacement } from "../../data/worldContentCatalog";
import type { WorldRuntime } from "../../runtime/WorldRuntime";
import { syncAbilitiesToBridge } from "../bridgeSync";
import {
  getCombatStartBlockGeneration,
  getCombatStartBlockReason,
} from "../../runtime/CombatStartGuard.js";

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
  #lastCombatStartBlockGeneration = getCombatStartBlockGeneration();

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

  bindDamageEvents(eventBus: EventBus<DamageEventMap>): () => void {
    const unsubscribeAbility = this.#abilityManager.subscribeAbilityExecuted((event) => {
      if (event.entityId === this.#heroId) this.#pendingHeroAbilityId = String(event.abilityId);
    });
    const unsubscribeHealth = eventBus.subscribe("HealthChanged", (event) => {
      if (event.entityId === this.#heroId) {
        this.#bridge.updatePlayerHealth(event.newHealth, event.maxHealth);
      } else {
        this.#bridge.updateEnemyHealth(event.newHealth, event.maxHealth);
      }
    });
    const unsubscribeDamage = eventBus.subscribe("DamageDealt", (event) => {
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

    return () => {
      unsubscribeAbility();
      unsubscribeHealth();
      unsubscribeDamage();
    };
  }

  syncProjectedSegmentRates(): void {
    const placement = getWorldZonePlacement(this.#worldRuntime.getActiveZoneDef().defId);
    const rates = calculateProjectedSegmentRates({
      physicalDamage: this.#statsManager.getStat(this.#heroId, STAT_PHYSICAL_DAMAGE).computed,
      magicalDamage: this.#statsManager.getStat(this.#heroId, STAT_MAGICAL_DAMAGE).computed,
      attackSpeed: this.#statsManager.getStat(this.#heroId, STAT_ATTACK_SPEED).computed,
      equippedWeaponId: this.#getEquippedWeaponId(),
      primaryAbilityAutoCast: this.#combatRuntime.isAutoCastEnabled(),
      currentZoneIndex: placement.zoneIndexWithinBand,
      currentWorldBandId: placement.bandId,
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
    if (result.spawnedEnemy !== undefined) {
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
    } else if (result.combatState === "defeat") {
      // Defeat is an authoritative encounter boundary: CombatRuntime has already
      // destroyed the active enemy. The bridge must drop the matching snapshot
      // in the same tick so presentation cannot re-adopt a dead encounter during
      // defeat -> walking -> combat resume.
      this.#bridge.clearEnemyPresentation();
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

  #getCurrentEncounterKey(): string {
    return [
      this.#worldRuntime.getActiveZoneDef().defId,
      this.#worldRuntime.currentSegment + 1,
      this.#worldRuntime.currentEncounter + 1,
    ].join(":");
  }

  #getEquippedWeaponId(): string | undefined {
    return this.#bridge.equipment.slots.find((slot) => slot.slot === "weapon")?.itemId;
  }
}
