import type { EntityId, World } from "@game/core";
import type { TargetManager } from "../targeting/target-manager.js";
import type { StatsManager } from "../stats/stats-manager.js";
import type { StatId } from "../stats/types.js";
import { AutoAttackComponent } from "./components.js";

const ATTACK_SPEED_STAT = "stat_attack_speed" as StatId;

export class AttackValidator {
  constructor(
    private readonly world: World,
    private readonly targetManager: TargetManager,
    private readonly statsManager: StatsManager,
  ) {}

  canAttack(entityId: EntityId): boolean {
    if (!this.world.hasComponent(entityId, AutoAttackComponent)) return false;
    if (!this.targetManager.hasTarget(entityId)) return false;
    if (!this.targetManager.isTargetValid(entityId)) return false;
    if (!this.statsManager.hasStats(entityId)) return false;

    const attackSpeed = this.statsManager.getStat(entityId, ATTACK_SPEED_STAT);
    return attackSpeed.computed > 0;
  }
}
