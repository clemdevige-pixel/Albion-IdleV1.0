import type { EntityId } from "@game/core";
import type { AutoAttackManager, DamageManager, EffectManager, StatsManager } from "@game/gameplay";
import type { DamageType, ModifierId, StatId } from "@game/gameplay";
import type {
  AbilityMechanic,
  ClientAbilityDefinition,
} from "../data/weaponContentCatalog.js";
import {
  canContinueWeaponMultiHit,
  matchesWeaponDotIdentity,
  snapshotWeaponDotSourceDamage,
} from "../data/weaponMechanicsContract.js";

const STAT_ABILITY_POWER = "stat_ability_power" as StatId;
const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_MAGICAL_DAMAGE = "stat_magical_damage" as StatId;
const STAT_AUTO_ATTACK_BONUS_PHYSICAL = "stat_auto_attack_bonus_physical_damage" as StatId;
const STAT_AUTO_ATTACK_BONUS_MAGICAL = "stat_auto_attack_bonus_magical_damage" as StatId;

export interface WeaponAbilityDamageTelemetryEvent {
  readonly abilityId: string;
  readonly kind: "direct" | "dot";
  readonly finalDamage: number;
}

interface ActiveDot {
  readonly effectId: string;
  readonly abilityId: string;
  readonly source: EntityId;
  readonly target: EntityId;
  readonly damageType: DamageType;
  readonly sourceDamage: number;
  readonly implicitOutputDamage: number;
  readonly abilityPowerMultiplier: number;
  readonly ratio: number;
  intervalRemaining: number;
  readonly interval: number;
  ticksRemaining: number;
}

interface TrackedModifier {
  readonly target: EntityId;
  readonly modifierId: ModifierId;
}

type DamageMechanic = Extract<AbilityMechanic, { readonly kind: "damage" }>;

export interface WeaponAbilityMechanicsRuntimeDeps {
  readonly heroId: EntityId;
  readonly damageManager: DamageManager;
  readonly effectManager: EffectManager;
  readonly statsManager: StatsManager;
  readonly autoAttackManager: AutoAttackManager;
  readonly onTargetKilled: (tick: number) => void;
  /** Optional diagnostics hook. Combat behavior never depends on this callback. */
  readonly onAbilityDamage?: (event: WeaponAbilityDamageTelemetryEvent) => void;
}

function statForDamageType(damageType: DamageType): StatId {
  return damageType === "magical" ? STAT_MAGICAL_DAMAGE : STAT_PHYSICAL_DAMAGE;
}

function bonusAutoAttackStatForDamageType(damageType: DamageType): StatId {
  return damageType === "magical" ? STAT_AUTO_ATTACK_BONUS_MAGICAL : STAT_AUTO_ATTACK_BONUS_PHYSICAL;
}

/**
 * DamageManager adds one full output-damage stat to every damage request. For
 * a multi-hit ability we split the authored total budget and subtract that
 * implicit contribution. `implicitOutputDamage` differs from `sourceDamage`
 * only for data-authored cross-type scaling (for example physical scaling that
 * deals magical damage).
 */
export function getAbilityHitBaseDamage(
  sourceDamage: number,
  bonusRatio: number,
  hits: number,
  abilityPowerPercent: number = 0,
  implicitOutputDamage: number = sourceDamage,
): number {
  const safeHits = Math.max(1, Math.floor(hits));
  const abilityPowerMultiplier = 1 + Math.max(0, abilityPowerPercent) / 100;
  const intendedDamagePerHit = sourceDamage * (1 + bonusRatio) * abilityPowerMultiplier / safeHits;
  return intendedDamagePerHit - implicitOutputDamage;
}

/** Shared conditional-ratio resolver used by both execution and overkill estimation. */
export function resolveAbilityDamageRatio(
  mechanic: DamageMechanic,
  healthRatio: number | undefined,
  hasEffect: (effectId: string) => boolean,
): number {
  let totalRatio = mechanic.ratio;
  if (
    mechanic.bonusHealthBelow !== undefined
    && healthRatio !== undefined
    && healthRatio <= mechanic.bonusHealthBelow.ratio
  ) totalRatio += mechanic.bonusHealthBelow.bonusRatio;
  if (mechanic.bonusEffect !== undefined && hasEffect(mechanic.bonusEffect.effectId)) {
    totalRatio += mechanic.bonusEffect.bonusRatio;
  }
  return totalRatio;
}

