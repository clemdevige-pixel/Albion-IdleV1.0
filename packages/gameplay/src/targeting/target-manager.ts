import type { EntityId, World } from "@game/core";
import { PositionComponent } from "../character/components.js";
import { TargetComponent } from "./components.js";
import type { TargetValidator } from "./target-validator.js";

export class TargetManager {
  constructor(
    private readonly world: World,
    private readonly validator: TargetValidator,
  ) {}

  attachTargeting(entityId: EntityId): void {
    this.world.addComponent(entityId, TargetComponent, { targetId: null });
  }

  detachTargeting(entityId: EntityId): void {
    this.world.removeComponent(entityId, TargetComponent);
  }

  setTarget(source: EntityId, target: EntityId): boolean {
    if (!this.validator.isValid(source, target)) return false;
    const data = this.world.getComponent(source, TargetComponent);
    data.targetId = target;
    return true;
  }

  clearTarget(source: EntityId): void {
    const data = this.world.getComponent(source, TargetComponent);
    data.targetId = null;
  }

  getTarget(source: EntityId): EntityId | null {
    return this.world.getComponent(source, TargetComponent).targetId;
  }

  hasTarget(source: EntityId): boolean {
    return this.getTarget(source) !== null;
  }

  isTargetValid(source: EntityId): boolean {
    const targetId = this.getTarget(source);
    if (targetId === null) return false;
    return this.validator.isValid(source, targetId);
  }

  cleanupInvalidTarget(source: EntityId): boolean {
    if (!this.hasTarget(source)) return false;
    if (this.isTargetValid(source)) return false;
    this.clearTarget(source);
    return true;
  }

  /**
   * Deterministic default target selection per AI_BIBLE 20_COMBAT
   * ("Target Selection": Nearest Living Enemy) and 31_RUNTIME §21
   * (deterministic tie-break by runtime entity id).
   *
   * Distance is measured on the horizontal axis only (20_COMBAT "Combat
   * Distance"). Candidates without a position are ranked after positioned
   * ones. Invalid (dead/missing) candidates are skipped. Returns the selected
   * target (also set as the current target) or null when none is valid.
   */
  selectNearestTarget(source: EntityId, candidates: readonly EntityId[]): EntityId | null {
    const sourceX = this.#getX(source);

    let best: EntityId | null = null;
    let bestDistance = Infinity;

    for (const candidate of candidates) {
      if (!this.validator.isValid(source, candidate)) continue;

      const candidateX = this.#getX(candidate);
      const distance =
        sourceX !== null && candidateX !== null ? Math.abs(candidateX - sourceX) : Infinity;

      if (
        best === null ||
        distance < bestDistance ||
        (distance === bestDistance && candidate < best)
      ) {
        best = candidate;
        bestDistance = distance;
      }
    }

    if (best === null) return null;
    const data = this.world.getComponent(source, TargetComponent);
    data.targetId = best;
    return best;
  }

  #getX(entityId: EntityId): number | null {
    if (!this.world.hasComponent(entityId, PositionComponent)) return null;
    return this.world.getComponent(entityId, PositionComponent).x;
  }
}
