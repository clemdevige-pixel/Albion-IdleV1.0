import type { EntityId, World } from "@game/core";
import type { TargetManager } from "../targeting/target-manager.js";
import type { StatsManager } from "../stats/stats-manager.js";
import type { StatId } from "../stats/types.js";
import { AutoAttackComponent } from "./components.js";
import { AttackValidator } from "./attack-validator.js";
import { computeAttackInterval, tickAttackTimer } from "./attack-timer.js";

const ATTACK_SPEED_STAT = "stat_attack_speed" as StatId;

export class AutoAttackManager {
  private readonly validator: AttackValidator;

  constructor(
    private readonly world: World,
    private readonly targetManager: TargetManager,
    private readonly statsManager: StatsManager,
  ) {
    this.validator = new AttackValidator(world, targetManager, statsManager);
  }

  attachAutoAttack(entityId: EntityId): void {
    this.world.addComponent(entityId, AutoAttackComponent, {
      active: false,
      timer: 0,
      interval: 0,
      attackReady: false,
    });
  }

  detachAutoAttack(entityId: EntityId): void {
    this.world.removeComponent(entityId, AutoAttackComponent);
  }

  startAutoAttack(entityId: EntityId): boolean {
    if (!this.canAttack(entityId)) return false;

    const data = this.world.getComponent(entityId, AutoAttackComponent);
    const attackSpeed = this.statsManager.getStat(entityId, ATTACK_SPEED_STAT);

    data.active = true;
    data.interval = computeAttackInterval(attackSpeed.computed);
    data.timer = 0;
    data.attackReady = false;

    return true;
  }

  stopAutoAttack(entityId: EntityId): void {
    const data = this.world.getComponent(entityId, AutoAttackComponent);
    data.active = false;
    data.timer = 0;
    data.attackReady = false;
  }

  isAutoAttacking(entityId: EntityId): boolean {
    return this.world.getComponent(entityId, AutoAttackComponent).active;
  }

  canAttack(entityId: EntityId): boolean {
    return this.validator.canAttack(entityId);
  }

  tick(entityId: EntityId, deltaTime: number): boolean {
    const data = this.world.getComponent(entityId, AutoAttackComponent);

    if (!data.active) return false;

    if (!this.targetManager.isTargetValid(entityId)) {
      this.stopAutoAttack(entityId);
      return false;
    }

    const attackSpeed = this.statsManager.getStat(entityId, ATTACK_SPEED_STAT);
    data.interval = computeAttackInterval(attackSpeed.computed);

    const ready = tickAttackTimer(data, deltaTime);

    if (ready) {
      data.attackReady = false;
      return true;
    }

    return false;
  }

  consumeAttack(entityId: EntityId): boolean {
    const data = this.world.getComponent(entityId, AutoAttackComponent);
    if (data.attackReady) {
      data.attackReady = false;
      return true;
    }
    return false;
  }
}
