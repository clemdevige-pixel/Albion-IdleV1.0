import type { EntityId, World } from "@game/core";
import type { EffectManager, StatusEffectType } from "@game/gameplay";
import type { WeaponAbilityMechanicsRuntime } from "./WeaponAbilityMechanicsRuntime.js";

type Snapshot = { readonly id: unknown; readonly target: EntityId; readonly effectType: StatusEffectType };

export class WeaponAbilityEffectTracker {
  private before: readonly Snapshot[] = [];

  constructor(
    private readonly world: World,
    private readonly effects: EffectManager,
    private readonly mechanics: WeaponAbilityMechanicsRuntime,
  ) {}

  capture(targets: readonly EntityId[]): void {
    this.before = this.snapshot(targets);
  }

  reconcile(targets: readonly EntityId[]): void {
    const active = new Set(this.snapshot(targets).map((effect) => String(effect.id)));
    const expired = this.before
      .filter((effect) => !active.has(String(effect.id)))
      .map((effect) => ({ effect }));
    if (expired.length > 0) this.mechanics.handleExpiredEffects(expired);
    this.before = [];
  }

  private snapshot(targets: readonly EntityId[]): readonly Snapshot[] {
    return targets.flatMap((target) => this.world.hasEntity(target)
      ? this.effects.getActiveEffects(target).map((effect) => ({ id: effect.id, target, effectType: effect.effectType }))
      : []);
  }
}