export class WeaponAbilityMechanicsRuntime {
  private readonly dots: ActiveDot[] = [];
  private readonly modifiers = new Map<string, TrackedModifier>();

  public constructor(private readonly deps: WeaponAbilityMechanicsRuntimeDeps) {}

  public canAutoCast(definition: ClientAbilityDefinition, target: EntityId): boolean {
    const rule = definition.mechanics.autoRule;
    if (rule === undefined || rule.kind === "always") return true;
    if (!this.deps.damageManager.isAlive(target)) return false;
    if (rule.kind === "target_health_below") {
      const health = this.deps.damageManager.getHealth(target);
      return health.maxHealth > 0 && health.currentHealth / health.maxHealth <= rule.ratio;
    }
    if (rule.kind === "target_has_effect") return this.hasEffect(target, rule.effectId);
    return true;
  }

  public execute(definition: ClientAbilityDefinition, target: EntityId, tick: number): boolean {
    const profile = definition.mechanics;
    const abilityId = String(definition.id);
    const abilityPowerPercent = this.deps.statsManager.getStat(this.deps.heroId, STAT_ABILITY_POWER).computed;
    const abilityPowerMultiplier = 1 + Math.max(0, abilityPowerPercent) / 100;
    let dealtDamage = false;
    let lastDamageMechanicFinalDamage = 0;

    for (const mechanic of profile.mechanics) {
      const requiresLivingEnemy = mechanic.kind !== "heal_from_damage" && !(mechanic.kind === "status" && mechanic.target === "self") && mechanic.kind !== "auto_attack_bonus_window";
      if (requiresLivingEnemy && !this.deps.damageManager.isAlive(target)) break;

      if (mechanic.kind === "damage") {
        const outputDamageType = mechanic.damageType ?? definition.damageType;
        const scalingDamageType = mechanic.scalingDamageType ?? outputDamageType;
        const sourceDamage = this.deps.statsManager.getStat(this.deps.heroId, statForDamageType(scalingDamageType)).computed;
        const implicitOutputDamage = this.deps.statsManager.getStat(this.deps.heroId, statForDamageType(outputDamageType)).computed;
        const health = this.deps.damageManager.getHealth(target);
        const healthRatio = health.maxHealth > 0 ? health.currentHealth / health.maxHealth : undefined;
        const totalRatio = resolveAbilityDamageRatio(mechanic, healthRatio, (effectId) => this.hasEffect(target, effectId));
        const hits = Math.max(1, mechanic.hits ?? 1);
        const baseDamagePerHit = getAbilityHitBaseDamage(sourceDamage, totalRatio, hits, abilityPowerPercent, implicitOutputDamage);
        let finalDamage = 0;
        for (let hit = 0; hit < hits && canContinueWeaponMultiHit(this.deps.damageManager.isAlive(target)); hit += 1) {
          const result = this.deps.damageManager.processDamage({ source: this.deps.heroId, target, baseDamage: baseDamagePerHit, damageType: outputDamageType, source_type: "ability" });
          dealtDamage = dealtDamage || result !== null;
          const hitDamage = result?.finalDamage ?? 0;
          finalDamage += hitDamage;
          if (hitDamage > 0) this.deps.onAbilityDamage?.({ abilityId, kind: "direct", finalDamage: hitDamage });
          if (result?.targetDied === true) this.deps.onTargetKilled(tick);
        }
        lastDamageMechanicFinalDamage = finalDamage;
        continue;
      }

      if (mechanic.kind === "bonus_damage") {
        const outputDamageType = mechanic.damageType ?? definition.damageType;
        const scalingDamageType = mechanic.scalingDamageType ?? outputDamageType;
        const sourceDamage = this.deps.statsManager.getStat(this.deps.heroId, statForDamageType(scalingDamageType)).computed;
        const implicitOutputDamage = this.deps.statsManager.getStat(this.deps.heroId, statForDamageType(outputDamageType)).computed;
        const intendedDamage = sourceDamage * Math.max(0, mechanic.ratio) * abilityPowerMultiplier;
        const result = this.deps.damageManager.processDamage({ source: this.deps.heroId, target, baseDamage: intendedDamage - implicitOutputDamage, damageType: outputDamageType, source_type: "ability" });
        dealtDamage = dealtDamage || result !== null;
        const finalDamage = result?.finalDamage ?? 0;
        lastDamageMechanicFinalDamage = finalDamage;
        if (finalDamage > 0) this.deps.onAbilityDamage?.({ abilityId, kind: "direct", finalDamage });
        if (result?.targetDied === true) this.deps.onTargetKilled(tick);
        continue;
      }

      if (mechanic.kind === "heal_from_damage") {
        if (lastDamageMechanicFinalDamage <= 0 || !this.deps.damageManager.isAlive(this.deps.heroId)) continue;
        const health = this.deps.damageManager.getHealth(this.deps.heroId);
        const uncappedHeal = lastDamageMechanicFinalDamage * Math.max(0, mechanic.ratio);
        const healthCap = mechanic.maxHealthRatio === undefined ? Number.POSITIVE_INFINITY : health.maxHealth * Math.max(0, mechanic.maxHealthRatio);
        const healAmount = Math.min(uncappedHeal, healthCap);
        if (healAmount > 0) this.deps.damageManager.healDamage(this.deps.heroId, healAmount);
        continue;
      }

      if (mechanic.kind === "dot") {
        const outputDamageType = mechanic.damageType ?? definition.damageType;
        const scalingDamageType = mechanic.scalingDamageType ?? outputDamageType;
        const sourceDamage = this.deps.statsManager.getStat(this.deps.heroId, statForDamageType(scalingDamageType)).computed;
        const implicitOutputDamage = this.deps.statsManager.getStat(this.deps.heroId, statForDamageType(outputDamageType)).computed;
        const duration = mechanic.interval * mechanic.ticks + 0.01;
        this.deps.effectManager.applyEffect(this.deps.heroId, target, { id: mechanic.effectId, effectType: "debuff", duration, strength: mechanic.ratio, refreshOnReapply: true }, tick);
        const incomingIdentity = { source: this.deps.heroId, target, effectId: mechanic.effectId };
        const existing = this.dots.find((dot) => matchesWeaponDotIdentity(dot, incomingIdentity));
        if (existing !== undefined) {
          existing.intervalRemaining = mechanic.interval;
          existing.ticksRemaining = mechanic.ticks;
        } else {
          this.dots.push({ effectId: mechanic.effectId, abilityId, source: this.deps.heroId, target, damageType: outputDamageType, sourceDamage: snapshotWeaponDotSourceDamage(sourceDamage), implicitOutputDamage, abilityPowerMultiplier, ratio: mechanic.ratio, intervalRemaining: mechanic.interval, interval: mechanic.interval, ticksRemaining: mechanic.ticks });
        }
        continue;
      }

      if (mechanic.kind === "auto_attack_bonus_window") {
        const sourceDamage = this.deps.statsManager.getStat(this.deps.heroId, statForDamageType(mechanic.scalingDamageType)).computed;
        const bonusDamage = sourceDamage * Math.max(0, mechanic.ratio);
        const applied = this.deps.effectManager.applyEffect(this.deps.heroId, this.deps.heroId, { id: mechanic.effectId, effectType: "buff", duration: mechanic.duration, strength: mechanic.ratio, refreshOnReapply: true }, tick);
        if (!applied.ok) continue;
        const modifierId = `ability_effect_${String(applied.value.id)}` as ModifierId;
        const statId = bonusAutoAttackStatForDamageType(mechanic.damageType);
        this.deps.statsManager.removeModifier(this.deps.heroId, modifierId);
        this.deps.statsManager.addModifier(this.deps.heroId, { id: modifierId, statId, type: "flat", value: bonusDamage, priority: 100, source: mechanic.effectId });
        this.deps.statsManager.calculateStats(this.deps.heroId);
        this.modifiers.set(String(applied.value.id), { target: this.deps.heroId, modifierId });
        continue;
      }

      const effectTarget = mechanic.target === "self" ? this.deps.heroId : target;
      const applied = this.deps.effectManager.applyEffect(this.deps.heroId, effectTarget, { id: mechanic.effectId, effectType: mechanic.effectType, duration: mechanic.duration, strength: Math.max(0, Math.abs(mechanic.statDelta ?? 1)), refreshOnReapply: true }, tick);
      if (!applied.ok) continue;
      if (mechanic.statId !== undefined && mechanic.statDelta !== undefined) {
        const modifierId = `ability_effect_${String(applied.value.id)}` as ModifierId;
        this.deps.statsManager.removeModifier(effectTarget, modifierId);
        this.deps.statsManager.addModifier(effectTarget, { id: modifierId, statId: mechanic.statId as StatId, type: mechanic.modifierType ?? "flat", value: mechanic.statDelta, priority: 100, source: mechanic.effectId });
        this.deps.statsManager.calculateStats(effectTarget);
        this.modifiers.set(String(applied.value.id), { target: effectTarget, modifierId });
      }
      if (mechanic.effectType === "stun") this.deps.autoAttackManager.stopAutoAttack(effectTarget);
    }
    return dealtDamage || profile.mechanics.length > 0;
  }

