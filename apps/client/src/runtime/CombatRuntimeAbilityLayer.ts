import type { AbilityId } from "@game/gameplay";
import { resolveUnlockedWeaponAbilities, resolveWeaponMastery } from "../data/weaponContentCatalog.js";
import { WeaponAbilityEffectTracker } from "./WeaponAbilityEffectTracker.js";
import { WeaponAbilityMechanicsRuntime } from "./WeaponAbilityMechanicsRuntime.js";
import { CombatRuntime as LegacyCombatRuntime } from "./CombatRuntimeLegacy.js";
import type { CombatDomainTickResult, CombatRuntimeDependencies } from "./CombatRuntimeLegacy.js";
import { markCombatSegmentStart } from "./CombatSegmentLifecycle.js";
import { markCombatStartBlocked } from "./CombatStartGuard.js";
import { shouldHoldAutoCastForOverkill } from "./autoCastOverkill.js";

export class CombatRuntime extends LegacyCombatRuntime {
  private readonly mechanics: WeaponAbilityMechanicsRuntime;
  private readonly effects: WeaponAbilityEffectTracker;
  private inTick = false;
  private abilityTick = 0;
  private initialized = false;
  private weaponBlocked = false;

  constructor(private readonly runtimeDeps: CombatRuntimeDependencies) {
    super(runtimeDeps);
    this.mechanics = new WeaponAbilityMechanicsRuntime({
      heroId: runtimeDeps.heroId,
      damageManager: runtimeDeps.damageManager,
      effectManager: runtimeDeps.effectManager,
      statsManager: runtimeDeps.statsManager,
      autoAttackManager: runtimeDeps.autoAttackManager,
      onTargetKilled: (tick) => { this.finalizeActiveEnemyDeath(tick); },
    });
    this.effects = new WeaponAbilityEffectTracker(runtimeDeps.world, runtimeDeps.effectManager, this.mechanics);
  }

  override initialize(): CombatDomainTickResult {
    if (!this.hasEquippedWeapon()) return { combatState: "idle" };
    this.initialized = true;
    const result = super.initialize();
    this.handleSegmentStart(result);
    return result;
  }

  override useWeaponAbility(slotIndex: number): boolean {
    const definition = this.resolveAbility(slotIndex);
    const target = this.getActiveEnemyId();
    if (definition === undefined || !this.runtimeDeps.damageManager.isAlive(target)) return false;
    if (
      this.inTick
      && (
        !this.mechanics.canAutoCast(definition, target)
        || shouldHoldAutoCastForOverkill({
          heroId: this.runtimeDeps.heroId,
          targetId: target,
          definition,
          damageManager: this.runtimeDeps.damageManager,
          effectManager: this.runtimeDeps.effectManager,
          statsManager: this.runtimeDeps.statsManager,
        })
      )
    ) return false;
    const used = this.runtimeDeps.abilityManager.executeIntent({
      entityId: this.runtimeDeps.heroId,
      abilityId: definition.id as AbilityId,
      primaryTarget: target,
      tick: this.abilityTick,
    });
    return used.ok && this.mechanics.execute(definition, target, this.abilityTick);
  }

  override interruptEncounter(): void {
    this.mechanics.clear();
    super.interruptEncounter();
  }

  override tick(dt: number, tickCounter: number): CombatDomainTickResult {
    this.abilityTick = tickCounter;

    // Starter selection and gathering are authoritative suspension states. They
    // must not emit a weapon warning while combat is intentionally unavailable.
    if (this.runtimeDeps.ports.isCombatSuspended()) {
      return super.tick(dt, tickCounter);
    }

    if (!this.hasEquippedWeapon()) {
      if (!this.weaponBlocked) {
        if (this.initialized) this.interruptEncounter();
        this.weaponBlocked = true;
        markCombatStartBlocked("weapon_required");
      }
      return { combatState: "idle" };
    }

    this.weaponBlocked = false;

    if (!this.initialized) {
      this.initialized = true;
      const initial = super.initialize();
      this.handleSegmentStart(initial);
      return initial;
    }

    if (this.runtimeDeps.combatService.getActiveSession() === undefined) this.mechanics.clear();
    this.mechanics.tick(dt, tickCounter);
    const targets = [this.runtimeDeps.heroId, this.getActiveEnemyId()] as const;
    this.effects.capture(targets);
    this.inTick = true;
    let result: CombatDomainTickResult;
    try { result = super.tick(dt, tickCounter); }
    finally { this.inTick = false; }

    this.handleSegmentStart(result);
    this.effects.reconcile(targets);
    return result;
  }

  private handleSegmentStart(result: CombatDomainTickResult): void {
    if (
      result.spawnedEnemy !== undefined
      && this.runtimeDeps.ports.getLocationState().encounterIndex === 0
    ) {
      this.runtimeDeps.abilityManager.resetCooldowns(this.runtimeDeps.heroId);
      markCombatSegmentStart();
    }
  }

  private hasEquippedWeapon(): boolean {
    return this.runtimeDeps.equipmentManager.getEquippedItem(this.runtimeDeps.heroId, "weapon") !== undefined;
  }

  private resolveAbility(slotIndex: number) {
    const itemId = this.runtimeDeps.equipmentManager.getEquippedItem(this.runtimeDeps.heroId, "weapon")?.itemId;
    if (itemId === undefined) return undefined;
    const route = resolveWeaponMastery(itemId);
    const level = route === undefined ? 0 : this.runtimeDeps.masteryService?.getMasteryState(route.weaponId)?.level ?? 1;
    return resolveUnlockedWeaponAbilities(itemId, level)[slotIndex];
  }
}
