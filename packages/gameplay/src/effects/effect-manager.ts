import type { EntityId } from "@game/core";
import { EventBus } from "@game/core";
import type { EffectEventMap } from "./effect-events.js";
import type {
  ActiveStatusEffect,
  ExpiredEffect,
  ModifierCategory,
  StatusEffectDefinition,
  StatusEffectId,
  StatusEffectResult,
  StatusEffectType,
} from "./types.js";
import { asStatusEffectId } from "./types.js";

export class EffectManager {
  readonly events = new EventBus<EffectEventMap>();
  readonly #effects = new Map<EntityId, ActiveStatusEffect[]>();
  #idCounter = 0;

  applyEffect(
    source: EntityId,
    target: EntityId,
    definition: StatusEffectDefinition,
    tick: number,
  ): StatusEffectResult<ActiveStatusEffect> {
    if (definition.duration <= 0) return { ok: false, reason: "invalid_duration" };
    if (definition.strength < 0) return { ok: false, reason: "invalid_effect" };

    const existing = this.#findExisting(target, definition.effectType, source, definition.id);

    if (existing !== undefined && definition.refreshOnReapply) {
      const previousDuration = existing.remainingDuration;
      const refreshed: ActiveStatusEffect = {
        ...existing,
        remainingDuration: definition.duration,
        strength: Math.max(existing.strength, definition.strength),
      };
      this.#replace(target, existing.id, refreshed);
      this.events.publish("StatusRefreshed", { effect: refreshed, previousDuration });
      return { ok: true, value: refreshed };
    }

    if (existing !== undefined) return { ok: true, value: existing };

    const effect: ActiveStatusEffect = {
      id: this.#nextId(),
      effectType: definition.effectType,
      source,
      target,
      definition,
      remainingDuration: definition.duration,
      strength: definition.strength,
      appliedAt: tick,
    };

    const list = this.#effects.get(target) ?? [];
    list.push(effect);
    this.#effects.set(target, list);
    this.events.publish("StatusApplied", { effect });
    return { ok: true, value: effect };
  }

  removeEffect(target: EntityId, effectId: StatusEffectId): StatusEffectResult<void> {
    const list = this.#effects.get(target);
    if (list === undefined) return { ok: false, reason: "effect_not_found" };
    const idx = list.findIndex((e) => e.id === effectId);
    if (idx === -1) return { ok: false, reason: "effect_not_found" };
    const [removed] = list.splice(idx, 1) as [ActiveStatusEffect];
    if (list.length === 0) this.#effects.delete(target);
    this.events.publish("StatusRemoved", { effect: removed });
    return { ok: true, value: undefined };
  }

  removeAllEffects(target: EntityId): void {
    const list = this.#effects.get(target);
    if (list === undefined) return;
    for (const effect of [...list]) this.events.publish("StatusRemoved", { effect });
    this.#effects.delete(target);
  }

  tickEffects(deltaTime: number): readonly ExpiredEffect[] {
    const expired: ExpiredEffect[] = [];
    for (const [target, list] of this.#effects) {
      let i = 0;
      while (i < list.length) {
        const updated: ActiveStatusEffect = {
          ...list[i]!,
          remainingDuration: list[i]!.remainingDuration - deltaTime,
        };
        if (updated.remainingDuration <= 0) {
          list.splice(i, 1);
          expired.push({ effect: updated });
          this.events.publish("StatusExpired", { effect: updated });
        } else {
          list[i] = updated;
          i += 1;
        }
      }
      if (list.length === 0) this.#effects.delete(target);
    }
    return expired;
  }

  getActiveEffects(target: EntityId): readonly ActiveStatusEffect[] {
    return this.#effects.get(target) ?? [];
  }

  hasEffectType(target: EntityId, effectType: StatusEffectType): boolean {
    return this.getActiveEffects(target).some((e) => e.effectType === effectType);
  }

  isStunned(target: EntityId): boolean { return this.hasEffectType(target, "stun"); }
  isRooted(target: EntityId): boolean { return this.hasEffectType(target, "root"); }
  isSilenced(target: EntityId): boolean { return this.hasEffectType(target, "silence"); }

  getModifiers(
    target: EntityId,
    category: ModifierCategory,
  ): readonly { strength: number; effectType: StatusEffectType }[] {
    return this.getActiveEffects(target)
      .filter((e) => e.definition.modifierCategory === category)
      .map((e) => ({ strength: e.strength, effectType: e.effectType }));
  }

  calculateModifiedValue(baseValue: number, target: EntityId, category: ModifierCategory): number {
    let value = baseValue;
    const mods = this.getModifiers(target, category);
    for (const mod of mods) {
      if (mod.effectType === "buff") value += mod.strength;
      else value -= mod.strength;
    }
    return value;
  }

  #nextId(): StatusEffectId {
    this.#idCounter += 1;
    return asStatusEffectId(`eff_${String(this.#idCounter)}`);
  }

  #findExisting(
    target: EntityId,
    effectType: StatusEffectType,
    source: EntityId,
    definitionId: string,
  ): ActiveStatusEffect | undefined {
    const list = this.#effects.get(target);
    if (list === undefined) return undefined;
    return list.find((e) =>
      e.effectType === effectType
      && e.source === source
      && e.definition.id === definitionId,
    );
  }

  #replace(target: EntityId, effectId: StatusEffectId, replacement: ActiveStatusEffect): void {
    const list = this.#effects.get(target);
    if (list === undefined) return;
    const idx = list.findIndex((e) => e.id === effectId);
    if (idx !== -1) list[idx] = replacement;
  }
}