  public tick(dt: number, tick: number): void {
    for (let index = this.dots.length - 1; index >= 0; index -= 1) {
      const dot = this.dots[index]!;
      if (!this.deps.damageManager.isAlive(dot.target)) {
        this.dots.splice(index, 1);
        continue;
      }
      dot.intervalRemaining -= dt;
      while (dot.intervalRemaining <= 0 && dot.ticksRemaining > 0 && this.deps.damageManager.isAlive(dot.target)) {
        dot.intervalRemaining += dot.interval;
        dot.ticksRemaining -= 1;
        const intendedDamage = dot.sourceDamage * dot.ratio * dot.abilityPowerMultiplier;
        const result = this.deps.damageManager.processDamage({ source: dot.source, target: dot.target, baseDamage: intendedDamage - dot.implicitOutputDamage, damageType: dot.damageType, source_type: "effect" });
        const tickDamage = result?.finalDamage ?? 0;
        if (tickDamage > 0) this.deps.onAbilityDamage?.({ abilityId: dot.abilityId, kind: "dot", finalDamage: tickDamage });
        if (result?.targetDied === true) this.deps.onTargetKilled(tick);
      }
      if (dot.ticksRemaining <= 0) this.dots.splice(index, 1);
    }
  }

  public handleExpiredEffects(expiredEffects: readonly { readonly effect: { readonly id: unknown; readonly target: EntityId; readonly effectType: string } }[]): void {
    for (const { effect } of expiredEffects) {
      const tracked = this.modifiers.get(String(effect.id));
      if (tracked !== undefined) {
        this.removeTrackedModifier(tracked);
        this.modifiers.delete(String(effect.id));
      }
      if (effect.effectType === "stun" && this.deps.damageManager.isAlive(effect.target)) {
        this.deps.autoAttackManager.startAutoAttack(effect.target);
      }
    }
  }

  public clear(): void {
    this.dots.splice(0, this.dots.length);
    for (const tracked of this.modifiers.values()) this.removeTrackedModifier(tracked);
    this.modifiers.clear();
  }

  private removeTrackedModifier(tracked: TrackedModifier): void {
    if (!this.deps.statsManager.hasStats(tracked.target)) return;
    this.deps.statsManager.removeModifier(tracked.target, tracked.modifierId);
    this.deps.statsManager.calculateStats(tracked.target);
  }

  private hasEffect(target: EntityId, effectId: string): boolean {
    return this.deps.effectManager.getActiveEffects(target).some((effect) => effect.definition.id === effectId);
  }
}
